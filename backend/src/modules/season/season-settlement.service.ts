import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { SeasonConfigService } from './season-config.service.js';
import { LeaderboardRealtimeService } from './leaderboard-realtime.service.js';
import {
  LeaderboardCategory,
  SeasonTier,
  SeasonStatus,
} from './dto/leaderboard.dto.js';
import { SeasonRewardType } from './dto/reward.dto.js';

/**
 * 结算状态枚举
 */
export enum SettlementStatus {
  NOT_STARTED = 'NOT_STARTED', // 未开始
  IN_PROGRESS = 'IN_PROGRESS', // 进行中
  FINALIZING_RANKINGS = 'FINALIZING_RANKINGS', // 正在同步排名
  DETERMINING_TIERS = 'DETERMINING_TIERS', // 正在确定段位
  DISTRIBUTING_REWARDS = 'DISTRIBUTING_REWARDS', // 正在发放奖励
  COMPLETED = 'COMPLETED', // 已完成
  FAILED = 'FAILED', // 失败
}

/**
 * 结算进度接口
 */
export interface SettlementProgress {
  seasonId: string;
  status: SettlementStatus;
  startedAt?: Date;
  completedAt?: Date;
  currentStep: string;
  totalUsers: number;
  processedUsers: number;
  progress: number; // 0-100
  error?: string;
}

/**
 * 奖励分配规则
 */
interface RewardDistributionRule {
  tier: SeasonTier;
  rewards: {
    type: SeasonRewardType;
    value: Record<string, unknown>;
    description: string;
  }[];
}

