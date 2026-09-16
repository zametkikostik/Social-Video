import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class VideosService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  async create(data: {
    title: string;
    description?: string;
    channelId: string;
    uploaderId: string;
    originalKey: string;
    isShort?: boolean;
  }) {
    const slug = this.generateSlug(data.title);

    return this.prisma.video.create({
      data: {
        title: data.title,
        description: data.description,
        slug,
        channelId: data.channelId,
        uploaderId: data.uploaderId,
        originalKey: data.originalKey,
        status: 'PROCESSING',
        isShort: data.isShort || false,
      },
    });
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
          },
        },
        uploader: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!video) {
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
