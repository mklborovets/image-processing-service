import { Test, TestingModule } from '@nestjs/testing';
import { ImagesService } from './images.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';

describe('ImagesService', () => {
  let service: ImagesService;
  let prisma: PrismaService;
  let s3: S3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagesService,
        {
          provide: PrismaService,
          useValue: {
            image: {
              create: jest.fn(),
              findMany: jest.fn().mockResolvedValue([]),
              count: jest.fn().mockResolvedValue(0),
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
        {
          provide: S3Service,
          useValue: {
            createPresignedPostUrl: jest.fn().mockResolvedValue({ url: 'http://test', fields: {} }),
            createPresignedGetUrl: jest.fn().mockResolvedValue('http://view'),
            deleteObject: jest.fn(),
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

    service = module.get<ImagesService>(ImagesService);
    prisma = module.get<PrismaService>(PrismaService);
    s3 = module.get<S3Service>(S3Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('createUploadUrl should create record and return url', async () => {
    jest.spyOn(prisma.image, 'create').mockResolvedValue({ id: '123' } as any);
    const result = await service.createUploadUrl({ fileName: 'test.jpg', mimeType: 'image/jpeg', size: 100 });
    expect(result.id).toBe('123');
    expect(result.uploadUrl).toBe('http://test');
  });

  it('findOne should throw NotFoundException if not found', async () => {
    jest.spyOn(prisma.image, 'findUnique').mockResolvedValue(null);
    await expect(service.findOne('999')).rejects.toThrow(NotFoundException);
  });

  it('remove should delete from s3 and db', async () => {
    jest.spyOn(prisma.image, 'findUnique').mockResolvedValue({ id: '123', originalKey: 'k', thumbnailKey: 'tk' } as any);
    await service.remove('123');
    expect(s3.deleteObject).toHaveBeenCalledTimes(2);
    expect(prisma.image.delete).toHaveBeenCalledWith({ where: { id: '123' } });
  });
});
