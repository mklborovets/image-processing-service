import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.getOrThrow<string>('AWS_REGION'),
      endpoint: this.configService.getOrThrow<string>('AWS_ENDPOINT'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
  }

  async createPresignedPostUrl(bucket: string, key: string, mimeType: string, maxSize: number) {
    try {
      const { url, fields } = await createPresignedPost(this.s3Client, {
        Bucket: bucket,
        Key: key,
        Conditions: [
          ['content-length-range', 1, maxSize],
          ['eq', '$Content-Type', mimeType],
        ],
        Fields: {
          'Content-Type': mimeType,
        },
        Expires: 600,
      });
      return { url, fields };
    } catch (error) {
      this.logger.error('Error creating presigned POST', error);
      throw error;
    }
  }

  async createPresignedGetUrl(bucket: string, key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: 900 });
    } catch (error) {
      this.logger.error(`Error creating presigned GET url for ${key}`, error);
      throw error;
    }
  }

  async deleteObject(bucket: string, key: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      await this.s3Client.send(command);
    } catch (error) {
      this.logger.error(`Error deleting object ${key} from bucket ${bucket}`, error);
    }
  }

  async getObjectStream(bucket: string, key: string): Promise<Readable> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.s3Client.send(command);
    return response.Body as Readable;
  }

  async uploadBuffer(bucket: string, key: string, buffer: Buffer, mimeType: string) {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    });
    await this.s3Client.send(command);
  }
}
