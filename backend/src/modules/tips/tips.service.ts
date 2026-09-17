import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TipsService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async create(data: {
    fromUserId: string;
    toUserId: string;
    amount: number;
    currency?: string;
    message?: string;
    videoId?: string;
    channelId?: string;
  }) {
    if (data.fromUserId === data.toUserId) {
      throw new BadRequestException('Cannot tip yourself');
    }
    if (!Number.isInteger(data.amount) || data.amount < 100) {
      throw new BadRequestException('Minimum tip is 100 (e.g. $1.00)');
    }
    if (data.amount > 1_000_000_00) {
      throw new BadRequestException('Amount too large');
    }

    const receiver = await this.prisma.user.findUnique({
      where: { id: data.toUserId },
    });
    if (!receiver) throw new NotFoundException('Receiver not found');

    if (data.videoId) {
      const video = await this.prisma.video.findUnique({
        where: { id: data.videoId },
      });
      if (!video) throw new NotFoundException('Video not found');
      if (video.uploaderId !== data.toUserId) {
        data.toUserId = video.uploaderId;
      }
    }

    const tip = await this.prisma.tip.create({
      data: {
        amount: data.amount,
        currency: data.currency || 'USD',
        message: data.message?.slice(0, 300),
        status: 'COMPLETED',
        paymentRef: `sim_${Date.now()}`,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        videoId: data.videoId,
        channelId: data.channelId,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        toUser: {
          select: { id: true, username: true, displayName: true },
        },
        video: { select: { id: true, title: true } },
      },
    });

    try {
      const dollars = (data.amount / 100).toFixed(2);
      await this.notifications.create({
        type: 'SYSTEM',
        recipientId: data.toUserId,
        actorId: data.fromUserId,
        title: 'Новый донат!',
        body: `$${dollars}${data.message ? ` — «${data.message.slice(0, 60)}»` : ''}`,
        link: data.videoId ? `/watch/${data.videoId}` : undefined,
        meta: { tipId: tip.id, amount: data.amount },
      });
    } catch {}

    return tip;
  }

  async received(userId: string, limit = 30, offset = 0) {
    return this.prisma.tip.findMany({
      where: { toUserId: userId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        video: { select: { id: true, title: true } },
      },
    });
  }

  async sent(userId: string, limit = 30, offset = 0) {
    return this.prisma.tip.findMany({
      where: { fromUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        toUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        video: { select: { id: true, title: true } },
      },
    });
  }

  async balance(userId: string) {
    const result = await this.prisma.tip.aggregate({
      where: { toUserId: userId, status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });
    return {
      totalCents: result._sum.amount || 0,
      totalFormatted: ((result._sum.amount || 0) / 100).toFixed(2),
      tipCount: result._count,
      currency: 'USD',
    };
  }

  async listForVideo(videoId: string, limit = 20) {
    return this.prisma.tip.findMany({
      where: { videoId, status: 'COMPLETED' },
      orderBy: { amount: 'desc' },
      take: limit,
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });
  }
}
