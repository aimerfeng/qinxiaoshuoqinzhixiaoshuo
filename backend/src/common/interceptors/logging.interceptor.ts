import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../logger/logger.service.js';

/**
 * HTTP 请求日志拦截器
 *
 * 功能：
 * 1. 记录所有 HTTP 请求的详细信息
 * 2. 记录请求处理时间
 * 3. 支持请求 ID 追踪
 * 4. 记录请求/响应体（可配置）
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new LoggerService().setContext('HTTP');

  // 配置
  private readonly logRequestBody = process.env.LOG_REQUEST_BODY === 'true';
  private readonly logResponseBody = process.env.LOG_RESPONSE_BODY === 'true';
  private readonly maxBodyLength = 1000; // 最大记录的 body 长度

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const requestId =
      (headers['x-request-id'] as string) || this.generateRequestId();
    const userId = (request as any).user?.id;

    // 设置请求 ID 到响应头
    response.setHeader('X-Request-Id', requestId);

    // 创建带上下文的日志器
    const logger = this.logger.child('HTTP');
    logger.setRequestId(requestId);
    if (userId) {
      logger.setUserId(userId);
    }

    // 开始计时
    const getElapsed = logger.startTimer();

    // 记录请求开始
    const requestData: Record<string, unknown> = {
      method,
      url,
      ip,
      userAgent: userAgent.substring(0, 200),
    };

    if (this.logRequestBody && request.body) {
      requestData.body = this.truncateBody(request.body);
    }

    logger.debug(`→ ${method} ${url}`, requestData);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = getElapsed();
          const statusCode = response.statusCode;

          const responseData: Record<string, unknown> = {
            statusCode,
            duration,
          };

          if (this.logResponseBody && data) {
            responseData.body = this.truncateBody(data);
          }

          logger.logRequest(method, url, statusCode, duration, responseData);
        },
        error: (error) => {
          const duration = getElapsed();
          const statusCode = error.status || 500;

          logger.error(`← ${method} ${url} ${statusCode}`, error.stack, {
            statusCode,
            duration,
            error: error.message,
          });
        },
      }),
    );
  }

  /**
   * 生成请求 ID
   */
  private generateRequestId(): string {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * 截断请求/响应体
   */
  private truncateBody(body: unknown): unknown {
    if (typeof body === 'string') {
      return body.length > this.maxBodyLength
        ? body.substring(0, this.maxBodyLength) + '...'
        : body;
    }

    if (typeof body === 'object' && body !== null) {
      const str = JSON.stringify(body);
      if (str.length > this.maxBodyLength) {
        return JSON.parse(
          str.substring(0, this.maxBodyLength) + '..."truncated"}',
        );
      }
      return body;
    }

    return body;
  }
}
