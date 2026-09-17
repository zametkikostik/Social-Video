import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type CreateNotificationInput = {
  type: 'LIKE' | 'COMMENT' | 'REPLY' | 'SUBSCRIBE' | 'LIVE' | 'VIDEO_READY' | 'SYSTEM';
  recipientId: string;
  actorId?: string;
  title: string;
  body?: string;
  link?: string;
  meta?: Record<string, unknown>;
};

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateNotificationInput) {
    if (data.actorId && data.actorId === data.recipientId) {
      return null;
    }

    return this.prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        body: data.body,
        link: data.link,
        meta: data.meta as any,
        recipientId: data.recipientId,
        actorId: data.actorId,
      },
    });
  }

  async list(userId: string, limit = 30, offset = 0, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: {
        recipientId: userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });
  }

  async unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
  }

  async markRead(id: string, userId: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Notification not found');
    if (n.recipientId !== userId) throw new ForbiddenException();

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  async remove(id: string, userId: string) {
    const n = await this.prisma.notification.findUnique({ where: { id } });
    if (!n) throw new NotFoundException('Notification not found');
    if (n.recipientId !== userId) throw new ForbiddenException();

    await this.prisma.notification.delete({ where: { id } });
    return { deleted: true };
  }

  async notifyLike(videoId: string, videoTitle: string, ownerId: string, actorId: string) {
    return this.create({
      type: 'LIKE',
      recipientId: ownerId,
      actorId,
      title: 'Новый лайк',
      body: `Ваше видео «${videoTitle}»`,
      link: `/watch/${videoId}`,
      meta: { videoId },
    });
  }

  async notifyComment(
    videoId: string,
    videoTitle: string,
    ownerId: string,
    actorId: string,
    commentPreview: string,
  ) {
    return this.create({
      type: 'COMMENT',
      recipientId: ownerId,
      actorId,
      title: 'Новый комментарий',
      body: `${commentPreview.slice(0, 80)} — на «${videoTitle}»`,
      link: `/watch/${videoId}`,
      meta: { videoId },
    });
  }

  async notifySubscribe(channelId: string, channelName: string, ownerId: string, actorId: string) {
    return this.create({
      type: 'SUBSCRIBE',
      recipientId: ownerId,
      actorId,
      title: 'Новый подписчик',
      body: `Подписался на канал «${channelName}»`,
      link: `/channel/${channelId}`,
      meta: { channelId },
    });
  }

  async notifyLive(channelId: string, streamId: string, title: string, subscriberIds: string[], actorId: string) {
    await Promise.all(
      subscriberIds.map((recipientId) =>
        this.create({
          type: 'LIVE',
          recipientId,
          actorId,
          title: 'Прямой эфир',
          body: title,
          link: `/live/${streamId}`,
          meta: { channelId, streamId },
        }),
      ),
    );
  }

  async notifyVideoReady(videoId: string, title: string, uploaderId: string) {
    return this.create({
      type: 'VIDEO_READY',
      recipientId: uploaderId,
      title: 'Видео готово',
      body: `«${title}» обработано и доступно`,
      link: `/watch/${videoId}`,
      meta: { videoId },
    });
  }
}
