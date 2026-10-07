import { Test, TestingModule } from '@nestjs/testing';
import { SqsWorkerService } from './sqs-worker.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { ConfigService } from '@nestjs/config';

describe('SqsWorkerService', () => {
  let service: SqsWorkerService;
  let prisma: PrismaService;
  let s3: S3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SqsWorkerService,
        {
          provide: PrismaService,
          useValue: {
            image: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: S3Service,
          useValue: {
            getObjectStream: jest.fn(),
            uploadBuffer: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
            getOrThrow: jest.fn((key) => key),
          },
        },
      ],
    }).compile();

    service = module.get<SqsWorkerService>(SqsWorkerService);
    prisma = module.get<PrismaService>(PrismaService);
    s3 = module.get<S3Service>(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should ignore test events', async () => {
    const deleteSpy = jest
      .spyOn(service as any, 'deleteMessage')
      .mockResolvedValue(undefined);
    await (service as any).processMessage({
      Body: JSON.stringify({ Event: 's3:TestEvent' }),
      ReceiptHandle: 'rh1',
    });
    expect(deleteSpy).toHaveBeenCalledWith('rh1');
  });

  it('should ignore messages without records', async () => {
    const deleteSpy = jest
      .spyOn(service as any, 'deleteMessage')
      .mockResolvedValue(undefined);
    await (service as any).processMessage({
      Body: JSON.stringify({}),
      ReceiptHandle: 'rh2',
    });
    expect(deleteSpy).toHaveBeenCalledWith('rh2');
  });
});
