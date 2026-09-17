import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(RateLimitGuard.name);
  private redis: Redis | null = null;
  private buckets = new Map<string, { count: number; reset: number }>();

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('REDIS_URL');
    if (!url) return;
    try {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableReadyCheck: true,
        lazyConnect: true,
      });
      this.redis.connect().catch((e) => {
        this.logger.warn(`Redis rate-limit unavailable: ${e.message}`);
        this.redis = null;
      });
      this.logger.log('Rate limit using Redis');
    } catch (e: any) {
      this.logger.warn(`Redis init failed: ${e.message}`);
      this.redis = null;
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ttlMs = Number(this.config.get('RATE_LIMIT_TTL_MS') || 60_000);
    const max = Number(this.config.get('RATE_LIMIT_MAX') || 120);
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const path = (req.route?.path || req.url || '').split('?')[0];
    const isAuth = /auth|login|register/i.test(path) || path.includes('/auth/');
    const isUpload = /upload|storage/i.test(path);
    let limit = max;
    if (isAuth) limit = Math.min(20, max);
    if (isUpload) limit = Math.min(30, max);

    const key = `rl:${isAuth ? 'auth' : isUpload ? 'up' : 'api'}:${ip}`;

    if (this.redis) {
      try {
        const count = await this.redis.incr(key);
        if (count === 1) await this.redis.expire(key, ttlSec);
        if (count > limit) {
          throw new HttpException(
            { statusCode: 429, message: 'Too many requests' },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
        return true;
      } catch (e: any) {
        if (e instanceof HttpException) throw e;
        this.logger.warn(`Redis rate-limit error, fallback memory: ${e.message}`);
      }
    }

    return this.memoryLimit(key, limit, ttlMs);
  }

  private memoryLimit(key: string, limit: number, ttlMs: number): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || now > bucket.reset) {
      bucket = { count: 0, reset: now + ttlMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (this.buckets.size > 50_000) {
      for (const [k, v] of this.buckets) {
        if (now > v.reset) this.buckets.delete(k);
      }
    }
    if (bucket.count > limit) {
      throw new HttpException(
        { statusCode: 429, message: 'Too many requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
