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
import { CommentsService } from './comments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller()
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get('videos/:videoId/comments')
  async list(
    @Param('videoId') videoId: string,
    @Query('limit') limit = '50',
    @Query('offset') offset = '0',
  ) {
    return this.commentsService.listByVideo(
      videoId,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Post('videos/:videoId/comments')
  @UseGuards(JwtAuthGuard)
  async create(
    @Param('videoId') videoId: string,
    @Body() body: { text: string; parentId?: string },
    @Request() req: any,
  ) {
    return this.commentsService.create({
      videoId,
      userId: req.user.id,
      text: body.text,
      parentId: body.parentId,
    });
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id') id: string, @Request() req: any) {
    const isMod = ['MODERATOR', 'ADMIN'].includes(req.user.role);
    return this.commentsService.delete(id, req.user.id, isMod);
  }
}
