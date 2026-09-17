import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private buckets = new Map<string, { count: number; reset: number }>();

  constructor(private config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const ttl = Number(this.config.get('RATE_LIMIT_TTL_MS') || 60_000);
    const max = Number(this.config.get('RATE_LIMIT_MAX') || 120);

    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      'unknown';
    const path = (req.route?.path || req.url || '').split('?')[0];
    const isAuth =
      path.includes('auth') || path.includes('login') || path.includes('register');
    const limit = isAuth ? Math.min(20, max) : max;

    const key = `${ip}:${isAuth ? 'auth' : 'api'}`;
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || now > bucket.reset) {
      bucket = { count: 0, reset: now + ttl };
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
