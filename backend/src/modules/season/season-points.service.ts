import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { SeasonConfigService } from './season-config.service.js';
import { LeaderboardRealtimeService } from './leaderboard-realtime.service.js';
import {
  LeaderboardCategory,
  SeasonTier,
  SeasonStatus,
} from './dto/leaderboard.dto.js';

/**
 * 积分变更原因枚举
 * 需求25.1.8: 赛季积分计算服务
 */
export enum PointsChangeReason {
  // 阅读活动
  READ_CHAPTER = 'READ_CHAPTER', // 阅读章节
  COMPLETE_WORK = 'COMPLETE_WORK', // 完成作品
  READING_DURATION = 'READING_DURATION', // 阅读时长

  // 创作活动
  PUBLISH_CHAPTER = 'PUBLISH_CHAPTER', // 发布章节
  RECEIVE_READS = 'RECEIVE_READS', // 获得阅读量
  RECEIVE_QUOTES = 'RECEIVE_QUOTES', // 获得引用

  // 社交活动
  POST_CARD = 'POST_CARD', // 发布Card
  RECEIVE_LIKES = 'RECEIVE_LIKES', // 获得点赞
  RECEIVE_COMMENTS = 'RECEIVE_COMMENTS', // 获得评论
  GAIN_FOLLOWERS = 'GAIN_FOLLOWERS', // 获得粉丝

  // 系统调整
  ADMIN_ADJUSTMENT = 'ADMIN_ADJUSTMENT', // 管理员调整
  SEASON_RESET = 'SEASON_RESET', // 赛季重置
}

/**
 * 积分变更记录接口
 */
export interface PointsChangeRecord {
  userId: string;
  seasonId: string;
  category: LeaderboardCategory;
  points: number;
  reason: PointsChangeReason;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * 积分添加结果接口
 */
export interface AddPointsResult {
  newScore: number;
  newTotalPoints: number;
  newTier: SeasonTier;
}

/**
 * 积分配置 - 各活动对应的积分值
 */
export const POINTS_CONFIG = {
  // 阅读活动积分
  [PointsChangeReason.READ_CHAPTER]: 2,
  [PointsChangeReason.COMPLETE_WORK]: 10,
  [PointsChangeReason.READING_DURATION]: 1, // 每30分钟

  // 创作活动积分
  [PointsChangeReason.PUBLISH_CHAPTER]: 20,
  [PointsChangeReason.RECEIVE_READS]: 1, // 每100阅读
  [PointsChangeReason.RECEIVE_QUOTES]: 5,

  // 社交活动积分
  [PointsChangeReason.POST_CARD]: 3,
  [PointsChangeReason.RECEIVE_LIKES]: 1,
  [PointsChangeReason.RECEIVE_COMMENTS]: 2,
  [PointsChangeReason.GAIN_FOLLOWERS]: 5,
};

/**
 * 综合分数权重配置
 */
export const OVERALL_WEIGHTS: Record<string, number> = {
  [LeaderboardCategory.READING]: 0.3,
  [LeaderboardCategory.CREATION]: 0.4,
  [LeaderboardCategory.SOCIAL]: 0.3,
};

/**
 * 赛季积分计算服务
 *
 * 需求25.1.8: 赛季积分计算服务
 *
 * 提供以下功能：
 * - addReadingPoints() - 添加阅读积分
 * - addCreationPoints() - 添加创作积分
 * - addSocialPoints() - 添加社交积分
 * - recalculateOverallScore() - 重新计算综合分数
 * - updateUserTier() - 更新用户段位
 *
 * 设计语言:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
@Injectable()
export class SeasonPointsService {
  private readonly logger = new Logger(SeasonPointsService.name);
  private readonly POINTS_LOG_KEY = 'season:points:log:';
  private readonly USER_POINTS_CACHE_PREFIX = 'season:user:points:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly seasonConfig: SeasonConfigService,
    @Inject(forwardRef(() => LeaderboardRealtimeService))
    private readonly leaderboardRealtime: LeaderboardRealtimeService,
  ) {}

  /**
   * 添加阅读积分
   *
   * 阅读活动包括：
   * - 阅读章节 (+2)
   * - 完成作品 (+10)
   * - 阅读时长 (+1/30分钟)
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   * @param points 积分数量
   * @param reason 积分原因
   * @param metadata 额外元数据
   */
  async addReadingPoints(
    userId: string,
    seasonId: string,
    points: number,
    reason: PointsChangeReason,
    metadata?: Record<string, unknown>,
  ): Promise<AddPointsResult> {
    return this.addPoints(
      userId,
      seasonId,
      LeaderboardCategory.READING,
      points,
      reason,
      metadata,
    );
  }

