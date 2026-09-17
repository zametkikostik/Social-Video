import { Controller, Get, Header, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller()
export class MetricsController {
  constructor(
    private metrics: MetricsService,
    private prisma: PrismaService,
  ) {}

  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async prometheus(@Res() res: Response) {
    try {
      const [users, videos, tips] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.video.count({ where: { status: 'READY' } }),
        this.prisma.tip.count({ where: { status: 'COMPLETED' } }),
      ]);
      this.metrics.setGauge('socialvideo_users', users);
      this.metrics.setGauge('socialvideo_videos_ready', videos);
      this.metrics.setGauge('socialvideo_tips_completed', tips);
    } catch {
      /* db may be down */
    }
    res.send(this.metrics.render());
  }
}
