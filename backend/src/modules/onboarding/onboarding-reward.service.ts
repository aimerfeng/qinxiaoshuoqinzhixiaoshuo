import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { WalletService } from '../wallet/wallet.service.js';
import {
  GuideCompletionRewardDto,
  AllGuidesCompletionRewardDto,
  CheckAllGuidesCompletedResponseDto,
} from './dto/onboarding-reward.dto.js';
import { GuideType } from './dto/onboarding-progress.dto.js';

/**
 * 所有引导类型列表
 */
const ALL_GUIDE_TYPES: GuideType[] = [
  GuideType.REGISTRATION,
  GuideType.HOMEPAGE,
  GuideType.READER,
  GuideType.CREATION,
];

/**
 * 引导奖励配置
 */
const GUIDE_REWARD_CONFIG = {
  /** 每个引导完成奖励的零芥子数量 */
  TOKENS_PER_GUIDE: 10,
  /** 完成所有引导的额外奖励零芥子数量 */
  ALL_GUIDES_BONUS_TOKENS: 50,
  /** 新手毕业成就名称 */
  GRADUATION_ACHIEVEMENT_NAME: '新手毕业',
};

/**
 * 引导类型名称映射
 */
const GUIDE_TYPE_NAMES: Record<GuideType, string> = {
  [GuideType.REGISTRATION]: '注册引导',
  [GuideType.HOMEPAGE]: '首页引导',
  [GuideType.READER]: '阅读引导',
  [GuideType.CREATION]: '创作引导',
};

/**
 * 新手引导奖励服务
 *
 * 需求22验收标准7: WHEN 用户完成所有引导 THEN System SHALL 发放"新手毕业"成就徽章
 *
 * 功能：
 * - 单个引导完成奖励发放
 * - 所有引导完成奖励发放
 * - 检查所有引导完成状态
 */
@Injectable()
export class OnboardingRewardService {
  private readonly logger = new Logger(OnboardingRewardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService,
  ) {}

  /**
   * 发放单个引导完成奖励
   *
   * @param userId 用户ID
   * @param guideType 引导类型
   * @returns 奖励信息，如果已经发放过则返回 null
   */
  async awardGuideCompletionReward(
    userId: string,
    guideType: GuideType,
  ): Promise<GuideCompletionRewardDto | null> {
    try {
      // 检查是否已经发放过该引导的奖励
      const existingReward = await this.prisma.transaction.findFirst({
        where: {
          wallet: { userId },
          type: 'REWARD',
          description: { contains: `完成${GUIDE_TYPE_NAMES[guideType]}奖励` },
        },
      });

      if (existingReward) {
        this.logger.log(
          `User ${userId} already received reward for ${guideType}`,
        );
        return null;
      }

      // 确保用户有钱包
      const wallet = await this.walletService.getOrCreateWallet(userId);

      // 发放奖励
      const tokensAwarded = GUIDE_REWARD_CONFIG.TOKENS_PER_GUIDE;
      const description = `完成${GUIDE_TYPE_NAMES[guideType]}奖励`;

      await this.prisma.$transaction(async (tx) => {
        // 更新钱包余额
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: tokensAwarded },
            totalReceived: { increment: tokensAwarded },
          },
        });

