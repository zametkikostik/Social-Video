import { Module, Global } from '@nestjs/common';
import { PluginsService } from './plugins.service';
import { PluginsController } from './plugins.controller';

@Global()
@Module({
  providers: [PluginsService],
  controllers: [PluginsController],
  exports: [PluginsService],
})
export class PluginsModule {}
