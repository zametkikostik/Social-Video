import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ModerationService } from '../moderation/moderation.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private moderation: ModerationService,
  ) {}

  async create(data: {
    videoId: string;
    userId: string;
    text: string;
    parentId?: string;
  }) {
    const video = await this.prisma.video.findUnique({ where: { id: data.videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const user = await this.prisma.user.findUnique({ where: { id: data.userId } });
    if (!user) throw new NotFoundException('User not found');

    if (data.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: data.parentId } });
      if (!parent || parent.videoId !== data.videoId) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        text: data.text,
        videoId: data.videoId,
        userId: data.userId,
        parentId: data.parentId,
        moderationStatus: 'PENDING',
      },
      include: {
        user: {
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

    const modResult = await this.moderation.moderateText(data.text, {
      userId: data.userId,
      isVerifiedUser: user.isVerified,
      targetType: 'comment',
      commentId: comment.id,
    });

    await this.moderation.applyToComment(comment.id, modResult);

    if (
      modResult.status === 'APPROVED' ||
      modResult.status === 'SKIPPED_VERIFIED'
    ) {
      await this.prisma.video.update({
        where: { id: data.videoId },
        data: { commentsCount: { increment: 1 } },
      });
    }

    return {
      ...comment,
      moderationStatus: modResult.status,
      isHidden:
        modResult.status === 'REJECTED' || modResult.status === 'QUARANTINED',
      moderation: {
        status: modResult.status,
        score: modResult.score,
        labels: modResult.labels,
        skippedBecauseVerified: modResult.skippedBecauseVerified || false,
      },
    };
  }

  async listByVideo(videoId: string, limit = 50, offset = 0) {
    return this.prisma.comment.findMany({
      where: {
        videoId,
        parentId: null,
        isHidden: false,
        moderationStatus: { in: ['APPROVED', 'SKIPPED_VERIFIED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        replies: {
          where: {
            isHidden: false,
            moderationStatus: { in: ['APPROVED', 'SKIPPED_VERIFIED'] },
          },
          orderBy: { createdAt: 'asc' },
          take: 20,
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
          },
        },
      },
    });
  }

  async delete(commentId: string, userId: string, isMod = false) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    if (!isMod && comment.userId !== userId) {
      throw new ForbiddenException('Not your comment');
    }

    await this.prisma.comment.delete({ where: { id: commentId } });

    if (!comment.isHidden) {
      await this.prisma.video.update({
        where: { id: comment.videoId },
        data: { commentsCount: { decrement: 1 } },
      });
    }

    return { deleted: true };
  }
}
