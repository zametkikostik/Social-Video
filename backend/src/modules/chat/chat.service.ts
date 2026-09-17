import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async saveMessage(data: {
    streamId: string;
    userId: string;
    text: string;
  }) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { id: data.streamId },
    });
    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.status !== 'LIVE' && stream.status !== 'IDLE') {
      throw new ForbiddenException('Chat only available during live stream');
    }

    const text = data.text.trim().slice(0, 500);
    if (!text) throw new ForbiddenException('Empty message');

    return this.prisma.liveChatMessage.create({
      data: {
        text,
        streamId: data.streamId,
        userId: data.userId,
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
  }

  async history(streamId: string, limit = 50) {
    return this.prisma.liveChatMessage
      .findMany({
        where: { streamId },
        orderBy: { createdAt: 'desc' },
        take: limit,
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
      })
      .then((rows) => rows.reverse());
  }

  async streamExists(streamId: string): Promise<boolean> {
    const s = await this.prisma.liveStream.findUnique({
      where: { id: streamId },
      select: { id: true },
    });
    return !!s;
  }
}
