import { Controller, Post, Delete, Param, UseGuards, Request, Get } from '@nestjs/common';
import { LikesService } from './likes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('videos/:videoId/likes')
export class LikesController {
  constructor(private likesService: LikesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async like(@Param('videoId') videoId: string, @Request() req: any) {
    return this.likesService.like(videoId, req.user.id);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  async unlike(@Param('videoId') videoId: string, @Request() req: any) {
    return this.likesService.unlike(videoId, req.user.id);
  }

  @Post('toggle')
  @UseGuards(JwtAuthGuard)
  async toggle(@Param('videoId') videoId: string, @Request() req: any) {
    return this.likesService.toggle(videoId, req.user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async isLiked(@Param('videoId') videoId: string, @Request() req: any) {
    const liked = await this.likesService.isLiked(videoId, req.user.id);
    return { liked };
  }
}
