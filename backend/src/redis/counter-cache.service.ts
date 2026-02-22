import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service.js';

/**
 * 计数器类型
 */
export enum CounterType {
  /** 作品阅读量 */
  WORK_VIEW = 'work:view',
  /** 章节阅读量 */
  CHAPTER_VIEW = 'chapter:view',
  /** 作品点赞数 */
  WORK_LIKE = 'work:like',
  /** 卡片点赞数 */
  CARD_LIKE = 'card:like',
  /** 评论点赞数 */
  COMMENT_LIKE = 'comment:like',
  /** 卡片评论数 */
  CARD_COMMENT = 'card:comment',
  /** 段落引用数 */
  PARAGRAPH_QUOTE = 'paragraph:quote',
  /** 弹幕数量 */
  ANCHOR_DANMAKU = 'anchor:danmaku',
}

/**
 * 计数器同步配置
 */
interface CounterSyncConfig {
  /** 同步阈值（达到此值时触发同步） */
  syncThreshold: number;
  /** 同步间隔（秒） */
  syncInterval: number;
  /** 计数器过期时间（秒） */
  counterTtl: number;
}

/**
 * 待同步的计数器数据
 */
interface PendingSync {
  type: CounterType;
  id: string;
  delta: number;
}

/**
 * 计数器缓存服务
 *
 * 根据需求10验收标准4：通过缓存优化响应时间
 *
 * 功能：
 * 1. 高性能计数器（阅读量、点赞数等）
 * 2. 批量增量更新，减少数据库写入
 * 3. 定期同步到数据库
 * 4. 支持原子操作，保证并发安全
 */
@Injectable()
export class CounterCacheService {
  private readonly logger = new Logger(CounterCacheService.name);

  // 缓存键前缀
  private readonly COUNTER_PREFIX = 'counter';
  private readonly PENDING_SYNC_KEY = 'counter:pending_sync';
  private readonly SYNC_LOCK_KEY = 'counter:sync_lock';

  // 默认配置
  private readonly config: CounterSyncConfig = {
    syncThreshold: 100, // 累计 100 次变更后同步
    syncInterval: 60, // 60 秒同步一次
    counterTtl: 86400, // 24 小时过期
  };

  constructor(private readonly redisService: RedisService) {}

  // ==================== 计数器操作 ====================

  /**
   * 增加计数器
   * @param type 计数器类型
   * @param id 目标 ID
   * @param delta 增量（默认 1）
   * @returns 增加后的值
   */
  async increment(
    type: CounterType,
    id: string,
    delta: number = 1,
  ): Promise<number> {
    const counterKey = this.buildCounterKey(type, id);
    const newValue = await this.redisService.incrBy(counterKey, delta);

    // 设置过期时间（如果是新键）
    if (newValue === delta) {
      await this.redisService.expire(counterKey, this.config.counterTtl);
    }

    // 记录待同步
    await this.recordPendingSync(type, id, delta);

    this.logger.debug(
      `Counter incremented: ${type}:${id} += ${delta} = ${newValue}`,
    );
    return newValue;
  }

  /**
   * 减少计数器
   * @param type 计数器类型
   * @param id 目标 ID
   * @param delta 减量（默认 1）
   * @returns 减少后的值
   */
  async decrement(
    type: CounterType,
    id: string,
    delta: number = 1,
  ): Promise<number> {
    const counterKey = this.buildCounterKey(type, id);
    const newValue = await this.redisService.incrBy(counterKey, -delta);

    // 记录待同步
    await this.recordPendingSync(type, id, -delta);

    this.logger.debug(
      `Counter decremented: ${type}:${id} -= ${delta} = ${newValue}`,
    );
    return newValue;
  }

  /**
   * 获取计数器值
   * @param type 计数器类型
   * @param id 目标 ID
   * @returns 当前值，不存在返回 null
   */
  async get(type: CounterType, id: string): Promise<number | null> {
    const counterKey = this.buildCounterKey(type, id);
    const value = await this.redisService.get(counterKey);

    if (value === null) {
      return null;
    }

    return parseInt(value, 10);
  }

  /**
   * 设置计数器值（用于从数据库初始化）
   * @param type 计数器类型
   * @param id 目标 ID
   * @param value 值
   */
  async set(type: CounterType, id: string, value: number): Promise<void> {
    const counterKey = this.buildCounterKey(type, id);
    await this.redisService.set(
      counterKey,
      value.toString(),
      this.config.counterTtl,
    );
    this.logger.debug(`Counter set: ${type}:${id} = ${value}`);
  }

  /**
   * 批量获取计数器值
   * @param type 计数器类型
   * @param ids 目标 ID 列表
   * @returns ID 到值的映射
   */
  async getBatch(
    type: CounterType,
    ids: string[],
  ): Promise<Map<string, number | null>> {
    if (ids.length === 0) {
      return new Map();
    }

    const client = this.redisService.getClient();
    const keys = ids.map((id) => this.buildCounterKey(type, id));
    const values = await client.mget(...keys);

    const result = new Map<string, number | null>();
    ids.forEach((id, index) => {
      const value = values[index];
      result.set(id, value !== null ? parseInt(value, 10) : null);
    });

    return result;
  }

