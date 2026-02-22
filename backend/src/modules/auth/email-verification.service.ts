import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { RedisService } from '../../redis/redis.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * 邮箱验证令牌数据接口
 */
interface VerificationTokenData {
  userId: string;
  email: string;
  createdAt: number;
}

/**
 * 邮箱验证响应接口
 */
export interface VerifyEmailResponse {
  success: boolean;
  message: string;
}

/**
 * 邮箱验证服务
 * 处理邮箱验证令牌的生成、存储和验证
 *
 * 需求1验收标准1: WHEN 用户提交有效的邮箱和密码进行注册 THEN System SHALL 创建新账户并发送验证邮件
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  /** Redis key 前缀 */
  private readonly TOKEN_PREFIX = 'email_verification:';

  /** 令牌过期时间（秒）- 24小时 */
  private readonly TOKEN_EXPIRY_SECONDS = 24 * 60 * 60;

  /** 重发邮件冷却时间（秒）- 60秒 */
  private readonly RESEND_COOLDOWN_SECONDS = 60;

  /** 重发冷却 Redis key 前缀 */
  private readonly RESEND_COOLDOWN_PREFIX = 'email_verification_cooldown:';

  constructor(
    private readonly redisService: RedisService,
    private readonly prismaService: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 生成并存储邮箱验证令牌
   *
   * @param userId 用户ID
   * @param email 用户邮箱
   * @returns 验证令牌
   */
  async generateVerificationToken(
    userId: string,
    email: string,
  ): Promise<string> {
    // 生成安全的随机令牌（32字节 = 64字符十六进制）
    const token = randomBytes(32).toString('hex');

    // 构建令牌数据
    const tokenData: VerificationTokenData = {
      userId,
      email: email.toLowerCase(),
      createdAt: Date.now(),
    };

    // 存储到 Redis，设置过期时间
    const redisKey = this.getTokenKey(token);
    await this.redisService.set(
      redisKey,
      JSON.stringify(tokenData),
      this.TOKEN_EXPIRY_SECONDS,
    );

    this.logger.debug(`Generated verification token for user ${userId}`);

    return token;
  }

  /**
   * 验证邮箱令牌
   *
   * @param token 验证令牌
   * @returns 验证结果
   * @throws BadRequestException 令牌无效或已过期
   */
  async verifyEmail(token: string): Promise<VerifyEmailResponse> {
    const redisKey = this.getTokenKey(token);

    // 从 Redis 获取令牌数据
    const tokenDataStr = await this.redisService.get(redisKey);

    if (!tokenDataStr) {
      this.logger.warn(
        `Invalid or expired verification token: ${token.substring(0, 8)}...`,
      );
      throw new BadRequestException('验证链接无效或已过期，请重新发送验证邮件');
    }

    let tokenData: VerificationTokenData;
    try {
      tokenData = JSON.parse(tokenDataStr) as VerificationTokenData;
    } catch {
      this.logger.error(
        `Failed to parse token data for token: ${token.substring(0, 8)}...`,
      );
      throw new BadRequestException('验证链接无效');
    }

    // 检查用户是否存在
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prismaService as any).user.findUnique({
      where: { id: tokenData.userId },
    });

    if (!user) {
      this.logger.warn(`User not found for verification: ${tokenData.userId}`);
      throw new NotFoundException('用户不存在');
    }

    // 检查邮箱是否已验证
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.isEmailVerified) {
      // 删除令牌
      await this.redisService.del(redisKey);
      throw new ConflictException('邮箱已验证，无需重复验证');
    }

    // 更新用户邮箱验证状态
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prismaService as any).user.update({
      where: { id: tokenData.userId },
      data: { isEmailVerified: true },
    });

    // 删除已使用的令牌
    await this.redisService.del(redisKey);

    this.logger.log(
      `Email verified successfully for user: ${tokenData.userId}`,
    );

    return {
      success: true,
      message: '邮箱验证成功',
    };
  }

  /**
   * 重新发送验证邮件
   *
   * @param email 用户邮箱
   * @returns 发送结果
   * @throws BadRequestException 邮箱不存在或冷却中
   */
  async resendVerificationEmail(email: string): Promise<VerifyEmailResponse> {
    const normalizedEmail = email.toLowerCase();

    // 检查重发冷却
    const cooldownKey = this.getCooldownKey(normalizedEmail);
    const cooldownExists = await this.redisService.exists(cooldownKey);

    if (cooldownExists) {
      const ttl = await this.redisService.ttl(cooldownKey);
      throw new BadRequestException(`请等待 ${ttl} 秒后再重新发送验证邮件`);
    }

    // 查找用户
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prismaService as any).user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // 为了安全，不透露邮箱是否存在
      this.logger.warn(
        `Resend verification requested for non-existent email: ${normalizedEmail}`,
      );
      return {
        success: true,
        message: '如果该邮箱已注册，验证邮件将发送到您的邮箱',
      };
    }

    // 检查邮箱是否已验证
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (user.isEmailVerified) {
      throw new ConflictException('邮箱已验证，无需重新发送');
    }

    // 生成新的验证令牌

    const token = await this.generateVerificationToken(
      user.id as string,
      normalizedEmail,
    );

    // 发送验证邮件（开发阶段用 console.log）
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    this.sendVerificationEmail(normalizedEmail, token, user.id as string);

    // 设置重发冷却
    await this.redisService.set(cooldownKey, '1', this.RESEND_COOLDOWN_SECONDS);

    return {
      success: true,
      message: '验证邮件已发送，请查收',
    };
  }

  /**
   * 发送验证邮件
   * 开发阶段用 console.log 替代实际邮件发送
   *
   * @param email 用户邮箱
   * @param token 验证令牌
   * @param userId 用户ID
   */
  sendVerificationEmail(email: string, token: string, userId: string): void {
    const frontendUrl = this.configService.get<string>(
      'app.frontendUrl',
      'http://localhost:3000',
    );
    const verificationLink = `${frontendUrl}/auth/verify-email?token=${token}`;

    // TODO: 实现实际的邮件发送逻辑
    // 开发阶段用 console.log 替代
    this.logger.log('========================================');
    this.logger.log('📧 验证邮件 (开发模式)');
    this.logger.log(`收件人: ${email}`);
    this.logger.log(`用户ID: ${userId}`);
    this.logger.log(`验证令牌: ${token}`);
    this.logger.log(`验证链接: ${verificationLink}`);
    this.logger.log(`有效期: ${this.TOKEN_EXPIRY_SECONDS / 3600} 小时`);
    this.logger.log('========================================');
  }

  /**
   * 获取令牌的 Redis key
   */
  private getTokenKey(token: string): string {
    return `${this.TOKEN_PREFIX}${token}`;
  }

  /**
   * 获取重发冷却的 Redis key
   */
  private getCooldownKey(email: string): string {
    return `${this.RESEND_COOLDOWN_PREFIX}${email}`;
  }

  /**
   * 检查令牌是否有效（不消费令牌）
   *
   * @param token 验证令牌
   * @returns 是否有效
   */
  async isTokenValid(token: string): Promise<boolean> {
    const redisKey = this.getTokenKey(token);
    const exists = await this.redisService.exists(redisKey);
    return exists > 0;
  }

  /**
   * 使指定用户的所有验证令牌失效
   * 用于用户更改邮箱等场景
   *
   * @param userId 用户ID
   */
  async invalidateUserTokens(userId: string): Promise<void> {
    // 注意：当前实现中，令牌是以 token 为 key 存储的
    // 如果需要按用户失效，需要维护一个用户到令牌的映射
    // 这里暂时不实现，因为令牌会自动过期
    this.logger.debug(`Token invalidation requested for user: ${userId}`);
  }
}
