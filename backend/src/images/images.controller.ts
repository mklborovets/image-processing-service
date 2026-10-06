import { Controller, Get, Post, Body, Param, Delete, Query } from '@nestjs/common';
import { ImagesService } from './images.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { GetImagesQueryDto } from './dto/get-images-query.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Request an S3 presigned POST url to upload an image' })
  @ApiResponse({ status: 201, description: 'The presigned URL and fields.' })
  createUploadUrl(@Body() dto: CreateUploadUrlDto) {
    return this.imagesService.createUploadUrl(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all images with pagination and optional status filter' })
  findAll(@Query() query: GetImagesQueryDto) {
    return this.imagesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single image by ID' })
  findOne(@Param('id') id: string) {
    return this.imagesService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an image from DB and S3' })
  remove(@Param('id') id: string) {
    return this.imagesService.remove(id);
  }
}
