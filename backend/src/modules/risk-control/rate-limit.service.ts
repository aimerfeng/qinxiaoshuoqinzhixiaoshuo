import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service.js';
import {
  RateLimitAction,
  DEFAULT_RATE_LIMITS,
  type RateLimitConfig,
  type RateLimitCheckResult,
  type RateLimitStatusResponse,
  type TokenBucketConfig,
  type TokenBucketState,
  type SlidingWindowConfig,
} from './dto/rate-limit.dto.js';

/**
 * 频率限制服务
 *
 * 需求19: 风控与反作弊系统 - 频率限制服务
 *
 * 功能:
 * - API endpoint rate limiting (per user, per IP)
 * - Action-specific rate limiting (login attempts, registration, tipping, commenting)
 * - Sliding window rate limiting
 * - Token bucket algorithm support
 *
 * 实现:
 * - 使用 Redis INCR 和 EXPIRE 进行原子操作
 * - 支持滑动窗口算法实现精确限流
 * - 支持令牌桶算法实现平滑限流
 */
@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  // Redis key 前缀
  private readonly KEY_PREFIX = 'ratelimit:';
  private readonly BLOCK_PREFIX = 'ratelimit:block:';
  private readonly BUCKET_PREFIX = 'ratelimit:bucket:';
  private readonly SLIDING_PREFIX = 'ratelimit:sliding:';

  constructor(private readonly redis: RedisService) {}

  /**
   * 检查频率限制
   *
   * 使用固定窗口计数器算法检查是否超过限制
   *
   * @param key 限制的唯一标识（如 user:123:login 或 ip:192.168.1.1:api）
   * @param limit 限制次数
   * @param windowSeconds 时间窗口（秒）
   * @returns 检查结果
   */
  async checkRateLimit(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitCheckResult> {
    const redisKey = `${this.KEY_PREFIX}${key}`;
    const blockKey = `${this.BLOCK_PREFIX}${key}`;

    try {
      // 首先检查是否被封禁
      const blockedUntil = await this.redis.get(blockKey);
      if (blockedUntil) {
        const blockedUntilTs = parseInt(blockedUntil, 10);
        const now = Math.floor(Date.now() / 1000);
        if (blockedUntilTs > now) {
          return {
            allowed: false,
            currentCount: limit,
            limit,
            remaining: 0,
            resetAt: blockedUntilTs,
            retryAfterSeconds: blockedUntilTs - now,
            blocked: true,
            blockedUntil: blockedUntilTs,
          };
        }
        // 封禁已过期，删除封禁记录
        await this.redis.del(blockKey);
      }

      // 获取当前计数
      const currentStr = await this.redis.get(redisKey);
      const current = currentStr ? parseInt(currentStr, 10) : 0;

      // 获取 TTL
      const ttl = await this.redis.ttl(redisKey);
      const now = Math.floor(Date.now() / 1000);
      const resetAt = ttl > 0 ? now + ttl : now + windowSeconds;

      if (current >= limit) {
        return {
          allowed: false,
          currentCount: current,
          limit,
          remaining: 0,
          resetAt,
          retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
          blocked: false,
        };
      }

      return {
        allowed: true,
        currentCount: current,
        limit,
        remaining: limit - current,
        resetAt,
        retryAfterSeconds: 0,
        blocked: false,
      };
    } catch (error) {
      this.logger.error(`Failed to check rate limit for ${key}: ${String(error)}`);
      // 出错时默认允许，避免影响正常业务
      return {
        allowed: true,
        currentCount: 0,
        limit,
        remaining: limit,
        resetAt: Math.floor(Date.now() / 1000) + windowSeconds,
        retryAfterSeconds: 0,
        blocked: false,
      };
    }
  }

  /**
   * 增加计数器
   *
   * 原子性地增加计数并设置过期时间
   *
   * @param key 限制的唯一标识
   * @param windowSeconds 时间窗口（秒）
   * @returns 增加后的计数
   */
  async incrementCounter(key: string, windowSeconds: number): Promise<number> {
    const redisKey = `${this.KEY_PREFIX}${key}`;

    try {
      // 使用 INCR 原子增加
      const count = await this.redis.incr(redisKey);

      // 如果是第一次设置，添加过期时间
      if (count === 1) {
        await this.redis.expire(redisKey, windowSeconds);
      }

      return count;
    } catch (error) {
      this.logger.error(`Failed to increment counter for ${key}: ${String(error)}`);
      return 0;
    }
  }

  /**
   * 获取剩余配额
   *
   * @param key 限制的唯一标识
   * @param limit 限制次数
   * @param windowSeconds 时间窗口（秒）
   * @returns 剩余配额
   */
  async getRemainingQuota(
    key: string,
    limit: number,
    windowSeconds: number,
  ): Promise<number> {
    const result = await this.checkRateLimit(key, limit, windowSeconds);
    return result.remaining;
  }

  /**
   * 重置频率限制
   *
   * @param key 限制的唯一标识
   */
  async resetRateLimit(key: string): Promise<void> {
    const redisKey = `${this.KEY_PREFIX}${key}`;
    const blockKey = `${this.BLOCK_PREFIX}${key}`;

    try {
      await this.redis.del(redisKey, blockKey);
      this.logger.debug(`Reset rate limit for ${key}`);
    } catch (error) {
      this.logger.error(`Failed to reset rate limit for ${key}: ${String(error)}`);
    }
  }

  /**
   * 检查是否被封禁
   *
   * @param key 限制的唯一标识
   * @returns 是否被封禁
   */
  async isBlocked(key: string): Promise<boolean> {
    const blockKey = `${this.BLOCK_PREFIX}${key}`;

    try {
      const blockedUntil = await this.redis.get(blockKey);
      if (!blockedUntil) return false;

      const blockedUntilTs = parseInt(blockedUntil, 10);
      const now = Math.floor(Date.now() / 1000);

      if (blockedUntilTs > now) {
        return true;
      }

      // 封禁已过期，删除记录
      await this.redis.del(blockKey);
      return false;
    } catch (error) {
      this.logger.error(`Failed to check block status for ${key}: ${String(error)}`);
      return false;
    }
  }

  /**
   * 封禁指定 key
   *
   * @param key 限制的唯一标识
   * @param durationSeconds 封禁时长（秒）
   */
  async blockKey(key: string, durationSeconds: number): Promise<void> {
    const blockKey = `${this.BLOCK_PREFIX}${key}`;
    const blockedUntil = Math.floor(Date.now() / 1000) + durationSeconds;

    try {
      await this.redis.set(blockKey, blockedUntil.toString(), durationSeconds);
      this.logger.warn(`Blocked key ${key} for ${durationSeconds} seconds`);
    } catch (error) {
      this.logger.error(`Failed to block key ${key}: ${String(error)}`);
    }
  }

  /**
   * 解除封禁
   *
   * @param key 限制的唯一标识
   */
  async unblockKey(key: string): Promise<void> {
    const blockKey = `${this.BLOCK_PREFIX}${key}`;

    try {
      await this.redis.del(blockKey);
      this.logger.debug(`Unblocked key ${key}`);
    } catch (error) {
      this.logger.error(`Failed to unblock key ${key}: ${String(error)}`);
    }
  }


  /**
   * 检查并增加计数（原子操作）
   *
   * 检查是否超过限制，如果未超过则增加计数
   *
   * @param key 限制的唯一标识
   * @param limit 限制次数
   * @param windowSeconds 时间窗口（秒）
   * @param blockDurationSeconds 超限后的封禁时长（可选）
   * @returns 检查结果
   */
  async checkAndIncrement(
    key: string,
    limit: number,
    windowSeconds: number,
    blockDurationSeconds?: number,
  ): Promise<RateLimitCheckResult> {
    // 先检查是否被封禁
    const blocked = await this.isBlocked(key);
    if (blocked) {
      const blockKey = `${this.BLOCK_PREFIX}${key}`;
      const blockedUntilStr = await this.redis.get(blockKey);
      const blockedUntil = blockedUntilStr ? parseInt(blockedUntilStr, 10) : 0;
      const now = Math.floor(Date.now() / 1000);

      return {
        allowed: false,
        currentCount: limit,
        limit,
        remaining: 0,
        resetAt: blockedUntil,
        retryAfterSeconds: blockedUntil - now,
        blocked: true,
        blockedUntil,
      };
    }

    // 增加计数
    const count = await this.incrementCounter(key, windowSeconds);
    const ttl = await this.redis.ttl(`${this.KEY_PREFIX}${key}`);
    const now = Math.floor(Date.now() / 1000);
    const resetAt = ttl > 0 ? now + ttl : now + windowSeconds;

    if (count > limit) {
      // 超过限制，如果配置了封禁时长则封禁
      if (blockDurationSeconds && blockDurationSeconds > 0) {
        await this.blockKey(key, blockDurationSeconds);
      }

      return {
        allowed: false,
        currentCount: count,
        limit,
        remaining: 0,
        resetAt,
        retryAfterSeconds: ttl > 0 ? ttl : windowSeconds,
        blocked: false,
      };
    }

    return {
      allowed: true,
      currentCount: count,
      limit,
      remaining: limit - count,
      resetAt,
      retryAfterSeconds: 0,
      blocked: false,
    };
  }

  /**
   * 使用预定义配置检查频率限制
   *
   * @param action 操作类型
   * @param identifier 标识符（用户ID或IP）
   * @returns 检查结果
   */
  async checkActionRateLimit(
    action: RateLimitAction | string,
    identifier: string,
  ): Promise<RateLimitCheckResult> {
    const config = DEFAULT_RATE_LIMITS[action as RateLimitAction] ?? {
      action,
      limit: 100,
      windowSeconds: 60,
    };

    const key = `${action}:${identifier}`;
    return this.checkAndIncrement(
      key,
      config.limit,
      config.windowSeconds,
      config.blockDurationSeconds,
    );
  }

  /**
   * 使用自定义配置检查频率限制
   *
   * @param config 频率限制配置
   * @param identifier 标识符（用户ID或IP）
   * @returns 检查结果
   */
  async checkWithConfig(
    config: RateLimitConfig,
    identifier: string,
  ): Promise<RateLimitCheckResult> {
    const key = `${config.action}:${identifier}`;
    return this.checkAndIncrement(
      key,
      config.limit,
      config.windowSeconds,
      config.blockDurationSeconds,
    );
  }

  /**
   * 获取频率限制状态
   *
   * @param key 限制的唯一标识
   * @param action 操作类型
   * @param limit 限制次数
   * @param windowSeconds 时间窗口（秒）
   * @returns 状态响应
   */
  async getStatus(
    key: string,
    action: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitStatusResponse> {
    const redisKey = `${this.KEY_PREFIX}${key}`;
    const blockKey = `${this.BLOCK_PREFIX}${key}`;

    const currentStr = await this.redis.get(redisKey);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    const ttl = await this.redis.ttl(redisKey);
    const now = Math.floor(Date.now() / 1000);

    const blockedUntilStr = await this.redis.get(blockKey);
    const blocked = blockedUntilStr ? parseInt(blockedUntilStr, 10) > now : false;
    const blockedUntil = blockedUntilStr ? parseInt(blockedUntilStr, 10) : undefined;

    return {
      key,
      action,
      currentCount: current,
      limit,
      remaining: Math.max(0, limit - current),
      windowSeconds,
      resetAt: ttl > 0 ? now + ttl : now + windowSeconds,
      blocked,
      blockedUntil,
    };
  }

  // ==================== 滑动窗口算法 ====================

  /**
   * 使用滑动窗口算法检查频率限制
   *
   * 滑动窗口算法比固定窗口更精确，避免窗口边界的突发流量问题
   *
   * @param key 限制的唯一标识
   * @param limit 限制次数
   * @param config 滑动窗口配置
   * @returns 检查结果
   */
  async checkSlidingWindow(
    key: string,
    limit: number,
    config: SlidingWindowConfig,
  ): Promise<RateLimitCheckResult> {
    const { windowSize, precision } = config;
    const redisKey = `${this.SLIDING_PREFIX}${key}`;
    const now = Math.floor(Date.now() / 1000);
    const subWindowSize = Math.ceil(windowSize / precision);

    try {
      // 计算当前子窗口
      const currentSubWindow = Math.floor(now / subWindowSize);
      const windowStart = currentSubWindow - precision + 1;

      // 获取所有子窗口的计数
      let totalCount = 0;
      const client = this.redis.getClient();

      for (let i = windowStart; i <= currentSubWindow; i++) {
        const subKey = `${redisKey}:${i}`;
        const countStr = await client.get(subKey);
        if (countStr) {
          totalCount += parseInt(countStr, 10);
        }
      }

      const remaining = Math.max(0, limit - totalCount);
      const resetAt = (currentSubWindow + 1) * subWindowSize;

      return {
        allowed: totalCount < limit,
        currentCount: totalCount,
        limit,
        remaining,
        resetAt,
        retryAfterSeconds: totalCount >= limit ? resetAt - now : 0,
        blocked: false,
      };
    } catch (error) {
      this.logger.error(`Failed to check sliding window for ${key}: ${String(error)}`);
      return {
        allowed: true,
        currentCount: 0,
        limit,
        remaining: limit,
        resetAt: now + windowSize,
        retryAfterSeconds: 0,
        blocked: false,
      };
    }
  }

  /**
   * 使用滑动窗口算法增加计数
   *
   * @param key 限制的唯一标识
   * @param config 滑动窗口配置
   * @returns 当前总计数
   */
  async incrementSlidingWindow(
    key: string,
    config: SlidingWindowConfig,
  ): Promise<number> {
    const { windowSize, precision } = config;
    const redisKey = `${this.SLIDING_PREFIX}${key}`;
    const now = Math.floor(Date.now() / 1000);
    const subWindowSize = Math.ceil(windowSize / precision);
    const currentSubWindow = Math.floor(now / subWindowSize);
    const subKey = `${redisKey}:${currentSubWindow}`;

    try {
      const client = this.redis.getClient();

      // 增加当前子窗口计数
      const count = await client.incr(subKey);

      // 设置过期时间（窗口大小 + 一个子窗口的缓冲）
      if (count === 1) {
        await client.expire(subKey, windowSize + subWindowSize);
      }

      // 计算总计数
      const windowStart = currentSubWindow - precision + 1;
      let totalCount = 0;

      for (let i = windowStart; i <= currentSubWindow; i++) {
        const countStr = await client.get(`${redisKey}:${i}`);
        if (countStr) {
          totalCount += parseInt(countStr, 10);
        }
      }

      return totalCount;
    } catch (error) {
      this.logger.error(`Failed to increment sliding window for ${key}: ${String(error)}`);
      return 0;
    }
  }

  // ==================== 令牌桶算法 ====================

  /**
   * 使用令牌桶算法检查频率限制
   *
   * 令牌桶算法允许一定程度的突发流量，同时保持平均速率限制
   *
   * @param key 限制的唯一标识
   * @param config 令牌桶配置
   * @returns 检查结果
   */
  async checkTokenBucket(
    key: string,
    config: TokenBucketConfig,
  ): Promise<RateLimitCheckResult> {
    const state = await this.getTokenBucketState(key, config);
    const now = Math.floor(Date.now() / 1000);

    const allowed = state.tokens >= config.tokensPerRequest;
    const remaining = Math.floor(state.tokens / config.tokensPerRequest);

    // 计算下一个令牌可用的时间
    let retryAfterSeconds = 0;
    if (!allowed) {
      const tokensNeeded = config.tokensPerRequest - state.tokens;
      retryAfterSeconds = Math.ceil(tokensNeeded / config.refillRate);
    }

    return {
      allowed,
      currentCount: config.capacity - Math.floor(state.tokens),
      limit: config.capacity,
      remaining,
      resetAt: now + Math.ceil(config.capacity / config.refillRate),
      retryAfterSeconds,
      blocked: false,
    };
  }

  /**
   * 从令牌桶消费令牌
   *
   * @param key 限制的唯一标识
   * @param config 令牌桶配置
   * @returns 是否成功消费
   */
  async consumeToken(
    key: string,
    config: TokenBucketConfig,
  ): Promise<boolean> {
    const state = await this.getTokenBucketState(key, config);

    if (state.tokens < config.tokensPerRequest) {
      return false;
    }

    // 消费令牌
    state.tokens -= config.tokensPerRequest;
    await this.saveTokenBucketState(key, state);

    return true;
  }

  /**
   * 获取令牌桶状态
   */
  private async getTokenBucketState(
    key: string,
    config: TokenBucketConfig,
  ): Promise<TokenBucketState> {
    const redisKey = `${this.BUCKET_PREFIX}${key}`;
    const now = Math.floor(Date.now() / 1000);

    try {
      const stateStr = await this.redis.get(redisKey);

      if (!stateStr) {
        // 初始化新桶
        return {
          tokens: config.capacity,
          lastRefillTime: now,
          capacity: config.capacity,
          refillRate: config.refillRate,
        };
      }

      const state = JSON.parse(stateStr) as TokenBucketState;

      // 计算应该填充的令牌数
      const timePassed = now - state.lastRefillTime;
      const tokensToAdd = timePassed * config.refillRate;
      state.tokens = Math.min(config.capacity, state.tokens + tokensToAdd);
      state.lastRefillTime = now;

      return state;
    } catch (error) {
      this.logger.error(`Failed to get token bucket state for ${key}: ${String(error)}`);
      return {
        tokens: config.capacity,
        lastRefillTime: now,
        capacity: config.capacity,
        refillRate: config.refillRate,
      };
    }
  }

  /**
   * 保存令牌桶状态
   */
  private async saveTokenBucketState(
    key: string,
    state: TokenBucketState,
  ): Promise<void> {
    const redisKey = `${this.BUCKET_PREFIX}${key}`;
    // 设置较长的过期时间，确保状态不会丢失
    const ttl = Math.ceil(state.capacity / state.refillRate) * 2;

    try {
      await this.redis.set(redisKey, JSON.stringify(state), ttl);
    } catch (error) {
      this.logger.error(`Failed to save token bucket state for ${key}: ${String(error)}`);
    }
  }

  // ==================== 辅助方法 ====================

  /**
   * 构建用户限制 key
   */
  buildUserKey(action: string, userId: string): string {
    return `${action}:user:${userId}`;
  }

  /**
   * 构建 IP 限制 key
   */
  buildIpKey(action: string, ip: string): string {
    return `${action}:ip:${ip}`;
  }

  /**
   * 构建复合限制 key（用户+IP）
   */
  buildCompositeKey(action: string, userId: string, ip: string): string {
    return `${action}:${userId}:${ip}`;
  }

  /**
   * 获取预定义配置
   */
  getDefaultConfig(action: RateLimitAction): RateLimitConfig | undefined {
    return DEFAULT_RATE_LIMITS[action];
  }
}
