import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../storage/s3.service';
import { ConfigService } from '@nestjs/config';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { GetImagesQueryDto } from './dto/get-images-query.dto';
import { sanitizeFilename } from '../common/utils/sanitize-filename';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ImagesService {
  private readonly originalsBucket: string;
  private readonly thumbnailsBucket: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {
    this.originalsBucket = this.configService.getOrThrow<string>(
      'S3_ORIGINALS_BUCKET',
    );
    this.thumbnailsBucket = this.configService.getOrThrow<string>(
      'S3_THUMBNAILS_BUCKET',
    );
  }

  async createUploadUrl(dto: CreateUploadUrlDto) {
    const id = uuidv4();
    const sanitizedName = sanitizeFilename(dto.fileName);
    const extension = sanitizedName.includes('.') ? sanitizedName.split('.').pop() : 'tmp';
    const originalKey = `originals/${id}.${extension}`;

    const record = await this.prisma.image.create({
      data: {
        id,
        originalName: sanitizedName,
        mimeType: dto.mimeType,
        size: dto.size,
        originalKey,
      },
    });

    const { url, fields } = await this.s3Service.createPresignedPostUrl(
      this.originalsBucket,
      originalKey,
      dto.mimeType,
      5 * 1024 * 1024,
    );

    return {
      id: record.id,
      uploadUrl: url,
      fields,
    };
  }

  async findAll(query: GetImagesQueryDto) {
    const { status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where = status ? { status } : {};

    const [items, total] = await Promise.all([
      this.prisma.image.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.image.count({ where }),
    ]);

    const enrichedItems = await Promise.all(
      items.map(async (item) => ({
        ...item,
        originalViewUrl: await this.s3Service.createPresignedGetUrl(
          this.originalsBucket,
          item.originalKey,
        ),
        thumbnailViewUrl: item.thumbnailKey
          ? await this.s3Service.createPresignedGetUrl(
              this.thumbnailsBucket,
              item.thumbnailKey,
            )
          : null,
      })),
    );

    return {
      data: enrichedItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.image.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    return {
      ...item,
      originalViewUrl: await this.s3Service.createPresignedGetUrl(
        this.originalsBucket,
        item.originalKey,
      ),
      thumbnailViewUrl: item.thumbnailKey
        ? await this.s3Service.createPresignedGetUrl(
            this.thumbnailsBucket,
            item.thumbnailKey,
          )
        : null,
    };
  }

  async remove(id: string) {
    const item = await this.prisma.image.findUnique({ where: { id } });
    if (!item) {
      throw new NotFoundException(`Image with ID ${id} not found`);
    }

    try {
      await this.s3Service.deleteObject(this.originalsBucket, item.originalKey);
      if (item.thumbnailKey) {
        await this.s3Service.deleteObject(
          this.thumbnailsBucket,
          item.thumbnailKey,
        );
      }
    } catch (error) {}

    await this.prisma.image.delete({ where: { id } });

    return { success: true };
  }
}
