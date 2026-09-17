import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const ALLOWED_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-matroska',
  'video/x-msvideo',
  'image/jpeg',
  'image/png',
  'image/webp',
  'audio/mpeg',
  'audio/mp4',
  'audio/wav',
  'audio/webm',
]);

class GetUploadUrlDto {
  filename: string;
  contentType: string;
  sizeBytes?: number;
}

@Controller('storage')
export class StorageController {
  constructor(private storage: StorageService) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  async getUploadUrl(@Body() dto: GetUploadUrlDto, @Request() req: any) {
    if (!dto?.filename || !dto?.contentType) {
      throw new BadRequestException('filename and contentType required');
    }
    const ct = dto.contentType.split(';')[0].trim().toLowerCase();
    if (!ALLOWED_TYPES.has(ct)) {
      throw new BadRequestException(`contentType not allowed: ${ct}`);
    }
    const maxMb = Number(process.env.UPLOAD_MAX_MB || 2048);
    const maxBytes = maxMb * 1024 * 1024;
    if (dto.sizeBytes != null && dto.sizeBytes > maxBytes) {
      throw new BadRequestException(`File exceeds max size ${maxMb} MB`);
    }
    const safeName = dto.filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
    const result = await this.storage.getUploadUrl(
      safeName,
      ct,
      `users/${req.user.id}/originals`,
      maxBytes,
    );
    return {
      ...result,
      maxBytes,
      storage: this.storage.isUsingR2() ? 'cloudflare-r2' : 'minio',
    };
  }
}