  /**
   * 添加创作积分
   *
   * 创作活动包括：
   * - 发布章节 (+20)
   * - 获得阅读量 (+1/100阅读)
   * - 获得引用 (+5)
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   * @param points 积分数量
   * @param reason 积分原因
   * @param metadata 额外元数据
   */
  async addCreationPoints(
    userId: string,
    seasonId: string,
    points: number,
    reason: PointsChangeReason,
    metadata?: Record<string, unknown>,
  ): Promise<AddPointsResult> {
    return this.addPoints(
      userId,
      seasonId,
      LeaderboardCategory.CREATION,
      points,
      reason,
      metadata,
    );
  }

  /**
   * 添加社交积分
   *
   * 社交活动包括：
   * - 发布Card (+3)
   * - 获得点赞 (+1)
   * - 获得评论 (+2)
   * - 获得粉丝 (+5)
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   * @param points 积分数量
   * @param reason 积分原因
   * @param metadata 额外元数据
   */
  async addSocialPoints(
    userId: string,
    seasonId: string,
    points: number,
    reason: PointsChangeReason,
    metadata?: Record<string, unknown>,
  ): Promise<AddPointsResult> {
    return this.addPoints(
      userId,
      seasonId,
      LeaderboardCategory.SOCIAL,
      points,
      reason,
      metadata,
    );
  }

