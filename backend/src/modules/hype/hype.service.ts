import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const PACKS = [
  { id: 'spark', amount: 100, hours: 6, label: 'Spark' },
  { id: 'boost', amount: 300, hours: 24, label: 'Boost' },
  { id: 'rocket', amount: 1000, hours: 72, label: 'Rocket' },
];

@Injectable()
export class HypeService {
  constructor(private prisma: PrismaService) {}

  packs() {
    return PACKS;
  }

  async activeForVideo(videoId: string) {
    const now = new Date();
    const hypes = await this.prisma.videoHype.findMany({
      where: { videoId, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, username: true, displayName: true } } },
    });
    const score = hypes.reduce((s, h) => s + h.amount, 0);
    return { score, hypes, expiresAt: hypes[0]?.expiresAt || null };
  }

  async create(videoId: string, userId: string, packId: string) {
    const pack = PACKS.find((p) => p.id === packId);
    if (!pack) throw new BadRequestException('Invalid pack');
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video || video.status !== 'READY') throw new NotFoundException('Video not available');
    const expiresAt = new Date(Date.now() + pack.hours * 3600 * 1000);
    const hype = await this.prisma.videoHype.create({
      data: { videoId, userId, amount: pack.amount, hours: pack.hours, expiresAt },
    });
    const active = await this.activeForVideo(videoId);
    return { hype, pack, score: active.score };
  }
}
