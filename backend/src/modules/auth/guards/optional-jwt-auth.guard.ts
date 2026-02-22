import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * 可选 JWT 认证守卫
 * 如果提供了有效的 JWT 令牌，则解析用户信息
 * 如果没有提供或令牌无效，则继续执行但不设置用户信息
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      // 没有令牌，继续执行但不设置用户
      return true;
    }

    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        sessionId: string;
      }>(token);

      // 将用户信息附加到请求对象
      (request as any).user = {
        id: payload.sub,
        userId: payload.sub,
        email: payload.email,
        sessionId: payload.sessionId,
      };
    } catch {
      // 令牌无效，继续执行但不设置用户
    }

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
