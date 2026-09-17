import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async subscribe(channelId: string, userId: string) {
    const channel = await this.prisma.channel.findUnique({ where: { id: channelId } });
    if (!channel) throw new NotFoundException('Channel not found');

    if (channel.ownerId === userId) {
      throw new ConflictException('Cannot subscribe to your own channel');
    }

    const existing = await this.prisma.subscription.findUnique({
      where: { subscriberId_channelId: { subscriberId: userId, channelId } },
    });
    if (existing) throw new ConflictException('Already subscribed');

    await this.prisma.subscription.create({
      data: {
        subscriberId: userId,
        channelId,
        channelOwnerId: channel.ownerId,
      },
    });

    return { subscribed: true };
  }

  async unsubscribe(channelId: string, userId: string) {
    const existing = await this.prisma.subscription.findUnique({
      where: { subscriberId_channelId: { subscriberId: userId, channelId } },
    });
    if (!existing) throw new NotFoundException('Subscription not found');

    await this.prisma.subscription.delete({ where: { id: existing.id } });
    return { subscribed: false };
  }

  async isSubscribed(channelId: string, userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { subscriberId_channelId: { subscriberId: userId, channelId } },
    });
    return !!sub;
  }

  async toggle(channelId: string, userId: string) {
    const subbed = await this.isSubscribed(channelId, userId);
    if (subbed) return this.unsubscribe(channelId, userId);
    return this.subscribe(channelId, userId);
  }

  async listMySubscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { subscriberId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatarUrl: true,
            isVerified: true,
            _count: { select: { subscribers: true, videos: true } },
          },
        },
      },
    });
  }

  async countSubscribers(channelId: string): Promise<number> {
    return this.prisma.subscription.count({ where: { channelId } });
  }
}
