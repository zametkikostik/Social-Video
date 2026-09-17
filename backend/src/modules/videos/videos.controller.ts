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
import { VideosService } from './videos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('videos')
export class VideosController {
  constructor(private videosService: VideosService) {}

  @Get()
  async list(
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
    @Query('q') q?: string,
  ) {
    if (q && q.trim()) {
      return this.videosService.search(
        q,
        parseInt(limit, 10),
        parseInt(offset, 10),
      );
    }
    return this.videosService.listPublic(
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Get('search')
  async search(
    @Query('q') q = '',
    @Query('limit') limit = '20',
    @Query('offset') offset = '0',
  ) {
    return this.videosService.search(
      q,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.videosService.findByIdAndIncrementViews(id);
  }

  @Post(':id/view')
  async recordView(@Param('id') id: string) {
    return this.videosService.incrementViews(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body()
    body: {
      title: string;
      description?: string;
      channelId: string;
      originalKey: string;
      isShort?: boolean;
    },
    @Request() req: any,
  ) {
    return this.videosService.create({
      ...body,
      uploaderId: req.user.id,
    });
  }
}
