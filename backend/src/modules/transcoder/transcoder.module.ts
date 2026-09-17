import { Module, forwardRef } from '@nestjs/common';
import { TranscoderService } from './transcoder.service';
import { StorageModule } from '../storage/storage.module';
import { FederationModule } from '../federation/federation.module';

@Module({
  imports: [StorageModule, forwardRef(() => FederationModule)],
  providers: [TranscoderService],
  exports: [TranscoderService],
})
export class TranscoderModule {}
