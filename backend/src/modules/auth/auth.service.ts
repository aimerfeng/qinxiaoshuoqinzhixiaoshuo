import {
  Injectable,
  ConflictException,
  Logger,
  InternalServerErrorException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { EmailVerificationService } from './email-verification.service.js';
import { SessionService } from '../../redis/session.service.js';
import { DeviceFingerprintService } from './device-fingerprint.service.js';

/**
 * 注册响应接口
 */
export interface RegisterResponse {
  userId: string;
  message: string;
}

/**
 * 用户简要信息接口
 */
export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  isEmailVerified: boolean;
  avatar: string | null;
}

/**
 * 登录响应接口
 * 需求1验收标准2: 生成会话令牌并授予访问权限
 * NFR-3: 会话令牌使用JWT，有效期24小时，支持刷新
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserProfile;
  isNewDevice: boolean;
  emailVerificationWarning?: string;
}

/**
 * Token 刷新响应接口
 * 需求1验收标准4: WHEN 会话令牌过期 THEN System SHALL 要求用户重新认证
 * NFR-3: 会话令牌使用JWT，有效期24小时，支持刷新
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * 登出响应接口
 */
export interface LogoutResponse {
  message: string;
  sessionsRevoked?: number;
}

/**
 * 用户数据接口
 */
interface UserData {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  passwordHash: string;
  isEmailVerified: boolean;
  isActive: boolean;
  profile?: {
    avatar: string | null;
  } | null;
}

