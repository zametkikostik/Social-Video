import { Module } from '@nestjs/common';
import { FederationService } from './federation.service';
import { FederationController } from './federation.controller';

@Module({
  providers: [FederationService],
  controllers: [FederationController],
  exports: [FederationService],
})
export class FederationModule {}
