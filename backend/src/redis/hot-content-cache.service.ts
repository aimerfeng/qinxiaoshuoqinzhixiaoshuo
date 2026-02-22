import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service.js';

/**
 * 热门作品缓存数据
 */
export interface HotWorkCache {
  id: string;
  title: string;
  authorId: string;
  authorName: string;
  coverImage: string | null;
  viewCount: number;
  likeCount: number;
  hotScore: number;
  contentType: string;
  updatedAt: string;
}

/**
 * 热门卡片缓存数据
 */
export interface HotCardCache {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  likeCount: number;
  commentCount: number;
  hotScore: number;
  hasQuote: boolean;
  createdAt: string;
}

/**
 * 热门内容缓存配置
 */
interface HotContentConfig {
  /** 热门作品缓存 TTL（秒） */
  hotWorksTtl: number;
  /** 热门卡片缓存 TTL（秒） */
  hotCardsTtl: number;
  /** 热门作品列表大小 */
  hotWorksSize: number;
  /** 热门卡片列表大小 */
  hotCardsSize: number;
  /** 分类热门作品列表大小 */
  categoryHotWorksSize: number;
}

/**
 * 热门内容缓存服务
 *
 * 根据需求10验收标准2：使用 Redis 缓存热点数据
 *
 * 功能：
 * 1. 缓存热门作品列表（全站、分类）
 * 2. 缓存热门卡片列表（广场推荐流）
 * 3. 支持热度分数排序
 * 4. 自动过期和刷新机制
 */
@Injectable()
export class HotContentCacheService {
  private readonly logger = new Logger(HotContentCacheService.name);

  // 缓存键前缀
  private readonly HOT_WORKS_KEY = 'hot:works';
  private readonly HOT_WORKS_BY_CATEGORY_KEY = 'hot:works:category';
  private readonly HOT_CARDS_KEY = 'hot:cards';
  private readonly TRENDING_WORKS_KEY = 'trending:works';

  // 默认配置
  private readonly config: HotContentConfig = {
    hotWorksTtl: 300, // 5 分钟
    hotCardsTtl: 180, // 3 分钟
    hotWorksSize: 100,
    hotCardsSize: 200,
    categoryHotWorksSize: 50,
  };

  constructor(private readonly cacheService: CacheService) {}

  // ==================== 热门作品缓存 ====================

  /**
   * 获取热门作品列表
   * @param limit 返回数量
   * @param offset 偏移量
   */
  async getHotWorks(
    limit: number = 20,
    offset: number = 0,
  ): Promise<HotWorkCache[]> {
    const cacheKey = `${this.HOT_WORKS_KEY}:list`;
    const cached = await this.cacheService.get<HotWorkCache[]>(cacheKey);

    if (cached) {
      return cached.slice(offset, offset + limit);
    }

    return [];
  }

  /**
   * 设置热门作品列表
   * @param works 作品列表
   */
  async setHotWorks(works: HotWorkCache[]): Promise<void> {
    const cacheKey = `${this.HOT_WORKS_KEY}:list`;
    // 只保留前 N 个
    const limitedWorks = works.slice(0, this.config.hotWorksSize);
    await this.cacheService.set(
      cacheKey,
      limitedWorks,
      this.config.hotWorksTtl,
    );
    this.logger.debug(`Hot works cache updated: ${limitedWorks.length} items`);
  }

  /**
   * 获取分类热门作品
   * @param category 分类（NOVEL/MANGA）
   * @param limit 返回数量
   */
  async getHotWorksByCategory(
    category: string,
    limit: number = 20,
  ): Promise<HotWorkCache[]> {
    const cacheKey = `${this.HOT_WORKS_BY_CATEGORY_KEY}:${category}`;
    const cached = await this.cacheService.get<HotWorkCache[]>(cacheKey);

    if (cached) {
      return cached.slice(0, limit);
    }

    return [];
  }

  /**
   * 设置分类热门作品
   * @param category 分类
   * @param works 作品列表
   */
  async setHotWorksByCategory(
    category: string,
    works: HotWorkCache[],
  ): Promise<void> {
    const cacheKey = `${this.HOT_WORKS_BY_CATEGORY_KEY}:${category}`;
    const limitedWorks = works.slice(0, this.config.categoryHotWorksSize);
    await this.cacheService.set(
      cacheKey,
      limitedWorks,
      this.config.hotWorksTtl,
    );
    this.logger.debug(
      `Hot works cache for ${category} updated: ${limitedWorks.length} items`,
    );
  }

  /**
   * 使热门作品缓存失效
   */
  async invalidateHotWorks(): Promise<void> {
    await this.cacheService.deletePattern(`${this.HOT_WORKS_KEY}:*`);
    await this.cacheService.deletePattern(
      `${this.HOT_WORKS_BY_CATEGORY_KEY}:*`,
    );
    this.logger.debug('Hot works cache invalidated');
  }

  // ==================== 热门卡片缓存 ====================