/**
 * 认证服务
 * 处理用户注册、登录、会话管理等认证相关业务逻辑
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptCostFactor: number;
  private readonly refreshTokenTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
    private readonly deviceFingerprintService: DeviceFingerprintService,
  ) {
    // bcrypt cost factor >= 12 (NFR-3 安全要求)
    this.bcryptCostFactor = 12;
    // 将 7d 转换为秒
    this.refreshTokenTtlSeconds = 7 * 24 * 60 * 60;
  }

  /**
   * 用户注册
   * 需求1验收标准1: WHEN 用户提交有效的邮箱和密码进行注册 THEN System SHALL 创建新账户并发送验证邮件
   *
   * @param registerDto 注册信息
   * @returns 注册结果
   */
  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const { email, password, username, displayName } = registerDto;

    // 检查邮箱是否已存在
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const existingUserByEmail = await (this.prisma as any).user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUserByEmail) {
      throw new ConflictException('该邮箱已被注册');
    }

    // 检查用户名是否已存在
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const existingUserByUsername = await (this.prisma as any).user.findUnique({
      where: { username },
    });

    if (existingUserByUsername) {
      throw new ConflictException('该用户名已被使用');
    }

    // 使用 bcrypt 加密密码 (cost factor >= 12)
    const passwordHash = await this.hashPassword(password);

    try {
      // 创建用户
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const user: UserData = await (this.prisma as any).user.create({
        data: {
          email: email.toLowerCase(),
          username,
          passwordHash,
          displayName: displayName || username,
          isEmailVerified: false,
          isActive: true,
        },
      });

      // 创建用户资料
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).userProfile.create({
        data: {
          userId: user.id,
        },
      });

      // 生成验证令牌并发送验证邮件
      const verificationToken =
        await this.emailVerificationService.generateVerificationToken(
          user.id,
          user.email,
        );
      this.emailVerificationService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.id,
      );

      this.logger.log(`User registered successfully: ${user.id}`);

      return {
        userId: user.id,
        message: '注册成功，验证邮件已发送到您的邮箱',
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Registration failed: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException('注册失败，请稍后重试');
    }
  }

  /**
   * 使用 bcrypt 加密密码
   * NFR-3 安全要求: 用户密码使用bcrypt（cost factor >= 12）加密存储
   *
   * @param password 明文密码
   * @returns 加密后的密码哈希
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptCostFactor);
  }

  /**
   * 验证密码
   *
   * @param password 明文密码
   * @param hash 密码哈希
   * @returns 是否匹配
   */
  private async verifyPassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 用户登录
   * 需求1验收标准2: WHEN 用户使用已验证的凭据登录 THEN System SHALL 生成会话令牌并授予访问权限
   * 需求1验收标准5: IF 用户连续5次登录失败 THEN System SHALL 临时锁定账户15分钟
   * NFR-3: 会话令牌使用JWT，有效期24小时，支持刷新
   *
   * @param loginDto 登录信息
   * @returns 登录结果（包含 JWT 令牌和用户信息）
   */
  async login(loginDto: LoginDto): Promise<LoginResponse> {
    const { email, password, deviceFingerprint } = loginDto;
    const normalizedEmail = email.toLowerCase();

    // 检查账户是否被锁定（需求1验收标准5）
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
    const user: UserData | null = await (this.prisma as any).user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: {
          select: { avatar: true },
        },
      },
    });

    if (!user) {
      // 追踪登录失败尝试
      await this.sessionService.trackLoginAttempt(normalizedEmail);
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 检查账户是否激活
    if (!user.isActive) {
      throw new ForbiddenException('账户已被禁用，请联系客服');
    }

    // 验证密码
    const isPasswordValid = await this.verifyPassword(
      password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      // 追踪登录失败尝试
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

    // 记录设备指纹并检测是否为新设备（需求19: 风控与反作弊系统）
    let isNewDevice = true;
    if (deviceFingerprint) {
      isNewDevice = await this.deviceFingerprintService.recordDeviceFingerprint(
        {
          userId: user.id,
          fingerprint: deviceFingerprint,
          // TODO: 从请求中获取 userAgent 和 ipAddress
        },
      );
    }

    // 创建会话
    const session = await this.sessionService.createSession({
      userId: user.id,
      deviceInfo: deviceFingerprint,
    });

    // 生成 JWT Access Token（有效期24小时）
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        sessionId: session.sessionId,
      },
      { expiresIn: 24 * 60 * 60 }, // 24 hours in seconds
    );

    // 生成 Refresh Token（有效期7天）
    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        sessionId: session.sessionId,
        type: 'refresh',
      },
      { expiresIn: 7 * 24 * 60 * 60 }, // 7 days in seconds
    );

    // 存储 Refresh Token 到 Redis
    await this.sessionService.storeRefreshToken(
      refreshToken,
      user.id,
      session.sessionId,
      this.refreshTokenTtlSeconds,
    );

    this.logger.log(`User logged in successfully: ${user.id}`);

    // 构建响应
    const response: LoginResponse = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        isEmailVerified: user.isEmailVerified,
        avatar: user.profile?.avatar || null,
      },
      isNewDevice,
    };

    // 如果邮箱未验证，添加警告信息
    if (!user.isEmailVerified) {
      response.emailVerificationWarning =
        '您的邮箱尚未验证，部分功能可能受限。请检查您的邮箱并完成验证。';
    }

    return response;
  }

  /**
   * 刷新访问令牌
   * 需求1验收标准4: WHEN 会话令牌过期 THEN System SHALL 要求用户重新认证
   * NFR-3: 会话令牌使用JWT，有效期24小时，支持刷新
   *
   * @param refreshToken 刷新令牌
   * @returns 新的访问令牌和刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    // 验证刷新令牌在 Redis 中是否存在
    const tokenData =
      await this.sessionService.validateRefreshToken(refreshToken);
    if (!tokenData) {
      throw new UnauthorizedException('刷新令牌无效或已过期，请重新登录');
    }

    const { userId, sessionId } = tokenData;

    // 验证 JWT 签名
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        sessionId: string;
        type: string;
      }>(refreshToken);

      // 验证令牌类型
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的令牌类型');
      }

      // 验证用户 ID 和会话 ID 是否匹配
      if (payload.sub !== userId || payload.sessionId !== sessionId) {
        throw new UnauthorizedException('令牌数据不匹配');
      }
    } catch (error: unknown) {
      // JWT 验证失败（过期或签名无效）
      await this.sessionService.revokeRefreshToken(refreshToken);
      throw new UnauthorizedException('刷新令牌无效或已过期，请重新登录');
    }

    // 检查用户是否仍然存在且处于活跃状态
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user: UserData | null = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        passwordHash: true,
        isEmailVerified: true,
        isActive: true,
      },
    });

    if (!user) {
      await this.sessionService.revokeRefreshToken(refreshToken);
      throw new UnauthorizedException('用户不存在');
    }

    if (!user.isActive) {
      await this.sessionService.revokeRefreshToken(refreshToken);
      throw new ForbiddenException('账户已被禁用，请联系客服');
    }

    // 检查会话是否仍然有效
    const session = await this.sessionService.getSession(sessionId);
    if (!session) {
      await this.sessionService.revokeRefreshToken(refreshToken);
      throw new UnauthorizedException('会话已过期，请重新登录');
    }

    // 撤销旧的刷新令牌（Token Rotation）
    await this.sessionService.revokeRefreshToken(refreshToken);

    // 生成新的 Access Token（有效期24小时）
    const newAccessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        sessionId: sessionId,
      },
      { expiresIn: 24 * 60 * 60 }, // 24 hours in seconds
    );

    // 生成新的 Refresh Token（有效期7天）- Token Rotation
    const newRefreshToken = this.jwtService.sign(
      {
        sub: user.id,
        sessionId: sessionId,
        type: 'refresh',
      },
      { expiresIn: 7 * 24 * 60 * 60 }, // 7 days in seconds
    );

    // 存储新的 Refresh Token 到 Redis
    await this.sessionService.storeRefreshToken(
      newRefreshToken,
      user.id,
      sessionId,
      this.refreshTokenTtlSeconds,
    );

    // 更新会话活动时间
    await this.sessionService.updateSessionActivity(sessionId);

    this.logger.log(`Token refreshed for user: ${user.id}`);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * 用户登出
   * 撤销刷新令牌，使会话失效
   *
   * @param refreshToken 要撤销的刷新令牌
   * @param logoutAll 是否登出所有设备
   * @returns 登出结果
   */
  async logout(
    refreshToken: string,
    logoutAll: boolean = false,
  ): Promise<LogoutResponse> {
    // 验证刷新令牌
    const tokenData =
      await this.sessionService.validateRefreshToken(refreshToken);

    if (!tokenData) {
      // 即使令牌无效，也返回成功（幂等性）
      return { message: '已成功登出' };
    }

    const { userId, sessionId } = tokenData;

    if (logoutAll) {
      // 登出所有设备：删除用户的所有会话
      const sessionsRevoked =
        await this.sessionService.deleteUserSessions(userId);
      this.logger.log(
        `User ${userId} logged out from all devices, ${sessionsRevoked} sessions revoked`,
      );
      return {
        message: '已成功从所有设备登出',
        sessionsRevoked,
      };
    } else {
      // 仅登出当前设备
      await this.sessionService.revokeRefreshToken(refreshToken);
      await this.sessionService.deleteSession(sessionId);
      this.logger.log(`User ${userId} logged out from session ${sessionId}`);
      return { message: '已成功登出' };
    }
  }
}
