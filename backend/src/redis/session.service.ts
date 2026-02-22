import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * 会话数据结构
 */
export interface Session {
  sessionId: string;
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
}

/**
 * 创建会话的参数
 */
export interface CreateSessionParams {
  userId: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  ttl?: number; // 过期时间（秒），默认 7 天
}

/**
 * 登录尝试追踪配置
 */
interface LoginAttemptConfig {
  maxAttempts: number; // 最大尝试次数
  lockoutDuration: number; // 锁定时长（秒）
  attemptWindow: number; // 尝试窗口时长（秒）
}

/**
 * 会话存储服务
 * 管理用户会话、刷新令牌、登录尝试追踪和设备会话
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  // Redis 键前缀
  private readonly SESSION_PREFIX = 'session:';
  private readonly USER_SESSIONS_PREFIX = 'user_sessions:';
  private readonly LOGIN_ATTEMPTS_PREFIX = 'login_attempts:';
  private readonly ACCOUNT_LOCKOUT_PREFIX = 'account_lockout:';
  private readonly REFRESH_TOKEN_PREFIX = 'refresh_token:';

  // 默认配置
  private readonly DEFAULT_SESSION_TTL = 7 * 24 * 60 * 60; // 7 天
  private readonly DEFAULT_REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 天

  // 登录尝试配置（对应需求1验收标准5：连续5次登录失败锁定15分钟）
  private readonly loginAttemptConfig: LoginAttemptConfig = {
    maxAttempts: 5,
    lockoutDuration: 15 * 60, // 15 分钟
    attemptWindow: 15 * 60, // 15 分钟窗口
  };

  constructor(private readonly redisService: RedisService) {}

  // ==================== 会话管理 ====================

  /**
   * 创建新会话
   * @param params 创建会话参数
   * @returns 创建的会话对象
   */
  async createSession(params: CreateSessionParams): Promise<Session> {
    const { userId, deviceInfo, ipAddress, userAgent, ttl } = params;
    const sessionId = uuidv4();
    const now = new Date();
    const effectiveTtl = ttl ?? this.DEFAULT_SESSION_TTL;
    const expiresAt = new Date(now.getTime() + effectiveTtl * 1000);

    const session: Session = {
      sessionId,
      userId,
      deviceInfo,
      ipAddress,
      userAgent,
      createdAt: now,
      lastActivityAt: now,
      expiresAt,
    };

    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      // 存储会话数据（使用 Hash）
      const sessionKey = this.buildSessionKey(sessionId);
      const sessionData = this.serializeSession(session);
      pipeline.hset(sessionKey, sessionData);
      pipeline.expire(sessionKey, effectiveTtl);

      // 将会话 ID 添加到用户会话集合
      const userSessionsKey = this.buildUserSessionsKey(userId);
      pipeline.sadd(userSessionsKey, sessionId);
      // 用户会话集合的过期时间设置为比会话更长
      pipeline.expire(userSessionsKey, effectiveTtl + 3600);

      await pipeline.exec();

      this.logger.debug(`Session created: ${sessionId} for user ${userId}`);
      return session;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create session: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 获取会话数据
   * @param sessionId 会话 ID
   * @returns 会话对象，不存在返回 null
   */
  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const sessionKey = this.buildSessionKey(sessionId);
      const data = await this.redisService.hgetall(sessionKey);

      if (!data || Object.keys(data).length === 0) {
        this.logger.debug(`Session not found: ${sessionId}`);
        return null;
      }

      const session = this.deserializeSession(data);
      this.logger.debug(`Session retrieved: ${sessionId}`);
      return session;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get session ${sessionId}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * 删除单个会话
   * @param sessionId 会话 ID
   * @returns 是否成功删除
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // 先获取会话以获取 userId
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      // 删除会话数据
      const sessionKey = this.buildSessionKey(sessionId);
      pipeline.del(sessionKey);

      // 从用户会话集合中移除
      const userSessionsKey = this.buildUserSessionsKey(session.userId);
      pipeline.srem(userSessionsKey, sessionId);

      await pipeline.exec();

      this.logger.debug(`Session deleted: ${sessionId}`);
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to delete session ${sessionId}: ${errorMessage}`,
      );
      return false;
    }
  }

  /**
   * 删除用户的所有会话
   * @param userId 用户 ID
   * @returns 删除的会话数量
   */
  async deleteUserSessions(userId: string): Promise<number> {
    try {
      const userSessionsKey = this.buildUserSessionsKey(userId);
      const sessionIds = await this.redisService.smembers(userSessionsKey);

      if (sessionIds.length === 0) {
        return 0;
      }

      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      // 删除所有会话数据
      for (const sessionId of sessionIds) {
        pipeline.del(this.buildSessionKey(sessionId));
      }

      // 删除用户会话集合
      pipeline.del(userSessionsKey);

      await pipeline.exec();

      this.logger.debug(
        `Deleted ${sessionIds.length} sessions for user ${userId}`,
      );
      return sessionIds.length;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to delete sessions for user ${userId}: ${errorMessage}`,
      );
      return 0;
    }
  }

  /**
   * 获取用户的所有活跃会话
   * @param userId 用户 ID
   * @returns 会话列表
   */
  async getUserSessions(userId: string): Promise<Session[]> {
    try {
      const userSessionsKey = this.buildUserSessionsKey(userId);
      const sessionIds = await this.redisService.smembers(userSessionsKey);

      if (sessionIds.length === 0) {
        return [];
      }

      const sessions: Session[] = [];
      const expiredSessionIds: string[] = [];

      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push(session);
        } else {
          // 会话已过期，标记为需要清理
          expiredSessionIds.push(sessionId);
        }
      }

      // 清理过期的会话 ID
      if (expiredSessionIds.length > 0) {
        await this.redisService.srem(userSessionsKey, ...expiredSessionIds);
        this.logger.debug(
          `Cleaned up ${expiredSessionIds.length} expired session references`,
        );
      }

      this.logger.debug(
        `Retrieved ${sessions.length} sessions for user ${userId}`,
      );
      return sessions;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get sessions for user ${userId}: ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * 更新会话最后活动时间
   * @param sessionId 会话 ID
   * @returns 是否成功更新
   */
  async updateSessionActivity(sessionId: string): Promise<boolean> {
    try {
      const sessionKey = this.buildSessionKey(sessionId);
      const exists = await this.redisService.exists(sessionKey);

      if (exists === 0) {
        return false;
      }

      const now = new Date().toISOString();
      await this.redisService.hset(sessionKey, 'lastActivityAt', now);

      this.logger.debug(`Session activity updated: ${sessionId}`);
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to update session activity ${sessionId}: ${errorMessage}`,
      );
      return false;
    }
  }

  // ==================== 刷新令牌管理 ====================

  /**
   * 存储刷新令牌
   * @param token 刷新令牌
   * @param userId 用户 ID
   * @param sessionId 关联的会话 ID
   * @param ttl 过期时间（秒），默认 30 天
   */
  async storeRefreshToken(
    token: string,
    userId: string,
    sessionId: string,
    ttl?: number,
  ): Promise<void> {
    try {
      const effectiveTtl = ttl ?? this.DEFAULT_REFRESH_TOKEN_TTL;
      const tokenKey = this.buildRefreshTokenKey(token);

      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      pipeline.hset(tokenKey, {
        userId,
        sessionId,
        createdAt: new Date().toISOString(),
      });
      pipeline.expire(tokenKey, effectiveTtl);

      await pipeline.exec();

      this.logger.debug(`Refresh token stored for user ${userId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to store refresh token: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 验证刷新令牌
   * @param token 刷新令牌
   * @returns 令牌数据（userId, sessionId），无效返回 null
   */
  async validateRefreshToken(
    token: string,
  ): Promise<{ userId: string; sessionId: string } | null> {
    try {
      const tokenKey = this.buildRefreshTokenKey(token);
      const data = await this.redisService.hgetall(tokenKey);

      if (!data || !data.userId || !data.sessionId) {
        this.logger.debug('Invalid or expired refresh token');
        return null;
      }

      return {
        userId: data.userId,
        sessionId: data.sessionId,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to validate refresh token: ${errorMessage}`);
      return null;
    }
  }

  /**
   * 撤销刷新令牌
   * @param token 刷新令牌
   * @returns 是否成功撤销
   */
  async revokeRefreshToken(token: string): Promise<boolean> {
    try {
      const tokenKey = this.buildRefreshTokenKey(token);
      const result = await this.redisService.del(tokenKey);

      this.logger.debug(`Refresh token revoked: ${result > 0}`);
      return result > 0;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to revoke refresh token: ${errorMessage}`);
      return false;
    }
  }

  // ==================== 登录尝试追踪 ====================

  /**
   * 追踪登录失败尝试
   * @param email 用户邮箱
   * @returns 当前尝试次数
   */
  async trackLoginAttempt(email: string): Promise<number> {
    try {
      const attemptsKey = this.buildLoginAttemptsKey(email);
      const client = this.redisService.getClient();

      // 使用 INCR 增加计数
      const attempts = await client.incr(attemptsKey);

      // 如果是第一次尝试，设置过期时间
      if (attempts === 1) {
        await client.expire(attemptsKey, this.loginAttemptConfig.attemptWindow);
      }

      // 如果达到最大尝试次数，锁定账户
      if (attempts >= this.loginAttemptConfig.maxAttempts) {
        await this.lockAccount(email);
      }

      this.logger.debug(`Login attempt tracked for ${email}: ${attempts}`);
      return attempts;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to track login attempt for ${email}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * 获取当前登录尝试次数
   * @param email 用户邮箱
   * @returns 尝试次数
   */
  async getLoginAttempts(email: string): Promise<number> {
    try {
      const attemptsKey = this.buildLoginAttemptsKey(email);
      const value = await this.redisService.get(attemptsKey);

      return value ? parseInt(value, 10) : 0;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get login attempts for ${email}: ${errorMessage}`,
      );
      return 0;
    }
  }

  /**
   * 清除登录尝试记录（登录成功后调用）
   * @param email 用户邮箱
   */
  async clearLoginAttempts(email: string): Promise<void> {
    try {
      const attemptsKey = this.buildLoginAttemptsKey(email);
      const lockoutKey = this.buildAccountLockoutKey(email);

      await this.redisService.del(attemptsKey, lockoutKey);

      this.logger.debug(`Login attempts cleared for ${email}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to clear login attempts for ${email}: ${errorMessage}`,
      );
    }
  }

  /**
   * 检查账户是否被锁定
   * @param email 用户邮箱
   * @returns 是否被锁定
   */
  async isAccountLocked(email: string): Promise<boolean> {
    try {
      const lockoutKey = this.buildAccountLockoutKey(email);
      const exists = await this.redisService.exists(lockoutKey);

      return exists > 0;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to check account lockout for ${email}: ${errorMessage}`,
      );
      return false;
    }
  }

  /**
   * 获取账户锁定剩余时间（秒）
   * @param email 用户邮箱
   * @returns 剩余锁定时间，未锁定返回 0
   */
  async getAccountLockoutRemaining(email: string): Promise<number> {
    try {
      const lockoutKey = this.buildAccountLockoutKey(email);
      const ttl = await this.redisService.ttl(lockoutKey);

      return ttl > 0 ? ttl : 0;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get lockout remaining for ${email}: ${errorMessage}`,
      );
      return 0;
    }
  }

  /**
   * 锁定账户
   * @param email 用户邮箱
   */
  private async lockAccount(email: string): Promise<void> {
    try {
      const lockoutKey = this.buildAccountLockoutKey(email);
      await this.redisService.set(
        lockoutKey,
        new Date().toISOString(),
        this.loginAttemptConfig.lockoutDuration,
      );

      this.logger.warn(`Account locked: ${email}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to lock account ${email}: ${errorMessage}`);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 构建会话键
   */
  private buildSessionKey(sessionId: string): string {
    return `${this.SESSION_PREFIX}${sessionId}`;
  }

  /**
   * 构建用户会话集合键
   */
  private buildUserSessionsKey(userId: string): string {
    return `${this.USER_SESSIONS_PREFIX}${userId}`;
  }

  /**
   * 构建登录尝试键
   */
  private buildLoginAttemptsKey(email: string): string {
    return `${this.LOGIN_ATTEMPTS_PREFIX}${email}`;
  }

  /**
   * 构建账户锁定键
   */
  private buildAccountLockoutKey(email: string): string {
    return `${this.ACCOUNT_LOCKOUT_PREFIX}${email}`;
  }

  /**
   * 构建刷新令牌键
   */
  private buildRefreshTokenKey(token: string): string {
    return `${this.REFRESH_TOKEN_PREFIX}${token}`;
  }

  /**
   * 序列化会话对象为 Redis Hash 格式
   */
  private serializeSession(session: Session): Record<string, string> {
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      deviceInfo: session.deviceInfo ?? '',
      ipAddress: session.ipAddress ?? '',
      userAgent: session.userAgent ?? '',
      createdAt: session.createdAt.toISOString(),
      lastActivityAt: session.lastActivityAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  /**
   * 反序列化 Redis Hash 数据为会话对象
   */
  private deserializeSession(data: Record<string, string>): Session {
    return {
      sessionId: data.sessionId,
      userId: data.userId,
      deviceInfo: data.deviceInfo || undefined,
      ipAddress: data.ipAddress || undefined,
      userAgent: data.userAgent || undefined,
      createdAt: new Date(data.createdAt),
      lastActivityAt: new Date(data.lastActivityAt),
      expiresAt: new Date(data.expiresAt),
    };
  }
}
