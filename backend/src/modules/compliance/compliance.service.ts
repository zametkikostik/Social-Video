import { Injectable, BadRequestException } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

export const POLICY_VERSION = '2026-09-17';

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  async recordConsent(data: {
    userId?: string;
    necessary?: boolean;
    analytics: boolean;
    marketing: boolean;
    preferences: boolean;
    region?: string;
    ip?: string;
    userAgent?: string;
  }) {
    const ipHash = data.ip
      ? createHash('sha256')
          .update(data.ip + (process.env.JWT_SECRET || ''))
          .digest('hex')
          .slice(0, 32)
      : undefined;
    return this.prisma.consentLog.create({
      data: {
        version: POLICY_VERSION,
        necessary: data.necessary !== false,
        analytics: !!data.analytics,
        marketing: !!data.marketing,
        preferences: !!data.preferences,
        region: data.region,
        ipHash,
        userAgent: data.userAgent?.slice(0, 400),
        userId: data.userId,
      },
    });
  }

  async latestConsent(userId: string) {
    return this.prisma.consentLog.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  policyMeta() {
    return {
      version: POLICY_VERSION,
      regions: {
        EU: ['GDPR', 'ePrivacy'],
        UK: ['UK GDPR', 'PECR'],
        BR: ['LGPD'],
        US_CA: ['CCPA/CPRA'],
        TR: ['KVKK'],
        TH: ['PDPA'],
      },
      rights: ['access', 'erasure', 'portability', 'withdraw_consent'],
      contact: process.env.PRIVACY_CONTACT_EMAIL || 'privacy@social.video',
    };
  }

  async requestDataAction(userId: string, type: 'EXPORT' | 'DELETE' | 'RECTIFY', note?: string) {
    if (!['EXPORT', 'DELETE', 'RECTIFY'].includes(type)) throw new BadRequestException('Invalid type');
    return this.prisma.dataRequest.create({ data: { userId, type, note, status: 'PENDING' } });
  }

  async exportUserData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, displayName: true, bio: true,
        createdAt: true, channels: true,
        videos: { select: { id: true, title: true, status: true, createdAt: true, views: true } },
        comments: { select: { id: true, text: true, createdAt: true, videoId: true } },
        consentLogs: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    return { exportedAt: new Date().toISOString(), policyVersion: POLICY_VERSION, data: user };
  }

  async anonymizeUser(userId: string) {
    const stamp = Date.now();
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${stamp}@anonymized.local`,
        username: `deleted_${stamp}`,
        displayName: 'Deleted User',
        bio: null, avatarUrl: null,
        passwordHash: createHash('sha256').update(String(stamp)).digest('hex'),
        payoutAddress: null, yoomoneyWallet: null, payeerAccount: null,
        apPrivateKey: null, apPublicKey: null,
      },
    });
  }
}
