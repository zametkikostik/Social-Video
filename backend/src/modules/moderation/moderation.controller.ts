import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ModerationStatus } from '@prisma/client';

@Controller('moderation')
export class ModerationController {
  constructor(
    private moderation: ModerationService,
    private prisma: PrismaService,
  ) {}

  @Get('queue')
  @UseGuards(JwtAuthGuard)
  async getQueue(@Request() req: any) {
    this.ensureModerator(req.user);

    const videos = await this.prisma.video.findMany({
      where: {
        moderationStatus: {
          in: [ModerationStatus.QUARANTINED, ModerationStatus.MANUAL_REVIEW],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        uploader: {
          select: { id: true, username: true, isVerified: true },
        },
        channel: {
          select: { id: true, name: true, isVerified: true },
        },
      },
    });

    return { videos };
  }

  @Post('videos/:id/override')
  @UseGuards(JwtAuthGuard)
  async overrideVideo(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; reason?: string },
    @Request() req: any,
  ) {
    this.ensureModerator(req.user);

    const status =
      body.action === 'approve'
        ? ModerationStatus.APPROVED
        : ModerationStatus.REJECTED;

    const video = await this.prisma.video.update({
      where: { id },
      data: {
        moderationStatus: status,
        moderationReason: body.reason || `Manual ${body.action} by moderator`,
        moderatedAt: new Date(),
        isQuarantined: body.action === 'reject',
        status: body.action === 'approve' ? 'READY' : 'FAILED',
        visibility: body.action === 'approve' ? 'PUBLIC' : 'PRIVATE',
      },
    });

    await this.prisma.moderationLog.create({
      data: {
        targetType: 'video',
        action: 'manual_override',
        reason: body.reason,
        provider: 'manual',
        videoId: id,
        moderatorId: req.user.id,
      },
    });

    return video;
  }

  private ensureModerator(user: any) {
    if (!['MODERATOR', 'ADMIN'].includes(user.role)) {
      throw new ForbiddenException('Moderator access required');
    }
  }
}
