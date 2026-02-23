import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  ACTIVITY_LIMITS,
  ACTIVITY_TYPE_NAMES,
  ACTIVITY_STATUS_NAMES,
  PARTICIPATION_STATUS_NAMES,
  type CreateActivityDto,
  type CreateActivityResultDto,
  type ActivityDetailDto,
  type ActivityListDto,
  type ActivityListItemDto,
  type ActivityQueryDto,
  type UserParticipationDto,
  type ActivityRulesDto,
  type ActivityRewardsConfigDto,
  type JoinActivityResultDto,
  type LeaveActivityResultDto,
  type MyParticipationsListDto,
  type MyParticipationItemDto,
  type MyParticipationsQueryDto,
  ActivityStatus,
  ActivityType,
  ParticipationStatus,
} from './dto/activity.dto.js';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async validateUserCanCreateActivity(userId: string): Promise<{ valid: boolean; error?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true },
    });
    if (!user) return { valid: false, error: 'User not found' };
    if (user.memberLevel === 'REGULAR') return { valid: false, error: 'Only official members can create activities' };
    return { valid: true };
  }

  validateActivityConfig(dto: CreateActivityDto): { valid: boolean; error?: string } {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const now = new Date();
    if (startTime <= now) return { valid: false, error: 'Start time must be in the future' };
    if (endTime <= startTime) return { valid: false, error: 'End time must be after start time' };
    const durationDays = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
    if (durationDays < ACTIVITY_LIMITS.MIN_DURATION_DAYS) return { valid: false, error: `Duration must be at least ${ACTIVITY_LIMITS.MIN_DURATION_DAYS} days` };
    if (durationDays > ACTIVITY_LIMITS.MAX_DURATION_DAYS) return { valid: false, error: `Duration cannot exceed ${ACTIVITY_LIMITS.MAX_DURATION_DAYS} days` };
    return { valid: true };
  }

  calculateRequiredPool(rewardPerPerson: number, maxParticipants?: number): number {
    return rewardPerPerson * (maxParticipants || ACTIVITY_LIMITS.MIN_PARTICIPANTS);
  }

  async validateUserBalance(userId: string, requiredAmount: number): Promise<{ valid: boolean; error?: string; currentBalance?: number }> {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId }, select: { balance: true } });
    if (!wallet) return { valid: false, error: 'Wallet not found' };
    if (wallet.balance < requiredAmount) return { valid: false, error: `Insufficient balance. Required: ${requiredAmount}, Current: ${wallet.balance}`, currentBalance: wallet.balance };
    return { valid: true, currentBalance: wallet.balance };
  }

  async createActivity(userId: string, dto: CreateActivityDto): Promise<CreateActivityResultDto> {
    const userValidation = await this.validateUserCanCreateActivity(userId);
    if (!userValidation.valid) return { success: false, message: userValidation.error || 'Cannot create activity' };
    const configValidation = this.validateActivityConfig(dto);
    if (!configValidation.valid) return { success: false, message: configValidation.error || 'Invalid activity config' };
    const requiredPool = this.calculateRequiredPool(dto.rewardPerPerson, dto.maxParticipants);
    const balanceValidation = await this.validateUserBalance(userId, requiredPool);
    if (!balanceValidation.valid) return { success: false, message: balanceValidation.error || 'Insufficient balance' };

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({ where: { userId }, data: { balance: { decrement: requiredPool } } });
      const wallet = await tx.wallet.findUnique({ where: { userId }, select: { id: true } });
      if (wallet) {
        await tx.transaction.create({
          data: { walletId: wallet.id, type: 'TIP_SENT', amount: -requiredPool, description: `Activity pool locked: ${requiredPool}`, referenceType: 'activity_pool' },
        });
      }
      const activity = await tx.activity.create({
        data: {
          title: dto.title, description: dto.description, coverImage: dto.coverImage || null, type: dto.type, status: 'DRAFT',
          startTime: new Date(dto.startTime), endTime: new Date(dto.endTime),
          rules: dto.rules ? (dto.rules as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          rewards: dto.rewards ? (dto.rewards as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
          maxParticipants: dto.maxParticipants || null, rewardPerPerson: dto.rewardPerPerson, totalPool: requiredPool, lockedPool: requiredPool, creatorId: userId,
        },
      });
      return activity;
    });
    return { success: true, activityId: result.id, lockedPool: requiredPool, message: `Activity created. Pool locked: ${requiredPool}` };
  }

  async getActivityList(query: ActivityQueryDto): Promise<ActivityListDto> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;
    const where: Prisma.ActivityWhereInput = { isDeleted: false };
    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (query.creatorId) where.creatorId = query.creatorId;
    const orderBy: Prisma.ActivityOrderByWithRelationInput = {};
    if ((query.sortBy || 'createdAt') === 'startTime') orderBy.startTime = query.sortOrder || 'desc';
    else orderBy.createdAt = query.sortOrder || 'desc';
    const total = await this.prisma.activity.count({ where });
    const activities = await this.prisma.activity.findMany({
      where, orderBy, skip, take: pageSize,
      include: { creator: { select: { id: true, username: true, displayName: true, avatar: true } }, _count: { select: { participations: true } } },
    });
    const activityItems: ActivityListItemDto[] = activities.map((a) => ({
      id: a.id, title: a.title, description: a.description.length > 100 ? a.description.substring(0, 100) + '...' : a.description,
      coverImage: a.coverImage, type: a.type as ActivityType, typeName: ACTIVITY_TYPE_NAMES[a.type] || a.type,
      status: a.status as ActivityStatus, statusName: ACTIVITY_STATUS_NAMES[a.status] || a.status,
      startTime: a.startTime, endTime: a.endTime, maxParticipants: a.maxParticipants, rewardPerPerson: a.rewardPerPerson,
      participantCount: a._count.participations, creator: { id: a.creator.id, username: a.creator.username, nickname: a.creator.displayName, avatar: a.creator.avatar }, createdAt: a.createdAt,
    }));
    return { activities: activityItems, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  async getActivityDetail(activityId: string, userId?: string): Promise<ActivityDetailDto> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: { creator: { select: { id: true, username: true, displayName: true, avatar: true } }, _count: { select: { participations: true } } },
    });
    if (!activity || activity.isDeleted) throw new NotFoundException('Activity not found');
    let currentUserParticipation: UserParticipationDto | null = null;
    if (userId) {
      const participation = await this.prisma.activityParticipation.findUnique({ where: { activityId_userId: { activityId, userId } } });
      if (participation) {
        currentUserParticipation = {
          id: participation.id, status: participation.status as unknown as ParticipationStatus,
          progress: participation.progress as Record<string, unknown> | null, rewardClaimed: participation.rewardClaimed,
          completedAt: participation.completedAt, createdAt: participation.createdAt,
        };
      }
    }
    return {
      id: activity.id, title: activity.title, description: activity.description, coverImage: activity.coverImage,
      type: activity.type as ActivityType, typeName: ACTIVITY_TYPE_NAMES[activity.type] || activity.type,
      status: activity.status as ActivityStatus, statusName: ACTIVITY_STATUS_NAMES[activity.status] || activity.status,
      startTime: activity.startTime, endTime: activity.endTime, rules: activity.rules as ActivityRulesDto | null,
      rewards: activity.rewards as ActivityRewardsConfigDto[] | null, maxParticipants: activity.maxParticipants,
      rewardPerPerson: activity.rewardPerPerson, totalPool: activity.totalPool, lockedPool: activity.lockedPool,
      participantCount: activity._count.participations, creator: { id: activity.creator.id, username: activity.creator.username, nickname: activity.creator.displayName, avatar: activity.creator.avatar },
      currentUserParticipation, createdAt: activity.createdAt, updatedAt: activity.updatedAt,
    };
  }

  async joinActivity(activityId: string, userId: string): Promise<JoinActivityResultDto> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: { _count: { select: { participations: { where: { status: { not: 'WITHDRAWN' } } } } } },
    });
    if (!activity || activity.isDeleted) return { success: false, message: '活动不存在' };
    if (activity.status !== 'ACTIVE') return { success: false, message: `活动当前状态为"${ACTIVITY_STATUS_NAMES[activity.status] || activity.status}"，无法参与` };
    if (activity.maxParticipants && activity._count.participations >= activity.maxParticipants) return { success: false, message: '活动参与人数已满' };
    const existingParticipation = await this.prisma.activityParticipation.findUnique({ where: { activityId_userId: { activityId, userId } } });
    if (existingParticipation) {
      if (existingParticipation.status === 'WITHDRAWN') {
        const updated = await this.prisma.activityParticipation.update({ where: { id: existingParticipation.id }, data: { status: 'JOINED', progress: {}, completedAt: null, rewardClaimed: false } });
        return { success: true, participationId: updated.id, activityId, status: ParticipationStatus.JOINED, message: '重新参与活动成功' };
      }
      return { success: false, message: '您已经参与了该活动' };
    }
    const participation = await this.prisma.activityParticipation.create({ data: { activityId, userId, status: 'JOINED', progress: {} } });
    return { success: true, participationId: participation.id, activityId, status: ParticipationStatus.JOINED, message: '参与活动成功' };
  }

  async leaveActivity(activityId: string, userId: string): Promise<LeaveActivityResultDto> {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity || activity.isDeleted) return { success: false, message: '活动不存在' };
    if (activity.status !== 'ACTIVE') return { success: false, message: `活动当前状态为"${ACTIVITY_STATUS_NAMES[activity.status] || activity.status}"，无法退出` };
    const participation = await this.prisma.activityParticipation.findUnique({ where: { activityId_userId: { activityId, userId } } });
    if (!participation) return { success: false, message: '您尚未参与该活动' };
    if (participation.status === 'WITHDRAWN') return { success: false, message: '您已经退出了该活动' };
    if (participation.status === 'COMPLETED' || participation.status === 'FAILED') return { success: false, message: '活动已完成，无法退出' };
    const updated = await this.prisma.activityParticipation.update({ where: { id: participation.id }, data: { status: 'WITHDRAWN' } });
    return { success: true, participationId: updated.id, status: ParticipationStatus.WITHDRAWN, message: '退出活动成功' };
  }

  async getMyParticipations(userId: string, query: MyParticipationsQueryDto): Promise<MyParticipationsListDto> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;
    const where: Prisma.ActivityParticipationWhereInput = { userId };
    if (query.status) where.status = query.status;
    const total = await this.prisma.activityParticipation.count({ where });
    const participations = await this.prisma.activityParticipation.findMany({
      where, orderBy: { createdAt: 'desc' }, skip, take: pageSize,
      include: { activity: { include: { creator: { select: { id: true, username: true, displayName: true, avatar: true } }, _count: { select: { participations: { where: { status: { not: 'WITHDRAWN' } } } } } } } },
    });
    const items: MyParticipationItemDto[] = participations.map((p) => ({
      id: p.id, status: p.status as ParticipationStatus, statusName: PARTICIPATION_STATUS_NAMES[p.status as string] || p.status,
      progress: p.progress as Record<string, unknown> | null, rewardClaimed: p.rewardClaimed, completedAt: p.completedAt, createdAt: p.createdAt,
      activity: {
        id: p.activity.id, title: p.activity.title, description: p.activity.description.length > 100 ? p.activity.description.substring(0, 100) + '...' : p.activity.description,
        coverImage: p.activity.coverImage, type: p.activity.type as ActivityType, typeName: ACTIVITY_TYPE_NAMES[p.activity.type as string] || p.activity.type,
        status: p.activity.status as ActivityStatus, statusName: ACTIVITY_STATUS_NAMES[p.activity.status as string] || p.activity.status,
        startTime: p.activity.startTime, endTime: p.activity.endTime, rewardPerPerson: p.activity.rewardPerPerson, participantCount: p.activity._count.participations,
        creator: { id: p.activity.creator.id, username: p.activity.creator.username, nickname: p.activity.creator.displayName, avatar: p.activity.creator.avatar },
      },
    }));
    return { participations: items, pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) } };
  }

  // ==================== 活动进度追踪 (任务16.1.4) ====================

  /**
   * 更新用户活动进度
   *
   * 任务16.1.4: 活动进度追踪
   * - 检查活动是否处于 ACTIVE 状态
   * - 更新用户的参与进度 JSON
   * - 自动检测是否完成活动
   *
   * @param activityId 活动ID
   * @param userId 用户ID
   * @param progressData 进度数据
   */
  async updateProgress(
    activityId: string,
    userId: string,
    progressData: Record<string, unknown>,
  ): Promise<{
    success: boolean;
    participationId?: string;
    progress?: Record<string, unknown> | null;
    completed?: boolean;
    message: string;
  }> {
    // 1. 检查活动是否存在且处于 ACTIVE 状态
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        status: true,
        isDeleted: true,
        rules: true,
      },
    });

    if (!activity || activity.isDeleted) {
      return { success: false, message: '活动不存在' };
    }

    if (activity.status !== 'ACTIVE') {
      return {
        success: false,
        message: `活动当前状态为"${ACTIVITY_STATUS_NAMES[activity.status] || activity.status}"，无法更新进度`,
      };
    }

    // 2. 检查用户是否已参与活动
    const participation = await this.prisma.activityParticipation.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });

    if (!participation) {
      return { success: false, message: '您尚未参与该活动' };
    }

    if (participation.status === 'WITHDRAWN') {
      return { success: false, message: '您已退出该活动' };
    }

    if (participation.status === 'COMPLETED') {
      return { success: false, message: '您已完成该活动，无需更新进度' };
    }

    if (participation.status === 'FAILED') {
      return { success: false, message: '活动已结束，无法更新进度' };
    }

    // 3. 合并进度数据
    const currentProgress = (participation.progress as Record<string, unknown>) || {};
    const newProgress = { ...currentProgress, ...progressData, updatedAt: new Date().toISOString() };

    // 4. 检查是否完成活动
    const isCompleted = this.checkCompletion(
      activity.rules as Record<string, unknown> | null,
      newProgress,
    );

    // 5. 更新参与记录
    const updated = await this.prisma.activityParticipation.update({
      where: { id: participation.id },
      data: {
        progress: newProgress,
        status: isCompleted ? 'COMPLETED' : 'JOINED',
        completedAt: isCompleted ? new Date() : null,
      },
    });

    return {
      success: true,
      participationId: updated.id,
      progress: updated.progress as Record<string, unknown> | null,
      completed: isCompleted,
      message: isCompleted ? '恭喜！您已完成活动' : '进度更新成功',
    };
  }

  /**
   * 检查用户是否完成活动
   *
   * 根据活动规则和用户进度判断是否完成
   *
   * @param rules 活动规则
   * @param progress 用户进度
   */
  checkCompletion(
    rules: Record<string, unknown> | null,
    progress: Record<string, unknown>,
  ): boolean {
    if (!rules) {
      return false;
    }

    // 阅读打卡类型：检查阅读章节数
    if (rules.targetChapterCount && typeof rules.targetChapterCount === 'number') {
      const readChapters = (progress.readChapters as number) || 0;
      if (readChapters >= rules.targetChapterCount) {
        return true;
      }
    }

    // 评论征集类型：检查评论数量和字数
    if (rules.minCommentLength && typeof rules.minCommentLength === 'number') {
      const commentCount = (progress.commentCount as number) || 0;
      const totalCommentLength = (progress.totalCommentLength as number) || 0;
      if (commentCount > 0 && totalCommentLength >= rules.minCommentLength) {
        return true;
      }
    }

    // 引用挑战类型：检查是否完成引用
    if (rules.targetParagraphId && typeof rules.targetParagraphId === 'string') {
      const quotedParagraphs = (progress.quotedParagraphs as string[]) || [];
      if (quotedParagraphs.includes(rules.targetParagraphId)) {
        return true;
      }
    }

    // 自定义完成标记
    if (progress.manualComplete === true) {
      return true;
    }

    return false;
  }

  /**
   * 标记参与记录为已完成
   *
   * @param participationId 参与记录ID
   */
  async markCompleted(participationId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const participation = await this.prisma.activityParticipation.findUnique({
      where: { id: participationId },
      include: {
        activity: {
          select: { status: true, isDeleted: true },
        },
      },
    });

    if (!participation) {
      return { success: false, message: '参与记录不存在' };
    }

    if (participation.activity.isDeleted) {
      return { success: false, message: '活动不存在' };
    }

    if (participation.status === 'COMPLETED') {
      return { success: false, message: '已经完成，无需重复标记' };
    }

    if (participation.status === 'WITHDRAWN') {
      return { success: false, message: '已退出活动，无法标记完成' };
    }

    await this.prisma.activityParticipation.update({
      where: { id: participationId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return { success: true, message: '已标记为完成' };
  }

  /**
   * 获取用户在活动中的进度
   *
   * @param activityId 活动ID
   * @param userId 用户ID
   */
  async getProgress(
    activityId: string,
    userId: string,
  ): Promise<{
    participationId: string;
    activityId: string;
    status: ParticipationStatus;
    statusName: string;
    progress: Record<string, unknown> | null;
    rewardClaimed: boolean;
    completedAt: Date | null;
    createdAt: Date;
    activityRules: Record<string, unknown> | null;
  } | null> {
    const participation = await this.prisma.activityParticipation.findUnique({
      where: { activityId_userId: { activityId, userId } },
      include: {
        activity: {
          select: { rules: true },
        },
      },
    });

    if (!participation) {
      return null;
    }

    return {
      participationId: participation.id,
      activityId: participation.activityId,
      status: participation.status as ParticipationStatus,
      statusName: PARTICIPATION_STATUS_NAMES[participation.status] || participation.status,
      progress: participation.progress as Record<string, unknown> | null,
      rewardClaimed: participation.rewardClaimed,
      completedAt: participation.completedAt,
      createdAt: participation.createdAt,
      activityRules: participation.activity.rules as Record<string, unknown> | null,
    };
  }

  // ==================== 奖励发放服务 (任务16.1.5) ====================

  /**
   * 领取活动奖励
   *
   * 任务16.1.5: 奖励发放服务
   * 需求16验收标准8: WHEN 用户完成活动条件 THEN System SHALL 根据验证方式处理奖励发放
   *
   * 领取规则：
   * - 用户必须已参与活动
   * - 参与状态必须为 COMPLETED
   * - 奖励尚未领取 (rewardClaimed = false)
   * - 从活动奖池转移代币到用户钱包
   * - 创建 ActivityReward 记录
   * - 标记 rewardClaimed = true
   *
   * @param activityId 活动ID
   * @param userId 用户ID
   */
  async claimReward(
    activityId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    rewardId?: string;
    amount?: number;
    rewardType?: string;
    message: string;
  }> {
    // 1. 获取活动信息
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        title: true,
        status: true,
        isDeleted: true,
        rewardPerPerson: true,
        lockedPool: true,
        creatorId: true,
      },
    });

    if (!activity || activity.isDeleted) {
      return { success: false, message: '活动不存在' };
    }

    // 2. 获取用户参与记录
    const participation = await this.prisma.activityParticipation.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });

    if (!participation) {
      return { success: false, message: '您尚未参与该活动' };
    }

    // 3. 检查参与状态
    if (participation.status !== 'COMPLETED') {
      return {
        success: false,
        message: `您的参与状态为"${PARTICIPATION_STATUS_NAMES[participation.status] || participation.status}"，只有完成活动才能领取奖励`,
      };
    }

    // 4. 检查是否已领取奖励
    if (participation.rewardClaimed) {
      return { success: false, message: '您已经领取过该活动的奖励' };
    }

    // 5. 检查奖池余额
    const rewardAmount = activity.rewardPerPerson;
    if (activity.lockedPool < rewardAmount) {
      return { success: false, message: '活动奖池余额不足，请联系活动发起者' };
    }

    // 6. 执行奖励发放（事务）
    const result = await this.prisma.$transaction(async (tx) => {
      // 6.1 减少活动奖池
      await tx.activity.update({
        where: { id: activityId },
        data: { lockedPool: { decrement: rewardAmount } },
      });

      // 6.2 增加用户钱包余额
      const wallet = await tx.wallet.upsert({
        where: { userId },
        create: {
          userId,
          balance: rewardAmount,
          totalReceived: rewardAmount,
        },
        update: {
          balance: { increment: rewardAmount },
          totalReceived: { increment: rewardAmount },
        },
      });

      // 6.3 创建交易记录
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: 'REWARD',
          amount: rewardAmount,
          referenceId: activityId,
          referenceType: 'activity',
          description: `活动奖励: ${activity.title}`,
        },
      });

      // 6.4 创建活动奖励记录
      const activityReward = await tx.activityReward.create({
        data: {
          activityId,
          userId,
          participationId: participation.id,
          rewardType: 'MUSTARD_SEED',
          amount: rewardAmount,
        },
      });

      // 6.5 标记奖励已领取
      await tx.activityParticipation.update({
        where: { id: participation.id },
        data: { rewardClaimed: true },
      });

      return activityReward;
    });

    return {
      success: true,
      rewardId: result.id,
      amount: rewardAmount,
      rewardType: 'MUSTARD_SEED',
      message: `成功领取 ${rewardAmount} 零芥子奖励`,
    };
  }

  /**
   * 批量发放活动奖励
   *
   * 任务16.1.5: 奖励发放服务 - 批量发放
   * 需求16验收标准8: WHEN 用户完成活动条件 THEN System SHALL 根据验证方式处理奖励发放
   *
   * 批量发放规则：
   * - 活动必须处于 ENDED 状态
   * - 只对状态为 COMPLETED 且未领取奖励的参与者发放
   * - 自动发放奖励到用户钱包
   *
   * @param activityId 活动ID
   */
  async distributeRewards(activityId: string): Promise<{
    success: boolean;
    activityId?: string;
    distributedCount?: number;
    failedCount?: number;
    totalAmount?: number;
    refundedAmount?: number;
    message: string;
  }> {
    // 1. 获取活动信息
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        title: true,
        status: true,
        isDeleted: true,
        rewardPerPerson: true,
        lockedPool: true,
        creatorId: true,
      },
    });

    if (!activity || activity.isDeleted) {
      return { success: false, message: '活动不存在' };
    }

    // 2. 获取所有已完成但未领取奖励的参与者
    const pendingParticipations = await this.prisma.activityParticipation.findMany({
      where: {
        activityId,
        status: 'COMPLETED',
        rewardClaimed: false,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    if (pendingParticipations.length === 0) {
      return {
        success: true,
        activityId,
        distributedCount: 0,
        failedCount: 0,
        totalAmount: 0,
        message: '没有待发放奖励的参与者',
      };
    }

    // 3. 计算所需奖池
    const rewardAmount = activity.rewardPerPerson;
    const totalRequired = rewardAmount * pendingParticipations.length;

    if (activity.lockedPool < totalRequired) {
      return {
        success: false,
        message: `奖池余额不足，需要 ${totalRequired}，当前 ${activity.lockedPool}`,
      };
    }

    // 4. 批量发放奖励（事务）
    let distributedCount = 0;
    let failedCount = 0;
    let totalDistributed = 0;

    for (const participation of pendingParticipations) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // 减少活动奖池
          await tx.activity.update({
            where: { id: activityId },
            data: { lockedPool: { decrement: rewardAmount } },
          });

          // 增加用户钱包余额
          const wallet = await tx.wallet.upsert({
            where: { userId: participation.userId },
            create: {
              userId: participation.userId,
              balance: rewardAmount,
              totalReceived: rewardAmount,
            },
            update: {
              balance: { increment: rewardAmount },
              totalReceived: { increment: rewardAmount },
            },
          });

          // 创建交易记录
          await tx.transaction.create({
            data: {
              walletId: wallet.id,
              type: 'REWARD',
              amount: rewardAmount,
              referenceId: activityId,
              referenceType: 'activity',
              description: `活动奖励: ${activity.title}`,
            },
          });

          // 创建活动奖励记录
          await tx.activityReward.create({
            data: {
              activityId,
              userId: participation.userId,
              participationId: participation.id,
              rewardType: 'MUSTARD_SEED',
              amount: rewardAmount,
            },
          });

          // 标记奖励已领取
          await tx.activityParticipation.update({
            where: { id: participation.id },
            data: { rewardClaimed: true },
          });
        });

        distributedCount++;
        totalDistributed += rewardAmount;
      } catch {
        failedCount++;
      }
    }

    return {
      success: true,
      activityId,
      distributedCount,
      failedCount,
      totalAmount: totalDistributed,
      message: `成功发放 ${distributedCount} 份奖励，共 ${totalDistributed} 零芥子${failedCount > 0 ? `，${failedCount} 份发放失败` : ''}`,
    };
  }

  /**
   * 结束活动并处理结算
   *
   * 任务16.1.5: 活动结束处理
   * 需求16验收标准9: WHEN 活动到期 THEN System SHALL 结算活动并退还未发放的奖池余额
   *
   * 结算规则：
   * - 将未完成的参与记录标记为 FAILED
   * - 自动发放已完成参与者的奖励
   * - 退还未使用的奖池给创建者
   * - 更新活动状态为 ENDED
   *
   * @param activityId 活动ID
   */
  async endActivity(activityId: string): Promise<{
    success: boolean;
    activityId?: string;
    failedCount?: number;
    completedCount?: number;
    refundedAmount?: number;
    message: string;
  }> {
    // 1. 获取活动信息
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        title: true,
        status: true,
        isDeleted: true,
        rewardPerPerson: true,
        lockedPool: true,
        totalPool: true,
        creatorId: true,
        endTime: true,
      },
    });

    if (!activity || activity.isDeleted) {
      return { success: false, message: '活动不存在' };
    }

    if (activity.status === 'ENDED') {
      return { success: false, message: '活动已经结束' };
    }

    if (activity.status === 'CANCELLED') {
      return { success: false, message: '活动已被取消' };
    }

    // 2. 标记未完成的参与记录为 FAILED
    const failedResult = await this.prisma.activityParticipation.updateMany({
      where: {
        activityId,
        status: 'JOINED', // 只更新状态为 JOINED 的记录
      },
      data: {
        status: 'FAILED',
      },
    });

    // 3. 获取已完成的参与者数量
    const completedCount = await this.prisma.activityParticipation.count({
      where: {
        activityId,
        status: 'COMPLETED',
      },
    });

    // 4. 批量发放已完成参与者的奖励
    await this.distributeRewards(activityId);

    // 5. 获取更新后的活动信息（奖池可能已变化）
    const updatedActivity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { lockedPool: true },
    });

    const remainingPool = updatedActivity?.lockedPool || 0;

    // 6. 退还剩余奖池给创建者
    let refundedAmount = 0;
    if (remainingPool > 0) {
      await this.prisma.$transaction(async (tx) => {
        // 清空活动奖池
        await tx.activity.update({
          where: { id: activityId },
          data: { lockedPool: 0 },
        });

        // 增加创建者钱包余额
        const wallet = await tx.wallet.upsert({
          where: { userId: activity.creatorId },
          create: {
            userId: activity.creatorId,
            balance: remainingPool,
            totalReceived: remainingPool,
          },
          update: {
            balance: { increment: remainingPool },
          },
        });

        // 创建退款交易记录
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'REFUND',
            amount: remainingPool,
            referenceId: activityId,
            referenceType: 'activity_refund',
            description: `活动奖池退还: ${activity.title}`,
          },
        });

        refundedAmount = remainingPool;
      });
    }

    // 7. 更新活动状态为 ENDED
    await this.prisma.activity.update({
      where: { id: activityId },
      data: { status: 'ENDED' },
    });

    return {
      success: true,
      activityId,
      failedCount: failedResult.count,
      completedCount,
      refundedAmount,
      message: `活动已结束。${completedCount} 人完成，${failedResult.count} 人未完成${refundedAmount > 0 ? `，已退还 ${refundedAmount} 零芥子给发起者` : ''}`,
    };
  }

  /**
   * 获取用户的活动奖励记录
   *
   * @param activityId 活动ID
   * @param userId 用户ID
   */
  async getRewardRecord(
    activityId: string,
    userId: string,
  ): Promise<{
    rewardId: string;
    activityId: string;
    rewardType: string;
    amount: number;
    claimedAt: Date;
  } | null> {
    const reward = await this.prisma.activityReward.findFirst({
      where: {
        activityId,
        userId,
      },
      select: {
        id: true,
        activityId: true,
        rewardType: true,
        amount: true,
        claimedAt: true,
      },
    });

    if (!reward) {
      return null;
    }

    return {
      rewardId: reward.id,
      activityId: reward.activityId,
      rewardType: reward.rewardType,
      amount: reward.amount,
      claimedAt: reward.claimedAt,
    };
  }

  // ==================== 活动审核服务 (任务16.1.6) ====================

  /**
   * 提交活动审核
   *
   * 任务16.1.6: 活动审核 API - 提交审核
   * 需求16验收标准4: WHEN 活动创建完成 THEN System SHALL 提交审核并通知管理员
   *
   * 提交规则：
   * - 只有活动创建者可以提交审核
   * - 活动必须处于 DRAFT 状态
   * - 验证活动配置完整性
   * - 状态变更为 PENDING
   *
   * @param activityId 活动ID
   * @param userId 用户ID（创建者）
   */
  async submitForReview(
    activityId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    activityId?: string;
    status?: ActivityStatus;
    message: string;
  }> {
    // 1. 获取活动信息
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        isDeleted: true,
        creatorId: true,
        startTime: true,
        endTime: true,
        rewardPerPerson: true,
        totalPool: true,
      },
    });

    if (!activity || activity.isDeleted) {
      return { success: false, message: '活动不存在' };
    }

    // 2. 检查是否为创建者
    if (activity.creatorId !== userId) {
      return { success: false, message: '只有活动创建者可以提交审核' };
    }

    // 3. 检查活动状态
    if (activity.status !== 'DRAFT') {
      return {
        success: false,
        message: `活动当前状态为"${ACTIVITY_STATUS_NAMES[activity.status] || activity.status}"，只有草稿状态的活动可以提交审核`,
      };
    }

    // 4. 验证活动配置完整性
    if (!activity.title || activity.title.length < ACTIVITY_LIMITS.TITLE_MIN_LENGTH) {
      return { success: false, message: '活动名称不完整' };
    }

    if (!activity.description || activity.description.length < ACTIVITY_LIMITS.DESCRIPTION_MIN_LENGTH) {
      return { success: false, message: '活动描述不完整' };
    }

    const now = new Date();
    if (activity.startTime <= now) {
      return { success: false, message: '活动开始时间必须在未来' };
    }

    if (activity.endTime <= activity.startTime) {
      return { success: false, message: '活动结束时间必须在开始时间之后' };
    }

    if (activity.rewardPerPerson <= 0) {
      return { success: false, message: '单人奖励金额必须大于0' };
    }

    if (activity.totalPool <= 0) {
      return { success: false, message: '活动奖池必须大于0' };
    }

    // 5. 更新活动状态为 PENDING
    await this.prisma.activity.update({
      where: { id: activityId },
      data: { status: 'PENDING' },
    });

    // TODO: 发送通知给管理员

    return {
      success: true,
      activityId,
      status: ActivityStatus.PENDING,
      message: '活动已提交审核，请等待管理员审核',
    };
  }

  /**
   * 审核通过活动
   *
   * 任务16.1.6: 活动审核 API - 审核通过
   * 需求16验收标准5: WHEN 管理员审核活动 THEN System SHALL 支持通过/拒绝操作
   *
   * 审核规则：
   * - 只有管理员可以审核
   * - 活动必须处于 PENDING 状态
   * - 状态变更为 ACTIVE
   * - 记录审核人信息
   *
   * @param activityId 活动ID
   * @param reviewerId 审核人ID（管理员）
   * @param note 审核备注（可选）
   */
  async approveActivity(
    activityId: string,
    reviewerId: string,
    note?: string,
  ): Promise<{
    success: boolean;
    activityId?: string;
    status?: ActivityStatus;
    reviewerId?: string;
    reviewedAt?: Date;
    message: string;
  }> {
    // 1. 获取活动信息
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        title: true,
        status: true,
        isDeleted: true,
        creatorId: true,
      },
    });

    if (!activity || activity.isDeleted) {
      return { success: false, message: '活动不存在' };
    }

    // 2. 检查活动状态
    if (activity.status !== 'PENDING') {
      return {
        success: false,
        message: `活动当前状态为"${ACTIVITY_STATUS_NAMES[activity.status] || activity.status}"，只有待审核状态的活动可以审核通过`,
      };
    }

    // 3. 更新活动状态为 ACTIVE，记录审核信息
    const reviewedAt = new Date();
    await this.prisma.activity.update({
      where: { id: activityId },
      data: {
        status: 'ACTIVE',
      },
    });

    // TODO: 发送通知给活动创建者
    void note; // 保留备注参数用于后续通知

    return {
      success: true,
      activityId,
      status: ActivityStatus.ACTIVE,
      reviewerId,
      reviewedAt,
      message: `活动"${activity.title}"已审核通过，现已上线`,
    };
  }

  /**
   * 拒绝活动
   *
   * 任务16.1.6: 活动审核 API - 审核拒绝
   * 需求16验收标准5: WHEN 管理员审核活动 THEN System SHALL 支持通过/拒绝操作
   * 需求16验收标准6: IF 活动被拒绝 THEN System SHALL 退还锁定的零芥子并通知创建者
   *
   * 拒绝规则：
   * - 只有管理员可以拒绝
   * - 活动必须处于 PENDING 状态
   * - 状态变更为 CANCELLED
   * - 记录拒绝原因
   * - 退还锁定的奖池给创建者
   *
   * @param activityId 活动ID
   * @param reviewerId 审核人ID（管理员）
   * @param reason 拒绝原因
   */
  async rejectActivity(
    activityId: string,
    reviewerId: string,
    reason: string,
  ): Promise<{
    success: boolean;
    activityId?: string;
    status?: ActivityStatus;
    reviewerId?: string;
    rejectReason?: string;
    refundedAmount?: number;
    reviewedAt?: Date;
    message: string;
  }> {
    // 1. 获取活动信息
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: {
        id: true,
        title: true,
        status: true,
        isDeleted: true,
        creatorId: true,
        lockedPool: true,
        totalPool: true,
      },
    });

    if (!activity || activity.isDeleted) {
      return { success: false, message: '活动不存在' };
    }

    // 2. 检查活动状态
    if (activity.status !== 'PENDING') {
      return {
        success: false,
        message: `活动当前状态为"${ACTIVITY_STATUS_NAMES[activity.status] || activity.status}"，只有待审核状态的活动可以拒绝`,
      };
    }

    // 3. 执行拒绝操作（事务）
    const reviewedAt = new Date();
    const refundAmount = activity.lockedPool;

    await this.prisma.$transaction(async (tx) => {
      // 3.1 更新活动状态为 CANCELLED
      await tx.activity.update({
        where: { id: activityId },
        data: {
          status: 'CANCELLED',
          lockedPool: 0,
        },
      });

      // 3.2 退还奖池给创建者
      if (refundAmount > 0) {
        const wallet = await tx.wallet.upsert({
          where: { userId: activity.creatorId },
          create: {
            userId: activity.creatorId,
            balance: refundAmount,
            totalReceived: refundAmount,
          },
          update: {
            balance: { increment: refundAmount },
          },
        });

        // 3.3 创建退款交易记录
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'REFUND',
            amount: refundAmount,
            referenceId: activityId,
            referenceType: 'activity_rejected',
            description: `活动审核被拒绝，奖池退还: ${activity.title}`,
          },
        });
      }
    });

    // TODO: 发送通知给活动创建者，包含拒绝原因
    void reason; // 保留拒绝原因用于后续通知

    return {
      success: true,
      activityId,
      status: ActivityStatus.CANCELLED,
      reviewerId,
      rejectReason: reason,
      refundedAmount: refundAmount,
      reviewedAt,
      message: `活动"${activity.title}"已被拒绝${refundAmount > 0 ? `，已退还 ${refundAmount} 零芥子给创建者` : ''}`,
    };
  }

  /**
   * 获取待审核活动列表
   *
   * 任务16.1.6: 活动审核 API - 获取待审核列表
   *
   * 查询规则：
   * - 只有管理员可以查看
   * - 只返回 PENDING 状态的活动
   * - 支持分页和筛选
   *
   * @param query 查询参数
   */
  async getPendingActivities(query: {
    page?: number;
    pageSize?: number;
    type?: string;
    sortBy?: 'createdAt' | 'startTime';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    activities: Array<{
      id: string;
      title: string;
      description: string;
      coverImage: string | null;
      type: ActivityType;
      typeName: string;
      startTime: Date;
      endTime: Date;
      maxParticipants: number | null;
      rewardPerPerson: number;
      totalPool: number;
      creator: {
        id: string;
        username: string;
        nickname: string | null;
        avatar: string | null;
      };
      createdAt: Date;
    }>;
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.ActivityWhereInput = {
      isDeleted: false,
      status: 'PENDING',
    };

    if (query.type) {
      where.type = query.type as ActivityType;
    }

    // 构建排序
    const orderBy: Prisma.ActivityOrderByWithRelationInput = {};
    if (query.sortBy === 'startTime') {
      orderBy.startTime = query.sortOrder || 'asc';
    } else {
      orderBy.createdAt = query.sortOrder || 'desc';
    }

    // 查询总数
    const total = await this.prisma.activity.count({ where });

    // 查询活动列表
    const activities = await this.prisma.activity.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    // 转换为 DTO 格式
    const activityItems = activities.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description.length > 200 ? a.description.substring(0, 200) + '...' : a.description,
      coverImage: a.coverImage,
      type: a.type as ActivityType,
      typeName: ACTIVITY_TYPE_NAMES[a.type] || a.type,
      startTime: a.startTime,
      endTime: a.endTime,
      maxParticipants: a.maxParticipants,
      rewardPerPerson: a.rewardPerPerson,
      totalPool: a.totalPool,
      creator: {
        id: a.creator.id,
        username: a.creator.username,
        nickname: a.creator.displayName,
        avatar: a.creator.avatar,
      },
      createdAt: a.createdAt,
    }));

    return {
      activities: activityItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
