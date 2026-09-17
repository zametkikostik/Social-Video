import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { LiveService } from './live.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('live')
export class LiveController {
  constructor(private liveService: LiveService) {}

  @Get()
  async listLive(
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.liveService.listLive(
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: { title: string; description?: string; channelId: string },
    @Request() req: any,
  ) {
    return this.liveService.create({
      ...body,
      userId: req.user.id,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async myStreams(@Request() req: any) {
    return this.liveService.listMy(req.user.id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Request() req: any) {
    return this.liveService.getById(id, req.user?.id);
  }

  @Post(':id/end')
  @UseGuards(JwtAuthGuard)
  async end(@Param('id') id: string, @Request() req: any) {
    return this.liveService.end(id, req.user.id);
  }

  @Post(':id/regenerate-key')
  @UseGuards(JwtAuthGuard)
  async regenerateKey(@Param('id') id: string, @Request() req: any) {
    return this.liveService.regenerateKey(id, req.user.id);
  }

  @Post('hooks/on-publish')
  async onPublish(
    @Body() body: { name?: string; key?: string },
    @Query('name') nameQ: string,
    @Res() res: Response,
  ) {
    const streamKey = body?.name || body?.key || nameQ;
    if (!streamKey) {
      return res.status(HttpStatus.FORBIDDEN).send('missing key');
    }
    const ok = await this.liveService.validateKey(streamKey);
    if (!ok) {
      return res.status(HttpStatus.FORBIDDEN).send('invalid key');
    }
    await this.liveService.markLive(streamKey);
    return res.status(HttpStatus.OK).send('ok');
  }

  @Post('hooks/on-publish-done')
  async onPublishDone(
    @Body() body: { name?: string },
    @Query('name') nameQ: string,
    @Res() res: Response,
  ) {
    const streamKey = body?.name || nameQ;
    if (streamKey) {
      try {
        await this.liveService.markEnded(streamKey);
      } catch {}
    }
    return res.status(HttpStatus.OK).send('ok');
  }
}
