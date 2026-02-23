import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { SeasonStatus, SeasonTier, LeaderboardCategory } from './dto/leaderboard.dto.js';
import {
  SeasonInfoDto,
  PaginationDto,
  UserSeasonHistoryEntryDto,
  UserSeasonHistoryRewardDto,
  UserSeasonRankDto,
} from './dto/leaderboard-response.dto.js';

/**
 * 赛季服务
 *
 * 需求25.1.5: 当前赛季信息 API
 *
 * 提供以下功能：
 * - getCurrentSeason() - 获取当前活跃赛季及剩余天数
 * - getSeasonById(id) - 根据ID获取赛季详情
 * - getSeasonList(query) - 获取赛季列表（分页）
 */
@Injectable()
export class SeasonService {
  private readonly logger = new Logger(SeasonService.name);
  private readonly CURRENT_SEASON_KEY = 'season:current';
  private readonly SEASON_CACHE_PREFIX = 'season:info:';
  private readonly SEASON_CACHE_TTL = 300; // 5分钟缓存

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 获取当前活跃赛季
   * 包含剩余天数计算
   *
   * 需求25.1.5: 当前赛季信息 API
   */
  async getCurrentSeason(): Promise<SeasonInfoDto | null> {
    // 尝试从缓存获取当前赛季ID
    const cachedSeasonId = await this.redis.get(this.CURRENT_SEASON_KEY);

    if (cachedSeasonId) {
      // 尝试从缓存获取赛季详情
      const cachedSeason = await this.redis.get(
        `${this.SEASON_CACHE_PREFIX}${cachedSeasonId}`,
      );
      if (cachedSeason) {
        try {
          const season = JSON.parse(cachedSeason) as SeasonInfoDto;
          // 重新计算剩余天数（因为缓存可能过期）
          if (season.status === SeasonStatus.ACTIVE) {
            season.remainingDays = this.calculateRemainingDays(
              new Date(season.endDate),
            );
          }
          return season;
        } catch {
          // 缓存解析失败，继续从数据库获取
        }
      }
    }

    // 从数据库获取当前活跃赛季
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const season = await (this.prisma as any).season.findFirst({
      where: { status: SeasonStatus.ACTIVE },
      orderBy: { startDate: 'desc' },
    });

    if (!season) {
      this.logger.warn('未找到当前活跃赛季');
      return null;
    }

    // 转换为DTO并计算剩余天数
    const seasonDto = this.toSeasonInfoDto(season);

    // 缓存赛季信息
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await this.redis.set(this.CURRENT_SEASON_KEY, season.id as string);
    await this.redis.set(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      `${this.SEASON_CACHE_PREFIX}${season.id}`,
      JSON.stringify(seasonDto),
      this.SEASON_CACHE_TTL,
    );

    return seasonDto;
  }

  /**
   * 根据ID获取赛季详情
   *
   * 需求25.1.5: 当前赛季信息 API
   */
  async getSeasonById(seasonId: string): Promise<SeasonInfoDto> {
    // 尝试从缓存获取
    const cachedSeason = await this.redis.get(
      `${this.SEASON_CACHE_PREFIX}${seasonId}`,
    );
    if (cachedSeason) {
      try {
        const season = JSON.parse(cachedSeason) as SeasonInfoDto;
        // 重新计算剩余天数
        if (season.status === SeasonStatus.ACTIVE) {
          season.remainingDays = this.calculateRemainingDays(
            new Date(season.endDate),
          );
        }
        return season;
      } catch {
        // 缓存解析失败，继续从数据库获取
      }
    }

    // 从数据库获取
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const season = await (this.prisma as any).season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      throw new NotFoundException(`赛季不存在: ${seasonId}`);
    }

    const seasonDto = this.toSeasonInfoDto(season);

    // 缓存赛季信息
    await this.redis.set(
      `${this.SEASON_CACHE_PREFIX}${seasonId}`,
      JSON.stringify(seasonDto),
      this.SEASON_CACHE_TTL,
    );

