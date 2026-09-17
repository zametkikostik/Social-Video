import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { HypeService } from './hype.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class HypeController {
  constructor(private hype: HypeService) {}

  @Get('hype/packs')
  packs() {
    return this.hype.packs();
  }

  @Get('videos/:id/hype')
  status(@Param('id') id: string) {
    return this.hype.activeForVideo(id);
  }

  @Post('videos/:id/hype')
  @UseGuards(JwtAuthGuard)
  create(@Param('id') id: string, @Body() body: { packId: string }, @Request() req: any) {
    return this.hype.create(id, req.user.id, body.packId || 'boost');
  }
}
