import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SeasonService } from './season.service.js';
import {
  SeasonRewardType,
  UserSeasonRewardStatus,
} from './dto/reward.dto.js';
import { SeasonTier } from './dto/leaderboard.dto.js';
import {
  SeasonRewardDto,
  UserSeasonRewardDto,
  UserSeasonRewardsSummaryDto,
  TierRewardsSummaryDto,
  RewardValue,
  TokenRewardValue,
} from './dto/reward-response.dto.js';
import { SeasonInfoDto } from './dto/leaderboard-response.dto.js';

/**
 * 赛季奖励服务
 *
 * 需求25.1.12: 赛季奖励领取 API
 *
 * 提供以下功能：
 * - getUserRewards(userId, seasonId) - 获取用户在某赛季的奖励列表
 * - claimReward(userId, seasonId, rewardId) - 领取单个奖励
 * - claimAllRewards(userId, seasonId) - 领取所有可领取的奖励
 *
 * 奖励领取逻辑：
 * 1. 检查奖励状态是否为 PENDING
 * 2. 检查奖励是否已过期
 * 3. 更新状态为 CLAIMED 并设置 claimedAt
 * 4. 对于 TOKENS 类型：添加代币到用户钱包
 * 5. 对于 BADGE/TITLE/AVATAR_FRAME：添加到用户库存
 *
 * 设计语言:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
@Injectable()
export class SeasonRewardService {
  private readonly logger = new Logger(SeasonRewardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly seasonService: SeasonService,
  ) {}

  /**
   * 获取用户在某赛季的奖励列表
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   * @returns 用户奖励列表
   */
  async getUserRewards(
    userId: string,
    seasonId: string,
  ): Promise<{
    season: SeasonInfoDto;
    rewards: UserSeasonRewardDto[];
  }> {
    // 获取赛季信息
    const season = await this.seasonService.getSeasonById(seasonId);

    // 获取用户在该赛季的所有奖励记录
    const userRewards = await (this.prisma as any).userSeasonReward.findMany({
      where: {
        userId,
        seasonId,
      },
      include: {
        seasonReward: true,
      },
      orderBy: [
        { status: 'asc' }, // PENDING 优先
        { createdAt: 'desc' },
      ],
    });

    // 转换为 DTO
    const rewards = (userRewards as any[]).map((ur) =>
      this.toUserSeasonRewardDto(ur),
    );

    return { season, rewards };
  }


  /**
   * 获取用户赛季奖励汇总
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   * @returns 用户奖励汇总信息
   */
  async getUserRewardsSummary(
    userId: string,
    seasonId: string,
  ): Promise<{
    season: SeasonInfoDto;
    summary: UserSeasonRewardsSummaryDto;
  }> {
    // 获取赛季信息
    const season = await this.seasonService.getSeasonById(seasonId);

    // 获取用户在该赛季的段位
    const userRank = await (this.prisma as any).seasonRank.findUnique({
      where: {
        userId_seasonId: { userId, seasonId },
      },
    });

    const currentTier = userRank?.tier ?? SeasonTier.NOVICE;

    // 获取用户的所有奖励记录
    const userRewards = await (this.prisma as any).userSeasonReward.findMany({
      where: {
        userId,
        seasonId,
      },
      include: {
        seasonReward: true,
      },
    });

    // 统计各状态的奖励数量
    let pendingCount = 0;
    let claimedCount = 0;
    let expiredCount = 0;

    for (const ur of userRewards as any[]) {
      const status = ur.status as UserSeasonRewardStatus;
      if (status === UserSeasonRewardStatus.PENDING) {
        // 检查是否已过期
        if (ur.expiresAt && new Date(ur.expiresAt as string) < new Date()) {
          expiredCount++;
        } else {
          pendingCount++;
        }
      } else if (status === UserSeasonRewardStatus.CLAIMED) {
        claimedCount++;
      } else if (status === UserSeasonRewardStatus.EXPIRED) {
        expiredCount++;
      }
    }

    // 获取该赛季所有段位的奖励配置
    const allRewards = await (this.prisma as any).seasonReward.findMany({
      where: { seasonId },
      orderBy: [{ tier: 'desc' }, { sortOrder: 'asc' }],
    });

    // 按段位分组奖励
    const tierRewards = this.groupRewardsByTier(
      allRewards as any[],
      userRewards as any[],
      currentTier,
    );

    const summary: UserSeasonRewardsSummaryDto = {
      userId,
      seasonId,
      currentTier,
      pendingCount,
      claimedCount,
      expiredCount,
      tierRewards,
    };

    return { season, summary };
  }

  /**
   * 领取单个奖励
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   * @param rewardId 奖励记录ID（UserSeasonReward的ID）
   * @returns 领取结果
   */
  async claimReward(
    userId: string,
    seasonId: string,
    rewardId: string,
  ): Promise<{
    reward: UserSeasonRewardDto;
    claimedReward: {
      type: SeasonRewardType;
      value: RewardValue;
      description?: string;
    };
  }> {
    // 查找用户的奖励记录
    const userReward = await (this.prisma as any).userSeasonReward.findFirst({
      where: {
        id: rewardId,
        userId,
        seasonId,
      },
      include: {
        seasonReward: true,
      },
    });

    if (!userReward) {
      throw new NotFoundException('奖励不存在或不属于当前用户');
    }

    // 检查奖励状态
    const status = userReward.status as UserSeasonRewardStatus;
    if (status === UserSeasonRewardStatus.CLAIMED) {
      throw new BadRequestException('该奖励已经领取过了');
    }

    if (status === UserSeasonRewardStatus.EXPIRED) {
      throw new BadRequestException('该奖励已过期');
    }

    // 检查是否已过期
    if (
      userReward.expiresAt &&
      new Date(userReward.expiresAt as string) < new Date()
    ) {
      // 更新状态为已过期
      await (this.prisma as any).userSeasonReward.update({
        where: { id: rewardId },
        data: {
          status: UserSeasonRewardStatus.EXPIRED,
          updatedAt: new Date(),
        },
      });
      throw new BadRequestException('该奖励已过期');
    }

    // 执行奖励发放
    const rewardType = userReward.seasonReward.rewardType as SeasonRewardType;
    const rewardValue = userReward.seasonReward.rewardValue as RewardValue;

    await this.distributeRewardToUser(userId, rewardType, rewardValue);

    // 更新奖励状态为已领取
    const updatedReward = await (this.prisma as any).userSeasonReward.update({
      where: { id: rewardId },
      data: {
        status: UserSeasonRewardStatus.CLAIMED,
        claimedAt: new Date(),
        updatedAt: new Date(),
      },
      include: {
        seasonReward: true,
      },
    });

    this.logger.log(
      `用户 ${userId} 领取了赛季 ${seasonId} 的奖励 ${rewardId}，类型: ${rewardType}`,
    );

    return {
      reward: this.toUserSeasonRewardDto(updatedReward),
      claimedReward: {
        type: rewardType,
        value: rewardValue,
        description: userReward.seasonReward.description as string | undefined,
      },
    };
  }


  /**
   * 领取所有可领取的奖励
   *
   * @param userId 用户ID
   * @param seasonId 赛季ID
   * @returns 批量领取结果
   */
  async claimAllRewards(
    userId: string,
    seasonId: string,
  ): Promise<{
    claimedRewards: UserSeasonRewardDto[];
    failedRewards: { rewardId: string; reason: string }[];
    summary: {
      totalRequested: number;
      successCount: number;
      failedCount: number;
      totalTokens: number;
    };
  }> {
    // 获取所有待领取的奖励
    const pendingRewards = await (this.prisma as any).userSeasonReward.findMany({
      where: {
        userId,
        seasonId,
        status: UserSeasonRewardStatus.PENDING,
      },
      include: {
        seasonReward: true,
      },
    });

    const claimedRewards: UserSeasonRewardDto[] = [];
    const failedRewards: { rewardId: string; reason: string }[] = [];
    let totalTokens = 0;

    for (const userReward of pendingRewards as any[]) {
      const rewardId = userReward.id as string;

      try {
        // 检查是否已过期
        if (
          userReward.expiresAt &&
          new Date(userReward.expiresAt as string) < new Date()
        ) {
          // 更新状态为已过期
          await (this.prisma as any).userSeasonReward.update({
            where: { id: rewardId },
            data: {
              status: UserSeasonRewardStatus.EXPIRED,
              updatedAt: new Date(),
            },
          });
          failedRewards.push({ rewardId, reason: '奖励已过期' });
          continue;
        }

        // 执行奖励发放
        const rewardType = userReward.seasonReward.rewardType as SeasonRewardType;
        const rewardValue = userReward.seasonReward.rewardValue as RewardValue;

        await this.distributeRewardToUser(userId, rewardType, rewardValue);

        // 统计代币数量
        if (rewardType === SeasonRewardType.TOKENS) {
          totalTokens += (rewardValue as TokenRewardValue).amount ?? 0;
        }

        // 更新奖励状态为已领取
        const updatedReward = await (this.prisma as any).userSeasonReward.update({
          where: { id: rewardId },
          data: {
            status: UserSeasonRewardStatus.CLAIMED,
            claimedAt: new Date(),
            updatedAt: new Date(),
          },
          include: {
            seasonReward: true,
          },
        });

        claimedRewards.push(this.toUserSeasonRewardDto(updatedReward));
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : '未知错误';
        failedRewards.push({ rewardId, reason: errorMessage });
        this.logger.error(
          `用户 ${userId} 领取奖励 ${rewardId} 失败: ${errorMessage}`,
        );
      }
    }

    this.logger.log(
      `用户 ${userId} 批量领取赛季 ${seasonId} 的奖励，成功: ${claimedRewards.length}，失败: ${failedRewards.length}`,
    );

    return {
      claimedRewards,
      failedRewards,
      summary: {
        totalRequested: (pendingRewards as any[]).length,
        successCount: claimedRewards.length,
        failedCount: failedRewards.length,
        totalTokens,
      },
    };
  }

  /**
   * 发放奖励到用户账户
   *
   * @param userId 用户ID
   * @param rewardType 奖励类型
   * @param rewardValue 奖励值
   */
  private async distributeRewardToUser(
    userId: string,
    rewardType: SeasonRewardType,
    rewardValue: RewardValue,
  ): Promise<void> {
    switch (rewardType) {
      case SeasonRewardType.TOKENS:
        await this.addTokensToWallet(
          userId,
          (rewardValue as TokenRewardValue).amount,
        );
        break;

      case SeasonRewardType.BADGE:
        await this.addBadgeToInventory(userId, rewardValue);
        break;

      case SeasonRewardType.TITLE:
        await this.addTitleToInventory(userId, rewardValue);
        break;

      case SeasonRewardType.AVATAR_FRAME:
        await this.addAvatarFrameToInventory(userId, rewardValue);
        break;

      default:
        this.logger.warn(`未知的奖励类型: ${rewardType}`);
    }
  }

  /**
   * 添加代币到用户钱包
   */
  private async addTokensToWallet(
    userId: string,
    amount: number,
  ): Promise<void> {
    // 查找或创建用户钱包
    const wallet = await (this.prisma as any).wallet.findUnique({
      where: { userId },
    });

    if (wallet) {
      // 更新钱包余额
      await (this.prisma as any).wallet.update({
        where: { userId },
        data: {
          balance: { increment: amount },
          totalReceived: { increment: amount },
          updatedAt: new Date(),
        },
      });

      // 记录交易
      await (this.prisma as any).transaction.create({
        data: {
          walletId: wallet.id as string,
          type: 'REWARD',
          amount,
          referenceType: 'season_reward',
          description: '赛季奖励领取',
        },
      });
    } else {
      // 创建新钱包
      const newWallet = await (this.prisma as any).wallet.create({
        data: {
          userId,
          balance: amount,
          totalReceived: amount,
        },
      });

      // 记录交易
      await (this.prisma as any).transaction.create({
        data: {
          walletId: newWallet.id as string,
          type: 'REWARD',
          amount,
          referenceType: 'season_reward',
          description: '赛季奖励领取',
        },
      });
    }

    this.logger.debug(`为用户 ${userId} 添加了 ${amount} 零芥子代币`);
  }


  /**
   * 添加徽章到用户库存
   * 注意：当前版本仅记录日志，实际存储需要 UserBadge 模型
   */
  private async addBadgeToInventory(
    userId: string,
    rewardValue: RewardValue,
  ): Promise<void> {
    const badgeValue = rewardValue as { badgeId: string; badgeName?: string };

    // TODO: 当 UserBadge 模型创建后，实现实际的徽章存储逻辑
    // 目前仅记录日志
    this.logger.log(
      `为用户 ${userId} 添加了徽章: ${badgeValue.badgeName ?? badgeValue.badgeId}`,
    );
  }

  /**
   * 添加称号到用户库存
   * 注意：当前版本仅记录日志，实际存储需要 UserTitle 模型
   */
  private async addTitleToInventory(
    userId: string,
    rewardValue: RewardValue,
  ): Promise<void> {
    const titleValue = rewardValue as { titleId: string; titleName?: string };

    // TODO: 当 UserTitle 模型创建后，实现实际的称号存储逻辑
    // 目前仅记录日志
    this.logger.log(
      `为用户 ${userId} 添加了称号: ${titleValue.titleName ?? titleValue.titleId}`,
    );
  }

  /**
   * 添加头像框到用户库存
   * 注意：当前版本仅记录日志，实际存储需要 UserAvatarFrame 模型
   */
  private async addAvatarFrameToInventory(
    userId: string,
    rewardValue: RewardValue,
  ): Promise<void> {
    const frameValue = rewardValue as { frameId: string; frameName?: string };

    // TODO: 当 UserAvatarFrame 模型创建后，实现实际的头像框存储逻辑
    // 目前仅记录日志
    this.logger.log(
      `为用户 ${userId} 添加了头像框: ${frameValue.frameName ?? frameValue.frameId}`,
    );
  }

  /**
   * 按段位分组奖励
   */
  private groupRewardsByTier(
    allRewards: any[],
    userRewards: any[],
    currentTier: SeasonTier,
  ): TierRewardsSummaryDto[] {
    const tierOrder = this.getTierOrder();
    const currentTierValue = tierOrder[currentTier];

    // 创建用户奖励映射（rewardId -> userReward）
    const userRewardMap = new Map<string, any>();
    for (const ur of userRewards) {
      userRewardMap.set(ur.rewardId as string, ur);
    }

    // 按段位分组
    const tierGroups = new Map<SeasonTier, any[]>();
    for (const reward of allRewards) {
      const tier = reward.tier as SeasonTier;
      if (!tierGroups.has(tier)) {
        tierGroups.set(tier, []);
      }
      tierGroups.get(tier)!.push(reward);
    }

    // 转换为 DTO
    const result: TierRewardsSummaryDto[] = [];
    const tiers = Object.values(SeasonTier);

    for (const tier of tiers) {
      const rewards = tierGroups.get(tier) ?? [];
      const tierValue = tierOrder[tier];
      const isAchieved = tierValue <= currentTierValue;

      // 检查是否有可领取的奖励
      let canClaim = false;
      if (isAchieved) {
        for (const reward of rewards) {
          const userReward = userRewardMap.get(reward.id as string);
          if (
            userReward &&
            userReward.status === UserSeasonRewardStatus.PENDING
          ) {
            // 检查是否过期
            if (
              !userReward.expiresAt ||
              new Date(userReward.expiresAt as string) >= new Date()
            ) {
              canClaim = true;
              break;
            }
          }
        }
      }

      result.push({
        tier,
        tierDisplayName: this.getTierDisplayName(tier),
        rewards: rewards.map((r: any) => this.toSeasonRewardDto(r)),
        isAchieved,
        canClaim,
      });
    }

    // 按段位从高到低排序
    result.sort((a, b) => tierOrder[b.tier] - tierOrder[a.tier]);

    return result;
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
   * 获取段位显示名称
   */
  private getTierDisplayName(tier: SeasonTier): string {
    const displayNames: Record<SeasonTier, string> = {
      [SeasonTier.NOVICE]: '新秀',
      [SeasonTier.BRONZE]: '青铜',
      [SeasonTier.SILVER]: '白银',
      [SeasonTier.GOLD]: '黄金',
      [SeasonTier.PLATINUM]: '铂金',
      [SeasonTier.DIAMOND]: '钻石',
      [SeasonTier.MASTER]: '大师',
      [SeasonTier.GRANDMASTER]: '宗师',
      [SeasonTier.KING]: '王者',
    };
    return displayNames[tier] ?? tier;
  }

  /**
   * 转换为 SeasonRewardDto
   */
  private toSeasonRewardDto(reward: any): SeasonRewardDto {
    return {
      id: reward.id as string,
      seasonId: reward.seasonId as string,
      tier: reward.tier as SeasonTier,
      rewardType: reward.rewardType as SeasonRewardType,
      rewardValue: reward.rewardValue as RewardValue,
      description: reward.description as string | null,
      sortOrder: reward.sortOrder as number,
      createdAt: (reward.createdAt as Date).toISOString(),
    };
  }

  /**
   * 转换为 UserSeasonRewardDto
   */
  private toUserSeasonRewardDto(userReward: any): UserSeasonRewardDto {
    return {
      id: userReward.id as string,
      userId: userReward.userId as string,
      seasonId: userReward.seasonId as string,
      rewardId: userReward.rewardId as string,
      status: userReward.status as UserSeasonRewardStatus,
      claimedAt: userReward.claimedAt
        ? (userReward.claimedAt as Date).toISOString()
        : null,
      expiresAt: userReward.expiresAt
        ? (userReward.expiresAt as Date).toISOString()
        : null,
      createdAt: (userReward.createdAt as Date).toISOString(),
      updatedAt: (userReward.updatedAt as Date).toISOString(),
      reward: this.toSeasonRewardDto(userReward.seasonReward),
    };
  }
}
