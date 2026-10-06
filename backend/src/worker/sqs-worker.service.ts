import { Injectable, OnModuleInit, OnApplicationShutdown, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import sharp from 'sharp';

@Injectable()
export class SqsWorkerService implements OnModuleInit, OnApplicationShutdown {
  private readonly sqsClient: SQSClient;
  private readonly logger = new Logger(SqsWorkerService.name);
  private isRunning = false;
  private queueUrl: string;
  private originalsBucket: string;
  private thumbnailsBucket: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {
    this.sqsClient = new SQSClient({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      endpoint: this.configService.getOrThrow<string>('AWS_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.queueUrl = this.configService.getOrThrow<string>('SQS_QUEUE_URL');
    this.originalsBucket = this.configService.getOrThrow<string>('S3_ORIGINALS_BUCKET');
    this.thumbnailsBucket = this.configService.getOrThrow<string>('S3_THUMBNAILS_BUCKET');
  }

  onModuleInit() {
    this.isRunning = true;
    this.poll();
  }

  onApplicationShutdown() {
    this.logger.log('Shutting down worker...');
    this.isRunning = false;
  }

  private async poll() {
    while (this.isRunning) {
      try {
        const command = new ReceiveMessageCommand({
          QueueUrl: this.queueUrl,
          WaitTimeSeconds: 20,
          MaxNumberOfMessages: 1,
        });

        const response = await this.sqsClient.send(command);

        if (response.Messages && response.Messages.length > 0) {
          for (const message of response.Messages) {
            await this.processMessage(message);
          }
        }
      } catch (error) {
        this.logger.error('Error polling SQS', error);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  private async processMessage(message: any) {
    try {
      const body = JSON.parse(message.Body);

      if (body.Event === 's3:TestEvent') {
        await this.deleteMessage(message.ReceiptHandle);
        return;
      }

      if (!body.Records || body.Records.length === 0) {
        await this.deleteMessage(message.ReceiptHandle);
        return;
      }

      for (const record of body.Records) {
        const s3Key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        const uuidMatch = s3Key.match(/originals\/(.+)\.[a-zA-Z0-9]+$/);
        if (!uuidMatch) {
          continue;
        }

        const id = uuidMatch[1];
        
        const imageRecord = await this.prisma.image.findUnique({ where: { id } });
        
        if (!imageRecord) {
          this.logger.warn(`Record for id ${id} not found, ignoring.`);
          await this.deleteMessage(message.ReceiptHandle);
          continue;
        }

        if (imageRecord.status === 'processed') {
          await this.deleteMessage(message.ReceiptHandle);
          continue;
        }

        try {
          const stream = await this.s3Service.getObjectStream(this.originalsBucket, s3Key);
          const thumbnailBuffer = await this.processImage(stream);
          const thumbnailKey = `thumbnails/${id}.webp`;

          await this.s3Service.uploadBuffer(this.thumbnailsBucket, thumbnailKey, thumbnailBuffer, 'image/webp');

          await this.prisma.image.update({
            where: { id },
            data: { status: 'processed', thumbnailKey },
          });

          await this.deleteMessage(message.ReceiptHandle);
        } catch (processError: any) {
          this.logger.error(`Error processing image ${id}`, processError);
          await this.prisma.image.update({
            where: { id },
            data: { status: 'failed', errorReason: processError.message || 'Corrupted image format' },
          });
          await this.deleteMessage(message.ReceiptHandle);
        }
      }
    } catch (parseError) {
      this.logger.error('Error parsing message body', parseError);
    }
  }

  private async processImage(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const pipeline = sharp().resize({ width: 300, withoutEnlargement: true }).webp();
    stream.pipe(pipeline);
    return pipeline.toBuffer();
  }

  private async deleteMessage(receiptHandle: string) {
    try {
      await this.sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: this.queueUrl,
          ReceiptHandle: receiptHandle,
        }),
      );
    } catch (error) {
      this.logger.error('Error deleting message from SQS', error);
    }
  }
}
