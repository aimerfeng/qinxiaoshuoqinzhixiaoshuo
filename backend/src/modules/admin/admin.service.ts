import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionService } from '../../redis/session.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { AdminLogService } from './admin-log.service.js';

/**
 * 管理员用户信息接口
 */
export interface AdminUser {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  isAdmin: boolean;
  avatar: string | null;
}

/**
 * 管理员登录响应接口
 */
export interface AdminLoginResponse {
  accessToken: string;
  refreshToken: string;
  admin: AdminUser;
}

/**
 * 管理后台服务
 * 处理管理员认证和管理功能
 * 
 * 需求18验收标准1: WHEN 运营人员登录后台 THEN System SHALL 验证权限并显示对应功能模块
 */
@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly refreshTokenTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly adminLogService: AdminLogService,
  ) {
    this.refreshTokenTtlSeconds = 7 * 24 * 60 * 60; // 7 days
  }

  /**
   * 管理员登录
   * 验证用户凭据并检查管理员权限
   * 
   * @param loginDto 登录信息
   * @param ipAddress 请求IP地址
   * @param userAgent 用户代理
   * @returns 登录结果（包含 JWT 令牌和管理员信息）
   */
  async login(
    loginDto: AdminLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AdminLoginResponse> {
    const { email, password } = loginDto;
    const normalizedEmail = email.toLowerCase();

    // 检查账户是否被锁定
    const isLocked = await this.sessionService.isAccountLocked(normalizedEmail);
    if (isLocked) {
      const remainingSeconds =
        await this.sessionService.getAccountLockoutRemaining(normalizedEmail);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);
      throw new ForbiddenException(
        `账户已被临时锁定，请在 ${remainingMinutes} 分钟后重试`,
      );
    }

    // 查找用户
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        passwordHash: true,
        isAdmin: true,
        isActive: true,
        avatar: true,
      },
    });

    if (!user) {
      await this.sessionService.trackLoginAttempt(normalizedEmail);
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 检查是否为管理员
    if (!user.isAdmin) {
      // 记录非管理员尝试登录管理后台
      this.adminLogService.logAction({
        adminId: user.id,
        actionType: 'ADMIN_LOGIN_ATTEMPT_DENIED',
        targetType: 'USER',
        targetId: user.id,
        description: `非管理员用户 ${user.email} 尝试登录管理后台`,
        ipAddress,
        userAgent,
      });
      throw new ForbiddenException('您没有管理员权限');
    }

    // 检查账户是否激活
    if (!user.isActive) {
      throw new ForbiddenException('账户已被禁用，请联系超级管理员');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const attempts =
        await this.sessionService.trackLoginAttempt(normalizedEmail);
      const remainingAttempts = 5 - attempts;

      if (remainingAttempts > 0) {
        throw new UnauthorizedException(
          `邮箱或密码错误，还剩 ${remainingAttempts} 次尝试机会`,
        );
      } else {
        throw new ForbiddenException('账户已被临时锁定，请在 15 分钟后重试');
      }
    }

    // 登录成功，清除登录尝试记录
    await this.sessionService.clearLoginAttempts(normalizedEmail);

    // 创建会话
    const session = await this.sessionService.createSession({
      userId: user.id,
      deviceInfo: `Admin Panel - ${userAgent || 'Unknown'}`,
    });

    // 生成 JWT Access Token（有效期24小时）
    // 包含 isAdmin 声明用于管理后台验证
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        sessionId: session.sessionId,
        isAdmin: true, // 管理员特有声明
      },
      { expiresIn: 24 * 60 * 60 },
    );

    // 生成 Refresh Token（有效期7天）
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        sessionId: session.sessionId,
        type: 'refresh',
        isAdmin: true,
      },
      { expiresIn: 7 * 24 * 60 * 60 },
    );

    // 存储 Refresh Token 到 Redis
    await this.sessionService.storeRefreshToken(
      refreshToken,
      user.id,
      session.sessionId,
      this.refreshTokenTtlSeconds,
    );

    // 记录管理员登录日志
    this.adminLogService.logAction({
      adminId: user.id,
      actionType: 'ADMIN_LOGIN',
      targetType: 'USER',
      targetId: user.id,
      description: `管理员 ${user.email} 登录管理后台`,
      ipAddress,
      userAgent,
    });

    this.logger.log(`Admin logged in successfully: ${user.id}`);

    return {
      accessToken,
      refreshToken,
      admin: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
      },
    };
  }

  /**
   * 验证管理员身份
   * 用于检查当前用户是否为管理员
   * 
   * @param userId 用户ID
   * @returns 是否为管理员
   */
  async verifyAdmin(userId: string): Promise<boolean> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: { isAdmin: true, isActive: true },
    });

    return user?.isAdmin === true && user?.isActive === true;
  }

  /**
   * 获取管理员信息
   * 
   * @param userId 用户ID
   * @returns 管理员信息
   */
  async getAdminProfile(userId: string): Promise<AdminUser | null> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        isAdmin: true,
        avatar: true,
      },
    });

    if (!user || !user.isAdmin) {
      return null;
    }

    return user;
  }
}
