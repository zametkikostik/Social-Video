import { Module } from '@nestjs/common';
import { HypeService } from './hype.service';
import { HypeController } from './hype.controller';

@Module({
  providers: [HypeService],
  controllers: [HypeController],
  exports: [HypeService],
})
export class HypeModule {}