  /**
   * 通用积分添加方法
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   * @param category 积分类别
   * @param points 积分数量
   * @param reason 积分原因
   * @param metadata 额外元数据
   */
  private async addPoints(
    userId: string,
    seasonId: string,
    category: LeaderboardCategory,
    points: number,
    reason: PointsChangeReason,
    metadata?: Record<string, unknown>,
  ): Promise<AddPointsResult> {
    // 验证赛季是否存在且处于活跃状态
    await this.validateActiveSeason(seasonId);

    // 使用事务确保数据一致性
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 更新或创建排行榜条目
      const leaderboardEntry = await this.upsertLeaderboardEntry(
        tx,
        userId,
        seasonId,
        category,
        points,
      );

      // 2. 重新计算综合分数
      const overallScore = await this.calculateAndUpdateOverallScore(
        tx,
        userId,
        seasonId,
      );

      // 3. 更新用户段位
      const seasonRank = await this.updateSeasonRank(tx, userId, seasonId);

      return {
        newScore: leaderboardEntry.score,
        newTotalPoints: seasonRank.points,
        newTier: seasonRank.tier as SeasonTier,
        overallScore,
      };
    });

    // 4. 更新 Redis 实时排行榜（需求25.1.9）
    await this.updateRealtimeLeaderboard(
      userId,
      seasonId,
      category,
      result.newScore,
      result.overallScore,
    );

    // 记录积分变更日志
    await this.logPointsChange({
      userId,
      seasonId,
      category,
      points,
      reason,
      metadata,
      timestamp: new Date(),
    });

    // 清除相关缓存
    await this.invalidateUserCache(userId, seasonId);

    this.logger.log(
      `用户 ${userId} 在赛季 ${seasonId} 的 ${category} 类别获得 ${points} 积分，原因: ${reason}`,
    );

    return result;
  }

  /**
   * 重新计算综合分数
   *
   * 综合分数 = 阅读分数 * 0.3 + 创作分数 * 0.4 + 社交分数 * 0.3
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   */
  async recalculateOverallScore(
    userId: string,
    seasonId: string,
  ): Promise<number> {
    // 验证赛季是否存在
    await this.validateActiveSeason(seasonId);

    const overallScore = await this.prisma.$transaction(async (tx) => {
      return this.calculateAndUpdateOverallScore(tx, userId, seasonId);
    });

    // 清除相关缓存
    await this.invalidateUserCache(userId, seasonId);

    return overallScore;
  }

  /**
   * 验证赛季是否存在且处于活跃状态
   */
  private async validateActiveSeason(seasonId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const season = await (this.prisma as any).season.findUnique({
      where: { id: seasonId },
      select: { id: true, status: true },
    });

    if (!season) {
      throw new NotFoundException(`赛季不存在: ${seasonId}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (season.status !== SeasonStatus.ACTIVE) {
      throw new Error(`赛季 ${seasonId} 不在活跃状态，无法添加积分`);
    }
  }

  /**
   * 更新或创建排行榜条目
   */
  private async upsertLeaderboardEntry(
    tx: any,
    userId: string,
    seasonId: string,
    category: LeaderboardCategory,
    pointsToAdd: number,
  ): Promise<{ score: number; rank: number | null }> {
    // 查找现有条目
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const existing = await tx.seasonLeaderboard.findUnique({
      where: {
        userId_seasonId_category: {
          userId,
          seasonId,
          category,
        },
      },
    });

    if (existing) {
      // 更新现有条目
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const newScore = (existing.score as number) + pointsToAdd;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const peakScore = Math.max(newScore, existing.peakScore as number);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const updated = await tx.seasonLeaderboard.update({
        where: {
          userId_seasonId_category: {
            userId,
            seasonId,
            category,
          },
        },
        data: {
          score: newScore,
          peakScore,
          updatedAt: new Date(),
        },
      });

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        score: updated.score as number,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        rank: updated.rank as number | null,
      };
    } else {
      // 创建新条目
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const created = await tx.seasonLeaderboard.create({
        data: {
          userId,
          seasonId,
          category,
          score: pointsToAdd,
          peakScore: pointsToAdd,
        },
      });

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        score: created.score as number,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        rank: created.rank as number | null,
      };
    }
  }

  /**
   * 计算并更新综合分数
   */
  private async calculateAndUpdateOverallScore(
    tx: any,
    userId: string,
    seasonId: string,
  ): Promise<number> {
    // 获取各类别分数
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const entries = await tx.seasonLeaderboard.findMany({
      where: {
        userId,
        seasonId,
        category: {
          in: [
            LeaderboardCategory.READING,
            LeaderboardCategory.CREATION,
            LeaderboardCategory.SOCIAL,
          ],
        },
      },
    });

    // 计算加权综合分数
    let overallScore = 0;
    for (const entry of entries as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const category = entry.category as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const score = entry.score as number;
      const weight = OVERALL_WEIGHTS[category] || 0;
      overallScore += score * weight;
    }

    // 四舍五入到整数
    overallScore = Math.round(overallScore);

    // 更新或创建综合排行榜条目
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const existingOverall = await tx.seasonLeaderboard.findUnique({
      where: {
        userId_seasonId_category: {
          userId,
          seasonId,
          category: LeaderboardCategory.OVERALL,
        },
      },
    });

    if (existingOverall) {
      const peakScore = Math.max(
        overallScore,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        existingOverall.peakScore as number,
      );
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await tx.seasonLeaderboard.update({
        where: {
          userId_seasonId_category: {
            userId,
            seasonId,
            category: LeaderboardCategory.OVERALL,
          },
        },
        data: {
          score: overallScore,
          peakScore,
          updatedAt: new Date(),
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await tx.seasonLeaderboard.create({
        data: {
          userId,
          seasonId,
          category: LeaderboardCategory.OVERALL,
          score: overallScore,
          peakScore: overallScore,
        },
      });
    }

    return overallScore;
  }

  /**
   * 更新用户赛季段位
   */
  private async updateSeasonRank(
    tx: any,
    userId: string,
    seasonId: string,
  ): Promise<{ points: number; tier: string }> {
    // 获取现有段位记录
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const existingRank = await tx.seasonRank.findUnique({
      where: {
        userId_seasonId: {
          userId,
          seasonId,
        },
      },
    });

    // 获取所有类别的分数来计算总积分
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const allEntries = await tx.seasonLeaderboard.findMany({
      where: {
        userId,
        seasonId,
        category: {
          in: [
            LeaderboardCategory.READING,
            LeaderboardCategory.CREATION,
            LeaderboardCategory.SOCIAL,
          ],
        },
      },
    });

    // 计算总积分（各类别分数之和）
    let totalPoints = 0;
    const pointsBreakdown: Record<string, number> = {};

    for (const entry of allEntries as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const cat = entry.category as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const score = entry.score as number;
      totalPoints += score;

      if (cat === 'READING') {
        pointsBreakdown.readingPoints = score;
      } else if (cat === 'CREATION') {
        pointsBreakdown.creationPoints = score;
      } else if (cat === 'SOCIAL') {
        pointsBreakdown.socialPoints = score;
      }
    }

    // 根据总积分确定段位
    const newTier = this.seasonConfig.getTierByPoints(totalPoints);

    if (existingRank) {
      // 更新现有记录
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const currentTier = existingRank.tier as SeasonTier;
      const peakPoints = Math.max(
        totalPoints,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        existingRank.peakPoints as number,
      );

      // 确定最高段位
      const newTierConfig = this.seasonConfig.getTierConfig(newTier);
      const peakTierConfig = this.seasonConfig.getTierConfig(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        existingRank.peakTier as SeasonTier,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      let peakTier = existingRank.peakTier as SeasonTier;
      if (newTierConfig.sortValue > peakTierConfig.sortValue) {
        peakTier = newTier;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const updated = await tx.seasonRank.update({
        where: {
          userId_seasonId: {
            userId,
            seasonId,
          },
        },
        data: {
          points: totalPoints,
          tier: newTier,
          peakPoints,
          peakTier,
          pointsBreakdown,
          updatedAt: new Date(),
        },
      });

      // 记录段位变化
      if (currentTier !== newTier) {
        this.logger.log(
          `用户 ${userId} 段位变化: ${currentTier} -> ${newTier}`,
        );
      }

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        points: updated.points as number,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        tier: updated.tier as string,
      };
    } else {
      // 创建新记录
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const created = await tx.seasonRank.create({
        data: {
          userId,
          seasonId,
          points: totalPoints,
          tier: newTier,
          peakPoints: totalPoints,
          peakTier: newTier,
          pointsBreakdown,
        },
      });

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        points: created.points as number,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        tier: created.tier as string,
      };
    }
  }

  /**
   * 记录积分变更日志到Redis
   */
  private async logPointsChange(record: PointsChangeRecord): Promise<void> {
    const key = `${this.POINTS_LOG_KEY}${record.userId}:${record.seasonId}`;
    const logEntry = JSON.stringify({
      ...record,
      timestamp: record.timestamp.toISOString(),
    });

    // 使用Redis List存储日志，保留最近1000条
    await this.redis.lpush(key, logEntry);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    await this.redis.ltrim(key, 0, 999);

    // 设置过期时间（赛季结束后30天）
    await this.redis.expire(key, 90 * 24 * 60 * 60 + 30 * 24 * 60 * 60);
  }

  /**
   * 清除用户相关缓存
   */
  private async invalidateUserCache(
    userId: string,
    seasonId: string,
  ): Promise<void> {
    const patterns = [
      `${this.USER_POINTS_CACHE_PREFIX}${userId}:${seasonId}:*`,
      `leaderboard:user:${seasonId}:*:${userId}`,
    ];

    for (const pattern of patterns) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
        const keys: string[] = await this.redis.keys(pattern);
        if (keys && keys.length > 0) {
          await this.redis.del(...keys);
        }
      } catch (error) {
        this.logger.warn(`清除缓存失败: ${pattern}`, error);
      }
    }
  }

  /**
   * 获取用户积分变更历史
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   * @param limit 返回数量限制
   */
  async getPointsHistory(
    userId: string,
    seasonId: string,
    limit: number = 50,
  ): Promise<PointsChangeRecord[]> {
    const key = `${this.POINTS_LOG_KEY}${userId}:${seasonId}`;
    const logs = await this.redis.lrange(key, 0, limit - 1);

    return logs.map((log) => {
      const parsed = JSON.parse(log) as PointsChangeRecord & {
        timestamp: string;
      };
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
      };
    });
  }

  /**
   * 批量添加积分（用于批量处理场景）
   *
   * @param records 积分变更记录数组
   */
  async batchAddPoints(
    records: Array<{
      userId: string;
      seasonId: string;
      category: LeaderboardCategory;
      points: number;
      reason: PointsChangeReason;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    for (const record of records) {
      await this.addPoints(
        record.userId,
        record.seasonId,
        record.category,
        record.points,
        record.reason,
        record.metadata,
      );
    }
  }

  /**
   * 获取用户在指定赛季的积分汇总
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   */
  async getUserPointsSummary(
    userId: string,
    seasonId: string,
  ): Promise<{
    totalPoints: number;
    tier: SeasonTier;
    breakdown: {
      readingPoints: number;
      creationPoints: number;
      socialPoints: number;
      overallScore: number;
    };
  }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [seasonRank, leaderboardEntries] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).seasonRank.findUnique({
        where: {
          userId_seasonId: {
            userId,
            seasonId,
          },
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).seasonLeaderboard.findMany({
        where: {
          userId,
          seasonId,
        },
      }),
    ]);

    // 构建积分明细
    const breakdown = {
      readingPoints: 0,
      creationPoints: 0,
      socialPoints: 0,
      overallScore: 0,
    };

    for (const entry of leaderboardEntries as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const category = entry.category as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const score = entry.score as number;

      if (category === 'READING') {
        breakdown.readingPoints = score;
      } else if (category === 'CREATION') {
        breakdown.creationPoints = score;
      } else if (category === 'SOCIAL') {
        breakdown.socialPoints = score;
      } else if (category === 'OVERALL') {
        breakdown.overallScore = score;
      }
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      totalPoints: (seasonRank?.points as number) ?? 0,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      tier: (seasonRank?.tier as SeasonTier) ?? SeasonTier.NOVICE,
      breakdown,
    };
  }

  /**
   * 更新 Redis 实时排行榜
   *
   * 需求25.1.9: 排行榜实时更新服务（Redis Sorted Set）
   *
   * 当用户积分变更时，同步更新 Redis Sorted Set 中的排行榜数据
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   * @param category 积分类别
   * @param categoryScore 类别分数
   * @param overallScore 综合分数
   */
  private async updateRealtimeLeaderboard(
    userId: string,
    seasonId: string,
    category: LeaderboardCategory,
    categoryScore: number,
    overallScore: number,
  ): Promise<void> {
    try {
      // 更新类别排行榜
      await this.leaderboardRealtime.updateScore(
        seasonId,
        category,
        userId,
        categoryScore,
      );

      // 更新综合排行榜
      await this.leaderboardRealtime.updateScore(
        seasonId,
        LeaderboardCategory.OVERALL,
        userId,
        overallScore,
      );

      this.logger.debug(
        `更新 Redis 实时排行榜: 用户 ${userId}, 赛季 ${seasonId}, ${category}=${categoryScore}, OVERALL=${overallScore}`,
      );
    } catch (error) {
      // Redis 更新失败不应影响主流程，只记录警告
      this.logger.warn(
        `更新 Redis 实时排行榜失败: ${userId}:${seasonId}:${category}`,
        error,
      );
    }
  }
}
