import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ModerationStatus } from '@prisma/client';

export interface ModerationResult {
  status: ModerationStatus;
  score: number;
  labels: string[];
  reason?: string;
  provider: string;
  raw?: any;
  skippedBecauseVerified?: boolean;
}

@Injectable()
export class ModerationService {
  private readonly logger = new Logger(ModerationService.name);
  private readonly openaiKey?: string;
  private readonly threshold: number;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    this.openaiKey = this.config.get<string>('OPENAI_API_KEY');
    this.threshold = parseFloat(this.config.get('MODERATION_THRESHOLD') || '0.7');
  }

  async moderateText(
    text: string,
    options: {
      userId: string;
      isVerifiedUser: boolean;
      isVerifiedChannel?: boolean;
      targetType: 'video' | 'comment';
      videoId?: string;
      commentId?: string;
    },
  ): Promise<ModerationResult> {
    const isTrusted = options.isVerifiedUser || options.isVerifiedChannel;

    if (!text || text.trim().length === 0) {
      return this.approve('empty', isTrusted);
    }

    let result: ModerationResult;

    if (this.openaiKey) {
      result = await this.callOpenAIModeration(text);
    } else {
      result = this.localHeuristic(text);
    }

    if (isTrusted) {
      if (result.score >= this.threshold) {
        result = {
          ...result,
          status: ModerationStatus.SKIPPED_VERIFIED,
          reason: `Verified user — soft pass (score ${result.score.toFixed(2)}). Labels: ${result.labels.join(', ')}`,
          skippedBecauseVerified: true,
        };
      } else {
        result.status = ModerationStatus.APPROVED;
      }
    } else {
      if (result.score >= 0.9) {
        result.status = ModerationStatus.REJECTED;
      } else if (result.score >= this.threshold) {
        result.status = ModerationStatus.QUARANTINED;
      } else {
        result.status = ModerationStatus.APPROVED;
      }
    }

    await this.saveLog({
      targetType: options.targetType,
      action: this.mapStatusToAction(result.status),
      score: result.score,
      labels: result.labels,
      reason: result.reason,
      provider: result.provider,
      rawResponse: result.raw,
      videoId: options.videoId,
      commentId: options.commentId,
    });

    return result;
  }

  async applyToVideo(videoId: string, result: ModerationResult) {
    const data: any = {
      moderationStatus: result.status,
      moderationScore: result.score,
      moderationLabels: result.labels,
      moderationReason: result.reason,
      moderatedAt: new Date(),
    };

    if (result.status === ModerationStatus.REJECTED) {
      data.status = 'FAILED';
      data.visibility = 'PRIVATE';
      data.isQuarantined = true;
    } else if (result.status === ModerationStatus.QUARANTINED) {
      data.status = 'QUARANTINED';
      data.isQuarantined = true;
      data.visibility = 'PRIVATE';
    } else if (
      result.status === ModerationStatus.APPROVED ||
      result.status === ModerationStatus.SKIPPED_VERIFIED
    ) {
      data.isQuarantined = false;
    }

    return this.prisma.video.update({
      where: { id: videoId },
      data,
    });
  }

  async applyToComment(commentId: string, result: ModerationResult) {
    return this.prisma.comment.update({
      where: { id: commentId },
      data: {
        moderationStatus: result.status,
        moderationScore: result.score,
        moderationLabels: result.labels,
        isHidden:
          result.status === ModerationStatus.REJECTED ||
          result.status === ModerationStatus.QUARANTINED,
      },
    });
  }

  private async callOpenAIModeration(text: string): Promise<ModerationResult> {
    try {
      const res = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'omni-moderation-latest',
          input: text,
        }),
      });

      if (!res.ok) {
        this.logger.error(`OpenAI moderation failed: ${res.status}`);
        return this.localHeuristic(text);
      }

      const data = await res.json();
      const result = data.results?.[0];

      if (!result) {
        return this.approve('openai-empty', false);
      }

      const categories = result.categories || {};
      const scores = result.category_scores || {};

      const labels: string[] = [];
      let maxScore = 0;

      for (const [cat, flagged] of Object.entries(categories)) {
        if (flagged) labels.push(cat);
        const s = scores[cat] || 0;
        if (s > maxScore) maxScore = s;
      }

      return {
        status: ModerationStatus.PENDING,
        score: maxScore,
        labels,
        reason: labels.length ? `Flagged: ${labels.join(', ')}` : undefined,
        provider: 'openai',
        raw: result,
      };
    } catch (err) {
      this.logger.error('OpenAI moderation error', err);
      return this.localHeuristic(text);
    }
  }

  private localHeuristic(text: string): ModerationResult {
    const lower = text.toLowerCase();

    const toxicPatterns: { label: string; patterns: RegExp[]; weight: number }[] = [
      {
        label: 'hate',
        patterns: [/\b(убить|смерть|ненавижу|расист|нацист)\b/i, /\b(kill|hate|nazi|racist)\b/i],
        weight: 0.85,
      },
      {
        label: 'violence',
        patterns: [/\b(взорвать|террор|оружие|бомба)\b/i, /\b(bomb|terror|shoot|murder)\b/i],
        weight: 0.9,
      },
      {
        label: 'nsfw',
        patterns: [/\b(порно|секс|xxx|nsfw)\b/i],
        weight: 0.75,
      },
      {
        label: 'spam',
        patterns: [/(http|https|www\.){3,}/i, /(купи|скидка|бесплатно).{0,20}(ссылка|переходи)/i],
        weight: 0.6,
      },
    ];

    let maxScore = 0;
    const labels: string[] = [];

    for (const group of toxicPatterns) {
      for (const re of group.patterns) {
        if (re.test(lower)) {
          labels.push(group.label);
          if (group.weight > maxScore) maxScore = group.weight;
          break;
        }
      }
    }

    return {
      status: ModerationStatus.PENDING,
      score: maxScore,
      labels: [...new Set(labels)],
      reason: labels.length ? `Local heuristic: ${labels.join(', ')}` : undefined,
      provider: 'local-heuristic',
    };
  }

  private approve(reason: string, verified: boolean): ModerationResult {
    return {
      status: verified ? ModerationStatus.SKIPPED_VERIFIED : ModerationStatus.APPROVED,
      score: 0,
      labels: [],
      reason,
      provider: 'system',
      skippedBecauseVerified: verified,
    };
  }

  private mapStatusToAction(status: ModerationStatus): string {
    switch (status) {
      case ModerationStatus.APPROVED: return 'auto_approve';
      case ModerationStatus.REJECTED: return 'auto_reject';
      case ModerationStatus.QUARANTINED: return 'quarantine';
      case ModerationStatus.SKIPPED_VERIFIED: return 'skipped_verified';
      case ModerationStatus.MANUAL_REVIEW: return 'manual_review';
      default: return 'pending';
    }
  }

  private async saveLog(data: {
    targetType: string;
    action: string;
    score?: number;
    labels?: string[];
    reason?: string;
    provider?: string;
    rawResponse?: any;
    videoId?: string;
    commentId?: string;
    moderatorId?: string;
  }) {
    try {
      await this.prisma.moderationLog.create({
        data: {
          targetType: data.targetType,
          action: data.action,
          score: data.score,
          labels: data.labels || [],
          reason: data.reason,
          provider: data.provider,
          rawResponse: data.rawResponse || undefined,
          videoId: data.videoId,
          commentId: data.commentId,
          moderatorId: data.moderatorId,
        },
      });
    } catch (err) {
      this.logger.error('Failed to save moderation log', err);
    }
  }
}
