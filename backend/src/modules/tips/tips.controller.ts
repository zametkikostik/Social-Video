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
import { TipsService } from './tips.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tips')
export class TipsController {
  constructor(private tipsService: TipsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body()
    body: {
      toUserId: string;
      amount: number;
      currency?: string;
      message?: string;
      videoId?: string;
      channelId?: string;
    },
    @Request() req: any,
  ) {
    return this.tipsService.create({
      fromUserId: req.user.id,
      toUserId: body.toUserId,
      amount: body.amount,
      currency: body.currency,
      message: body.message,
      videoId: body.videoId,
      channelId: body.channelId,
    });
  }

  @Get('received')
  @UseGuards(JwtAuthGuard)
  async received(
    @Request() req: any,
    @Query('limit') limit = '30',
    @Query('offset') offset = '0',
  ) {
    return this.tipsService.received(
      req.user.id,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Get('sent')
  @UseGuards(JwtAuthGuard)
  async sent(
    @Request() req: any,
    @Query('limit') limit = '30',
    @Query('offset') offset = '0',
  ) {
    return this.tipsService.sent(
      req.user.id,
      parseInt(limit, 10),
      parseInt(offset, 10),
    );
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async balance(@Request() req: any) {
    return this.tipsService.balance(req.user.id);
  }

  @Get('video/:videoId')
  async forVideo(
    @Param('videoId') videoId: string,
    @Query('limit') limit = '20',
  ) {
    return this.tipsService.listForVideo(videoId, parseInt(limit, 10));
  }
}
