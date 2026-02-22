import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service.js';

/**
 * 缓存服务基类
 * 提供高级缓存抽象，支持 JSON 序列化、TTL、命名空间、标签等功能
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultTtl = 3600; // 默认 1 小时

  constructor(private readonly redisService: RedisService) {}

  // ==================== 核心缓存操作 ====================

  /**
   * 获取缓存值（支持泛型）
   * @param key 缓存键
   * @returns 反序列化后的值，不存在返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redisService.get(this.buildKey(key));
      if (value === null) {
        this.logger.debug(`Cache miss: ${key}`);
        return null;
      }
      this.logger.debug(`Cache hit: ${key}`);
      return this.deserialize<T>(value);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache get error for key ${key}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 要缓存的值
   * @param ttl 过期时间（秒），可选
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      const serialized = this.serialize(value);
      const fullKey = this.buildKey(key);
      await this.redisService.set(fullKey, serialized, ttl ?? this.defaultTtl);
      this.logger.debug(`Cache set: ${key}, TTL: ${ttl ?? this.defaultTtl}s`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache set error for key ${key}: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 删除单个缓存键
   * @param key 缓存键
   * @returns 是否成功删除
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.redisService.del(this.buildKey(key));
      this.logger.debug(`Cache delete: ${key}, result: ${result > 0}`);
      return result > 0;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache delete error for key ${key}: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 检查缓存键是否存在
   * @param key 缓存键
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redisService.exists(this.buildKey(key));
      return result > 0;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache exists error for key ${key}: ${errorMessage}`);
      return false;
    }
  }

  // ==================== Cache-Aside 模式 ====================

  /**
   * Cache-Aside 模式：获取或设置缓存
   * 如果缓存存在则返回缓存值，否则执行 factory 函数获取值并缓存
   * @param key 缓存键
   * @param factory 数据获取函数
   * @param ttl 过期时间（秒），可选
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    // 先尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // 缓存未命中，执行 factory 获取数据
    this.logger.debug(`Cache miss, executing factory for: ${key}`);
    const value = await factory();

    // 缓存结果
    await this.set(key, value, ttl);

    return value;
  }

  // ==================== 批量操作 ====================

  /**
   * 批量获取缓存值
   * @param keys 缓存键数组
   * @returns 键值对映射，不存在的键值为 null
   */
  async mget<T>(keys: string[]): Promise<Map<string, T | null>> {
    if (keys.length === 0) {
      return new Map();
    }

    try {
      const fullKeys = keys.map((k) => this.buildKey(k));
      const client = this.redisService.getClient();
      const values = await client.mget(...fullKeys);

      const result = new Map<string, T | null>();
      keys.forEach((key, index) => {
        const value = values[index];
        if (value === null) {
          result.set(key, null);
        } else {
          try {
            result.set(key, this.deserialize<T>(value));
          } catch {
            result.set(key, null);
          }
        }
      });

      this.logger.debug(`Cache mget: ${keys.length} keys`);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache mget error: ${errorMessage}`);
      return new Map(keys.map((k) => [k, null]));
    }
  }

  /**
   * 批量设置缓存值
   * @param entries 键值对数组
   * @param ttl 过期时间（秒），可选
   */
  async mset<T>(
    entries: Array<{ key: string; value: T }>,
    ttl?: number,
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();

      for (const { key, value } of entries) {
        const fullKey = this.buildKey(key);
        const serialized = this.serialize(value);
        if (ttl) {
          pipeline.set(fullKey, serialized, 'EX', ttl);
        } else {
          pipeline.set(fullKey, serialized, 'EX', this.defaultTtl);
        }
      }

      await pipeline.exec();
      this.logger.debug(`Cache mset: ${entries.length} entries`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache mset error: ${errorMessage}`);
      throw error;
    }
  }

  // ==================== 模式匹配删除 ====================

  /**
   * 按模式删除缓存键
   * @param pattern 匹配模式（支持 * 通配符）
   * @returns 删除的键数量
   */
  async deletePattern(pattern: string): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const fullPattern = this.buildKey(pattern);

      // 使用 SCAN 迭代查找匹配的键
      const keys: string[] = [];
      let cursor = '0';

      do {
        const [nextCursor, foundKeys] = await client.scan(
          cursor,
          'MATCH',
          fullPattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        keys.push(...foundKeys);
      } while (cursor !== '0');

      if (keys.length === 0) {
        return 0;
      }

      // 批量删除
      const deleted = await client.del(...keys);
      this.logger.debug(
        `Cache deletePattern: ${pattern}, deleted ${deleted} keys`,
      );
      return deleted;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Cache deletePattern error for ${pattern}: ${errorMessage}`,
      );
      return 0;
    }
  }

  // ==================== 计数器操作 ====================

  /**
   * 自增计数器
   * @param key 缓存键
   * @param by 增量，默认为 1
   * @returns 增加后的值
   */
  async increment(key: string, by: number = 1): Promise<number> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.redisService.incrBy(fullKey, by);
      this.logger.debug(`Cache increment: ${key} by ${by}, result: ${result}`);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Cache increment error for key ${key}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * 自减计数器
   * @param key 缓存键
   * @param by 减量，默认为 1
   * @returns 减少后的值
   */
  async decrement(key: string, by: number = 1): Promise<number> {
    try {
      const fullKey = this.buildKey(key);
      const result = await this.redisService.incrBy(fullKey, -by);
      this.logger.debug(`Cache decrement: ${key} by ${by}, result: ${result}`);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Cache decrement error for key ${key}: ${errorMessage}`,
      );
      throw error;
    }
  }

  // ==================== 标签缓存 ====================

  /**
   * 设置带标签的缓存值
   * 标签用于批量失效相关缓存
   * @param key 缓存键
   * @param value 要缓存的值
   * @param tags 标签数组
   * @param ttl 过期时间（秒），可选
   */
  async setWithTags<T>(
    key: string,
    value: T,
    tags: string[],
    ttl?: number,
  ): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const pipeline = client.pipeline();
      const fullKey = this.buildKey(key);
      const effectiveTtl = ttl ?? this.defaultTtl;

      // 设置缓存值
      pipeline.set(fullKey, this.serialize(value), 'EX', effectiveTtl);

      // 将键添加到每个标签的集合中
      for (const tag of tags) {
        const tagKey = this.buildTagKey(tag);
        pipeline.sadd(tagKey, fullKey);
        // 标签集合的过期时间设置为比缓存值更长，确保能正确清理
        pipeline.expire(tagKey, effectiveTtl + 3600);
      }

      await pipeline.exec();
      this.logger.debug(
        `Cache setWithTags: ${key}, tags: [${tags.join(', ')}]`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Cache setWithTags error for key ${key}: ${errorMessage}`,
      );
      throw error;
    }
  }

  /**
   * 按标签删除所有相关缓存
   * @param tag 标签名
   * @returns 删除的键数量
   */
  async deleteByTag(tag: string): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const tagKey = this.buildTagKey(tag);

      // 获取标签关联的所有键
      const keys = await client.smembers(tagKey);

      if (keys.length === 0) {
        return 0;
      }

      // 批量删除缓存键和标签集合
      const pipeline = client.pipeline();
      pipeline.del(...keys);
      pipeline.del(tagKey);

      const results = await pipeline.exec();
      const deleted = (results?.[0]?.[1] as number) || 0;

      this.logger.debug(`Cache deleteByTag: ${tag}, deleted ${deleted} keys`);
      return deleted;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Cache deleteByTag error for tag ${tag}: ${errorMessage}`,
      );
      return 0;
    }
  }

  // ==================== TTL 操作 ====================

  /**
   * 获取缓存键的剩余过期时间
   * @param key 缓存键
   * @returns 剩余秒数，-1 表示永不过期，-2 表示键不存在
   */
  async getTtl(key: string): Promise<number> {
    try {
      return await this.redisService.ttl(this.buildKey(key));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache getTtl error for key ${key}: ${errorMessage}`);
      return -2;
    }
  }

  /**
   * 更新缓存键的过期时间
   * @param key 缓存键
   * @param ttl 新的过期时间（秒）
   * @returns 是否成功
   */
  async setTtl(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.redisService.expire(this.buildKey(key), ttl);
      return result === 1;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache setTtl error for key ${key}: ${errorMessage}`);
      return false;
    }
  }

  // ==================== Sorted Set 操作 ====================

  /**
   * 添加或更新 Sorted Set 成员
   * @param key 缓存键
   * @param score 分数
   * @param member 成员
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const fullKey = this.buildKey(key);
      const result = await client.zadd(fullKey, score, member);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache zadd error for key ${key}: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 按分数范围删除 Sorted Set 成员
   * @param key 缓存键
   * @param start 起始排名
   * @param stop 结束排名
   */
  async zremrangebyrank(
    key: string,
    start: number,
    stop: number,
  ): Promise<number> {
    try {
      const client = this.redisService.getClient();
      const fullKey = this.buildKey(key);
      const result = await client.zremrangebyrank(fullKey, start, stop);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Cache zremrangebyrank error for key ${key}: ${errorMessage}`,
      );
      return 0;
    }
  }

  /**
   * 按分数降序获取 Sorted Set 成员
   * @param key 缓存键
   * @param start 起始排名
   * @param stop 结束排名
   */
  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    try {
      const client = this.redisService.getClient();
      const fullKey = this.buildKey(key);
      const result = await client.zrevrange(fullKey, start, stop);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Cache zrevrange error for key ${key}: ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * 获取成员在 Sorted Set 中的排名（按分数降序）
   * @param key 缓存键
   * @param member 成员
   */
  async zrevrank(key: string, member: string): Promise<number | null> {
    try {
      const client = this.redisService.getClient();
      const fullKey = this.buildKey(key);
      const result = await client.zrevrank(fullKey, member);
      return result;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Cache zrevrank error for key ${key}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * 删除缓存键（别名方法）
   * @param key 缓存键
   */
  async del(key: string): Promise<boolean> {
    return this.delete(key);
  }

  /**
   * 设置缓存键的过期时间（别名方法）
   * @param key 缓存键
   * @param seconds 过期时间（秒）
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    return this.setTtl(key, seconds);
  }

  // ==================== 辅助方法 ====================

  /**
   * 构建完整的缓存键（添加命名空间前缀）
   * 注意：RedisModule 已配置 'anima:' 前缀，这里添加 'cache:' 子命名空间
   */
  private buildKey(key: string): string {
    return `cache:${key}`;
  }

  /**
   * 构建标签键
   */
  private buildTagKey(tag: string): string {
    return `cache:_tags:${tag}`;
  }

  /**
   * 序列化值为 JSON 字符串
   */
  private serialize<T>(value: T): string {
    try {
      return JSON.stringify(value);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Serialization error: ${errorMessage}`);
      throw new Error(`Failed to serialize value: ${errorMessage}`);
    }
  }

  /**
   * 反序列化 JSON 字符串为对象
   */
  private deserialize<T>(value: string): T {
    try {
      return JSON.parse(value) as T;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Deserialization error: ${errorMessage}`);
      throw new Error(`Failed to deserialize value: ${errorMessage}`);
    }
  }
}
