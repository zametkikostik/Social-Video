import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class VideosService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private moderation: ModerationService,
  ) {}

  async create(data: {
    title: string;
    description?: string;
    channelId: string;
    uploaderId: string;
    originalKey: string;
    isShort?: boolean;
  }) {
    const [user, channel] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: data.uploaderId } }),
      this.prisma.channel.findUnique({ where: { id: data.channelId } }),
    ]);

    if (!user || !channel) {
      throw new NotFoundException('User or channel not found');
    }

    if (channel.ownerId !== data.uploaderId) {
      throw new ForbiddenException('You do not own this channel');
    }

    const slug = this.generateSlug(data.title);

    const video = await this.prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        slug,
        channelId: data.channelId,
        uploaderId: data.uploaderId,
        originalKey: data.originalKey,
        status: 'PROCESSING',
        isShort: data.isShort || false,
        moderationStatus: 'PENDING',
      },
    });

    const textToCheck = `${data.title}\n${data.description || ''}`;
    const modResult = await this.moderation.moderateText(textToCheck, {
      userId: data.uploaderId,
      isVerifiedUser: user.isVerified,
      isVerifiedChannel: channel.isVerified,
      targetType: 'video',
      videoId: video.id,
    });

    const updated = await this.moderation.applyToVideo(video.id, modResult);

    return {
      ...updated,
      moderation: {
        status: modResult.status,
        score: modResult.score,
        labels: modResult.labels,
        skippedBecauseVerified: modResult.skippedBecauseVerified || false,
      },
    };
  }

  async findById(id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        uploader: {
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

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (
      video.moderationStatus === 'REJECTED' ||
      video.moderationStatus === 'QUARANTINED'
    ) {
      throw new NotFoundException('Video not found');
    }

    let hlsUrl: string | null = null;
    let thumbnailUrl: string | null = null;

    if (video.hlsMasterKey) {
      hlsUrl = await this.storage.getPlaybackUrl(video.hlsMasterKey);
    }
    if (video.thumbnailKey) {
      thumbnailUrl = await this.storage.getPlaybackUrl(video.thumbnailKey);
    }

    return {
      ...video,
      hlsUrl,
      thumbnailUrl,
    };
  }

  async listPublic(limit = 20, offset = 0) {
    return this.prisma.video.findMany({
      where: {
        status: 'READY',
        visibility: 'PUBLIC',
        moderationStatus: {
          in: ['APPROVED', 'SKIPPED_VERIFIED'],
        },
        isQuarantined: false,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        channel: {
          select: {
            id: true,
            name: true,
            slug: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });
  }

  private generateSlug(title: string): string {
    const base = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
    const suffix = Math.random().toString(36).slice(2, 8);
    return `${base}-${suffix}`;
  }
}
