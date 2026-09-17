import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  @Get()
  live() {
    return {
      ok: true,
      service: 'social-video-api',
      time: new Date().toISOString(),
      env: this.config.get('NODE_ENV') || 'development',
    };
  }

  @Get('ready')
  async ready() {
    let db = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    return {
      ok: db,
      checks: { database: db },
      time: new Date().toISOString(),
    };
  }
}
