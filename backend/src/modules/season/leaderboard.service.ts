import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { SeasonService } from './season.service.js';
import { LeaderboardCategory, SeasonTier } from './dto/leaderboard.dto.js';
import {
  LeaderboardEntryDto,
  LeaderboardUserDto,
  PaginationDto,
  SeasonInfoDto,
  UserLeaderboardSummaryDto,
  UserSeasonRankDto,
} from './dto/leaderboard-response.dto.js';

/**
 * 排行榜服务
 *
 * 需求25.1.6: 排行榜数据 API（阅读/创作/社交/综合）
 *
 * 提供以下功能：
 * - getLeaderboard(seasonId, category, page, limit) - 获取排行榜条目（分页）
 * - getTopEntries(seasonId, category, limit) - 获取排行榜前N名（快速展示）
 * - getUserRankInCategory(userId, seasonId, category) - 获取用户在某类别的排名
 *
 * 设计语言:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
@Injectable()
export class LeaderboardService {
  private readonly LEADERBOARD_CACHE_PREFIX = 'leaderboard:';
  private readonly TOP_ENTRIES_CACHE_PREFIX = 'leaderboard:top:';
  private readonly USER_RANK_CACHE_PREFIX = 'leaderboard:user:';
  private readonly CACHE_TTL = 60; // 1分钟缓存（排行榜数据更新频繁）
  private readonly TOP_CACHE_TTL = 30; // 30秒缓存（Top数据更新更频繁）

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly seasonService: SeasonService,
  ) {}

  /**
   * 获取排行榜条目（分页）
   *
   * 需求25.1.6: 排行榜数据 API
   *
   * @param seasonId 赛季ID（可选，默认当前赛季）
   * @param category 排行榜类别
   * @param page 页码（默认1）
   * @param limit 每页数量（默认20）
   * @returns 排行榜条目列表和分页信息
   */
  async getLeaderboard(
    seasonId: string | undefined,
    category: LeaderboardCategory,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    season: SeasonInfoDto;
    category: LeaderboardCategory;
    entries: LeaderboardEntryDto[];
    pagination: PaginationDto;
  }> {
    // 获取赛季信息
    const season = await this.resolveSeasonId(seasonId);

    // 尝试从缓存获取
    const cacheKey = `${this.LEADERBOARD_CACHE_PREFIX}${season.id}:${category}:${page}:${limit}`;
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData) as {
          entries: LeaderboardEntryDto[];
          pagination: PaginationDto;
        };
        return {
          season,
          category,
          ...parsed,
        };
      } catch {
        // 缓存解析失败，继续从数据库获取
      }
    }

    // 从数据库获取排行榜数据
    const offset = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [entries, total] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).seasonLeaderboard.findMany({
        where: {
          seasonId: season.id,
          category,
          rank: { not: null }, // 只获取有排名的条目
        },
        orderBy: [{ rank: 'asc' }],
        skip: offset,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
              memberLevel: true,
            },
          },
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).seasonLeaderboard.count({
        where: {
          seasonId: season.id,
          category,
          rank: { not: null },
        },
      }),
    ]);

    // 转换为DTO
    const entryDtos = (entries as any[]).map((entry) =>
      this.toLeaderboardEntryDto(entry),
    );

    const pagination: PaginationDto = {
      page,
      limit,
      total: total as number,
      totalPages: Math.ceil((total as number) / limit),
    };

    // 缓存结果
    await this.redis.set(
      cacheKey,
      JSON.stringify({ entries: entryDtos, pagination }),
      this.CACHE_TTL,
    );

    return {
      season,
      category,
      entries: entryDtos,
      pagination,
    };
  }

  /**
   * 获取排行榜前N名（快速展示）
   *
   * 需求25.1.6: 排行榜数据 API
   *
   * @param seasonId 赛季ID（可选，默认当前赛季）
   * @param category 排行榜类别
   * @param limit 获取数量（默认10，最大100）
   * @returns 排行榜前N名条目
   */
  async getTopEntries(
    seasonId: string | undefined,
    category: LeaderboardCategory,
    limit: number = 10,
  ): Promise<{
    season: SeasonInfoDto;
    category: LeaderboardCategory;
    entries: LeaderboardEntryDto[];
  }> {
    // 限制最大数量
    const safeLimit = Math.min(limit, 100);

    // 获取赛季信息
    const season = await this.resolveSeasonId(seasonId);

    // 尝试从缓存获取
    const cacheKey = `${this.TOP_ENTRIES_CACHE_PREFIX}${season.id}:${category}:${safeLimit}`;
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      try {
        const entries = JSON.parse(cachedData) as LeaderboardEntryDto[];
        return {
          season,
          category,
          entries,
        };
      } catch {
        // 缓存解析失败，继续从数据库获取
      }
    }

    // 从数据库获取Top N数据
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const entries = await (this.prisma as any).seasonLeaderboard.findMany({
      where: {
        seasonId: season.id,
        category,
        rank: { not: null },
      },
      orderBy: [{ rank: 'asc' }],
      take: safeLimit,
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            avatarUrl: true,
            memberLevel: true,
          },
        },
      },
    });

    // 转换为DTO
    const entryDtos = (entries as any[]).map((entry) =>
      this.toLeaderboardEntryDto(entry),
    );

    // 缓存结果
    await this.redis.set(
      cacheKey,
      JSON.stringify(entryDtos),
      this.TOP_CACHE_TTL,
    );

    return {
      season,
      category,
      entries: entryDtos,
    };
  }

  /**
   * 获取用户在某类别的排名
   *
   * 需求25.1.6: 排行榜数据 API
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID（可选，默认当前赛季）
   * @param category 排行榜类别
   * @returns 用户排名信息
   */
  async getUserRankInCategory(
    userId: string,
    seasonId: string | undefined,
    category: LeaderboardCategory,
  ): Promise<{
    season: SeasonInfoDto;
    category: LeaderboardCategory;
    entry: LeaderboardEntryDto | null;
    totalParticipants: number;
  }> {
    // 获取赛季信息
    const season = await this.resolveSeasonId(seasonId);

    // 尝试从缓存获取
    const cacheKey = `${this.USER_RANK_CACHE_PREFIX}${season.id}:${category}:${userId}`;
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData) as {
          entry: LeaderboardEntryDto | null;
          totalParticipants: number;
        };
        return {
          season,
          category,
          ...parsed,
        };
      } catch {
        // 缓存解析失败，继续从数据库获取
      }
    }

    // 从数据库获取用户排名数据
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [entry, totalParticipants] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).seasonLeaderboard.findUnique({
        where: {
          userId_seasonId_category: {
            userId,
            seasonId: season.id,
            category,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              avatarUrl: true,
              memberLevel: true,
            },
          },
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).seasonLeaderboard.count({
        where: {
          seasonId: season.id,
          category,
          rank: { not: null },
        },
      }),
    ]);

    // 转换为DTO
    const entryDto = entry ? this.toLeaderboardEntryDto(entry) : null;
    const totalCount = totalParticipants as number;

    // 缓存结果
    await this.redis.set(
      cacheKey,
      JSON.stringify({ entry: entryDto, totalParticipants: totalCount }),
      this.CACHE_TTL,
    );

    return {
      season,
      category,
      entry: entryDto,
      totalParticipants: totalCount,
    };
  }

  /**
   * 解析赛季ID，如果未提供则获取当前赛季
   */
  private async resolveSeasonId(seasonId?: string): Promise<SeasonInfoDto> {
    if (seasonId) {
      return this.seasonService.getSeasonById(seasonId);
    }

    const currentSeason = await this.seasonService.getCurrentSeason();
    if (!currentSeason) {
      throw new NotFoundException('当前没有进行中的赛季');
    }
    return currentSeason;
  }

  /**
   * 将数据库模型转换为LeaderboardEntryDto
   */
  private toLeaderboardEntryDto(entry: any): LeaderboardEntryDto {
    // 计算排名变化
    let rankChange: number | null = null;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (entry.rank !== null && entry.previousRank !== null) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      rankChange = entry.previousRank - entry.rank; // 正数表示上升
    }

    // 转换用户信息
    const user: LeaderboardUserDto = {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      id: entry.user.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      nickname: entry.user.nickname,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      avatarUrl: entry.user.avatarUrl,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      memberLevel: entry.user.memberLevel,
    };

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      id: entry.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      userId: entry.userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      seasonId: entry.seasonId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      category: entry.category,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      score: entry.score,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      rank: entry.rank,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      previousRank: entry.previousRank,
      rankChange,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      peakRank: entry.peakRank,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      peakScore: entry.peakScore,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      updatedAt: (entry.updatedAt as Date).toISOString(),
      user,
    };
  }

  /**
   * 获取用户在所有类别的排名汇总
   *
   * 需求25.1.7: 用户排名查询 API
   *
   * 返回用户在当前赛季或指定赛季的所有排行榜类别中的排名信息，包括：
   * - 各类别的分数、排名、排名变化、百分位
   * - 用户的段位信息（tier, points, peakTier等）
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID（可选，默认当前赛季）
   * @returns 用户排名汇总信息
   */
  async getUserRanking(
    userId: string,
    seasonId?: string,
  ): Promise<{
    season: SeasonInfoDto;
    summary: UserLeaderboardSummaryDto;
  }> {
    // 获取赛季信息
    const season = await this.resolveSeasonId(seasonId);

    // 尝试从缓存获取
    const cacheKey = `${this.USER_RANK_CACHE_PREFIX}${season.id}:all:${userId}`;
    const cachedData = await this.redis.get(cacheKey);
    if (cachedData) {
      try {
        const summary = JSON.parse(cachedData) as UserLeaderboardSummaryDto;
        return { season, summary };
      } catch {
        // 缓存解析失败，继续从数据库获取
      }
    }

    // 获取所有类别的排行榜数据
    const categories = Object.values(LeaderboardCategory);

    // 并行获取所有类别的排名数据和总参与人数
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [leaderboardEntries, totalCounts, seasonRank] = await Promise.all([
      // 获取用户在所有类别的排行榜条目
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).seasonLeaderboard.findMany({
        where: {
          userId,
          seasonId: season.id,
        },
      }),
      // 获取各类别的总参与人数（用于计算百分位）
      Promise.all(
        categories.map(async (category) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          const count = await (this.prisma as any).seasonLeaderboard.count({
            where: {
              seasonId: season.id,
              category,
              rank: { not: null },
            },
          });
          return { category, count: count as number };
        }),
      ),
      // 获取用户的段位信息
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).seasonRank.findUnique({
        where: {
          userId_seasonId: {
            userId,
            seasonId: season.id,
          },
        },
      }),
    ]);

    // 类型断言
    const leaderboardEntriesTyped = leaderboardEntries as any[];
    const totalCountsTyped = totalCounts as {
      category: LeaderboardCategory;
      count: number;
    }[];

    // 构建各类别排名数据（包含百分位计算）
    const rankings = categories.map((category) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const entry = leaderboardEntriesTyped.find(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (e) => e.category === category,
      );
      const totalInfo = totalCountsTyped.find((t) => t.category === category);
      const totalParticipants = totalInfo?.count ?? 0;

      // 计算排名变化
      let rankChange: number | null = null;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (entry?.rank !== null && entry?.previousRank !== null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        rankChange = (entry.previousRank as number) - (entry.rank as number);
      }

      // 计算百分位（排名越高百分位越高，第1名为100%）
      let percentile: number | null = null;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (entry?.rank !== null && totalParticipants > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const rankNum = entry.rank as number;
        percentile = Math.round(
          ((totalParticipants - rankNum + 1) / totalParticipants) * 100,
        );
      }

      return {
        category,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        score: entry?.score ?? 0,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        rank: entry?.rank ?? null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
        previousRank: entry?.previousRank ?? null,
        rankChange,
        percentile,
        totalParticipants,
      };
    });

    // 构建段位信息
    let seasonRankDto: UserSeasonRankDto | null = null;
    if (seasonRank) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      seasonRankDto = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        id: seasonRank.id as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        userId: seasonRank.userId as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        seasonId: seasonRank.seasonId as string,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        tier: seasonRank.tier as SeasonTier,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        points: seasonRank.points as number,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        previousTier: seasonRank.previousTier as SeasonTier | null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        peakTier: seasonRank.peakTier as SeasonTier,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        peakPoints: seasonRank.peakPoints as number,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        pointsBreakdown: seasonRank.pointsBreakdown as {
          readingPoints?: number;
          creationPoints?: number;
          socialPoints?: number;
        } | null,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        updatedAt: (seasonRank.updatedAt as Date).toISOString(),
      };
    }

    // 构建汇总DTO
    const summary: UserLeaderboardSummaryDto = {
      userId,
      seasonId: season.id,
      rankings,
      seasonRank: seasonRankDto,
    };

    // 缓存结果
    await this.redis.set(cacheKey, JSON.stringify(summary), this.CACHE_TTL);

    return { season, summary };
  }
}
