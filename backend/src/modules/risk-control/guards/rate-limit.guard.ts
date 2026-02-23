import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimitService } from '../rate-limit.service.js';
import {
  RATE_LIMIT_KEY,
  type RateLimitOptions,
} from '../decorators/rate-limit.decorator.js';
import { RateLimitAction, DEFAULT_RATE_LIMITS } from '../dto/rate-limit.dto.js';

/**
 * 频率限制守卫
 *
 * 需求19: 风控与反作弊系统 - 频率限制服务
 *
 * 用于保护 API 端点，防止滥用和攻击。
 * 可以通过 @RateLimit() 装饰器配置限制参数。
 *
 * 使用示例:
 * ```typescript
 * @UseGuards(RateLimitGuard)
 * @RateLimit({ action: RateLimitAction.LOGIN, limit: 5, windowSeconds: 900 })
 * @Post('login')
 * async login() { ... }
 * ```
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取装饰器配置
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果没有配置，使用默认的 API 请求限制
    const config: RateLimitOptions = options ?? DEFAULT_RATE_LIMITS[RateLimitAction.API_REQUEST];

    const request = context.switchToHttp().getRequest<Request>();
    const identifier = this.getIdentifier(request, config);

    if (!identifier) {
      this.logger.warn('Could not determine rate limit identifier');
      return true;
    }

    const key = `${config.action}:${identifier}`;

    // 检查并增加计数
    const result = await this.rateLimitService.checkAndIncrement(
      key,
      config.limit,
      config.windowSeconds,
      config.blockDurationSeconds,
    );

    // 设置响应头
    const response = context.switchToHttp().getResponse<Response>();
    this.setRateLimitHeaders(response, result, config);

    if (!result.allowed) {
      const errorMessage = config.errorMessage ?? '请求过于频繁，请稍后再试';

      this.logger.warn(
        `Rate limit exceeded for ${key}: ${result.currentCount}/${config.limit}`,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: errorMessage,
          error: 'Too Many Requests',
          retryAfter: result.retryAfterSeconds,
          blocked: result.blocked,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * 获取限制标识符
   *
   * 根据配置决定使用用户ID、IP地址或两者组合
   */
  private getIdentifier(
    request: Request,
    config: RateLimitOptions,
  ): string | null {
    const userId = this.getUserId(request);
    const ip = this.getClientIp(request);

    // 如果配置了按用户限制且用户已登录
    if (config.perUser && userId) {
      if (config.perIp && ip) {
        return `${userId}:${ip}`;
      }
      return `user:${userId}`;
    }

    // 如果配置了按IP限制
    if (config.perIp && ip) {
      return `ip:${ip}`;
    }

    // 默认使用IP
    if (ip) {
      return `ip:${ip}`;
    }

    // 如果有用户ID，使用用户ID
    if (userId) {
      return `user:${userId}`;
    }

    return null;
  }

  /**
   * 从请求中获取用户ID
   */
  private getUserId(request: Request): string | null {
    // 从 JWT 认证中获取用户ID
    const user = (request as Request & { user?: Record<string, unknown> }).user;
    if (user && typeof user === 'object') {
      if ('id' in user && typeof user.id === 'string') {
        return user.id;
      }
      if ('userId' in user && typeof user.userId === 'string') {
        return user.userId;
      }
      if ('sub' in user && typeof user.sub === 'string') {
        return user.sub;
      }
    }
    return null;
  }

  /**
   * 从请求中获取客户端IP
   */
  private getClientIp(request: Request): string | null {
    // 优先使用代理头
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // 使用连接IP
    return request.ip ?? request.socket?.remoteAddress ?? null;
  }

  /**
   * 设置频率限制响应头
   */
  private setRateLimitHeaders(
    response: Response,
    result: {
      limit: number;
      remaining: number;
      resetAt: number;
      retryAfterSeconds: number;
    },
    config: RateLimitOptions,
  ): void {
    try {
      // 标准的频率限制响应头
      response.setHeader('X-RateLimit-Limit', result.limit.toString());
      response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
      response.setHeader('X-RateLimit-Reset', result.resetAt.toString());
      response.setHeader(
        'X-RateLimit-Policy',
        `${result.limit};w=${config.windowSeconds}`,
      );

      if (result.retryAfterSeconds > 0) {
        response.setHeader('Retry-After', result.retryAfterSeconds.toString());
      }
    } catch (error) {
      // 忽略设置头部失败的错误
      this.logger.debug(`Failed to set rate limit headers: ${String(error)}`);
    }
  }
}