    return seasonDto;
  }

  /**
   * 获取赛季列表（分页）
   *
   * 需求25.1.5: 当前赛季信息 API
   */
  async getSeasonList(query: {
    status?: SeasonStatus;
    page?: number;
    limit?: number;
  }): Promise<{ seasons: SeasonInfoDto[]; pagination: PaginationDto }> {
    const { status, page = 1, limit = 10 } = query;

    const where = status ? { status } : {};

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [seasons, total] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).season.findMany({
        where,
        orderBy: { seasonNumber: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).season.count({ where }),
    ]);

    const seasonDtos = (seasons as any[]).map((season) =>
      this.toSeasonInfoDto(season),
    );

    return {
      seasons: seasonDtos,
      pagination: {
        page,
        limit,
        total: total as number,
        totalPages: Math.ceil((total as number) / limit),
      },
    };
  }

  /**
   * 计算剩余天数
   */
  private calculateRemainingDays(endDate: Date): number {
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * 将数据库模型转换为DTO
   */
  private toSeasonInfoDto(season: any): SeasonInfoDto {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const endDate = new Date(season.endDate as string);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const isActive = season.status === SeasonStatus.ACTIVE;

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      id: season.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      name: season.name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      description: season.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      seasonNumber: season.seasonNumber,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      status: season.status,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      startDate: (season.startDate as Date).toISOString(),
      endDate: endDate.toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      durationDays: season.durationDays,
      remainingDays: isActive
        ? this.calculateRemainingDays(endDate)
        : undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      createdAt: (season.createdAt as Date).toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      updatedAt: (season.updatedAt as Date).toISOString(),
    };
  }

  /**
   * 获取用户赛季历史记录
   *
   * 需求25.1.11: 赛季历史记录 API
   *
   * 返回用户过去参与的赛季记录，包括：
   * - 赛季基本信息（名称、编号、日期）
   * - 用户最终段位和积分
   * - 各类别的最终排名
   * - 获得的奖励（如有）
   *
   * @param userId 用户ID
   * @param query 查询参数
   * @returns 用户赛季历史列表和分页信息
   */
  async getUserSeasonHistory(
    userId: string,
    query: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      minTier?: SeasonTier;
      sortBy?: 'seasonNumber' | 'points' | 'rank';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{
    history: UserSeasonHistoryEntryDto[];
    pagination: PaginationDto;
  }> {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      minTier,
      sortBy = 'seasonNumber',
      sortOrder = 'desc',
    } = query;

    this.logger.debug(
      `获取用户 ${userId} 的赛季历史，参数: ${JSON.stringify(query)}`,
    );

    // 构建赛季筛选条件
    const seasonWhere: any = {
      status: { in: [SeasonStatus.ENDED, SeasonStatus.SETTLED] },
    };

    // 日期范围筛选
    if (startDate) {
      seasonWhere.startDate = { gte: new Date(startDate) };
    }
    if (endDate) {
      seasonWhere.endDate = { lte: new Date(endDate) };
    }

    // 构建用户段位筛选条件
    const rankWhere: any = {
      userId,
    };

    // 最低段位筛选
    if (minTier) {
      const tierOrder = this.getTierOrder();
      const minTierValue = tierOrder[minTier];
      const eligibleTiers = Object.entries(tierOrder)
        .filter(([, value]) => value >= minTierValue)
        .map(([tier]) => tier);
      rankWhere.tier = { in: eligibleTiers };
    }

    // 确定排序方式
    let orderBy: any;
    if (sortBy === 'points') {
      orderBy = { points: sortOrder };
    } else {
      // 默认按赛季编号排序，需要通过关联查询
      orderBy = { season: { seasonNumber: sortOrder } };
    }

    // 查询用户参与的赛季段位记录
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [seasonRanks, total] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).seasonRank.findMany({
        where: {
          ...rankWhere,
          season: seasonWhere,
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          season: true,
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).seasonRank.count({
        where: {
          ...rankWhere,
          season: seasonWhere,
        },
      }),
    ]);

    // 获取每个赛季的排行榜数据和奖励
    const history: UserSeasonHistoryEntryDto[] = [];

    for (const seasonRank of seasonRanks as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const seasonId = seasonRank.seasonId as string;

      // 获取各类别排名
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const leaderboardEntries = await (this.prisma as any).seasonLeaderboard.findMany({
        where: {
          userId,
          seasonId,
        },
      });

      // 获取用户在该赛季获得的奖励
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const userRewards = await (this.prisma as any).userSeasonReward.findMany({
        where: {
          userId,
          seasonId,
        },
        include: {
          seasonReward: true,
        },
      });

      // 构建历史条目
      const entry: UserSeasonHistoryEntryDto = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        season: this.toSeasonInfoDto(seasonRank.season),
        rank: this.toUserSeasonRankDto(seasonRank),
        rankings: this.toRankingsDto(leaderboardEntries as any[]),
        rewards: this.toRewardsDto(userRewards as any[]),
      };

      history.push(entry);
    }

    // 如果按排名排序，需要在内存中排序
    if (sortBy === 'rank') {
      history.sort((a, b) => {
        const aRank = a.rankings.find(
          (r) => r.category === LeaderboardCategory.OVERALL,
        )?.finalRank;
        const bRank = b.rankings.find(
          (r) => r.category === LeaderboardCategory.OVERALL,
        )?.finalRank;

        // 处理 null 值
        if (aRank === null && bRank === null) return 0;
        if (aRank === null) return sortOrder === 'asc' ? 1 : -1;
        if (bRank === null) return sortOrder === 'asc' ? -1 : 1;

        return sortOrder === 'asc' ? (aRank ?? 0) - (bRank ?? 0) : (bRank ?? 0) - (aRank ?? 0);
      });
    }

    return {
      history,
      pagination: {
        page,
        limit,
        total: total as number,
        totalPages: Math.ceil((total as number) / limit),
      },
    };
  }

  /**
   * 获取段位排序值映射
   */
  private getTierOrder(): Record<SeasonTier, number> {
    return {
      [SeasonTier.NOVICE]: 0,
      [SeasonTier.BRONZE]: 1,
      [SeasonTier.SILVER]: 2,
      [SeasonTier.GOLD]: 3,
      [SeasonTier.PLATINUM]: 4,
      [SeasonTier.DIAMOND]: 5,
      [SeasonTier.MASTER]: 6,
      [SeasonTier.GRANDMASTER]: 7,
      [SeasonTier.KING]: 8,
    };
  }

  /**
   * 将数据库模型转换为 UserSeasonRankDto
   */
  private toUserSeasonRankDto(seasonRank: any): UserSeasonRankDto {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      id: seasonRank.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      userId: seasonRank.userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      seasonId: seasonRank.seasonId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      tier: seasonRank.tier,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      points: seasonRank.points,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      previousTier: seasonRank.previousTier,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      peakTier: seasonRank.peakTier,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      peakPoints: seasonRank.peakPoints,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      pointsBreakdown: seasonRank.pointsBreakdown,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      updatedAt: (seasonRank.updatedAt as Date).toISOString(),
    };
  }

  /**
   * 将排行榜条目转换为排名 DTO
   */
  private toRankingsDto(
    leaderboardEntries: any[],
  ): { category: LeaderboardCategory; finalScore: number; finalRank: number | null }[] {
    const categories = Object.values(LeaderboardCategory);

    return categories.map((category) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const entry = leaderboardEntries.find((e) => e.category === category);
      return {
        category,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        finalScore: entry?.score ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        finalRank: entry?.rank ?? null,
      };
    });
  }

  /**
   * 将用户奖励记录转换为奖励 DTO
   */
  private toRewardsDto(userRewards: any[]): UserSeasonHistoryRewardDto[] {
    return userRewards.map((reward) => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      id: reward.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      rewardType: reward.seasonReward?.rewardType ?? 'UNKNOWN',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      description: reward.seasonReward?.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      status: reward.status,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      claimedAt: reward.claimedAt
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ? (reward.claimedAt as Date).toISOString()
        : null,
    }));
  }
}
