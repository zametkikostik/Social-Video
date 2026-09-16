import { Module } from '@nestjs/common';
import { TranscoderService } from './transcoder.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [StorageModule],
  providers: [TranscoderService],
  exports: [TranscoderService],
})
export class TranscoderModule {}