  /**
   * 获取热门卡片列表（广场推荐流）
   * @param limit 返回数量
   * @param offset 偏移量
   */
  async getHotCards(
    limit: number = 20,
    offset: number = 0,
  ): Promise<HotCardCache[]> {
    const cacheKey = `${this.HOT_CARDS_KEY}:list`;
    const cached = await this.cacheService.get<HotCardCache[]>(cacheKey);

    if (cached) {
      return cached.slice(offset, offset + limit);
    }

    return [];
  }

  /**
   * 设置热门卡片列表
   * @param cards 卡片列表
   */
  async setHotCards(cards: HotCardCache[]): Promise<void> {
    const cacheKey = `${this.HOT_CARDS_KEY}:list`;
    const limitedCards = cards.slice(0, this.config.hotCardsSize);
    await this.cacheService.set(
      cacheKey,
      limitedCards,
      this.config.hotCardsTtl,
    );
    this.logger.debug(`Hot cards cache updated: ${limitedCards.length} items`);
  }

  /**
   * 使热门卡片缓存失效
   */
  async invalidateHotCards(): Promise<void> {
    await this.cacheService.deletePattern(`${this.HOT_CARDS_KEY}:*`);
    this.logger.debug('Hot cards cache invalidated');
  }

  // ==================== 趋势作品缓存（实时热度） ====================

  /**
   * 更新作品热度分数（使用 Sorted Set）
   * @param workId 作品 ID
   * @param score 热度分数
   */
  async updateWorkHotScore(workId: string, score: number): Promise<void> {
    await this.cacheService.zadd(this.TRENDING_WORKS_KEY, score, workId);
    // 保持列表大小，移除低分作品
    await this.cacheService.zremrangebyrank(
      this.TRENDING_WORKS_KEY,
      0,
      -this.config.hotWorksSize - 1,
    );
  }

  /**
   * 获取趋势作品 ID 列表（按热度降序）
   * @param limit 返回数量
   */
  async getTrendingWorkIds(limit: number = 20): Promise<string[]> {
    return this.cacheService.zrevrange(this.TRENDING_WORKS_KEY, 0, limit - 1);
  }

  /**
   * 获取作品热度排名
   * @param workId 作品 ID
   */
  async getWorkHotRank(workId: string): Promise<number | null> {
    return this.cacheService.zrevrank(this.TRENDING_WORKS_KEY, workId);
  }

  // ==================== 单个内容缓存 ====================

  /**
   * 缓存单个作品详情
   * @param workId 作品 ID
   * @param work 作品数据
   * @param ttl 过期时间（秒）
   */
  async cacheWork(
    workId: string,
    work: HotWorkCache,
    ttl: number = 600,
  ): Promise<void> {
    const cacheKey = `work:${workId}`;
    await this.cacheService.set(cacheKey, work, ttl);
  }

  /**
   * 获取缓存的作品详情
   * @param workId 作品 ID
   */
  async getCachedWork(workId: string): Promise<HotWorkCache | null> {
    const cacheKey = `work:${workId}`;
    return this.cacheService.get<HotWorkCache>(cacheKey);
  }

  /**
   * 使单个作品缓存失效
   * @param workId 作品 ID
   */
  async invalidateWork(workId: string): Promise<void> {
    const cacheKey = `work:${workId}`;
    await this.cacheService.delete(cacheKey);
  }

  /**
   * 缓存单个卡片详情
   * @param cardId 卡片 ID
   * @param card 卡片数据
   * @param ttl 过期时间（秒）
   */
  async cacheCard(
    cardId: string,
    card: HotCardCache,
    ttl: number = 300,
  ): Promise<void> {
    const cacheKey = `card:${cardId}`;
    await this.cacheService.set(cacheKey, card, ttl);
  }

  /**
   * 获取缓存的卡片详情
   * @param cardId 卡片 ID
   */
  async getCachedCard(cardId: string): Promise<HotCardCache | null> {
    const cacheKey = `card:${cardId}`;
    return this.cacheService.get<HotCardCache>(cacheKey);
  }

  /**
   * 使单个卡片缓存失效
   * @param cardId 卡片 ID
   */
  async invalidateCard(cardId: string): Promise<void> {
    const cacheKey = `card:${cardId}`;
    await this.cacheService.delete(cacheKey);
  }

  // ==================== 批量操作 ====================

  /**
   * 批量获取作品缓存
   * @param workIds 作品 ID 列表
   */
  async getCachedWorks(
    workIds: string[],
  ): Promise<Map<string, HotWorkCache | null>> {
    const keys = workIds.map((id) => `work:${id}`);
    return this.cacheService.mget<HotWorkCache>(keys);
  }

  /**
   * 批量设置作品缓存
   * @param works 作品列表
   * @param ttl 过期时间（秒）
   */
  async setCachedWorks(
    works: HotWorkCache[],
    ttl: number = 600,
  ): Promise<void> {
    const entries = works.map((work) => ({
      key: `work:${work.id}`,
      value: work,
    }));
    await this.cacheService.mset(entries, ttl);
  }
}
