import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import type { ClaimRewardResponseDto } from './dto/limited-event-response.dto.js';
import { LimitedEventStatusLocal } from './limited-event.service.js';

/**
 * 奖励类型枚举值（与 Prisma LimitedEventRewardType 对应）
 */
const RewardType = {
  TOKENS: 'TOKENS',
  BADGE: 'BADGE',
  TITLE: 'TITLE',
  AVATAR_FRAME: 'AVATAR_FRAME',
  THEME: 'THEME',
  EXPERIENCE: 'EXPERIENCE',
  EXCLUSIVE_ITEM: 'EXCLUSIVE_ITEM',
} as const;

type RewardTypeValue = (typeof RewardType)[keyof typeof RewardType];

/**
 * 奖励类型中文名称映射
 */
const REWARD_TYPE_NAMES: Record<RewardTypeValue, string> = {
  [RewardType.TOKENS]: '零芥子代币',
  [RewardType.BADGE]: '徽章',
  [RewardType.TITLE]: '称号',
  [RewardType.AVATAR_FRAME]: '头像框',
  [RewardType.THEME]: '主题',
  [RewardType.EXPERIENCE]: '经验值',
  [RewardType.EXCLUSIVE_ITEM]: '专属物品',
};

/**
 * 活动奖励服务
 *
 * 需求26.1.9: 活动奖励领取 API
 *
 * 提供以下功能：
 * - claimTaskReward(userId, taskId) - 领取已完成任务的奖励
 * - 验证任务是否已完成
 * - 防止重复领取
 * - 处理不同奖励类型（TOKENS/BADGE/TITLE/AVATAR_FRAME/THEME/EXPERIENCE/EXCLUSIVE_ITEM）
 */
@Injectable()
export class EventRewardService {
  private readonly logger = new Logger(EventRewardService.name);
  private readonly REWARD_CACHE_PREFIX = 'event-reward:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 领取任务奖励
   *
   * 需求26.1.9: claimTaskReward(userId, taskId) - 领取已完成任务的奖励
   *
   * 验证流程：
   * 1. 验证任务存在
   * 2. 验证活动状态（进行中或已结束但在领取期内）
   * 3. 验证用户已参与活动
   * 4. 验证任务已完成
   * 5. 验证奖励未被领取
   * 6. 处理奖励发放
   * 7. 更新领取状态
   *
   * @param userId 用户ID
   * @param taskId 任务ID
   * @returns 领取结果
   */
  async claimTaskReward(
    userId: string,
    taskId: string,
  ): Promise<ClaimRewardResponseDto> {
    this.logger.debug(`用户 ${userId} 领取任务 ${taskId} 奖励`);

    // 1. 获取任务信息
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const task = await (this.prisma as any).limitedEventTask.findUnique({
      where: { id: taskId },
      include: { event: true },
    });

    if (!task) {
      throw new NotFoundException(`任务不存在: ${taskId}`);
    }

    // 2. 验证活动状态
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const event = task.event;

    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    if (
      event.status !== LimitedEventStatusLocal.ACTIVE &&
      event.status !== LimitedEventStatusLocal.ENDED
    ) {
      throw new BadRequestException('活动尚未开始，无法领取奖励');
    }

    // 如果活动已结束，检查是否在领取期内（结束后7天内可领取）
    if (event.status === LimitedEventStatusLocal.ENDED) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const endDate = new Date(event.endDate);
      const claimDeadline = new Date(endDate);
      claimDeadline.setDate(claimDeadline.getDate() + 7);

      if (new Date() > claimDeadline) {
        throw new BadRequestException('活动已结束且超过领取期限');
      }
    }
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    // 3. 获取用户任务进度
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const taskProgress = await (
      this.prisma as any
    ).limitedEventUserTaskProgress.findUnique({
      where: {
        userId_taskId: { userId, taskId },
      },
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    if (!taskProgress) {
      throw new BadRequestException('您尚未参与此活动或任务');
    }

    // 4. 验证任务已完成
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!taskProgress.isCompleted) {
      throw new BadRequestException('任务尚未完成，无法领取奖励');
    }

    // 5. 验证奖励未被领取
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (taskProgress.isClaimed) {
      throw new ConflictException('奖励已领取，请勿重复领取');
    }

    // 6. 处理奖励发放
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const rewardType: RewardTypeValue = task.rewardType;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const rewardValue: Record<string, unknown> = task.rewardValue;
    const claimedAt = new Date();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await this.processReward(userId, rewardType, rewardValue, task.name);

    // 7. 更新领取状态
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).limitedEventUserTaskProgress.update({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      where: { id: taskProgress.id },
      data: {
        isClaimed: true,
        claimedAt,
      },
    });

