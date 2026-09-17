import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PlaylistsService } from './playlists.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('playlists')
export class PlaylistsController {
  constructor(private playlistsService: PlaylistsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: { title: string; description?: string; isPublic?: boolean },
    @Request() req: any,
  ) {
    return this.playlistsService.create({
      ...body,
      ownerId: req.user.id,
    });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async myPlaylists(@Request() req: any) {
    return this.playlistsService.listMy(req.user.id);
  }

  @Get(':id')
  async getOne(@Param('id') id: string, @Request() req: any) {
    const viewerId = req.user?.id;
    return this.playlistsService.findById(id, viewerId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: { title?: string; description?: string; isPublic?: boolean },
    @Request() req: any,
  ) {
    return this.playlistsService.update(id, req.user.id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.playlistsService.delete(id, req.user.id);
  }

  @Post(':id/videos')
  @UseGuards(JwtAuthGuard)
  async addVideo(
    @Param('id') id: string,
    @Body() body: { videoId: string },
    @Request() req: any,
  ) {
    return this.playlistsService.addVideo(id, body.videoId, req.user.id);
  }

  @Delete(':id/videos/:videoId')
  @UseGuards(JwtAuthGuard)
  async removeVideo(
    @Param('id') id: string,
    @Param('videoId') videoId: string,
    @Request() req: any,
  ) {
    return this.playlistsService.removeVideo(id, videoId, req.user.id);
  }

  @Post(':id/reorder')
  @UseGuards(JwtAuthGuard)
  async reorder(
    @Param('id') id: string,
    @Body() body: { videoIds: string[] },
    @Request() req: any,
  ) {
    return this.playlistsService.reorder(id, req.user.id, body.videoIds);
  }
}
