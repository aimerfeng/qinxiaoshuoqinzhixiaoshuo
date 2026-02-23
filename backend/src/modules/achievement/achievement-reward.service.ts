import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AchievementRewardType,
  AchievementRewardValueDto,
  AchievementCategory,
  AchievementTier,
} from './dto/achievement.dto.js';
import {
  ClaimRewardResponseDto,
} from './dto/achievement-response.dto.js';

/**
 * 成就奖励发放服务
 *
 * 需求24.1.7: 成就奖励发放服务（零芥子/徽章/称号/头像框）
 *
 * 功能：
 * - 领取成就奖励
 * - 发放零芥子代币
 * - 发放徽章
 * - 发放称号
 * - 发放头像框
 * - 发放主题皮肤
 */
@Injectable()
export class AchievementRewardService {
  private readonly logger = new Logger(AchievementRewardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 领取成就奖励
   *
   * 需求24.1.10: 成就领取 API
   *
   * @param userId 用户ID
   * @param achievementId 成就ID
   */
  async claimReward(
    userId: string,
    achievementId: string,
  ): Promise<ClaimRewardResponseDto> {
    try {
      // 获取成就定义
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        throw new NotFoundException('成就不存在');
      }

      // 获取用户成就进度
      const userAchievement = await this.prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId } },
      });

      if (!userAchievement) {
        throw new BadRequestException('您尚未获得此成就');
      }

      if (!userAchievement.isUnlocked) {
        throw new BadRequestException('成就尚未解锁');
      }

      if (userAchievement.isClaimed) {
        throw new BadRequestException('奖励已领取');
      }

      // 发放奖励
      const rewardValue = achievement.rewardValue as AchievementRewardValueDto;
      await this.distributeReward(
        userId,
        achievement.rewardType as unknown as AchievementRewardType,
        rewardValue,
        achievement.displayName,
      );

      // 更新领取状态
      const updatedProgress = await this.prisma.userAchievement.update({
        where: { id: userAchievement.id },
        data: {
          isClaimed: true,
          claimedAt: new Date(),
        },
      });

      this.logger.log(
        `User ${userId} claimed reward for achievement: ${achievement.name}`,
      );

      // 发送奖励领取通知
      this.eventEmitter.emit('notification.reward_claimed', {
        userId,
        achievementName: achievement.name,
        rewardType: achievement.rewardType,
        rewardValue,
      });

      const progressPercent = Math.min(
        Math.round((updatedProgress.currentProgress / achievement.targetValue) * 100),
        100,
      );

      return {
        message: '奖励领取成功',
        achievement: {
          id: achievement.id,
          name: achievement.name,
          displayName: achievement.displayName,
          description: achievement.description,
          category: achievement.category as unknown as AchievementCategory,
          tier: achievement.tier as unknown as AchievementTier,
          iconUrl: achievement.iconUrl,
          badgeUrl: achievement.badgeUrl,
          targetValue: achievement.targetValue,
          rewardType: achievement.rewardType as unknown as AchievementRewardType,
          rewardValue,
          isHidden: achievement.isHidden,
          isActive: achievement.isActive,
          sortOrder: achievement.sortOrder,
          createdAt: achievement.createdAt,
          updatedAt: achievement.updatedAt,
          currentProgress: updatedProgress.currentProgress,
          progressPercent,
          isUnlocked: updatedProgress.isUnlocked,
          unlockedAt: updatedProgress.unlockedAt,
          isClaimed: updatedProgress.isClaimed,
          claimedAt: updatedProgress.claimedAt,
        },
        reward: {
          type: achievement.rewardType as unknown as AchievementRewardType,
          value: rewardValue,
        },
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to claim reward: ${errorMessage}`);
      throw new InternalServerErrorException('领取奖励失败');
    }
  }

  /**
   * 发放奖励
   *
   * @param userId 用户ID
   * @param rewardType 奖励类型
   * @param rewardValue 奖励值
   * @param achievementName 成就名称（用于记录）
   */
  private async distributeReward(
    userId: string,
    rewardType: AchievementRewardType,
    rewardValue: AchievementRewardValueDto,
    achievementName: string,
  ): Promise<void> {
    switch (rewardType) {
      case AchievementRewardType.TOKENS:
        await this.distributeTokens(userId, rewardValue.amount ?? 0, achievementName);
        break;

      case AchievementRewardType.BADGE:
        await this.distributeBadge(userId, rewardValue.badgeId ?? '', achievementName);
        break;

      case AchievementRewardType.TITLE:
        await this.distributeTitle(userId, rewardValue.title ?? '', achievementName);
        break;

      case AchievementRewardType.AVATAR_FRAME:
        await this.distributeAvatarFrame(userId, rewardValue.frameId ?? '', achievementName);
        break;

      case AchievementRewardType.THEME:
        await this.distributeTheme(userId, rewardValue.themeId ?? '', achievementName);
        break;

      default:
        this.logger.warn(`Unknown reward type: ${rewardType}`);
    }
  }

  /**
   * 发放零芥子代币
   *
   * 需求24.1.7: 成就奖励发放服务（零芥子）
   */
  private async distributeTokens(
    userId: string,
    amount: number,
    achievementName: string,
  ): Promise<void> {
    if (amount <= 0) {
      this.logger.warn(`Invalid token amount: ${amount}`);
      return;
    }

    try {
      // 查找用户钱包
      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        this.logger.warn(`Wallet not found for user: ${userId}`);
        return;
      }

      // 更新钱包余额
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
        },
      });

      // 创建交易记录
      await this.prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'REWARD',
          amount,
          description: `成就奖励：${achievementName}`,
          referenceType: 'achievement',
        },
      });

      this.logger.log(
        `Distributed ${amount} tokens to user ${userId} for achievement: ${achievementName}`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to distribute tokens: ${errorMessage}`);
      throw new InternalServerErrorException('发放零芥子失败');
    }
  }

  /**
   * 发放徽章
   *
   * 需求24.1.7: 成就奖励发放服务（徽章）
   *
   * 注意：UserBadge 模型需要在 Prisma Schema 中定义后才能使用
   * 当前实现为占位符，记录日志但不实际发放
   */
  private async distributeBadge(
    userId: string,
    badgeId: string,
    achievementName: string,
  ): Promise<void> {
    if (!badgeId) {
      this.logger.warn(`Invalid badge ID for achievement: ${achievementName}`);
      return;
    }

    // TODO: 实现徽章发放逻辑
    // 需要在 Prisma Schema 中添加 UserBadge 模型
    this.logger.log(
      `[Placeholder] Would distribute badge ${badgeId} to user ${userId} for achievement: ${achievementName}`,
    );
  }

  /**
   * 发放称号
   *
   * 需求24.1.7: 成就奖励发放服务（称号）
   *
   * 注意：UserTitle 模型需要在 Prisma Schema 中定义后才能使用
   * 当前实现为占位符，记录日志但不实际发放
   */
  private async distributeTitle(
    userId: string,
    title: string,
    achievementName: string,
  ): Promise<void> {
    if (!title) {
      this.logger.warn(`Invalid title for achievement: ${achievementName}`);
      return;
    }

    // TODO: 实现称号发放逻辑
    // 需要在 Prisma Schema 中添加 UserTitle 模型
    this.logger.log(
      `[Placeholder] Would distribute title "${title}" to user ${userId} for achievement: ${achievementName}`,
    );
  }

  /**
   * 发放头像框
   *
   * 需求24.1.7: 成就奖励发放服务（头像框）
   *
   * 注意：UserAvatarFrame 模型需要在 Prisma Schema 中定义后才能使用
   * 当前实现为占位符，记录日志但不实际发放
   */
  private async distributeAvatarFrame(
    userId: string,
    frameId: string,
    achievementName: string,
  ): Promise<void> {
    if (!frameId) {
      this.logger.warn(`Invalid frame ID for achievement: ${achievementName}`);
      return;
    }

    // TODO: 实现头像框发放逻辑
    // 需要在 Prisma Schema 中添加 UserAvatarFrame 模型
    this.logger.log(
      `[Placeholder] Would distribute avatar frame ${frameId} to user ${userId} for achievement: ${achievementName}`,
    );
  }

  /**
   * 发放主题皮肤
   *
   * 需求24.1.7: 成就奖励发放服务（主题皮肤）
   */
  private async distributeTheme(
    userId: string,
    themeId: string,
    achievementName: string,
  ): Promise<void> {
    if (!themeId) {
      this.logger.warn(`Invalid theme ID for achievement: ${achievementName}`);
      return;
    }

    try {
      // 检查主题是否存在
      const theme = await this.prisma.theme.findUnique({
        where: { id: themeId },
      });

      if (!theme) {
        this.logger.warn(`Theme not found: ${themeId}`);
        return;
      }

      // 检查用户是否已解锁该主题
      const existingPreference = await this.prisma.userThemePreference.findUnique({
        where: { userId_themeId: { userId, themeId } },
      });

      if (existingPreference) {
        this.logger.debug(`User ${userId} already has theme: ${themeId}`);
        return;
      }

      // 解锁主题
      await this.prisma.userThemePreference.create({
        data: {
          userId,
          themeId,
          isActive: false,
          unlockedAt: new Date(),
        },
      });

      this.logger.log(
        `Distributed theme ${themeId} to user ${userId} for achievement: ${achievementName}`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to distribute theme: ${errorMessage}`);
      // 主题发放失败不阻止奖励领取
    }
  }

  /**
   * 批量领取所有可领取的奖励
   *
   * @param userId 用户ID
   */
  async claimAllRewards(userId: string): Promise<ClaimRewardResponseDto[]> {
    try {
      // 获取所有已解锁但未领取的成就
      const unclaimedAchievements = await this.prisma.userAchievement.findMany({
        where: {
          userId,
          isUnlocked: true,
          isClaimed: false,
        },
        include: {
          achievement: true,
        },
      });

      const results: ClaimRewardResponseDto[] = [];

      for (const ua of unclaimedAchievements) {
        try {
          const result = await this.claimReward(userId, ua.achievementId);
          results.push(result);
        } catch (error) {
          this.logger.warn(
            `Failed to claim reward for achievement ${ua.achievementId}: ${error}`,
          );
        }
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to claim all rewards: ${errorMessage}`);
      throw new InternalServerErrorException('批量领取奖励失败');
    }
  }

  /**
   * 获取用户可领取的奖励数量
   *
   * @param userId 用户ID
   */
  async getClaimableCount(userId: string): Promise<number> {
    try {
      return await this.prisma.userAchievement.count({
        where: {
          userId,
          isUnlocked: true,
          isClaimed: false,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get claimable count: ${errorMessage}`);
      return 0;
    }
  }
}
