import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class LiveService {
  private readonly rtmpBase: string;
  private readonly hlsBase: string;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.rtmpBase =
      this.config.get('LIVE_RTMP_URL') || 'rtmp://localhost:1935/live';
    this.hlsBase =
      this.config.get('LIVE_HLS_BASE') || 'http://localhost:8080/live';
  }

  private generateStreamKey(): string {
    return randomBytes(24).toString('hex');
  }

  async create(data: {
    title: string;
    description?: string;
    channelId: string;
    userId: string;
  }) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: data.channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');
    if (channel.ownerId !== data.userId) {
      throw new ForbiddenException('Not your channel');
    }

    const existing = await this.prisma.liveStream.findFirst({
      where: {
        channelId: data.channelId,
        status: { in: ['IDLE', 'STARTING', 'LIVE'] },
      },
    });
    if (existing) {
      throw new ConflictException(
        'Channel already has an active stream. End it first.',
      );
    }

    const streamKey = this.generateStreamKey();

    const stream = await this.prisma.liveStream.create({
      data: {
        title: data.title,
        description: data.description,
        streamKey,
        channelId: data.channelId,
        userId: data.userId,
        status: 'IDLE',
      },
      include: {
        channel: {
          select: { id: true, name: true, slug: true, avatarUrl: true },
        },
      },
    });

    return {
      ...stream,
      ingest: {
        rtmpUrl: this.rtmpBase,
        streamKey,
        fullUrl: `${this.rtmpBase}/${streamKey}`,
      },
      playback: {
        hlsUrl: `${this.hlsBase}/${streamKey}/index.m3u8`,
      },
    };
  }

  async getById(id: string, requesterId?: string) {
    const stream = await this.prisma.liveStream.findUnique({
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
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            isVerified: true,
          },
        },
      },
    });
    if (!stream) throw new NotFoundException('Stream not found');

    const isOwner = requesterId === stream.userId;
    const hlsUrl = `${this.hlsBase}/${stream.streamKey}/index.m3u8`;

    return {
      ...stream,
      streamKey: isOwner ? stream.streamKey : undefined,
      ingest: isOwner
        ? {
            rtmpUrl: this.rtmpBase,
            streamKey: stream.streamKey,
            fullUrl: `${this.rtmpBase}/${stream.streamKey}`,
          }
        : undefined,
      playback: { hlsUrl },
      hlsUrl,
    };
  }

  async listLive(limit = 20, offset = 0) {
    return this.prisma.liveStream.findMany({
      where: { status: 'LIVE' },
      orderBy: { viewers: 'desc' },
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

  async listMy(userId: string) {
    return this.prisma.liveStream.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markLive(streamKey: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { streamKey },
    });
    if (!stream) throw new NotFoundException('Invalid stream key');

    return this.prisma.liveStream.update({
      where: { id: stream.id },
      data: {
        status: 'LIVE',
        startedAt: stream.startedAt || new Date(),
        hlsUrl: `${this.hlsBase}/${streamKey}/index.m3u8`,
      },
    });
  }

  async markEnded(streamKey: string) {
    const stream = await this.prisma.liveStream.findUnique({
      where: { streamKey },
    });
    if (!stream) throw new NotFoundException('Invalid stream key');

    return this.prisma.liveStream.update({
      where: { id: stream.id },
      data: {
        status: 'ENDED',
        endedAt: new Date(),
      },
    });
  }

  async end(id: string, userId: string) {
    const stream = await this.prisma.liveStream.findUnique({ where: { id } });
    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.userId !== userId) {
      throw new ForbiddenException('Not your stream');
    }

    return this.prisma.liveStream.update({
      where: { id },
      data: { status: 'ENDED', endedAt: new Date() },
    });
  }

  async regenerateKey(id: string, userId: string) {
    const stream = await this.prisma.liveStream.findUnique({ where: { id } });
    if (!stream) throw new NotFoundException('Stream not found');
    if (stream.userId !== userId) {
      throw new ForbiddenException('Not your stream');
    }
    if (stream.status === 'LIVE') {
      throw new ConflictException('Cannot rotate key while LIVE');
    }

    const streamKey = this.generateStreamKey();
    return this.prisma.liveStream.update({
      where: { id },
      data: { streamKey, status: 'IDLE' },
    });
  }

  async validateKey(streamKey: string): Promise<boolean> {
    const stream = await this.prisma.liveStream.findUnique({
      where: { streamKey },
    });
    if (!stream) return false;
    if (stream.status === 'ENDED') return false;
    return true;
  }

  async bumpViewers(id: string, delta = 1) {
    const stream = await this.prisma.liveStream.update({
      where: { id },
      data: { viewers: { increment: delta } },
    });
    if (stream.viewers > stream.peakViewers) {
      await this.prisma.liveStream.update({
        where: { id },
        data: { peakViewers: stream.viewers },
      });
    }
    return stream;
  }
}
