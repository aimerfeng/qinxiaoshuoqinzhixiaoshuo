import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../../redis/redis.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionService } from '../../redis/session.service.js';

/**
 * 密码重置令牌数据接口
 */
interface PasswordResetTokenData {
  userId: string;
  email: string;
  createdAt: number;
}

/**
 * 密码重置响应接口
 */
export interface PasswordResetResponse {
  success: boolean;
  message: string;
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
}

/**
 * 密码重置服务
 * 处理密码重置令牌的生成、存储和验证
 *
 * 需求1验收标准3: WHEN 用户请求密码重置 THEN System SHALL 发送包含重置链接的邮件
 * NFR-3: 敏感操作（密码修改、提现）需二次验证
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  /** Redis key 前缀 */
  private readonly TOKEN_PREFIX = 'password_reset:';

  /** 令牌过期时间（秒）- 1小时 */
  private readonly TOKEN_EXPIRY_SECONDS = 60 * 60;

  /** 请求频率限制 Redis key 前缀 */
  private readonly RATE_LIMIT_PREFIX = 'password_reset_rate:';

  /** 请求频率限制时间窗口（秒）- 1小时 */
  private readonly RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

  /** 每小时最大请求次数 */
  private readonly MAX_REQUESTS_PER_HOUR = 3;

  /** bcrypt cost factor >= 12 (NFR-3 安全要求) */
  private readonly bcryptCostFactor = 12;

  constructor(
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 请求密码重置
   * 生成重置令牌并发送邮件
   *
   * @param email 用户邮箱
   * @returns 请求结果
   */
  async requestPasswordReset(email: string): Promise<PasswordResetResponse> {
    const normalizedEmail = email.toLowerCase();

    // 检查请求频率限制（防止滥用）
    await this.checkRateLimit(normalizedEmail);

    // 查找用户
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user: UserData | null = await (this.prisma as any).user.findUnique({
      where: { email: normalizedEmail },
    });

    // 为了安全，不透露邮箱是否存在
    if (!user) {
      this.logger.warn(
        `Password reset requested for non-existent email: ${normalizedEmail}`,
      );
      // 增加频率限制计数（即使用户不存在，也要防止枚举攻击）
      await this.incrementRateLimit(normalizedEmail);
      return {
        success: true,
        message: '如果该邮箱已注册，重置链接将发送到您的邮箱',
      };
    }

    // 检查账户是否激活
    if (!user.isActive) {
      this.logger.warn(
        `Password reset requested for inactive account: ${user.id}`,
      );
      return {
        success: true,
        message: '如果该邮箱已注册，重置链接将发送到您的邮箱',
      };
    }

    // 生成重置令牌
    const token = await this.generateResetToken(user.id, normalizedEmail);

    // 发送重置邮件（开发阶段用 console.log）
    this.sendPasswordResetEmail(normalizedEmail, token, user.id);

    // 增加频率限制计数
    await this.incrementRateLimit(normalizedEmail);

    this.logger.log(`Password reset requested for user: ${user.id}`);

    return {
      success: true,
      message: '如果该邮箱已注册，重置链接将发送到您的邮箱',
    };
  }

  /**
   * 重置密码
   * 验证令牌并更新密码，同时使所有会话失效
   *
   * @param token 重置令牌
   * @param newPassword 新密码
   * @returns 重置结果
   */
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<PasswordResetResponse> {
    const redisKey = this.getTokenKey(token);

    // 从 Redis 获取令牌数据
    const tokenDataStr = await this.redisService.get(redisKey);

    if (!tokenDataStr) {
      this.logger.warn(
        `Invalid or expired password reset token: ${token.substring(0, 8)}...`,
      );
      throw new BadRequestException('重置链接无效或已过期，请重新申请');
    }

    let tokenData: PasswordResetTokenData;
    try {
      tokenData = JSON.parse(tokenDataStr) as PasswordResetTokenData;
    } catch {
      this.logger.error(
        `Failed to parse token data for token: ${token.substring(0, 8)}...`,
      );
      throw new BadRequestException('重置链接无效');
    }

    // 检查用户是否存在
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user: UserData | null = await (this.prisma as any).user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user) {
      this.logger.warn(
        `User not found for password reset: ${tokenData.userId}`,
      );
      throw new NotFoundException('用户不存在');
    }

    // 检查账户是否激活
    if (!user.isActive) {
      throw new BadRequestException('账户已被禁用，无法重置密码');
    }

    // 使用 bcrypt 加密新密码 (cost factor >= 12)
    const passwordHash = await bcrypt.hash(newPassword, this.bcryptCostFactor);

    // 更新用户密码
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).user.update({
      where: { id: tokenData.userId },
      data: { passwordHash },
    });

    // 删除已使用的令牌
    await this.redisService.del(redisKey);

    // 使所有会话失效（安全措施：密码修改后强制重新登录）
    const sessionsRevoked = await this.sessionService.deleteUserSessions(
      tokenData.userId,
    );

    this.logger.log(
      `Password reset successfully for user: ${tokenData.userId}, ${sessionsRevoked} sessions invalidated`,
    );

    return {
      success: true,
      message: '密码重置成功，请使用新密码登录',
    };
  }

  /**
   * 生成并存储密码重置令牌
   *
   * @param userId 用户ID
   * @param email 用户邮箱
   * @returns 重置令牌
   */
  private async generateResetToken(
    userId: string,
    email: string,
  ): Promise<string> {
    // 生成安全的随机令牌（32字节 = 64字符十六进制）
    const token = randomBytes(32).toString('hex');

    // 构建令牌数据
    const tokenData: PasswordResetTokenData = {
      userId,
      email: email.toLowerCase(),
      createdAt: Date.now(),
    };

    // 存储到 Redis，设置过期时间（1小时）
    const redisKey = this.getTokenKey(token);
    await this.redisService.set(
      redisKey,
      JSON.stringify(tokenData),
      this.TOKEN_EXPIRY_SECONDS,
    );

    this.logger.debug(`Generated password reset token for user ${userId}`);

    return token;
  }

  /**
   * 发送密码重置邮件
   * 开发阶段用 console.log 替代实际邮件发送
   *
   * @param email 用户邮箱
   * @param token 重置令牌
   * @param userId 用户ID
   */
  private sendPasswordResetEmail(
    email: string,
    token: string,
    userId: string,
  ): void {
    const frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );
    const resetLink = `${frontendUrl}/auth/reset-password?token=${token}`;

    // TODO: 实现实际的邮件发送逻辑
    // 开发阶段用 console.log 替代
    this.logger.log('========================================');
    this.logger.log('🔐 密码重置邮件 (开发模式)');
    this.logger.log(`收件人: ${email}`);
    this.logger.log(`用户ID: ${userId}`);
    this.logger.log(`重置令牌: ${token}`);
    this.logger.log(`重置链接: ${resetLink}`);
    this.logger.log(`有效期: ${this.TOKEN_EXPIRY_SECONDS / 60} 分钟`);
    this.logger.log('========================================');
  }

  /**
   * 检查请求频率限制
   * 防止密码重置请求被滥用
   *
   * @param email 用户邮箱
   * @throws HttpException 如果超过频率限制
   */
  private async checkRateLimit(email: string): Promise<void> {
    const rateLimitKey = this.getRateLimitKey(email);
    const currentCount = await this.redisService.get(rateLimitKey);

    if (
      currentCount &&
      parseInt(currentCount, 10) >= this.MAX_REQUESTS_PER_HOUR
    ) {
      const ttl = await this.redisService.ttl(rateLimitKey);
      const remainingMinutes = Math.ceil(ttl / 60);
      this.logger.warn(`Rate limit exceeded for password reset: ${email}`);
      throw new HttpException(
        `密码重置请求过于频繁，请在 ${remainingMinutes} 分钟后重试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /**
   * 增加频率限制计数
   *
   * @param email 用户邮箱
   */
  private async incrementRateLimit(email: string): Promise<void> {
    const rateLimitKey = this.getRateLimitKey(email);
    const client = this.redisService.getClient();

    // 使用 INCR 增加计数
    const count = await client.incr(rateLimitKey);

    // 如果是第一次请求，设置过期时间
    if (count === 1) {
      await client.expire(rateLimitKey, this.RATE_LIMIT_WINDOW_SECONDS);
    }
  }

  /**
   * 获取令牌的 Redis key
   */
  private getTokenKey(token: string): string {
    return `${this.TOKEN_PREFIX}${token}`;
  }

  /**
   * 获取频率限制的 Redis key
   */
  private getRateLimitKey(email: string): string {
    return `${this.RATE_LIMIT_PREFIX}${email}`;
  }

  /**
   * 检查令牌是否有效（不消费令牌）
   *
   * @param token 重置令牌
   * @returns 是否有效
   */
  async isTokenValid(token: string): Promise<boolean> {
    const redisKey = this.getTokenKey(token);
    const exists = await this.redisService.exists(redisKey);
    return exists > 0;
  }
}
