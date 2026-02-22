import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * JWT 认证守卫
 * 验证请求中的 JWT 令牌，保护需要认证的路由
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('未提供认证令牌');
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

      return true;
    } catch {
      throw new UnauthorizedException('认证令牌无效或已过期');
    }
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