        // 创建交易记录
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'REWARD',
            amount: tokensAwarded,
            description,
            referenceType: 'onboarding',
          },
        });
      });

      this.logger.log(
        `Awarded ${tokensAwarded} tokens to user ${userId} for completing ${guideType}`,
      );

      return {
        guideType,
        tokensAwarded,
        description,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to award guide completion reward: ${errorMessage}`,
      );
      // 不抛出异常，奖励发放失败不应阻止引导完成
      return null;
    }
  }

  /**
   * 发放所有引导完成奖励（新手毕业）
   *
   * 需求22验收标准7: WHEN 用户完成所有引导 THEN System SHALL 发放"新手毕业"成就徽章
   *
   * @param userId 用户ID
   * @returns 奖励信息，如果已经发放过则返回 null
   */
  async awardAllGuidesCompletionReward(
    userId: string,
  ): Promise<AllGuidesCompletionRewardDto | null> {
    try {
      // 检查是否已经发放过新手毕业奖励
      const existingReward = await this.prisma.transaction.findFirst({
        where: {
          wallet: { userId },
          type: 'REWARD',
          description: {
            contains: GUIDE_REWARD_CONFIG.GRADUATION_ACHIEVEMENT_NAME,
          },
        },
      });

      if (existingReward) {
        this.logger.log(
          `User ${userId} already received graduation achievement`,
        );
        return null;
      }

      // 确保用户有钱包
      const wallet = await this.walletService.getOrCreateWallet(userId);

      // 发放奖励
      const tokensAwarded = GUIDE_REWARD_CONFIG.ALL_GUIDES_BONUS_TOKENS;
      const achievementName = GUIDE_REWARD_CONFIG.GRADUATION_ACHIEVEMENT_NAME;
      const description = `${achievementName}成就奖励`;

      await this.prisma.$transaction(async (tx) => {
        // 更新钱包余额
        await tx.wallet.update({
          where: { id: wallet.id },
          data: {
            balance: { increment: tokensAwarded },
            totalReceived: { increment: tokensAwarded },
          },
        });

        // 创建交易记录
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'REWARD',
            amount: tokensAwarded,
            description,
            referenceType: 'achievement',
          },
        });

        // TODO: 当成就系统实现后，在这里创建成就记录
        // await tx.userAchievement.create({
        //   data: {
        //     userId,
        //     achievementId: 'graduation',
        //     unlockedAt: new Date(),
        //   },
        // });
      });

      this.logger.log(
        `Awarded graduation achievement to user ${userId} with ${tokensAwarded} bonus tokens`,
      );

      return {
        tokensAwarded,
        achievementName,
        description,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to award all guides completion reward: ${errorMessage}`,
      );
      // 不抛出异常，奖励发放失败不应阻止引导完成
      return null;
    }
  }

  /**
   * 检查用户是否完成了所有引导
   *
   * @param userId 用户ID
   * @returns 完成状态信息
   */
  async checkAllGuidesCompleted(
    userId: string,
  ): Promise<CheckAllGuidesCompletedResponseDto> {
    try {
      // 获取用户所有已完成的引导
      const completedProgress = await this.prisma.onboardingProgress.findMany({
        where: {
          userId,
          completedAt: { not: null },
        },
        select: {
          guideType: true,
        },
      });

      const completedGuides = completedProgress.map((p) => p.guideType);
      const pendingGuides = ALL_GUIDE_TYPES.filter(
        (type) => !completedGuides.includes(type),
      );
      const allCompleted = pendingGuides.length === 0;
      const completionPercentage = Math.round(
        (completedGuides.length / ALL_GUIDE_TYPES.length) * 100,
      );

      return {
        allCompleted,
        completedGuides,
        pendingGuides,
        completionPercentage,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to check all guides completed: ${errorMessage}`,
      );
      // 返回默认值
      return {
        allCompleted: false,
        completedGuides: [],
        pendingGuides: ALL_GUIDE_TYPES,
        completionPercentage: 0,
      };
    }
  }

  /**
   * 处理引导完成后的奖励发放
   *
   * 这是一个便捷方法，用于在引导完成后自动处理奖励
   *
   * @param userId 用户ID
   * @param guideType 刚完成的引导类型
   * @returns 奖励信息
   */
  async processGuideCompletionRewards(
    userId: string,
    guideType: GuideType,
  ): Promise<{
    guideReward: GuideCompletionRewardDto | null;
    allGuidesReward: AllGuidesCompletionRewardDto | null;
    allGuidesCompleted: boolean;
  }> {
    // 1. 发放单个引导完成奖励
    const guideReward = await this.awardGuideCompletionReward(
      userId,
      guideType,
    );

    // 2. 检查是否所有引导都已完成
    const completionStatus = await this.checkAllGuidesCompleted(userId);

    // 3. 如果所有引导都完成了，发放新手毕业奖励
    let allGuidesReward: AllGuidesCompletionRewardDto | null = null;
    if (completionStatus.allCompleted) {
      allGuidesReward = await this.awardAllGuidesCompletionReward(userId);
    }

    return {
      guideReward,
      allGuidesReward,
      allGuidesCompleted: completionStatus.allCompleted,
    };
  }
}
