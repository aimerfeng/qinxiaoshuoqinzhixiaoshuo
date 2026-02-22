import { Module, Global } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerService } from './logger/logger.service.js';
import { MetricsService } from './services/metrics.service.js';
import { ErrorTrackingService } from './services/error-tracking.service.js';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';
import { MetricsInterceptor } from './interceptors/metrics.interceptor.js';
import { HealthController } from './controllers/health.controller.js';

/**
 * 公共模块
 *
 * 提供全局服务：
 * - 结构化日志
 * - 性能监控
 * - 错误追踪
 * - 全局异常过滤
 * - 请求日志拦截
 */
@Global()
@Module({
  controllers: [HealthController],
  providers: [
    LoggerService,
    MetricsService,
    ErrorTrackingService,
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    // 全局日志拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // 全局性能指标拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [LoggerService, MetricsService, ErrorTrackingService],
})
export class CommonModule {}
