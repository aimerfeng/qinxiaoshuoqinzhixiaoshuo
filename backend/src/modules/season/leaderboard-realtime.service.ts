import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { LeaderboardCategory } from './dto/leaderboard.dto.js';

/**
 * 排行榜用户信息接口
 */
export interface LeaderboardUserInfo {
  userId: string;
  score: number;
  rank: number;
}

/**
 * 排行榜实时更新服务
 *
 * 需求25.1.9: 排行榜实时更新服务（Redis Sorted Set）
 *
 * 使用 Redis Sorted Set 实现高性能实时排行榜：
 * - ZADD: 更新用户分数
 * - ZREVRANK: 获取用户排名（降序）
 * - ZREVRANGE: 获取前N名用户
 * - ZCOUNT: 获取总参与人数
 *
 * 设计语言:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
@Injectable()
export class LeaderboardRealtimeService {
  private readonly logger = new Logger(LeaderboardRealtimeService.name);

  // Redis key 前缀
  private readonly LEADERBOARD_KEY_PREFIX = 'leaderboard:realtime:';
  private readonly SYNC_LOCK_PREFIX = 'leaderboard:sync:lock:';
  private readonly LAST_SYNC_PREFIX = 'leaderboard:sync:last:';

  // 同步配置
  private readonly SYNC_LOCK_TTL = 300; // 同步锁过期时间（秒）
  private readonly LEADERBOARD_TTL = 90 * 24 * 60 * 60; // 排行榜数据过期时间（90天）

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 生成排行榜 Redis Key
   */
  private getLeaderboardKey(seasonId: string, category: LeaderboardCategory): string {
    return `${this.LEADERBOARD_KEY_PREFIX}${seasonId}:${category}`;
  }

  /**
   * 生成同步锁 Redis Key
   */
  private getSyncLockKey(seasonId: string, category: LeaderboardCategory): string {
    return `${this.SYNC_LOCK_PREFIX}${seasonId}:${category}`;
  }

  /**
   * 生成最后同步时间 Redis Key
   */
  private getLastSyncKey(seasonId: string, category: LeaderboardCategory): string {
    return `${this.LAST_SYNC_PREFIX}${seasonId}:${category}`;
  }

  /**
   * 更新用户分数
   *
   * 使用 ZADD 命令更新用户在排行榜中的分数
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param userId 用户ID
   * @param score 新分数
   * @returns 更新后的排名（从1开始）
   */
  async updateScore(
    seasonId: string,
    category: LeaderboardCategory,
    userId: string,
    score: number,
  ): Promise<number> {
    const key = this.getLeaderboardKey(seasonId, category);

    // 使用 ZADD 更新分数
    await this.redis.zadd(key, score, userId);

    // 设置过期时间
    await this.redis.expire(key, this.LEADERBOARD_TTL);

    // 获取更新后的排名（ZREVRANK 返回从0开始的排名）
    const rank = await this.redis.getClient().zrevrank(key, userId);

    const finalRank = rank !== null ? rank + 1 : -1;

    this.logger.debug(
      `用户 ${userId} 在赛季 ${seasonId} 的 ${category} 榜分数更新为 ${score}，排名: ${finalRank}`,
    );

    return finalRank;
  }

  /**
   * 增加用户分数
   *
   * 使用 ZINCRBY 命令增加用户分数
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param userId 用户ID
   * @param increment 增加的分数
   * @returns 更新后的分数和排名
   */
  async incrementScore(
    seasonId: string,
    category: LeaderboardCategory,
    userId: string,
    increment: number,
  ): Promise<{ newScore: number; rank: number }> {
    const key = this.getLeaderboardKey(seasonId, category);

    // 使用 ZINCRBY 增加分数
    const newScore = await this.redis.getClient().zincrby(key, increment, userId);

    // 设置过期时间
    await this.redis.expire(key, this.LEADERBOARD_TTL);

    // 获取更新后的排名
    const rank = await this.redis.getClient().zrevrank(key, userId);

    const finalRank = rank !== null ? rank + 1 : -1;

    this.logger.debug(
      `用户 ${userId} 在赛季 ${seasonId} 的 ${category} 榜分数增加 ${increment}，新分数: ${newScore}，排名: ${finalRank}`,
    );

    return {
      newScore: parseFloat(newScore),
      rank: finalRank,
    };
  }

  /**
   * 获取用户排名
   *
   * 使用 ZREVRANK 获取用户在排行榜中的排名（降序）
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param userId 用户ID
   * @returns 用户排名（从1开始），如果用户不在排行榜中返回 null
   */
  async getUserRank(
    seasonId: string,
    category: LeaderboardCategory,
    userId: string,
  ): Promise<number | null> {
    const key = this.getLeaderboardKey(seasonId, category);

    // ZREVRANK 返回从0开始的排名
    const rank = await this.redis.getClient().zrevrank(key, userId);

    if (rank === null) {
      return null;
    }

    return rank + 1;
  }

  /**
   * 获取用户分数
   *
   * 使用 ZSCORE 获取用户分数
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param userId 用户ID
   * @returns 用户分数，如果用户不在排行榜中返回 null
   */
  async getUserScore(
    seasonId: string,
    category: LeaderboardCategory,
    userId: string,
  ): Promise<number | null> {
    const key = this.getLeaderboardKey(seasonId, category);

    const score = await this.redis.zscore(key, userId);

    if (score === null) {
      return null;
    }

    return parseFloat(score);
  }

  /**
   * 获取用户排名和分数
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param userId 用户ID
   * @returns 用户排名和分数信息
   */
  async getUserRankAndScore(
    seasonId: string,
    category: LeaderboardCategory,
    userId: string,
  ): Promise<{ rank: number | null; score: number | null }> {
    const [rank, score] = await Promise.all([
      this.getUserRank(seasonId, category, userId),
      this.getUserScore(seasonId, category, userId),
    ]);

    return { rank, score };
  }

  /**
   * 获取前N名用户
   *
   * 使用 ZREVRANGE 获取排行榜前N名用户（降序）
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param limit 获取数量（默认10）
   * @returns 前N名用户列表
   */
  async getTopUsers(
    seasonId: string,
    category: LeaderboardCategory,
    limit: number = 10,
  ): Promise<LeaderboardUserInfo[]> {
    const key = this.getLeaderboardKey(seasonId, category);

    // 使用 ZREVRANGE 获取前N名，带分数
    const results = await this.redis.getClient().zrevrange(key, 0, limit - 1, 'WITHSCORES');

    // 解析结果：[member1, score1, member2, score2, ...]
    const users: LeaderboardUserInfo[] = [];
    for (let i = 0; i < results.length; i += 2) {
      users.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
        rank: Math.floor(i / 2) + 1,
      });
    }

    return users;
  }

  /**
   * 获取指定范围的用户
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param start 起始排名（从0开始）
   * @param stop 结束排名
   * @returns 指定范围的用户列表
   */
  async getUsersInRange(
    seasonId: string,
    category: LeaderboardCategory,
    start: number,
    stop: number,
  ): Promise<LeaderboardUserInfo[]> {
    const key = this.getLeaderboardKey(seasonId, category);

    // 使用 ZREVRANGE 获取指定范围，带分数
    const results = await this.redis.getClient().zrevrange(key, start, stop, 'WITHSCORES');

    // 解析结果
    const users: LeaderboardUserInfo[] = [];
    for (let i = 0; i < results.length; i += 2) {
      users.push({
        userId: results[i],
        score: parseFloat(results[i + 1]),
        rank: start + Math.floor(i / 2) + 1,
      });
    }

    return users;
  }

  /**
   * 获取总参与人数
   *
   * 使用 ZCARD 获取排行榜中的总人数
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @returns 总参与人数
   */
  async getTotalParticipants(
    seasonId: string,
    category: LeaderboardCategory,
  ): Promise<number> {
    const key = this.getLeaderboardKey(seasonId, category);

    return this.redis.getClient().zcard(key);
  }

  /**
   * 获取指定分数范围内的用户数量
   *
   * 使用 ZCOUNT 获取分数在指定范围内的用户数量
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param minScore 最小分数
   * @param maxScore 最大分数
   * @returns 用户数量
   */
  async getCountInScoreRange(
    seasonId: string,
    category: LeaderboardCategory,
    minScore: number,
    maxScore: number,
  ): Promise<number> {
    const key = this.getLeaderboardKey(seasonId, category);

    return this.redis.getClient().zcount(key, minScore, maxScore);
  }

  /**
   * 从数据库同步排行榜数据到 Redis
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @returns 同步的用户数量
   */
  async syncFromDatabase(
    seasonId: string,
    category: LeaderboardCategory,
  ): Promise<number> {
    const lockKey = this.getSyncLockKey(seasonId, category);

    // 尝试获取同步锁
    const lockAcquired = await this.acquireLock(lockKey);
    if (!lockAcquired) {
      this.logger.warn(`同步锁获取失败，跳过同步: ${seasonId}:${category}`);
      return 0;
    }

    try {
      // 验证赛季存在
      await this.validateSeason(seasonId);

      // 从数据库获取排行榜数据
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const entries = await (this.prisma as any).seasonLeaderboard.findMany({
        where: {
          seasonId,
          category,
        },
        select: {
          userId: true,
          score: true,
        },
      });

      if (!entries || (entries as any[]).length === 0) {
        this.logger.log(`赛季 ${seasonId} 的 ${category} 榜没有数据需要同步`);
        return 0;
      }

      const key = this.getLeaderboardKey(seasonId, category);

      // 清空现有数据
      await this.redis.del(key);

      // 批量添加数据到 Redis
      const pipeline = this.redis.getClient().pipeline();
      for (const entry of entries as any[]) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        pipeline.zadd(key, entry.score as number, entry.userId as string);
      }
      await pipeline.exec();

      // 设置过期时间
      await this.redis.expire(key, this.LEADERBOARD_TTL);

      // 记录最后同步时间
      const lastSyncKey = this.getLastSyncKey(seasonId, category);
      await this.redis.set(lastSyncKey, new Date().toISOString(), this.LEADERBOARD_TTL);

      const count = (entries as any[]).length;
      this.logger.log(`从数据库同步 ${count} 条记录到 Redis: ${seasonId}:${category}`);

      return count;
    } finally {
      // 释放同步锁
      await this.releaseLock(lockKey);
    }
  }

  /**
   * 从 Redis 同步排行榜数据到数据库
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @returns 同步的用户数量
   */
  async syncToDatabase(
    seasonId: string,
    category: LeaderboardCategory,
  ): Promise<number> {
    const lockKey = this.getSyncLockKey(seasonId, category);

    // 尝试获取同步锁
    const lockAcquired = await this.acquireLock(lockKey);
    if (!lockAcquired) {
      this.logger.warn(`同步锁获取失败，跳过同步: ${seasonId}:${category}`);
      return 0;
    }

    try {
      // 验证赛季存在
      await this.validateSeason(seasonId);

      const key = this.getLeaderboardKey(seasonId, category);

      // 获取 Redis 中的所有数据
      const total = await this.redis.getClient().zcard(key);
      if (total === 0) {
        this.logger.log(`Redis 中没有数据需要同步: ${seasonId}:${category}`);
        return 0;
      }

      // 分批获取数据（每批1000条）
      const batchSize = 1000;
      let synced = 0;

      for (let start = 0; start < total; start += batchSize) {
        const end = Math.min(start + batchSize - 1, total - 1);
        const results = await this.redis.getClient().zrevrange(key, start, end, 'WITHSCORES');

        // 解析数据
        const updates: { userId: string; score: number; rank: number }[] = [];
        for (let i = 0; i < results.length; i += 2) {
          updates.push({
            userId: results[i],
            score: parseFloat(results[i + 1]),
            rank: start + Math.floor(i / 2) + 1,
          });
        }

        // 批量更新数据库
        await this.prisma.$transaction(async (tx) => {
          for (const update of updates) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            await (tx as any).seasonLeaderboard.upsert({
              where: {
                userId_seasonId_category: {
                  userId: update.userId,
                  seasonId,
                  category,
                },
              },
              update: {
                score: update.score,
                rank: update.rank,
                updatedAt: new Date(),
              },
              create: {
                userId: update.userId,
                seasonId,
                category,
                score: update.score,
                rank: update.rank,
                peakScore: update.score,
                peakRank: update.rank,
              },
            });
          }
        });

        synced += updates.length;
      }

      // 记录最后同步时间
      const lastSyncKey = this.getLastSyncKey(seasonId, category);
      await this.redis.set(lastSyncKey, new Date().toISOString(), this.LEADERBOARD_TTL);

      this.logger.log(`从 Redis 同步 ${synced} 条记录到数据库: ${seasonId}:${category}`);

      return synced;
    } finally {
      // 释放同步锁
      await this.releaseLock(lockKey);
    }
  }

  /**
   * 同步所有类别的排行榜数据到数据库
   *
   * @param seasonId 赛季ID
   * @returns 各类别同步的用户数量
   */
  async syncAllCategoriesToDatabase(
    seasonId: string,
  ): Promise<Record<LeaderboardCategory, number>> {
    const categories = Object.values(LeaderboardCategory);
    const results: Record<string, number> = {};

    for (const category of categories) {
      results[category] = await this.syncToDatabase(seasonId, category);
    }

    return results as Record<LeaderboardCategory, number>;
  }

  /**
   * 从数据库同步所有类别的排行榜数据到 Redis
   *
   * @param seasonId 赛季ID
   * @returns 各类别同步的用户数量
   */
  async syncAllCategoriesFromDatabase(
    seasonId: string,
  ): Promise<Record<LeaderboardCategory, number>> {
    const categories = Object.values(LeaderboardCategory);
    const results: Record<string, number> = {};

    for (const category of categories) {
      results[category] = await this.syncFromDatabase(seasonId, category);
    }

    return results as Record<LeaderboardCategory, number>;
  }

  /**
   * 获取最后同步时间
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @returns 最后同步时间，如果没有同步过返回 null
   */
  async getLastSyncTime(
    seasonId: string,
    category: LeaderboardCategory,
  ): Promise<Date | null> {
    const lastSyncKey = this.getLastSyncKey(seasonId, category);
    const lastSync = await this.redis.get(lastSyncKey);

    if (!lastSync) {
      return null;
    }

    return new Date(lastSync);
  }

  /**
   * 检查是否需要同步
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param maxAgeMinutes 最大同步间隔（分钟）
   * @returns 是否需要同步
   */
  async needsSync(
    seasonId: string,
    category: LeaderboardCategory,
    maxAgeMinutes: number = 5,
  ): Promise<boolean> {
    const lastSync = await this.getLastSyncTime(seasonId, category);

    if (!lastSync) {
      return true;
    }

    const ageMs = Date.now() - lastSync.getTime();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;

    return ageMs > maxAgeMs;
  }

  /**
   * 删除用户从排行榜
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param userId 用户ID
   * @returns 是否删除成功
   */
  async removeUser(
    seasonId: string,
    category: LeaderboardCategory,
    userId: string,
  ): Promise<boolean> {
    const key = this.getLeaderboardKey(seasonId, category);

    const removed = await this.redis.getClient().zrem(key, userId);

    return removed > 0;
  }

  /**
   * 清空排行榜
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   */
  async clearLeaderboard(
    seasonId: string,
    category: LeaderboardCategory,
  ): Promise<void> {
    const key = this.getLeaderboardKey(seasonId, category);
    await this.redis.del(key);

    this.logger.log(`清空排行榜: ${seasonId}:${category}`);
  }

  /**
   * 获取用户周围的排名
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别
   * @param userId 用户ID
   * @param range 上下范围（默认5）
   * @returns 用户周围的排名列表
   */
  async getUserNeighbors(
    seasonId: string,
    category: LeaderboardCategory,
    userId: string,
    range: number = 5,
  ): Promise<{
    user: LeaderboardUserInfo | null;
    neighbors: LeaderboardUserInfo[];
  }> {
    const key = this.getLeaderboardKey(seasonId, category);

    // 获取用户排名
    const userRank = await this.redis.getClient().zrevrank(key, userId);

    if (userRank === null) {
      return { user: null, neighbors: [] };
    }

    // 获取用户分数
    const userScore = await this.redis.zscore(key, userId);

    const user: LeaderboardUserInfo = {
      userId,
      score: userScore ? parseFloat(userScore) : 0,
      rank: userRank + 1,
    };

    // 计算范围
    const start = Math.max(0, userRank - range);
    const stop = userRank + range;

    // 获取周围用户
    const neighbors = await this.getUsersInRange(seasonId, category, start, stop);

    return { user, neighbors };
  }

  /**
   * 验证赛季是否存在
   */
  private async validateSeason(seasonId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const season = await (this.prisma as any).season.findUnique({
      where: { id: seasonId },
      select: { id: true, status: true },
    });

    if (!season) {
      throw new NotFoundException(`赛季不存在: ${seasonId}`);
    }
  }

  /**
   * 获取分布式锁
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    const result = await this.redis.getClient().set(
      lockKey,
      '1',
      'EX',
      this.SYNC_LOCK_TTL,
      'NX',
    );

    return result === 'OK';
  }

  /**
   * 释放分布式锁
   */
  private async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(lockKey);
  }
}
