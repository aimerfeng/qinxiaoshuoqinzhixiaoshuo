import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../services/metrics.service.js';

/**
 * 性能指标收集拦截器
 *
 * 功能：
 * 1. 自动收集每个请求的响应时间
 * 2. 记录请求成功/失败状态
 * 3. 为 MetricsService 提供数据
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          this.metricsService.recordRequest(responseTime, true);
        },
        error: () => {
          const responseTime = Date.now() - startTime;
          this.metricsService.recordRequest(responseTime, false);
        },
      }),
    );
  }
}
