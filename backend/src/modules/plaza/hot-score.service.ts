import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import { Cron, CronExpression } from '@nestjs/schedule';

// 热度计算权重
const HOT_SCORE_WEIGHTS = {
  like: 1,
  comment: 3,
  quote: 5,
  share: 8,
};

// 时间衰减因子
const TIME_DECAY_FACTOR = 1.5;

// 热度计算时间窗口（小时）
const HOT_SCORE_WINDOW_HOURS = 24;

@Injectable()
export class HotScoreService {
  private readonly logger = new Logger(HotScoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 计算单个 Card 的热度分数
   * 公式: HotScore = (likes * 1 + comments * 3 + quotes * 5 + shares * 8) / (age_hours + 2)^1.5
   */
  calculateHotScore(
    likeCount: number,
    commentCount: number,
    quoteCount: number,
    shareCount: number,
    createdAt: Date,
  ): number {
    const now = new Date();
    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    const rawScore =
      likeCount * HOT_SCORE_WEIGHTS.like +
      commentCount * HOT_SCORE_WEIGHTS.comment +
      quoteCount * HOT_SCORE_WEIGHTS.quote +
      shareCount * HOT_SCORE_WEIGHTS.share;

    // 时间衰减
    const decayFactor = Math.pow(ageHours + 2, TIME_DECAY_FACTOR);
    const hotScore = rawScore / decayFactor;

    // 保留4位小数
    return Math.round(hotScore * 10000) / 10000;
  }

  /**
   * 更新单个 Card 的热度分数
   */
  async updateCardHotScore(cardId: string): Promise<number> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
        likeCount: true,
        commentCount: true,
        quoteCount: true,
        createdAt: true,
      },
    });

    if (!card) {
      return 0;
    }

    const hotScore = this.calculateHotScore(
      card.likeCount,
      card.commentCount,
      card.quoteCount,
      0, // shareCount 暂时为0
      card.createdAt,
    );

    await this.prisma.card.update({
      where: { id: cardId },
      data: { hotScore },
    });

    // 更新 Redis 热门排行榜
    await this.updateTrendingCache(cardId, hotScore);

    return hotScore;
  }

  /**
   * 批量更新热度分数（定时任务）
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async batchUpdateHotScores(): Promise<void> {
    this.logger.log('开始批量更新热度分数...');

    try {
      // 获取最近24小时内有活动的 Card
      const recentTime = new Date(
        Date.now() - HOT_SCORE_WINDOW_HOURS * 60 * 60 * 1000,
      );

      const cards = await this.prisma.card.findMany({
        where: {
          isDeleted: false,
          OR: [
            { createdAt: { gte: recentTime } },
            { updatedAt: { gte: recentTime } },
          ],
        },
        select: {
          id: true,
          likeCount: true,
          commentCount: true,
          quoteCount: true,
          createdAt: true,
        },
      });

      this.logger.log(`找到 ${cards.length} 个需要更新的 Card`);

      // 批量更新
      const updates = cards.map((card) => {
        const hotScore = this.calculateHotScore(
          card.likeCount,
          card.commentCount,
          card.quoteCount,
          0,
          card.createdAt,
        );

        return this.prisma.card.update({
          where: { id: card.id },
          data: { hotScore },
        });
      });

      await Promise.all(updates);

      // 更新热门排行榜缓存
      await this.rebuildTrendingCache();

      this.logger.log('热度分数更新完成');
    } catch (error) {
      this.logger.error('批量更新热度分数失败', error);
    }
  }

  /**
   * 更新 Redis 热门排行榜缓存
   */
  private async updateTrendingCache(
    cardId: string,
    hotScore: number,
  ): Promise<void> {
    try {
      const key = 'trending:cards';
      // 使用 ZADD 更新排行榜
      await this.cacheService.zadd(key, hotScore, cardId);
      // 只保留前1000个
      await this.cacheService.zremrangebyrank(key, 0, -1001);
    } catch (error) {
      this.logger.warn('更新热门缓存失败', error);
    }
  }

  /**
   * 重建热门排行榜缓存
   */
  private async rebuildTrendingCache(): Promise<void> {
    try {
      const topCards = await this.prisma.card.findMany({
        where: { isDeleted: false },
        orderBy: { hotScore: 'desc' },
        take: 1000,
        select: { id: true, hotScore: true },
      });

      const key = 'trending:cards';
      // 清空旧缓存
      await this.cacheService.del(key);

      // 批量添加
      for (const card of topCards) {
        await this.cacheService.zadd(key, card.hotScore, card.id);
      }

      // 设置过期时间（10分钟）
      await this.cacheService.expire(key, 600);
    } catch (error) {
      this.logger.warn('重建热门缓存失败', error);
    }
  }

  /**
   * 获取热门 Card ID 列表
   */
  async getTrendingCardIds(
    limit: number = 20,
    offset: number = 0,
  ): Promise<string[]> {
    try {
      const key = 'trending:cards';
      const ids = await this.cacheService.zrevrange(
        key,
        offset,
        offset + limit - 1,
      );
      return ids || [];
    } catch (error) {
      this.logger.warn('获取热门缓存失败，回退到数据库查询', error);
      // 回退到数据库查询
      const cards = await this.prisma.card.findMany({
        where: { isDeleted: false },
        orderBy: { hotScore: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true },
      });
      return cards.map((c) => c.id);
    }
  }

  /**
   * 获取 Card 的热度排名
   */
  async getCardRank(cardId: string): Promise<number | null> {
    try {
      const key = 'trending:cards';
      const rank = await this.cacheService.zrevrank(key, cardId);
      return rank !== null ? rank + 1 : null;
    } catch {
      return null;
    }
  }
}
