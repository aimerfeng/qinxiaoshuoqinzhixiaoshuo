import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CacheService } from '../../redis/cache.service.js';

/**
 * 热度分数计算参数接口
 */
export interface HotScoreParams {
  likeCount: number;
  tipAmount: number;
  viewCount: number;
  branchCount: number;
}

/**
 * 分支统计数据接口
 */
interface BranchStats {
  likeCount: number;
  tipAmount: number;
  viewCount: number;
}

/**
 * 排行榜项目接口
 */
export interface RankingItem {
  id: string;
  hotScore: number;
  rank: number;
}

// Redis 缓存键
const LIBRARY_RANKING_KEY = 'library:ranking:top100';
const BRANCH_RANKING_KEY = 'branch:ranking:top100';

// 缓存过期时间（秒）- 2小时，比更新周期长一些
const RANKING_CACHE_TTL = 7200;

/**
 * 热度分数服务
 *
 * 负责计算和更新小说库及分支的热度分数
 *
 * 热度分数计算公式：
 * hotScore = (likeCount × 1) + (tipAmount / 100 × 2) + (viewCount / 100 × 0.5) + (branchCount × 3)
 *
 * _Requirements: 1.6, 7.1, 7.2, 7.3, 7.5_
 */
@Injectable()
export class HotScoreService {
  private readonly logger = new Logger(HotScoreService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 计算热度分数
   *
   * 公式：(likeCount × 1) + (tipAmount / 100 × 2) + (viewCount / 100 × 0.5) + (branchCount × 3)
   *
   * @param params 热度分数计算参数
   * @returns 计算后的热度分数
   *
   * _Requirements: 1.6, 7.1_
   */
  calculateHotScore(params: HotScoreParams): number {
    const { likeCount, tipAmount, viewCount, branchCount } = params;

    const likeScore = likeCount * 1;
    const tipScore = (tipAmount / 100) * 2;
    const viewScore = (viewCount / 100) * 0.5;
    const branchScore = branchCount * 3;

    return likeScore + tipScore + viewScore + branchScore;
  }

  /**
   * 更新小说库热度分数
   *
   * 根据小说库的统计数据重新计算并更新热度分数
   *
   * @param libraryId 小说库ID
   * @returns 更新后的小说库
   *
   * _Requirements: 1.6, 7.1_
   */
  async updateLibraryHotScore(libraryId: string) {
    // 获取小说库及其所有分支的统计数据
    const library = await this.prisma.library.findUnique({
      where: { id: libraryId },
      include: {
        branches: {
          where: { isDeleted: false },
          select: {
            likeCount: true,
            tipAmount: true,
            viewCount: true,
          },
        },
      },
    });

    if (!library) {
      return null;
    }

    // 汇总所有分支的统计数据
    const branches = library.branches as BranchStats[];
    const totalLikeCount = branches.reduce(
      (sum: number, branch: BranchStats) => sum + branch.likeCount,
      0,
    );
    const totalTipAmount = branches.reduce(
      (sum: number, branch: BranchStats) => sum + branch.tipAmount,
      0,
    );
    const totalViewCount = branches.reduce(
      (sum: number, branch: BranchStats) => sum + branch.viewCount,
      0,
    );
    const branchCount = branches.length;

    // 计算热度分数
    const hotScore = this.calculateHotScore({
      likeCount: totalLikeCount,
      tipAmount: totalTipAmount,
      viewCount: totalViewCount,
      branchCount,
    });

    // 更新小说库热度分数
    return this.prisma.library.update({
      where: { id: libraryId },
      data: {
        hotScore,
        branchCount,
        totalTipAmount,
      },
    });
  }

  /**
   * 更新分支热度分数
   *
   * 根据分支的统计数据重新计算并更新热度分数
   *
   * @param branchId 分支ID
   * @returns 更新后的分支
   *
   * _Requirements: 7.1_
   */
  async updateBranchHotScore(branchId: string) {
    const branch = await this.prisma.libraryBranch.findUnique({
      where: { id: branchId },
    });

    if (!branch) {
      return null;
    }

    // 分支热度分数计算（分支没有 branchCount，所以设为 0）
    const hotScore = this.calculateHotScore({
      likeCount: branch.likeCount,
      tipAmount: branch.tipAmount,
      viewCount: branch.viewCount,
      branchCount: 0,
    });

    return this.prisma.libraryBranch.update({
      where: { id: branchId },
      data: { hotScore },
    });
  }

  // ==================== 批量更新方法 ====================

  /**
   * 批量更新所有小说库的热度分数
   *
   * @returns 更新的小说库数量
   *
   * _Requirements: 7.3_
   */
  async updateAllLibraryHotScores(): Promise<number> {
    this.logger.log('开始批量更新小说库热度分数...');

    try {
      // 获取所有未删除的小说库
      const libraries = await this.prisma.library.findMany({
        where: { isDeleted: false },
        select: { id: true },
      });

      this.logger.log(`找到 ${libraries.length} 个小说库需要更新`);

      let updatedCount = 0;

      // 批量更新每个小说库的热度分数
      for (const library of libraries) {
        try {
          await this.updateLibraryHotScore(library.id);
          updatedCount++;
        } catch (error) {
          this.logger.warn(`更新小说库 ${library.id} 热度分数失败`, error);
        }
      }

      this.logger.log(`成功更新 ${updatedCount} 个小说库的热度分数`);
      return updatedCount;
    } catch (error) {
      this.logger.error('批量更新小说库热度分数失败', error);
      throw error;
    }
  }

  /**
   * 批量更新所有分支的热度分数
   *
   * @returns 更新的分支数量
   *
   * _Requirements: 7.3_
   */
  async updateAllBranchHotScores(): Promise<number> {
    this.logger.log('开始批量更新分支热度分数...');

    try {
      // 获取所有未删除的分支
      const branches = await this.prisma.libraryBranch.findMany({
        where: { isDeleted: false },
        select: {
          id: true,
          likeCount: true,
          tipAmount: true,
          viewCount: true,
        },
      });

      this.logger.log(`找到 ${branches.length} 个分支需要更新`);

      // 批量计算并更新热度分数
      const updates = branches.map((branch) => {
        const hotScore = this.calculateHotScore({
          likeCount: branch.likeCount,
          tipAmount: branch.tipAmount,
          viewCount: branch.viewCount,
          branchCount: 0,
        });

        return this.prisma.libraryBranch.update({
          where: { id: branch.id },
          data: { hotScore },
        });
      });

      await Promise.all(updates);

      this.logger.log(`成功更新 ${branches.length} 个分支的热度分数`);
      return branches.length;
    } catch (error) {
      this.logger.error('批量更新分支热度分数失败', error);
      throw error;
    }
  }

  // ==================== 定时任务 ====================

  /**
   * 每小时执行的热度分数更新任务
   *
   * 1. 批量更新所有 Library 的 hotScore
   * 2. 批量更新所有 Branch 的 hotScore
   * 3. 更新 Redis 缓存的热度排行榜
   *
   * _Requirements: 7.3_
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHotScoreUpdate(): Promise<void> {
    this.logger.log('=== 开始执行每小时热度分数更新任务 ===');

    const startTime = Date.now();

    try {
      // 1. 更新所有小说库热度分数
      const libraryCount = await this.updateAllLibraryHotScores();

      // 2. 更新所有分支热度分数
      const branchCount = await this.updateAllBranchHotScores();

      // 3. 更新 Redis 缓存排行榜
      await this.rebuildLibraryRankingCache();
      await this.rebuildBranchRankingCache();

      const duration = Date.now() - startTime;
      this.logger.log(
        `=== 热度分数更新任务完成 ===\n` +
          `更新小说库: ${libraryCount} 个\n` +
          `更新分支: ${branchCount} 个\n` +
          `耗时: ${duration}ms`,
      );
    } catch (error) {
      this.logger.error('热度分数更新任务执行失败', error);
    }
  }

  // ==================== Redis 缓存操作 ====================

  /**
   * 重建小说库热度排行榜缓存
   *
   * 缓存 Top 100 小说库到 Redis
   *
   * _Requirements: 7.5_
   */
  async rebuildLibraryRankingCache(): Promise<void> {
    this.logger.log('开始重建小说库热度排行榜缓存...');

    try {
      // 获取 Top 100 小说库
      const topLibraries = await this.prisma.library.findMany({
        where: { isDeleted: false },
        orderBy: { hotScore: 'desc' },
        take: 100,
        select: { id: true, hotScore: true },
      });

      // 清空旧缓存
      await this.cacheService.del(LIBRARY_RANKING_KEY);

      // 批量添加到 Sorted Set
      for (const library of topLibraries) {
        await this.cacheService.zadd(
          LIBRARY_RANKING_KEY,
          library.hotScore,
          library.id,
        );
      }

      // 设置过期时间
      await this.cacheService.expire(LIBRARY_RANKING_KEY, RANKING_CACHE_TTL);

      this.logger.log(
        `小说库热度排行榜缓存重建完成，共 ${topLibraries.length} 个`,
      );
    } catch (error) {
      this.logger.error('重建小说库热度排行榜缓存失败', error);
    }
  }

  /**
   * 重建分支热度排行榜缓存
   *
   * 缓存 Top 100 分支到 Redis
   *
   * _Requirements: 7.5_
   */
  async rebuildBranchRankingCache(): Promise<void> {
    this.logger.log('开始重建分支热度排行榜缓存...');

    try {
      // 获取 Top 100 分支
      const topBranches = await this.prisma.libraryBranch.findMany({
        where: { isDeleted: false },
        orderBy: { hotScore: 'desc' },
        take: 100,
        select: { id: true, hotScore: true },
      });

      // 清空旧缓存
      await this.cacheService.del(BRANCH_RANKING_KEY);

      // 批量添加到 Sorted Set
      for (const branch of topBranches) {
        await this.cacheService.zadd(
          BRANCH_RANKING_KEY,
          branch.hotScore,
          branch.id,
        );
      }

      // 设置过期时间
      await this.cacheService.expire(BRANCH_RANKING_KEY, RANKING_CACHE_TTL);

      this.logger.log(
        `分支热度排行榜缓存重建完成，共 ${topBranches.length} 个`,
      );
    } catch (error) {
      this.logger.error('重建分支热度排行榜缓存失败', error);
    }
  }

  /**
   * 更新单个小说库在排行榜缓存中的分数
   *
   * @param libraryId 小说库ID
   * @param hotScore 热度分数
   */
  async updateLibraryRankingCache(
    libraryId: string,
    hotScore: number,
  ): Promise<void> {
    try {
      await this.cacheService.zadd(LIBRARY_RANKING_KEY, hotScore, libraryId);
      // 只保留前 100 个
      await this.cacheService.zremrangebyrank(LIBRARY_RANKING_KEY, 0, -101);
    } catch (error) {
      this.logger.warn(`更新小说库 ${libraryId} 排行榜缓存失败`, error);
    }
  }

  /**
   * 更新单个分支在排行榜缓存中的分数
   *
   * @param branchId 分支ID
   * @param hotScore 热度分数
   */
  async updateBranchRankingCache(
    branchId: string,
    hotScore: number,
  ): Promise<void> {
    try {
      await this.cacheService.zadd(BRANCH_RANKING_KEY, hotScore, branchId);
      // 只保留前 100 个
      await this.cacheService.zremrangebyrank(BRANCH_RANKING_KEY, 0, -101);
    } catch (error) {
      this.logger.warn(`更新分支 ${branchId} 排行榜缓存失败`, error);
    }
  }

  // ==================== 排行榜查询 ====================

  /**
   * 获取小说库热度排行榜 ID 列表
   *
   * @param limit 返回数量，默认 100
   * @param offset 偏移量，默认 0
   * @returns 小说库 ID 列表
   *
   * _Requirements: 7.5_
   */
  async getLibraryRankingIds(
    limit: number = 100,
    offset: number = 0,
  ): Promise<string[]> {
    try {
      const ids = await this.cacheService.zrevrange(
        LIBRARY_RANKING_KEY,
        offset,
        offset + limit - 1,
      );

      if (ids && ids.length > 0) {
        return ids;
      }

      // 缓存未命中，回退到数据库查询
      this.logger.debug('小说库排行榜缓存未命中，回退到数据库查询');
      const libraries = await this.prisma.library.findMany({
        where: { isDeleted: false },
        orderBy: { hotScore: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true },
      });

      return libraries.map((l) => l.id);
    } catch (error) {
      this.logger.warn('获取小说库排行榜失败，回退到数据库查询', error);
      const libraries = await this.prisma.library.findMany({
        where: { isDeleted: false },
        orderBy: { hotScore: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true },
      });
      return libraries.map((l) => l.id);
    }
  }

  /**
   * 获取分支热度排行榜 ID 列表
   *
   * @param limit 返回数量，默认 100
   * @param offset 偏移量，默认 0
   * @returns 分支 ID 列表
   *
   * _Requirements: 7.4_
   */
  async getBranchRankingIds(
    limit: number = 100,
    offset: number = 0,
  ): Promise<string[]> {
    try {
      const ids = await this.cacheService.zrevrange(
        BRANCH_RANKING_KEY,
        offset,
        offset + limit - 1,
      );

      if (ids && ids.length > 0) {
        return ids;
      }

      // 缓存未命中，回退到数据库查询
      this.logger.debug('分支排行榜缓存未命中，回退到数据库查询');
      const branches = await this.prisma.libraryBranch.findMany({
        where: { isDeleted: false },
        orderBy: { hotScore: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true },
      });

      return branches.map((b) => b.id);
    } catch (error) {
      this.logger.warn('获取分支排行榜失败，回退到数据库查询', error);
      const branches = await this.prisma.libraryBranch.findMany({
        where: { isDeleted: false },
        orderBy: { hotScore: 'desc' },
        skip: offset,
        take: limit,
        select: { id: true },
      });
      return branches.map((b) => b.id);
    }
  }

  /**
   * 获取小说库在排行榜中的排名
   *
   * @param libraryId 小说库ID
   * @returns 排名（从1开始），不在排行榜中返回 null
   */
  async getLibraryRank(libraryId: string): Promise<number | null> {
    try {
      const rank = await this.cacheService.zrevrank(
        LIBRARY_RANKING_KEY,
        libraryId,
      );
      return rank !== null ? rank + 1 : null;
    } catch {
      return null;
    }
  }

  /**
   * 获取分支在排行榜中的排名
   *
   * @param branchId 分支ID
   * @returns 排名（从1开始），不在排行榜中返回 null
   */
  async getBranchRank(branchId: string): Promise<number | null> {
    try {
      const rank = await this.cacheService.zrevrank(
        BRANCH_RANKING_KEY,
        branchId,
      );
      return rank !== null ? rank + 1 : null;
    } catch {
      return null;
    }
  }
}
