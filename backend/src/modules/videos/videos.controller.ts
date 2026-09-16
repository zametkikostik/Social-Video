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
  ) {
    return this.videosService.listPublic(
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.videosService.findById(id);
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
