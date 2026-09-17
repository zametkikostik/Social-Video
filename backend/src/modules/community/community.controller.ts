import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { CommunityService } from './community.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class CommunityController {
  constructor(private communityService: CommunityService) {}

  @Get('channels/:channelId/community')
  async listByChannel(
    @Param('channelId') channelId: string,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.communityService.listByChannel(
      channelId,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Get('community/channel/:slug')
  async listBySlug(
    @Param('slug') slug: string,
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.communityService.listByChannelSlug(
      slug,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Get('community/:id')
  async getOne(@Param('id') id: string) {
    return this.communityService.getById(id);
  }

  @Post('channels/:channelId/community')
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('channelId') channelId: string,
    @Body() body: { text: string; imageUrl?: string; videoId?: string },
    @Request() req: any,
  ) {
    return this.communityService.create({
      channelId,
      authorId: req.user.id,
      text: body.text,
      imageUrl: body.imageUrl,
      videoId: body.videoId,
    });
  }

  @Delete('community/:id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.communityService.delete(id, req.user.id);
  }

  @Post('community/:id/like')
  async like(@Param('id') id: string) {
    return this.communityService.like(id);
  }
}
