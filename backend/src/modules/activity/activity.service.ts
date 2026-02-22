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

  async validateUserCanCreateActivity(
    userId: string,
  ): Promise<{ valid: boolean; error?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true },
    });
    if (!user) return { valid: false, error: 'User not found' };
    if (user.memberLevel === 'REGULAR')
      return {
        valid: false,
        error: 'Only official members can create activities',
      };
    return { valid: true };
  }

  validateActivityConfig(dto: CreateActivityDto): {
    valid: boolean;
    error?: string;
  } {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    const now = new Date();
    if (startTime <= now)
      return { valid: false, error: 'Start time must be in the future' };
    if (endTime <= startTime)
      return { valid: false, error: 'End time must be after start time' };
    const durationDays =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);
    if (durationDays < ACTIVITY_LIMITS.MIN_DURATION_DAYS)
      return {
        valid: false,
        error:
          'Duration must be at least ' +
          ACTIVITY_LIMITS.MIN_DURATION_DAYS +
          ' days',
      };
    if (durationDays > ACTIVITY_LIMITS.MAX_DURATION_DAYS)
      return {
        valid: false,
        error:
          'Duration cannot exceed ' +
          ACTIVITY_LIMITS.MAX_DURATION_DAYS +
          ' days',
      };
    return { valid: true };
  }

  calculateRequiredPool(
    rewardPerPerson: number,
    maxParticipants?: number,
  ): number {
    return (
      rewardPerPerson * (maxParticipants || ACTIVITY_LIMITS.MIN_PARTICIPANTS)
    );
  }

  async validateUserBalance(
    userId: string,
    requiredAmount: number,
  ): Promise<{ valid: boolean; error?: string; currentBalance?: number }> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { balance: true },
    });
    if (!wallet) return { valid: false, error: 'Wallet not found' };
    if (wallet.balance < requiredAmount)
      return {
        valid: false,
        error: 'Insufficient balance',
        currentBalance: wallet.balance,
      };
    return { valid: true, currentBalance: wallet.balance };
  }

  async createActivity(
    userId: string,
    dto: CreateActivityDto,
  ): Promise<CreateActivityResultDto> {
    const userValidation = await this.validateUserCanCreateActivity(userId);
    if (!userValidation.valid)
      return {
        success: false,
        message: userValidation.error || 'Cannot create activity',
      };
    const configValidation = this.validateActivityConfig(dto);
    if (!configValidation.valid)
      return {
        success: false,
        message: configValidation.error || 'Invalid activity config',
      };
    const requiredPool = this.calculateRequiredPool(
      dto.rewardPerPerson,
      dto.maxParticipants,
    );
    const balanceValidation = await this.validateUserBalance(
      userId,
      requiredPool,
    );
    if (!balanceValidation.valid)
      return {
        success: false,
        message: balanceValidation.error || 'Insufficient balance',
      };

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId },
        data: { balance: { decrement: requiredPool } },
      });
      const wallet = await tx.wallet.findUnique({
        where: { userId },
        select: { id: true },
      });
      if (wallet) {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: 'TIP_SENT',
            amount: -requiredPool,
            description: 'Activity pool locked',
            referenceType: 'activity_pool',
          },
        });
      }
      const activity = await tx.activity.create({
        data: {
          title: dto.title,
          description: dto.description,
          coverImage: dto.coverImage || null,
          type: dto.type,
          status: 'DRAFT',
          startTime: new Date(dto.startTime),
          endTime: new Date(dto.endTime),
          rules: dto.rules ? dto.rules : null,
          rewards: dto.rewards ? dto.rewards : null,
          maxParticipants: dto.maxParticipants || null,
          rewardPerPerson: dto.rewardPerPerson,
          totalPool: requiredPool,
          lockedPool: requiredPool,
          creatorId: userId,
        },
      });
      return activity;
    });
    return {
      success: true,
      activityId: result.id,
      lockedPool: requiredPool,
      message: 'Activity created',
    };
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
    if ((query.sortBy || 'createdAt') === 'startTime')
      orderBy.startTime = query.sortOrder || 'desc';
    else orderBy.createdAt = query.sortOrder || 'desc';
    const total = await this.prisma.activity.count({ where });
    const activities = await this.prisma.activity.findMany({
      where,
      orderBy,
      skip,
      take: pageSize,
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        _count: { select: { participations: true } },
      },
    });
    const activityItems: ActivityListItemDto[] = activities.map((a) => ({
      id: a.id,
      title: a.title,
      description:
        a.description.length > 100
          ? a.description.substring(0, 100) + '...'
          : a.description,
      coverImage: a.coverImage,
      type: a.type as ActivityType,
      typeName: ACTIVITY_TYPE_NAMES[a.type] || a.type,
      status: a.status as ActivityStatus,
      statusName: ACTIVITY_STATUS_NAMES[a.status] || a.status,
      startTime: a.startTime,
      endTime: a.endTime,
      maxParticipants: a.maxParticipants,
      rewardPerPerson: a.rewardPerPerson,
      participantCount: a._count.participations,
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

  async getActivityDetail(
    activityId: string,
    userId?: string,
  ): Promise<ActivityDetailDto> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        creator: {
          select: { id: true, username: true, displayName: true, avatar: true },
        },
        _count: { select: { participations: true } },
      },
    });
    if (!activity || activity.isDeleted)
      throw new NotFoundException('Activity not found');
    let currentUserParticipation: UserParticipationDto | null = null;
    if (userId) {
      const participation = await this.prisma.activityParticipation.findUnique({
        where: { activityId_userId: { activityId, userId } },
      });
      if (participation) {
        currentUserParticipation = {
          id: participation.id,
          status: participation.status as unknown as ParticipationStatus,
          progress: participation.progress as Record<string, unknown> | null,
          rewardClaimed: participation.rewardClaimed,
          completedAt: participation.completedAt,
          createdAt: participation.createdAt,
        };
      }
    }
    return {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      coverImage: activity.coverImage,
      type: activity.type as ActivityType,
      typeName: ACTIVITY_TYPE_NAMES[activity.type] || activity.type,
      status: activity.status as ActivityStatus,
      statusName: ACTIVITY_STATUS_NAMES[activity.status] || activity.status,
      startTime: activity.startTime,
      endTime: activity.endTime,
      rules: activity.rules as ActivityRulesDto | null,
      rewards: activity.rewards as ActivityRewardsConfigDto[] | null,
      maxParticipants: activity.maxParticipants,
      rewardPerPerson: activity.rewardPerPerson,
      totalPool: activity.totalPool,
      lockedPool: activity.lockedPool,
      participantCount: activity._count.participations,
      creator: {
        id: activity.creator.id,
        username: activity.creator.username,
        nickname: activity.creator.displayName,
        avatar: activity.creator.avatar,
      },
      currentUserParticipation,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    };
  }

  async joinActivity(
    activityId: string,
    userId: string,
  ): Promise<JoinActivityResultDto> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      include: {
        _count: {
          select: {
            participations: { where: { status: { not: 'WITHDRAWN' } } },
          },
        },
      },
    });
    if (!activity || activity.isDeleted)
      return { success: false, message: '活动不存在' };
    if (activity.status !== 'ACTIVE')
      return {
        success: false,
        message:
          '活动当前状态为"' +
          (ACTIVITY_STATUS_NAMES[activity.status] || activity.status) +
          '"，无法参与',
      };
    if (
      activity.maxParticipants &&
      activity._count.participations >= activity.maxParticipants
    )
      return { success: false, message: '活动参与人数已满' };
    const existingParticipation =
      await this.prisma.activityParticipation.findUnique({
        where: { activityId_userId: { activityId, userId } },
      });
    if (existingParticipation) {
      if (existingParticipation.status === 'WITHDRAWN') {
        const updated = await this.prisma.activityParticipation.update({
          where: { id: existingParticipation.id },
          data: {
            status: 'JOINED',
            progress: {},
            completedAt: null,
            rewardClaimed: false,
          },
        });
        return {
          success: true,
          participationId: updated.id,
          activityId,
          status: ParticipationStatus.JOINED,
          message: '重新参与活动成功',
        };
      }
      return { success: false, message: '您已经参与了该活动' };
    }
    const participation = await this.prisma.activityParticipation.create({
      data: { activityId, userId, status: 'JOINED', progress: {} },
    });
    return {
      success: true,
      participationId: participation.id,
      activityId,
      status: ParticipationStatus.JOINED,
      message: '参与活动成功',
    };
  }

  async leaveActivity(
    activityId: string,
    userId: string,
  ): Promise<LeaveActivityResultDto> {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity || activity.isDeleted)
      return { success: false, message: '活动不存在' };
    if (activity.status !== 'ACTIVE')
      return {
        success: false,
        message:
          '活动当前状态为"' +
          (ACTIVITY_STATUS_NAMES[activity.status] || activity.status) +
          '"，无法退出',
      };
    const participation = await this.prisma.activityParticipation.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });
    if (!participation) return { success: false, message: '您尚未参与该活动' };
    if (participation.status === 'WITHDRAWN')
      return { success: false, message: '您已经退出了该活动' };
    if (
      participation.status === 'COMPLETED' ||
      participation.status === 'FAILED'
    )
      return { success: false, message: '活动已完成，无法退出' };
    const updated = await this.prisma.activityParticipation.update({
      where: { id: participation.id },
      data: { status: 'WITHDRAWN' },
    });
    return {
      success: true,
      participationId: updated.id,
      status: ParticipationStatus.WITHDRAWN,
      message: '退出活动成功',
    };
  }

  async getMyParticipations(
    userId: string,
    query: MyParticipationsQueryDto,
  ): Promise<MyParticipationsListDto> {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(50, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;
    const where: Prisma.ActivityParticipationWhereInput = { userId };
    if (query.status) where.status = query.status;
    const total = await this.prisma.activityParticipation.count({ where });
    const participations = await this.prisma.activityParticipation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        activity: {
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                participations: { where: { status: { not: 'WITHDRAWN' } } },
              },
            },
          },
        },
      },
    });
    const items: MyParticipationItemDto[] = participations.map((p) => ({
      id: p.id,
      status: p.status as ParticipationStatus,
      statusName: PARTICIPATION_STATUS_NAMES[p.status as string] || p.status,
      progress: p.progress as Record<string, unknown> | null,
      rewardClaimed: p.rewardClaimed,
      completedAt: p.completedAt,
      createdAt: p.createdAt,
      activity: {
        id: p.activity.id,
        title: p.activity.title,
        description:
          p.activity.description.length > 100
            ? p.activity.description.substring(0, 100) + '...'
            : p.activity.description,
        coverImage: p.activity.coverImage,
        type: p.activity.type as ActivityType,
        typeName:
          ACTIVITY_TYPE_NAMES[p.activity.type as string] || p.activity.type,
        status: p.activity.status as ActivityStatus,
        statusName:
          ACTIVITY_STATUS_NAMES[p.activity.status as string] ||
          p.activity.status,
        startTime: p.activity.startTime,
        endTime: p.activity.endTime,
        rewardPerPerson: p.activity.rewardPerPerson,
        participantCount: p.activity._count.participations,
        creator: {
          id: p.activity.creator.id,
          username: p.activity.creator.username,
          nickname: p.activity.creator.displayName,
          avatar: p.activity.creator.avatar,
        },
      },
    }));
    return {
      participations: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
