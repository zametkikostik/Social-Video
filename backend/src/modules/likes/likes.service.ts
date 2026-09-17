import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(private prisma: PrismaService) {}

  async like(videoId: string, userId: string) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const existing = await this.prisma.like.findUnique({
      where: { videoId_userId: { videoId, userId } },
    });
    if (existing) throw new ConflictException('Already liked');

    await this.prisma.$transaction([
      this.prisma.like.create({ data: { videoId, userId } }),
      this.prisma.video.update({
        where: { id: videoId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);

    return { liked: true };
  }

  async unlike(videoId: string, userId: string) {
    const existing = await this.prisma.like.findUnique({
      where: { videoId_userId: { videoId, userId } },
    });
    if (!existing) throw new NotFoundException('Like not found');

    await this.prisma.$transaction([
      this.prisma.like.delete({ where: { id: existing.id } }),
      this.prisma.video.update({
        where: { id: videoId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);

    return { liked: false };
  }

  async isLiked(videoId: string, userId: string): Promise<boolean> {
    const like = await this.prisma.like.findUnique({
      where: { videoId_userId: { videoId, userId } },
    });
    return !!like;
  }

  async toggle(videoId: string, userId: string) {
    const liked = await this.isLiked(videoId, userId);
    if (liked) return this.unlike(videoId, userId);
    return this.like(videoId, userId);
  }
}
