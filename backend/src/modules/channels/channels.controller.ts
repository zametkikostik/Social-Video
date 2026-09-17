import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('channels')
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: { name: string; description?: string },
    @Request() req: any,
  ) {
    return this.channelsService.create({
      ...body,
      ownerId: req.user.id,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async myChannels(@Request() req: any) {
    return this.channelsService.listByOwner(req.user.id);
  }

  @Get(':slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.channelsService.findBySlug(slug);
  }

  @Get(':slug/videos')
  async channelVideos(
    @Param('slug') slug: string,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.channelsService.listVideos(
      slug,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }
}
