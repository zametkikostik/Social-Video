import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CommunityService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    channelId: string;
    authorId: string;
    text: string;
    imageUrl?: string;
    videoId?: string;
  }) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: data.channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.ownerId !== data.authorId) {
      throw new ForbiddenException('Only channel owner can post');
    }

    if (data.videoId) {
      const video = await this.prisma.video.findUnique({
        where: { id: data.videoId },
      });
      if (!video || video.channelId !== data.channelId) {
        throw new NotFoundException('Video not found on this channel');
      }
    }

    return this.prisma.communityPost.create({
      data: {
        text: data.text,
        imageUrl: data.imageUrl,
        videoId: data.videoId,
        channelId: data.channelId,
        authorId: data.authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        channel: {
          select: { id: true, name: true, slug: true, avatarUrl: true },
        },
      },
    });
  }

  async listByChannel(channelId: string, limit = 20, offset = 0) {
    return this.prisma.communityPost.findMany({
      where: { channelId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        author: {
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

  async listByChannelSlug(slug: string, limit = 20, offset = 0) {
    const channel = await this.prisma.channel.findUnique({ where: { slug } });
    if (!channel) throw new NotFoundException('Channel not found');
    return this.listByChannel(channel.id, limit, offset);
  }

  async getById(id: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
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
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async delete(id: string, userId: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    if (post.authorId !== userId) {
      throw new ForbiddenException('Not your post');
    }
    await this.prisma.communityPost.delete({ where: { id } });
    return { deleted: true };
  }

  async like(id: string) {
    return this.prisma.communityPost.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
      select: { id: true, likesCount: true },
    });
  }
}
