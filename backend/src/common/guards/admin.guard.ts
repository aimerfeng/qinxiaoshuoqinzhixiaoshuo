import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_ADMIN_KEY } from '../decorators/admin.decorator.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * 管理员权限守卫
 * 验证用户是否具有管理员权限（isAdmin 字段）
 * 
 * 需求18验收标准1: WHEN 运营人员登录后台 THEN System SHALL 验证权限并显示对应功能模块
 * 
 * 使用方式:
 * 1. 在控制器或方法上使用 @Admin() 装饰器
 * 2. 守卫会自动检查用户的 isAdmin 字段
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 检查是否需要管理员权限
    const isAdminRequired = this.reflector.getAllAndOverride<boolean>(
      IS_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 如果不需要管理员权限，直接放行
    if (!isAdminRequired) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('未提供认证令牌');
    }

    try {
      // 验证 JWT 令牌
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        sessionId: string;
      }>(token);

      // 查询用户信息，检查 isAdmin 字段
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const user = await (this.prisma as any).user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          isAdmin: true,
          isActive: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('用户不存在');
      }

      if (!user.isActive) {
        throw new ForbiddenException('账户已被禁用');
      }

      if (!user.isAdmin) {
        throw new ForbiddenException('需要管理员权限');
      }

      // 将用户信息附加到请求对象
      (request as any).user = {
        id: payload.sub,
        userId: payload.sub,
        email: payload.email,
        sessionId: payload.sessionId,
        isAdmin: user.isAdmin,
      };

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
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