    // 清除缓存
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await this.clearRewardCache(userId, event.id);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const taskName: string = task.name;
    this.logger.log(
      `用户 ${userId} 成功领取任务 ${taskName} 奖励: ${rewardType}`,
    );

    return {
      success: true,
      message: `成功领取奖励: ${this.getRewardTypeName(rewardType)}`,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      rewardType: rewardType as any,
      rewardValue,
      claimedAt: claimedAt.toISOString(),
    };
  }

  /**
   * 领取里程碑奖励
   *
   * 需求26.1.10: claimMilestoneReward(userId, milestoneId) - 领取已解锁里程碑的奖励
   *
   * 验证流程：
   * 1. 验证里程碑存在
   * 2. 验证活动状态（进行中或已结束但在领取期内）
   * 3. 验证用户已参与活动
   * 4. 验证里程碑已解锁
   * 5. 验证奖励未被领取
   * 6. 处理奖励发放
   * 7. 更新领取状态
   *
   * @param userId 用户ID
   * @param milestoneId 里程碑ID
   * @returns 领取结果
   */
  async claimMilestoneReward(
    userId: string,
    milestoneId: string,
  ): Promise<ClaimRewardResponseDto> {
    this.logger.debug(`用户 ${userId} 领取里程碑 ${milestoneId} 奖励`);

    // 1. 获取里程碑信息
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const milestone = await (
      this.prisma as any
    ).limitedEventMilestone.findUnique({
      where: { id: milestoneId },
      include: { event: true },
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    if (!milestone) {
      throw new NotFoundException(`里程碑不存在: ${milestoneId}`);
    }

    // 2. 验证活动状态
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const event = milestone.event;

    /* eslint-disable @typescript-eslint/no-unsafe-member-access */
    if (
      event.status !== LimitedEventStatusLocal.ACTIVE &&
      event.status !== LimitedEventStatusLocal.ENDED
    ) {
      throw new BadRequestException('活动尚未开始，无法领取奖励');
    }

    // 如果活动已结束，检查是否在领取期内（结束后7天内可领取）
    if (event.status === LimitedEventStatusLocal.ENDED) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const endDate = new Date(event.endDate);
      const claimDeadline = new Date(endDate);
      claimDeadline.setDate(claimDeadline.getDate() + 7);

      if (new Date() > claimDeadline) {
        throw new BadRequestException('活动已结束且超过领取期限');
      }
    }
    /* eslint-enable @typescript-eslint/no-unsafe-member-access */

    // 3. 获取用户里程碑进度
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const milestoneProgress = await (
      this.prisma as any
    ).limitedEventUserMilestoneProgress.findUnique({
      where: {
        userId_milestoneId: { userId, milestoneId },
      },
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    if (!milestoneProgress) {
      throw new BadRequestException('您尚未参与此活动或里程碑');
    }

    // 4. 验证里程碑已解锁
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!milestoneProgress.isUnlocked) {
      throw new BadRequestException('里程碑尚未解锁，无法领取奖励');
    }

    // 5. 验证奖励未被领取
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (milestoneProgress.isClaimed) {
      throw new ConflictException('奖励已领取，请勿重复领取');
    }

    // 6. 处理奖励发放
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const rewardType: RewardTypeValue = milestone.rewardType;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const rewardValue: Record<string, unknown> = milestone.rewardValue;
    const claimedAt = new Date();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await this.processReward(userId, rewardType, rewardValue, milestone.name);

    // 7. 更新领取状态
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await (this.prisma as any).limitedEventUserMilestoneProgress.update({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      where: { id: milestoneProgress.id },
      data: {
        isClaimed: true,
        claimedAt,
      },
    });

    // 清除缓存
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await this.clearRewardCache(userId, event.id);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const milestoneName: string = milestone.name;
    this.logger.log(
      `用户 ${userId} 成功领取里程碑 ${milestoneName} 奖励: ${rewardType}`,
    );

    return {
      success: true,
      message: `成功领取里程碑奖励: ${this.getRewardTypeName(rewardType)}`,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      rewardType: rewardType as any,
      rewardValue,
      claimedAt: claimedAt.toISOString(),
    };
  }

  /**
   * 处理奖励发放
   *
   * 根据奖励类型执行不同的发放逻辑：
   * - TOKENS: 增加用户钱包余额
   * - BADGE: 解锁用户徽章
   * - TITLE: 解锁用户称号
   * - AVATAR_FRAME: 解锁头像框
   * - THEME: 解锁主题
   * - EXPERIENCE: 增加经验值
   * - EXCLUSIVE_ITEM: 解锁专属物品
   *
   * @param userId 用户ID
   * @param rewardType 奖励类型
   * @param rewardValue 奖励详情
   * @param taskName 任务名称（用于交易记录描述）
   */
  private async processReward(
    userId: string,
    rewardType: RewardTypeValue,
    rewardValue: Record<string, unknown>,
    taskName: string,
  ): Promise<void> {
    switch (rewardType) {
      case RewardType.TOKENS:
        await this.processTokensReward(userId, rewardValue, taskName);
        break;

      case RewardType.BADGE:
        await this.processBadgeReward(userId, rewardValue);
        break;

      case RewardType.TITLE:
        await this.processTitleReward(userId, rewardValue);
        break;

      case RewardType.AVATAR_FRAME:
        await this.processAvatarFrameReward(userId, rewardValue);
        break;

      case RewardType.THEME:
        await this.processThemeReward(userId, rewardValue);
        break;

      case RewardType.EXPERIENCE:
        await this.processExperienceReward(userId, rewardValue);
        break;

      case RewardType.EXCLUSIVE_ITEM:
        await this.processExclusiveItemReward(userId, rewardValue);
        break;

      default:
        this.logger.warn(`未知的奖励类型: ${String(rewardType)}`);
    }
  }

  /**
   * 处理零芥子代币奖励
   *
   * @param userId 用户ID
   * @param rewardValue 奖励详情 { amount: number }
   * @param taskName 任务名称
   */
  private async processTokensReward(
    userId: string,
    rewardValue: Record<string, unknown>,
    taskName: string,
  ): Promise<void> {
    const amount = (rewardValue.amount as number) || 0;

    if (amount <= 0) {
      this.logger.warn(`无效的代币奖励数量: ${amount}`);
      return;
    }

    // 获取或创建用户钱包
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          totalReceived: 0,
          totalSent: 0,
        },
      });
    }

    // 更新钱包余额并创建交易记录
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
          totalReceived: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'REWARD',
          amount,
          description: `活动任务奖励: ${taskName}`,
          referenceType: 'limited_event_task',
        },
      });
    });

    this.logger.log(`用户 ${userId} 获得 ${amount} 零芥子代币`);
  }

  /**
   * 处理徽章奖励
   *
   * @param userId 用户ID
   * @param rewardValue 奖励详情 { badgeId: string }
   */
  private async processBadgeReward(
    userId: string,
    rewardValue: Record<string, unknown>,
  ): Promise<void> {
    const badgeId = rewardValue.badgeId as string;

    if (!badgeId) {
      this.logger.warn('徽章奖励缺少 badgeId');
      return;
    }

    // 检查徽章是否存在
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const badge = await (this.prisma as any).achievement?.findUnique({
      where: { id: badgeId },
    });

    if (!badge) {
      this.logger.warn(`徽章不存在: ${badgeId}`);
      // 记录到用户物品表（通用处理）
      await this.addUserItem(userId, 'BADGE', badgeId, rewardValue);
      return;
    }

    // 检查用户是否已拥有该徽章
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    const existingProgress = await (
      this.prisma as any
    ).userAchievementProgress?.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: badgeId },
      },
    });
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (existingProgress?.isUnlocked) {
      this.logger.log(`用户 ${userId} 已拥有徽章 ${badgeId}`);
      return;
    }

    // 解锁徽章
    if (existingProgress) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).userAchievementProgress?.update({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        where: { id: existingProgress.id },
        data: {
          isUnlocked: true,
          unlockedAt: new Date(),
        },
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).userAchievementProgress?.create({
        data: {
          userId,
          achievementId: badgeId,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          currentProgress: badge.targetValue || 1,
          isUnlocked: true,
          unlockedAt: new Date(),
        },
      });
    }

    this.logger.log(`用户 ${userId} 解锁徽章 ${badgeId}`);
  }

  /**
   * 处理称号奖励
   *
   * @param userId 用户ID
   * @param rewardValue 奖励详情 { titleId: string, titleName: string }
   */
  private async processTitleReward(
    userId: string,
    rewardValue: Record<string, unknown>,
  ): Promise<void> {
    const titleId = rewardValue.titleId as string;
    const titleName = rewardValue.titleName as string;

    if (!titleId) {
      this.logger.warn('称号奖励缺少 titleId');
      return;
    }

    // 记录到用户物品表
    await this.addUserItem(userId, 'TITLE', titleId, {
      ...rewardValue,
      name: titleName || titleId,
    });

    this.logger.log(`用户 ${userId} 解锁称号 ${titleName || titleId}`);
  }

  /**
   * 处理头像框奖励
   *
   * @param userId 用户ID
   * @param rewardValue 奖励详情 { frameId: string, frameName: string }
   */
  private async processAvatarFrameReward(
    userId: string,
    rewardValue: Record<string, unknown>,
  ): Promise<void> {
    const frameId = rewardValue.frameId as string;
    const frameName = rewardValue.frameName as string;

    if (!frameId) {
      this.logger.warn('头像框奖励缺少 frameId');
      return;
    }

    // 记录到用户物品表
    await this.addUserItem(userId, 'AVATAR_FRAME', frameId, {
      ...rewardValue,
      name: frameName || frameId,
    });

    this.logger.log(`用户 ${userId} 解锁头像框 ${frameName || frameId}`);
  }

  /**
   * 处理主题奖励
   *
   * @param userId 用户ID
   * @param rewardValue 奖励详情 { themeId: string, themeName: string }
   */
  private async processThemeReward(
    userId: string,
    rewardValue: Record<string, unknown>,
  ): Promise<void> {
    const themeId = rewardValue.themeId as string;
    const themeName = rewardValue.themeName as string;

    if (!themeId) {
      this.logger.warn('主题奖励缺少 themeId');
      return;
    }

    // 检查主题是否存在
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const theme = await (this.prisma as any).theme?.findUnique({
      where: { id: themeId },
    });

    if (theme) {
      // 检查用户是否已解锁该主题
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
      const existingUnlock = await (
        this.prisma as any
      ).userThemeUnlock?.findUnique({
        where: {
          userId_themeId: { userId, themeId },
        },
      });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

      if (!existingUnlock) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await (this.prisma as any).userThemeUnlock?.create({
          data: {
            userId,
            themeId,
            unlockedAt: new Date(),
          },
        });
      }
    } else {
      // 主题不存在，记录到用户物品表
      await this.addUserItem(userId, 'THEME', themeId, {
        ...rewardValue,
        name: themeName || themeId,
      });
    }

    this.logger.log(`用户 ${userId} 解锁主题 ${themeName || themeId}`);
  }

  /**
   * 处理经验值奖励
   *
   * @param userId 用户ID
   * @param rewardValue 奖励详情 { amount: number }
   */
  private async processExperienceReward(
    userId: string,
    rewardValue: Record<string, unknown>,
  ): Promise<void> {
    const amount = (rewardValue.amount as number) || 0;

    if (amount <= 0) {
      this.logger.warn(`无效的经验值奖励数量: ${amount}`);
      return;
    }

    // 更新用户贡献度（作为经验值）
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        contributionScore: { increment: amount },
      },
    });

    this.logger.log(`用户 ${userId} 获得 ${amount} 经验值`);
  }

  /**
   * 处理专属物品奖励
   *
   * @param userId 用户ID
   * @param rewardValue 奖励详情 { itemId: string, itemName: string, itemType: string }
   */
  private async processExclusiveItemReward(
    userId: string,
    rewardValue: Record<string, unknown>,
  ): Promise<void> {
    const itemId = rewardValue.itemId as string;
    const itemName = rewardValue.itemName as string;
    const itemType = (rewardValue.itemType as string) || 'EXCLUSIVE';

    if (!itemId) {
      this.logger.warn('专属物品奖励缺少 itemId');
      return;
    }

    // 记录到用户物品表
    await this.addUserItem(userId, itemType, itemId, {
      ...rewardValue,
      name: itemName || itemId,
    });

    this.logger.log(`用户 ${userId} 获得专属物品 ${itemName || itemId}`);
  }

  /**
   * 添加用户物品（通用方法）
   *
   * 用于记录各种虚拟物品到用户物品表
   *
   * @param userId 用户ID
   * @param itemType 物品类型
   * @param itemId 物品ID
   * @param metadata 物品元数据
   */
  private async addUserItem(
    userId: string,
    itemType: string,
    itemId: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    try {
      // 检查是否已存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const existingItem = await (this.prisma as any).userItem?.findFirst({
        where: {
          userId,
          itemType,
          itemId,
        },
      });

      if (existingItem) {
        this.logger.log(`用户 ${userId} 已拥有物品 ${itemType}:${itemId}`);
        return;
      }

      // 创建用户物品记录
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).userItem?.create({
        data: {
          userId,
          itemType,
          itemId,
          metadata,
          obtainedAt: new Date(),
        },
      });
    } catch {
      // 如果 userItem 表不存在，记录日志但不抛出错误
      this.logger.warn(`无法记录用户物品 ${itemType}:${itemId}，可能表不存在`);
    }
  }

  /**
   * 获取奖励类型名称
   *
   * @param rewardType 奖励类型
   * @returns 中文名称
   */
  private getRewardTypeName(rewardType: RewardTypeValue): string {
    return REWARD_TYPE_NAMES[rewardType] || '奖励';
  }

  /**
   * 清除奖励缓存
   */
  private async clearRewardCache(
    userId: string,
    eventId: string,
  ): Promise<void> {
    const cacheKey = `${this.REWARD_CACHE_PREFIX}${userId}:${eventId}`;
    await this.redis.del(cacheKey);

    // 同时清除进度缓存
    const progressCacheKey = `event-progress:${userId}:${eventId}`;
    await this.redis.del(progressCacheKey);
  }
}
