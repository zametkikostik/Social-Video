import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    name: string;
    description?: string;
    ownerId: string;
  }) {
    const slug = this.generateSlug(data.name);

    const existing = await this.prisma.channel.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException('Channel slug already exists');
    }

    return this.prisma.channel.create({
      data: {
        name: data.name,
        slug,
        description: data.description,
        ownerId: data.ownerId,
      },
    });
  }

  async findBySlug(slug: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { slug },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        _count: {
          select: {
            videos: true,
            subscribers: true,
          },
        },
      },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    return channel;
  }

  async listByOwner(ownerId: string) {
    return this.prisma.channel.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listVideos(slug: string, limit = 20, offset = 0) {
    const channel = await this.prisma.channel.findUnique({ where: { slug } });
    if (!channel) throw new NotFoundException('Channel not found');

    return this.prisma.video.findMany({
      where: {
        channelId: channel.id,
        status: 'READY',
        visibility: 'PUBLIC',
        moderationStatus: { in: ['APPROVED', 'SKIPPED_VERIFIED'] },
        isQuarantined: false,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnailKey: true,
        duration: true,
        views: true,
        isShort: true,
        publishedAt: true,
        likesCount: true,
      },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50);
  }
}
