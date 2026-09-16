import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class GetUploadUrlDto {
  filename: string;
  contentType: string;
}

@Controller('storage')
export class StorageController {
  constructor(private storage: StorageService) {}

  @Post('upload-url')
  @UseGuards(JwtAuthGuard)
  async getUploadUrl(@Body() dto: GetUploadUrlDto, @Request() req: any) {
    const result = await this.storage.getUploadUrl(
      dto.filename,
      dto.contentType,
      `users/${req.user.id}/originals`,
    );
    return {
      ...result,
      storage: this.storage.isUsingR2() ? 'cloudflare-r2' : 'minio',
    };
  }
}
