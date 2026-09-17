import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const ms = Date.now() - start;
      this.metrics.inc('http_requests_total', {
        method: req.method,
        status: String(res.statusCode),
      });
      this.metrics.observeMs('http_request_duration', ms, {
        method: req.method,
      });
    });
    next();
  }
}
