import { Controller, Get } from '@nestjs/common';
import { PluginsService } from './plugins.service';

@Controller('plugins')
export class PluginsController {
  constructor(private plugins: PluginsService) {}

  @Get()
  list() {
    return {
      plugins: this.plugins.list(),
      docs: 'Drop folders into /plugins with manifest.json + index.js',
    };
  }
}
