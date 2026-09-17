import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PUBLIC_READY = {
  status: 'READY' as const,
  visibility: 'PUBLIC' as const,
  moderationStatus: { in: ['APPROVED', 'SKIPPED_VERIFIED'] as const },
  isQuarantined: false,
};

@Injectable()
export class RecommendationsService {
  constructor(private prisma: PrismaService) {}

  async feed(limit = 24, offset = 0, userId?: string) {
    const videos = await this.prisma.video.findMany({
      where: { ...PUBLIC_READY, isShort: false },
      orderBy: [{ publishedAt: 'desc' }],
      take: 200,
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

    let subChannelIds = new Set<string>();
    if (userId) {
      const subs = await this.prisma.subscription.findMany({
        where: { subscriberId: userId },
        select: { channelId: true },
      });
      subChannelIds = new Set(subs.map((s) => s.channelId));
    }

    const now = Date.now();
    const scored = videos.map((v) => {
      const ageHours = Math.max(
        1,
        (now - new Date(v.publishedAt || v.createdAt).getTime()) / 3600000,
      );
      const recency = 100 / Math.sqrt(ageHours);
      const engagement = (v.views || 0) + (v.likesCount || 0) * 5;
      const subBoost = subChannelIds.has(v.channelId) ? 50 : 0;
      const score = engagement * 0.3 + recency * 2 + subBoost;
      return { ...v, _score: score };
    });

    scored.sort((a, b) => b._score - a._score);
    return scored.slice(offset, offset + limit).map(({ _score, ...v }) => v);
  }

  async related(videoId: string, limit = 12) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, title: true, channelId: true, isShort: true },
    });
    if (!video) return [];

    const keywords = this.extractKeywords(video.title);

    const [sameChannel, pool] = await Promise.all([
      this.prisma.video.findMany({
        where: {
          ...PUBLIC_READY,
          channelId: video.channelId,
          id: { not: videoId },
          isShort: video.isShort,
        },
        orderBy: { views: 'desc' },
        take: Math.ceil(limit / 2),
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
      }),
      this.prisma.video.findMany({
        where: {
          ...PUBLIC_READY,
          id: { not: videoId },
          isShort: video.isShort,
          ...(keywords.length
            ? {
                OR: keywords.map((k) => ({
                  title: { contains: k, mode: 'insensitive' as const },
                })),
              }
            : {}),
        },
        orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
        take: limit * 2,
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
      }),
    ]);

    const seen = new Set<string>([videoId]);
    const result: typeof sameChannel = [];

    for (const v of sameChannel) {
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      result.push(v);
    }
    for (const v of pool) {
      if (result.length >= limit) break;
      if (seen.has(v.id)) continue;
      seen.add(v.id);
      result.push(v);
    }

    if (result.length < limit) {
      const trending = await this.prisma.video.findMany({
        where: {
          ...PUBLIC_READY,
          id: { notIn: Array.from(seen) },
          isShort: video.isShort,
        },
        orderBy: { views: 'desc' },
        take: limit - result.length,
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
      result.push(...trending);
    }

    return result.slice(0, limit);
  }

  async trendingShorts(limit = 30) {
    return this.prisma.video.findMany({
      where: { ...PUBLIC_READY, isShort: true },
      orderBy: [{ views: 'desc' }, { publishedAt: 'desc' }],
      take: limit,
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

  private extractKeywords(title: string): string[] {
    const stop = new Set([
      'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'to', 'for', 'with',
      'и', 'в', 'на', 'с', 'по', 'для', 'как', 'это', 'из', 'от',
    ]);
    return title
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !stop.has(w))
      .slice(0, 5);
  }
}
