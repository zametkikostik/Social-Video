import { Module } from '@nestjs/common';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { StorageModule } from '../storage/storage.module';
import { ModerationModule } from '../moderation/moderation.module';
import { TranscoderModule } from '../transcoder/transcoder.module';

@Module({
  imports: [StorageModule, ModerationModule, TranscoderModule],
  providers: [VideosService],
  controllers: [VideosController],
  exports: [VideosService],
})
export class VideosModule {}
