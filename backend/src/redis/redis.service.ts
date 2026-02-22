import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

/**
 * Redis 服务封装
 * 提供 Redis 客户端访问和常用操作方法
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {
    this.setupEventListeners();
  }

  /**
   * 设置 Redis 连接事件监听器
   */
  private setupEventListeners(): void {
    this.redis.on('connect', () => {
      this.logger.log('Redis client connected');
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis client ready');
    });

    this.redis.on('error', (error: Error) => {
      this.logger.error(`Redis client error: ${error.message}`, error.stack);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis client connection closed');
    });

    this.redis.on('reconnecting', () => {
      this.logger.log('Redis client reconnecting...');
    });
  }

  /**
   * 获取原始 Redis 客户端实例
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * 检查 Redis 连接健康状态
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * 获取 Redis 连接信息
   */
  async getInfo(): Promise<string> {
    return this.redis.info();
  }

  // ==================== 基础操作 ====================

  /**
   * 设置键值对
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    if (ttlSeconds) {
      return this.redis.set(key, value, 'EX', ttlSeconds);
    }
    return this.redis.set(key, value);
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  /**
   * 删除键
   */
  async del(...keys: string[]): Promise<number> {
    return this.redis.del(...keys);
  }

  /**
   * 检查键是否存在
   */
  async exists(...keys: string[]): Promise<number> {
    return this.redis.exists(...keys);
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<number> {
    return this.redis.expire(key, seconds);
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    return this.redis.ttl(key);
  }

  // ==================== 计数器操作 ====================

  /**
   * 自增
   */
  async incr(key: string): Promise<number> {
    return this.redis.incr(key);
  }

  /**
   * 自增指定值
   */
  async incrBy(key: string, increment: number): Promise<number> {
    return this.redis.incrby(key, increment);
  }

  /**
   * 自减
   */
  async decr(key: string): Promise<number> {
    return this.redis.decr(key);
  }

  // ==================== Hash 操作 ====================

  /**
   * 设置 Hash 字段
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    return this.redis.hset(key, field, value);
  }

  /**
   * 获取 Hash 字段
   */
  async hget(key: string, field: string): Promise<string | null> {
    return this.redis.hget(key, field);
  }

  /**
   * 获取所有 Hash 字段
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return this.redis.hgetall(key);
  }

  /**
   * 删除 Hash 字段
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return this.redis.hdel(key, ...fields);
  }

  // ==================== Set 操作 ====================

  /**
   * 添加到集合
   */
  async sadd(key: string, ...members: string[]): Promise<number> {
    return this.redis.sadd(key, ...members);
  }

  /**
   * 从集合移除
   */
  async srem(key: string, ...members: string[]): Promise<number> {
    return this.redis.srem(key, ...members);
  }

  /**
   * 获取集合所有成员
   */
  async smembers(key: string): Promise<string[]> {
    return this.redis.smembers(key);
  }

  /**
   * 检查是否是集合成员
   */
  async sismember(key: string, member: string): Promise<number> {
    return this.redis.sismember(key, member);
  }

  // ==================== Sorted Set 操作 ====================

  /**
   * 添加到有序集合
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.redis.zadd(key, score, member);
  }

  /**
   * 获取有序集合范围（按分数升序）
   */
  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redis.zrange(key, start, stop);
  }

  /**
   * 获取有序集合范围（按分数降序）
   */
  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redis.zrevrange(key, start, stop);
  }

  /**
   * 获取成员分数
   */
  async zscore(key: string, member: string): Promise<string | null> {
    return this.redis.zscore(key, member);
  }

  /**
   * 获取成员排名（升序）
   */
  async zrank(key: string, member: string): Promise<number | null> {
    return this.redis.zrank(key, member);
  }

  // ==================== List 操作 ====================

  /**
   * 从左侧推入
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    return this.redis.lpush(key, ...values);
  }

  /**
   * 从右侧推入
   */
  async rpush(key: string, ...values: string[]): Promise<number> {
    return this.redis.rpush(key, ...values);
  }

  /**
   * 从左侧弹出
   */
  async lpop(key: string): Promise<string | null> {
    return this.redis.lpop(key);
  }

  /**
   * 从右侧弹出
   */
  async rpop(key: string): Promise<string | null> {
    return this.redis.rpop(key);
  }

  /**
   * 获取列表范围
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.redis.lrange(key, start, stop);
  }

  /**
   * 获取列表长度
   */
  async llen(key: string): Promise<number> {
    return this.redis.llen(key);
  }

  // ==================== 清理 ====================

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Redis connection...');
    await this.redis.quit();
    this.logger.log('Redis connection closed');
  }
}
