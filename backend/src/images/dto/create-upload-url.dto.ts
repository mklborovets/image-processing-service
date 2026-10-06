import { IsString, IsIn, IsNumber, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export class CreateUploadUrlDto {
  @ApiProperty({ example: 'photo.jpg' })
  @IsString()
  fileName: string;

  @ApiProperty({ example: 'image/jpeg', enum: ALLOWED_MIME_TYPES })
  @IsIn(ALLOWED_MIME_TYPES)
  mimeType: string;

  @ApiProperty({ example: 102400, description: 'File size in bytes (max 5MB)' })
  @IsNumber()
  @Max(MAX_FILE_SIZE)
  size: number;
}
