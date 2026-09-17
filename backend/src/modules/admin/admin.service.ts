import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async stats() {
    const [
      users,
      videos,
      channels,
      comments,
      liveStreams,
      tipsSum,
      pendingVideos,
      quarantined,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.video.count({ where: { status: 'READY' } }),
      this.prisma.channel.count(),
      this.prisma.comment.count(),
      this.prisma.liveStream.count({ where: { status: 'LIVE' } }),
      this.prisma.tip.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.video.count({
        where: { moderationStatus: { in: ['PENDING', 'MANUAL_REVIEW'] } },
      }),
      this.prisma.video.count({ where: { isQuarantined: true } }),
    ]);

    return {
      users,
      videos,
      channels,
      comments,
      liveNow: liveStreams,
      tipsTotalCents: tipsSum._sum.amount || 0,
      tipsCount: tipsSum._count,
      pendingModeration: pendingVideos,
      quarantined,
    };
  }

  async listUsers(limit = 50, offset = 0, q?: string) {
    return this.prisma.user.findMany({
      where: q
        ? {
            OR: [
              { username: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { displayName: { contains: q, mode: 'insensitive' } },
            ],
          }
        : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        role: true,
        isVerified: true,
        createdAt: true,
        _count: { select: { videos: true, channels: true } },
      },
    });
  }

  async setUserRole(
    userId: string,
    role: 'USER' | 'CREATOR' | 'MODERATOR' | 'ADMIN',
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, username: true, role: true, isVerified: true },
    });
  }

  async setVerified(userId: string, isVerified: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { isVerified },
      select: { id: true, username: true, isVerified: true, role: true },
    });
  }

  async listVideosForModeration(status?: string, limit = 30, offset = 0) {
    return this.prisma.video.findMany({
      where: {
        ...(status
          ? { moderationStatus: status as any }
          : {
              moderationStatus: {
                in: ['PENDING', 'MANUAL_REVIEW', 'QUARANTINED', 'REJECTED'],
              },
            }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        channel: { select: { id: true, name: true, slug: true } },
        uploader: {
          select: {
            id: true,
            username: true,
            displayName: true,
            isVerified: true,
          },
        },
      },
    });
  }

  async moderateVideo(
    videoId: string,
    action: 'APPROVE' | 'REJECT' | 'QUARANTINE',
    reason?: string,
    moderatorId?: string,
  ) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const map = {
      APPROVE: {
        moderationStatus: 'APPROVED' as const,
        isQuarantined: false,
        status:
          video.status === 'QUARANTINED' ? ('READY' as const) : video.status,
      },
      REJECT: {
        moderationStatus: 'REJECTED' as const,
        isQuarantined: true,
        status: 'QUARANTINED' as const,
      },
      QUARANTINE: {
        moderationStatus: 'QUARANTINED' as const,
        isQuarantined: true,
        status: 'QUARANTINED' as const,
      },
    };

    const data = map[action];
    if (!data) throw new BadRequestException('Invalid action');

    const updated = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        ...data,
        moderationReason: reason,
        moderatedAt: new Date(),
      },
    });

    await this.prisma.moderationLog.create({
      data: {
        targetType: 'video',
        action: action.toLowerCase(),
        reason,
        videoId,
        moderatorId,
        provider: 'admin',
      },
    });

    return updated;
  }

  async listRecentLogs(limit = 40) {
    return this.prisma.moderationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        video: { select: { id: true, title: true } },
        comment: { select: { id: true, text: true } },
      },
    });
  }

  async deleteVideo(videoId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    await this.prisma.video.update({
      where: { id: videoId },
      data: { status: 'DELETED', visibility: 'PRIVATE' },
    });
    return { deleted: true, id: videoId };
  }
}
