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

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50);
  }
}
