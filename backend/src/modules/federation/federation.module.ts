import { Module, Global } from '@nestjs/common';
import { FederationService } from './federation.service';
import { FederationController } from './federation.controller';

@Global()
@Module({
  providers: [FederationService],
  controllers: [FederationController],
  exports: [FederationService],
})
export class FederationModule {}