  /**
   * 批量设置计数器值
   * @param type 计数器类型
   * @param counters ID 到值的映射
   */
  async setBatch(
    type: CounterType,
    counters: Map<string, number>,
  ): Promise<void> {
    if (counters.size === 0) {
      return;
    }

    const client = this.redisService.getClient();
    const pipeline = client.pipeline();

    counters.forEach((value, id) => {
      const key = this.buildCounterKey(type, id);
      pipeline.set(key, value.toString(), 'EX', this.config.counterTtl);
    });

    await pipeline.exec();
    this.logger.debug(`Counter batch set: ${type}, count: ${counters.size}`);
  }

  /**
   * 删除计数器
   * @param type 计数器类型
   * @param id 目标 ID
   */
  async delete(type: CounterType, id: string): Promise<void> {
    const counterKey = this.buildCounterKey(type, id);
    await this.redisService.del(counterKey);
    this.logger.debug(`Counter deleted: ${type}:${id}`);
  }

  // ==================== 便捷方法 ====================

  /**
   * 增加作品阅读量
   */
  async incrementWorkView(workId: string): Promise<number> {
    return this.increment(CounterType.WORK_VIEW, workId);
  }

  /**
   * 增加章节阅读量
   */
  async incrementChapterView(chapterId: string): Promise<number> {
    return this.increment(CounterType.CHAPTER_VIEW, chapterId);
  }

  /**
   * 增加卡片点赞数
   */
  async incrementCardLike(cardId: string): Promise<number> {
    return this.increment(CounterType.CARD_LIKE, cardId);
  }

  /**
   * 减少卡片点赞数
   */
  async decrementCardLike(cardId: string): Promise<number> {
    return this.decrement(CounterType.CARD_LIKE, cardId);
  }

  /**
   * 增加卡片评论数
   */
  async incrementCardComment(cardId: string): Promise<number> {
    return this.increment(CounterType.CARD_COMMENT, cardId);
  }

  /**
   * 减少卡片评论数
   */
  async decrementCardComment(cardId: string): Promise<number> {
    return this.decrement(CounterType.CARD_COMMENT, cardId);
  }

  /**
   * 增加段落引用数
   */
  async incrementParagraphQuote(paragraphId: string): Promise<number> {
    return this.increment(CounterType.PARAGRAPH_QUOTE, paragraphId);
  }

  /**
   * 增加弹幕数量
   */
  async incrementAnchorDanmaku(anchorId: string): Promise<number> {
    return this.increment(CounterType.ANCHOR_DANMAKU, anchorId);
  }

  /**
   * 获取作品阅读量
   */
  async getWorkView(workId: string): Promise<number | null> {
    return this.get(CounterType.WORK_VIEW, workId);
  }

  /**
   * 获取卡片点赞数
   */
  async getCardLike(cardId: string): Promise<number | null> {
    return this.get(CounterType.CARD_LIKE, cardId);
  }

  // ==================== 同步机制 ====================

  /**
   * 记录待同步的计数器变更
   */
  private async recordPendingSync(
    type: CounterType,
    id: string,
    delta: number,
  ): Promise<void> {
    const syncKey = `${type}:${id}`;
    const client = this.redisService.getClient();

    // 使用 Hash 存储待同步的增量
    await client.hincrby(this.PENDING_SYNC_KEY, syncKey, delta);
  }

  /**
   * 获取所有待同步的计数器变更
   * @returns 待同步数据列表
   */
  async getPendingSyncs(): Promise<PendingSync[]> {
    const data = await this.redisService.hgetall(this.PENDING_SYNC_KEY);
    const syncs: PendingSync[] = [];

    for (const [key, value] of Object.entries(data)) {
      const [type, id] = key.split(':') as [CounterType, string];
      const delta = parseInt(value, 10);

      if (delta !== 0) {
        syncs.push({ type, id, delta });
      }
    }

    return syncs;
  }

  /**
   * 清除已同步的计数器变更
   * @param syncs 已同步的数据
   */
  async clearSyncedCounters(syncs: PendingSync[]): Promise<void> {
    if (syncs.length === 0) {
      return;
    }

    const fields = syncs.map((s) => `${s.type}:${s.id}`);
    await this.redisService.hdel(this.PENDING_SYNC_KEY, ...fields);
    this.logger.debug(`Cleared ${syncs.length} synced counters`);
  }

  /**
   * 尝试获取同步锁
   * @param ttl 锁过期时间（秒）
   * @returns 是否获取成功
   */
  async acquireSyncLock(ttl: number = 60): Promise<boolean> {
    const client = this.redisService.getClient();
    const result = await client.set(this.SYNC_LOCK_KEY, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * 释放同步锁
   */
  async releaseSyncLock(): Promise<void> {
    await this.redisService.del(this.SYNC_LOCK_KEY);
  }

  // ==================== 辅助方法 ====================

  /**
   * 构建计数器键
   */
  private buildCounterKey(type: CounterType, id: string): string {
    return `${this.COUNTER_PREFIX}:${type}:${id}`;
  }
}