/**
 * 赛季结算服务
 *
 * 需求25.1.10: 赛季结算服务（段位确定/奖励发放）
 *
 * 提供以下功能：
 * - settleSeasonAsync(seasonId) - 启动异步结算流程
 * - finalizeRankings(seasonId) - 从Redis同步排名到数据库
 * - determineUserTiers(seasonId) - 确定所有用户的最终段位
 * - distributeRewards(seasonId) - 为所有符合条件的用户创建奖励记录
 * - getSettlementStatus(seasonId) - 获取当前结算进度
 *
 * 奖励分配规则：
 * - Top 1: 王者段位奖励 + 特殊称号
 * - Top 10: 钻石段位奖励
 * - Top 100: 铂金段位奖励
 * - 其他用户: 根据段位发放对应奖励
 *
 * 设计语言:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
@Injectable()
export class SeasonSettlementService {
  private readonly logger = new Logger(SeasonSettlementService.name);

  // Redis key 前缀
  private readonly SETTLEMENT_STATUS_PREFIX = 'season:settlement:status:';
  private readonly SETTLEMENT_LOCK_PREFIX = 'season:settlement:lock:';
  private readonly SETTLEMENT_LOCK_TTL = 3600; // 结算锁过期时间（1小时）

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly seasonConfig: SeasonConfigService,
    private readonly leaderboardRealtime: LeaderboardRealtimeService,
  ) {}

  /**
   * 启动异步赛季结算流程
   *
   * @param seasonId 赛季ID
   * @returns 结算进度信息
   */
  async settleSeasonAsync(seasonId: string): Promise<SettlementProgress> {
    // 验证赛季状态
    await this.validateSeasonForSettlement(seasonId);

    // 尝试获取结算锁
    const lockKey = `${this.SETTLEMENT_LOCK_PREFIX}${seasonId}`;
    const lockAcquired = await this.acquireLock(lockKey);

    if (!lockAcquired) {
      // 检查是否已有结算在进行中
      const existingStatus = await this.getSettlementStatus(seasonId);
      if (existingStatus.status === SettlementStatus.IN_PROGRESS) {
        return existingStatus;
      }
      throw new BadRequestException('赛季结算正在进行中，请稍后再试');
    }

    try {
      // 初始化结算状态
      const progress: SettlementProgress = {
        seasonId,
        status: SettlementStatus.IN_PROGRESS,
        startedAt: new Date(),
        currentStep: '初始化结算流程',
        totalUsers: 0,
        processedUsers: 0,
        progress: 0,
      };

      await this.saveSettlementStatus(progress);

      // 异步执行结算流程
      this.executeSettlement(seasonId, progress).catch((error) => {
        this.logger.error(`赛季 ${seasonId} 结算失败:`, error);
        this.updateSettlementStatus(seasonId, {
          status: SettlementStatus.FAILED,
          error: error instanceof Error ? error.message : '未知错误',
        }).catch(() => {});
        this.releaseLock(lockKey).catch(() => {});
      });

      return progress;
    } catch (error) {
      await this.releaseLock(lockKey);
      throw error;
    }
  }

  /**
   * 执行结算流程
   */
  private async executeSettlement(
    seasonId: string,
    progress: SettlementProgress,
  ): Promise<void> {
    const lockKey = `${this.SETTLEMENT_LOCK_PREFIX}${seasonId}`;

    try {
      // 步骤1: 同步排名数据
      await this.updateSettlementStatus(seasonId, {
        status: SettlementStatus.FINALIZING_RANKINGS,
        currentStep: '正在同步排名数据...',
        progress: 10,
      });

      const rankingResult = await this.finalizeRankings(seasonId);
      progress.totalUsers = rankingResult.totalUsers;

      // 步骤2: 确定用户段位
      await this.updateSettlementStatus(seasonId, {
        status: SettlementStatus.DETERMINING_TIERS,
        currentStep: '正在确定用户段位...',
        progress: 40,
        totalUsers: progress.totalUsers,
      });

      await this.determineUserTiers(seasonId);

      // 步骤3: 发放奖励
      await this.updateSettlementStatus(seasonId, {
        status: SettlementStatus.DISTRIBUTING_REWARDS,
        currentStep: '正在发放赛季奖励...',
        progress: 70,
      });

      await this.distributeRewards(seasonId);

      // 步骤4: 更新赛季状态为已结算
      await this.updateSeasonStatus(seasonId, SeasonStatus.SETTLED);

      // 完成结算
      await this.updateSettlementStatus(seasonId, {
        status: SettlementStatus.COMPLETED,
        currentStep: '结算完成',
        progress: 100,
        completedAt: new Date(),
      });

      this.logger.log(`赛季 ${seasonId} 结算完成`);
    } finally {
      await this.releaseLock(lockKey);
    }
  }

  /**
   * 从Redis同步排名到数据库并计算最终排名
   *
   * @param seasonId 赛季ID
   * @returns 同步结果
   */
  async finalizeRankings(seasonId: string): Promise<{
    totalUsers: number;
    categorySynced: Record<LeaderboardCategory, number>;
  }> {
    this.logger.log(`开始同步赛季 ${seasonId} 的排名数据...`);

    // 同步所有类别的排行榜数据
    const categorySynced = await this.leaderboardRealtime.syncAllCategoriesToDatabase(seasonId);

    // 计算每个类别的最终排名
    const categories = Object.values(LeaderboardCategory);
    for (const category of categories) {
      await this.calculateFinalRanks(seasonId, category);
    }

    // 获取总参与用户数
    const totalUsers = await this.getTotalParticipants(seasonId);

    this.logger.log(
      `赛季 ${seasonId} 排名同步完成，共 ${totalUsers} 名用户参与`,
    );

    return { totalUsers, categorySynced };
  }

  /**
   * 计算某类别的最终排名
   */
  private async calculateFinalRanks(
    seasonId: string,
    category: LeaderboardCategory,
  ): Promise<void> {
    // 使用原生SQL更新排名，按分数降序排列
    await this.prisma.$executeRaw`
      WITH ranked AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) as new_rank
        FROM season_leaderboards
        WHERE season_id = ${seasonId} AND category = ${category}::text
      )
      UPDATE season_leaderboards sl
      SET rank = ranked.new_rank,
          previous_rank = sl.rank,
          updated_at = NOW()
      FROM ranked
      WHERE sl.id = ranked.id
    `;

    this.logger.debug(`赛季 ${seasonId} 的 ${category} 榜排名计算完成`);
  }

  /**
   * 确定所有用户的最终段位
   *
   * @param seasonId 赛季ID
   */
  async determineUserTiers(seasonId: string): Promise<void> {
    this.logger.log(`开始确定赛季 ${seasonId} 的用户段位...`);

    // 获取综合排行榜数据
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const leaderboardEntries = await (this.prisma as any).seasonLeaderboard.findMany({
      where: {
        seasonId,
        category: LeaderboardCategory.OVERALL,
      },
      orderBy: { rank: 'asc' },
    });

    // 批量更新用户段位
    for (const entry of leaderboardEntries as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const userId = entry.userId as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const rank = entry.rank as number | null;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const score = entry.score as number;

      // 根据排名和积分确定最终段位
      const finalTier = this.determineFinalTier(rank, score);

      // 更新用户的赛季段位记录
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      await (this.prisma as any).seasonRank.upsert({
        where: {
          userId_seasonId: { userId, seasonId },
        },
        update: {
          tier: finalTier,
          updatedAt: new Date(),
        },
        create: {
          userId,
          seasonId,
          tier: finalTier,
          points: score,
          peakTier: finalTier,
          peakPoints: score,
        },
      });
    }

    this.logger.log(
      `赛季 ${seasonId} 用户段位确定完成，共处理 ${(leaderboardEntries as any[]).length} 名用户`,
    );
  }

  /**
   * 根据排名和积分确定最终段位
   *
   * 奖励分配规则：
   * - Top 1: 王者
   * - Top 2-10: 钻石
   * - Top 11-100: 铂金
   * - 其他: 根据积分确定段位
   */
  private determineFinalTier(rank: number | null, points: number): SeasonTier {
    // 特殊排名奖励
    if (rank !== null) {
      if (rank === 1) {
        return SeasonTier.KING;
      }
      if (rank <= 10) {
        return SeasonTier.DIAMOND;
      }
      if (rank <= 100) {
        return SeasonTier.PLATINUM;
      }
    }

    // 根据积分确定段位
    return this.seasonConfig.getTierByPoints(points);
  }

  /**
   * 为所有符合条件的用户发放赛季奖励
   *
   * @param seasonId 赛季ID
   */
  async distributeRewards(seasonId: string): Promise<void> {
    this.logger.log(`开始发放赛季 ${seasonId} 的奖励...`);

    // 获取赛季奖励配置
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const seasonRewards = await (this.prisma as any).seasonReward.findMany({
      where: { seasonId },
    });

    // 如果没有配置奖励，创建默认奖励配置
    if ((seasonRewards as any[]).length === 0) {
      await this.createDefaultRewards(seasonId);
    }

    // 获取所有有段位记录的用户
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const userRanks = await (this.prisma as any).seasonRank.findMany({
      where: { seasonId },
      include: {
        user: {
          select: { id: true, username: true },
        },
      },
    });

    // 获取综合排行榜数据（用于确定特殊排名奖励）
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const overallLeaderboard = await (this.prisma as any).seasonLeaderboard.findMany({
      where: {
        seasonId,
        category: LeaderboardCategory.OVERALL,
      },
      orderBy: { rank: 'asc' },
      take: 100, // 只需要前100名
    });

    // 创建排名映射
    const rankMap = new Map<string, number>();
    for (const entry of overallLeaderboard as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      rankMap.set(entry.userId as string, entry.rank as number);
    }

    // 为每个用户发放奖励
    let rewardsCreated = 0;
    for (const userRank of userRanks as any[]) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const userId = userRank.userId as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const tier = userRank.tier as SeasonTier;
      const rank = rankMap.get(userId);

      // 获取用户应得的奖励
      const userRewards = await this.getUserEligibleRewards(
        seasonId,
        tier,
        rank,
      );

      // 创建奖励记录
      for (const reward of userRewards) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          await (this.prisma as any).userSeasonReward.create({
            data: {
              userId,
              seasonId,
              rewardId: reward.id,
              status: 'PENDING',
              expiresAt: this.calculateRewardExpiry(),
            },
          });
          rewardsCreated++;
        } catch (error) {
          // 忽略重复记录错误
          if (
            error instanceof Error &&
            error.message.includes('Unique constraint')
          ) {
            continue;
          }
          throw error;
        }
      }
    }

    this.logger.log(
      `赛季 ${seasonId} 奖励发放完成，共创建 ${rewardsCreated} 条奖励记录`,
    );
  }

  /**
   * 获取用户应得的奖励列表
   */
  private async getUserEligibleRewards(
    seasonId: string,
    tier: SeasonTier,
    rank?: number,
  ): Promise<any[]> {
    // 获取该段位的所有奖励
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const tierRewards = await (this.prisma as any).seasonReward.findMany({
      where: {
        seasonId,
        tier,
      },
    });

    const rewards = [...(tierRewards as any[])];

    // 特殊排名奖励
    if (rank === 1) {
      // Top 1 获得特殊称号
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const specialReward = await (this.prisma as any).seasonReward.findFirst({
        where: {
          seasonId,
          tier: SeasonTier.KING,
          rewardType: SeasonRewardType.TITLE,
        },
      });
      if (specialReward && !rewards.find((r: any) => r.id === specialReward.id)) {
        rewards.push(specialReward);
      }
    }

    return rewards;
  }

  /**
   * 创建默认赛季奖励配置
   */
  private async createDefaultRewards(seasonId: string): Promise<void> {
    const defaultRewards: RewardDistributionRule[] = [
      {
        tier: SeasonTier.KING,
        rewards: [
          {
            type: SeasonRewardType.TOKENS,
            value: { amount: 1000 },
            description: '王者段位奖励 - 1000零芥子代币',
          },
          {
            type: SeasonRewardType.BADGE,
            value: { badgeId: 'king_badge', badgeName: '王者徽章' },
            description: '王者段位专属徽章',
          },
          {
            type: SeasonRewardType.TITLE,
            value: { titleId: 'king_title', titleName: '赛季王者' },
            description: '王者段位专属称号',
          },
          {
            type: SeasonRewardType.AVATAR_FRAME,
            value: { frameId: 'king_frame', frameName: '王者头像框' },
            description: '王者段位专属头像框',
          },
        ],
      },
      {
        tier: SeasonTier.GRANDMASTER,
        rewards: [
          {
            type: SeasonRewardType.TOKENS,
            value: { amount: 500 },
            description: '宗师段位奖励 - 500零芥子代币',
          },
          {
            type: SeasonRewardType.BADGE,
            value: { badgeId: 'grandmaster_badge', badgeName: '宗师徽章' },
            description: '宗师段位专属徽章',
          },
        ],
      },
      {
        tier: SeasonTier.MASTER,
        rewards: [
          {
            type: SeasonRewardType.TOKENS,
            value: { amount: 300 },
            description: '大师段位奖励 - 300零芥子代币',
          },
          {
            type: SeasonRewardType.BADGE,
            value: { badgeId: 'master_badge', badgeName: '大师徽章' },
            description: '大师段位专属徽章',
          },
        ],
      },
      {
        tier: SeasonTier.DIAMOND,
        rewards: [
          {
            type: SeasonRewardType.TOKENS,
            value: { amount: 200 },
            description: '钻石段位奖励 - 200零芥子代币',
          },
          {
            type: SeasonRewardType.BADGE,
            value: { badgeId: 'diamond_badge', badgeName: '钻石徽章' },
            description: '钻石段位专属徽章',
          },
        ],
      },
      {
        tier: SeasonTier.PLATINUM,
        rewards: [
          {
            type: SeasonRewardType.TOKENS,
            value: { amount: 100 },
            description: '铂金段位奖励 - 100零芥子代币',
          },
          {
            type: SeasonRewardType.BADGE,
            value: { badgeId: 'platinum_badge', badgeName: '铂金徽章' },
            description: '铂金段位专属徽章',
          },
        ],
      },
      {
        tier: SeasonTier.GOLD,
        rewards: [
          {
            type: SeasonRewardType.TOKENS,
            value: { amount: 50 },
            description: '黄金段位奖励 - 50零芥子代币',
          },
        ],
      },
      {
        tier: SeasonTier.SILVER,
        rewards: [
          {
            type: SeasonRewardType.TOKENS,
            value: { amount: 30 },
            description: '白银段位奖励 - 30零芥子代币',
          },
        ],
      },
      {
        tier: SeasonTier.BRONZE,
        rewards: [
          {
            type: SeasonRewardType.TOKENS,
            value: { amount: 20 },
            description: '青铜段位奖励 - 20零芥子代币',
          },
        ],
      },
      {
        tier: SeasonTier.NOVICE,
        rewards: [
          {
            type: SeasonRewardType.TOKENS,
            value: { amount: 10 },
            description: '新秀段位奖励 - 10零芥子代币',
          },
        ],
      },
    ];

    // 批量创建奖励配置
    for (const rule of defaultRewards) {
      let sortOrder = 0;
      for (const reward of rule.rewards) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
        await (this.prisma as any).seasonReward.create({
          data: {
            seasonId,
            tier: rule.tier,
            rewardType: reward.type,
            rewardValue: reward.value,
            description: reward.description,
            sortOrder: sortOrder++,
          },
        });
      }
    }

    this.logger.log(`为赛季 ${seasonId} 创建了默认奖励配置`);
  }

  /**
   * 计算奖励过期时间（结算后30天）
   */
  private calculateRewardExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30);
    return expiry;
  }

  /**
   * 获取结算状态
   *
   * @param seasonId 赛季ID
   * @returns 结算进度信息
   */
  async getSettlementStatus(seasonId: string): Promise<SettlementProgress> {
    const statusKey = `${this.SETTLEMENT_STATUS_PREFIX}${seasonId}`;
    const statusJson = await this.redis.get(statusKey);

    if (!statusJson) {
      return {
        seasonId,
        status: SettlementStatus.NOT_STARTED,
        currentStep: '未开始',
        totalUsers: 0,
        processedUsers: 0,
        progress: 0,
      };
    }

    try {
      const status = JSON.parse(statusJson) as SettlementProgress;
      // 转换日期字符串为Date对象
      if (status.startedAt) {
        status.startedAt = new Date(status.startedAt);
      }
      if (status.completedAt) {
        status.completedAt = new Date(status.completedAt);
      }
      return status;
    } catch {
      return {
        seasonId,
        status: SettlementStatus.NOT_STARTED,
        currentStep: '未开始',
        totalUsers: 0,
        processedUsers: 0,
        progress: 0,
      };
    }
  }

  /**
   * 保存结算状态
   */
  private async saveSettlementStatus(progress: SettlementProgress): Promise<void> {
    const statusKey = `${this.SETTLEMENT_STATUS_PREFIX}${progress.seasonId}`;
    await this.redis.set(
      statusKey,
      JSON.stringify(progress),
      86400, // 24小时过期
    );
  }

  /**
   * 更新结算状态
   */
  private async updateSettlementStatus(
    seasonId: string,
    updates: Partial<SettlementProgress>,
  ): Promise<void> {
    const current = await this.getSettlementStatus(seasonId);
    const updated = { ...current, ...updates };
    await this.saveSettlementStatus(updated);
  }

  /**
   * 验证赛季是否可以进行结算
   */
  private async validateSeasonForSettlement(seasonId: string): Promise<any> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const season = await (this.prisma as any).season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      throw new NotFoundException(`赛季不存在: ${seasonId}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const status = season.status as SeasonStatus;

    if (status === SeasonStatus.SETTLED) {
      throw new BadRequestException('该赛季已经结算完成');
    }

    if (status === SeasonStatus.ACTIVE) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const endDate = new Date(season.endDate as string);
      if (endDate > new Date()) {
        throw new BadRequestException('赛季尚未结束，无法进行结算');
      }
    }

    if (status === SeasonStatus.UPCOMING) {
      throw new BadRequestException('赛季尚未开始，无法进行结算');
    }

    return season;
  }

  /**
   * 更新赛季状态
   */
  private async updateSeasonStatus(
    seasonId: string,
    status: SeasonStatus,
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    await (this.prisma as any).season.update({
      where: { id: seasonId },
      data: { status, updatedAt: new Date() },
    });

    // 清除赛季缓存
    await this.redis.del(`season:current`);
    await this.redis.del(`season:info:${seasonId}`);
  }

  /**
   * 获取赛季总参与人数
   */
  private async getTotalParticipants(seasonId: string): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const count = await (this.prisma as any).seasonLeaderboard.count({
      where: {
        seasonId,
        category: LeaderboardCategory.OVERALL,
      },
    });
    return count as number;
  }

  /**
   * 获取分布式锁
   */
  private async acquireLock(lockKey: string): Promise<boolean> {
    const result = await this.redis.getClient().set(
      lockKey,
      '1',
      'EX',
      this.SETTLEMENT_LOCK_TTL,
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
