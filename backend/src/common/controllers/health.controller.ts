import { Controller, Get } from '@nestjs/common';
import { MetricsService, HealthStatus } from '../services/metrics.service.js';
import {
  ErrorTrackingService,
  ErrorStats,
} from '../services/error-tracking.service.js';

/**
 * 健康检查和监控控制器
 *
 * 提供系统健康状态和性能指标的 API 端点
 */
@Controller('health')
export class HealthController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly errorTrackingService: ErrorTrackingService,
  ) {}

  /**
   * 基础健康检查
   * GET /api/v1/health
   */
  @Get()
  async check(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 详细健康状态
   * GET /api/v1/health/status
   */
  @Get('status')
  async getStatus(): Promise<HealthStatus> {
    return this.metricsService.getHealthStatus();
  }

  /**
   * 系统指标
   * GET /api/v1/health/metrics
   */
  @Get('metrics')
  async getMetrics(): Promise<{
    request: unknown;
    system: unknown;
    database: unknown;
    redis: unknown;
  }> {
    const [databaseMetrics, redisMetrics] = await Promise.all([
      this.metricsService.getDatabaseMetrics(),
      this.metricsService.getRedisMetrics(),
    ]);

    return {
      request: this.metricsService.getRequestMetrics(),
      system: this.metricsService.getSystemMetrics(),
      database: databaseMetrics,
      redis: redisMetrics,
    };
  }

  /**
   * 错误统计
   * GET /api/v1/health/errors
   */
  @Get('errors')
  async getErrors(): Promise<ErrorStats> {
    return this.errorTrackingService.getErrorStats();
  }

  /**
   * 存活探针（Kubernetes liveness probe）
   * GET /api/v1/health/live
   */
  @Get('live')
  async liveness(): Promise<{ status: string }> {
    return { status: 'alive' };
  }

  /**
   * 就绪探针（Kubernetes readiness probe）
   * GET /api/v1/health/ready
   */
  @Get('ready')
  async readiness(): Promise<{ status: string; ready: boolean }> {
    const health = await this.metricsService.getHealthStatus();
    const ready = health.services.database && health.services.redis;

    return {
      status: ready ? 'ready' : 'not_ready',
      ready,
    };
  }
}
