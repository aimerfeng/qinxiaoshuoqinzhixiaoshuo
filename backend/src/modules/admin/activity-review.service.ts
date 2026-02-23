import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminLogService } from './admin-log.service.js';
import { ActivityService } from '../activity/activity.service.js';
import {
  ActivityListQueryDto,
  ApproveActivityDto,
  RejectActivityDto,
  ActivityListItemDto,
  ActivityReviewDetailDto,
  ActivityListResponseDto,
  ActivityOperationResultDto,
  ComplianceCheckResult,
  ACTIVITY_TYPE_NAMES,
  ACTIVITY_STATUS_NAMES,
} from './dto/activity-review.dto.js';

/**
 * 活动审核服务
 * 处理管理后台的活动审核功能
 *
 * 需求18验收标准9: WHEN 运营人员审核用户活动 THEN System SHALL 显示活动详情和合规性检查结果
 * 需求16验收标准4: WHEN 活动创建完成 THEN System SHALL 提交审核并通知管理员
 * 需求16验收标准5: WHEN 管理员审核通过 THEN System SHALL 发布活动并在广场/作品页展示
 * 需求16验收标准6: WHEN 管理员拒绝活动 THEN System SHALL 解锁奖池并通知发起者修改建议
 *
 * 审核工作流: 活动提交 → 待审核队列 → 运营人员审核 → 通过/拒绝 → 通知创建者
 */
@Injectable()
export class ActivityReviewService {
  private readonly logger = new Logger(ActivityReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * 获取活动列表（管理员视图）
   *
   * 支持分页、状态筛选、类型筛选、关键词搜索
   */
  async getActivityList(
    query: ActivityListQueryDto,
  ): Promise<ActivityListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, unknown> = {
      isDeleted: false,
    };

    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [activities, total] = await Promise.all([
      (this.prisma as any).activity.findMany({
        where,
        orderBy,
        skip,
        take: limit,
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
            select: { participations: true },
          },
        },
      }),
      (this.prisma as any).activity.count({ where }),
    ]);

    // Fetch reviewer names
    const reviewerIds = (activities as any[])
      .filter((a: any) => a.reviewerId)
      .map((a: any) => a.reviewerId as string);

    const reviewerMap = await this.fetchUserNameMap([...new Set(reviewerIds)]);

    const mappedActivities: ActivityListItemDto[] = (activities as any[]).map(
      (a: any) => this.mapToListItem(a, reviewerMap),
    );

    return {
      activities: mappedActivities,
      pagination: {
        page,
        limit,
        total: total as number,
        totalPages: Math.ceil((total as number) / limit),
      },
    };
  }

  /**
   * 获取活动审核详情（管理员视图）
   *
   * 需求18验收标准9: 显示活动详情和合规性检查结果
   */
  async getActivityDetail(activityId: string): Promise<ActivityReviewDetailDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const activity = await (this.prisma as any).activity.findUnique({
      where: { id: activityId },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatar: true,
            memberLevel: true,
            contributionScore: true,
            isActive: true,
            createdAt: true,
          },
        },
        _count: {
          select: { participations: true },
        },
      },
    });

    if (!activity || activity.isDeleted) {
      throw new NotFoundException('活动不存在');
    }

    // Fetch reviewer name
    let reviewerName: string | null = null;
    if (activity.reviewerId) {
      const reviewerMap = await this.fetchUserNameMap([activity.reviewerId as string]);
      reviewerName = reviewerMap.get(activity.reviewerId as string) || null;
    }

    // Run compliance checks
    const complianceCheck = this.runComplianceCheck(activity);

    // Get participation stats
    const participationStats = await this.getParticipationStats(activityId);

    const creator = activity.creator;

    return {
      id: activity.id as string,
      title: activity.title as string,
      description: activity.description as string,
      coverImage: activity.coverImage as string | null,
      type: activity.type as string,
      typeName: ACTIVITY_TYPE_NAMES[activity.type as string] || (activity.type as string),
      status: activity.status as string,
      statusName: ACTIVITY_STATUS_NAMES[activity.status as string] || (activity.status as string),
      startTime: activity.startTime as Date,
      endTime: activity.endTime as Date,
      maxParticipants: activity.maxParticipants as number | null,
      rewardPerPerson: activity.rewardPerPerson as number,
      totalPool: activity.totalPool as number,
      lockedPool: activity.lockedPool as number,
      participantCount: activity._count?.participations as number ?? 0,
      rules: activity.rules,
      rewards: activity.rewards,
      rejectReason: activity.rejectReason as string | null,
      creator: {
        id: creator.id as string,
        username: creator.username as string,
        displayName: creator.displayName as string | null,
        avatar: creator.avatar as string | null,
      },
      reviewerId: activity.reviewerId as string | null,
      reviewerName,
      reviewedAt: activity.reviewedAt as Date | null,
      createdAt: activity.createdAt as Date,
      updatedAt: activity.updatedAt as Date,
      creatorDetail: {
        id: creator.id as string,
        email: creator.email as string,
        username: creator.username as string,
        displayName: creator.displayName as string | null,
        memberLevel: creator.memberLevel as string,
        contributionScore: creator.contributionScore as number,
        isActive: creator.isActive as boolean,
        createdAt: creator.createdAt as Date,
      },
      complianceCheck,
      participationStats,
    };
  }

  /**
   * 审核通过活动
   *
   * 需求16验收标准5: WHEN 管理员审核通过 THEN System SHALL 发布活动并在广场/作品页展示
   */
  async approveActivity(
    activityId: string,
    reviewerId: string,
    dto: ApproveActivityDto,
  ): Promise<ActivityOperationResultDto> {
    // Delegate to activity service for core logic
    const result = await this.activityService.approveActivity(
      activityId,
      reviewerId,
      dto.reviewNote,
    );

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    // Update reviewer info on the activity record
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const updated = await (this.prisma as any).activity.update({
      where: { id: activityId },
      data: {
        reviewerId,
        reviewedAt: new Date(),
      },
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
          select: { participations: true },
        },
      },
    });

    // Log admin action
    this.adminLogService.logAction({
      adminId: reviewerId,
      actionType: 'ACTIVITY_APPROVE',
      targetType: 'ACTIVITY',
      targetId: activityId,
      description: `审核通过活动: ${updated.title}`,
      metadata: {
        activityId,
        reviewNote: dto.reviewNote,
      },
    });

    this.logger.log(
      `Activity ${activityId} approved by admin ${reviewerId}`,
    );

    const reviewerMap = await this.fetchUserNameMap([reviewerId]);

    return {
      success: true,
      message: result.message,
      activity: this.mapToListItem(updated, reviewerMap),
    };
  }

  /**
   * 拒绝活动
   *
   * 需求16验收标准6: WHEN 管理员拒绝活动 THEN System SHALL 解锁奖池并通知发起者修改建议
   */
  async rejectActivity(
    activityId: string,
    reviewerId: string,
    dto: RejectActivityDto,
  ): Promise<ActivityOperationResultDto> {
    // Delegate to activity service for core logic (handles pool refund)
    const result = await this.activityService.rejectActivity(
      activityId,
      reviewerId,
      dto.rejectReason,
    );

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    // Update reviewer info and reject reason on the activity record
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const updated = await (this.prisma as any).activity.update({
      where: { id: activityId },
      data: {
        reviewerId,
        reviewedAt: new Date(),
        rejectReason: dto.rejectReason,
      },
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
          select: { participations: true },
        },
      },
    });

    // Log admin action
    this.adminLogService.logAction({
      adminId: reviewerId,
      actionType: 'ACTIVITY_REJECT',
      targetType: 'ACTIVITY',
      targetId: activityId,
      description: `拒绝活动: ${updated.title}，原因: ${dto.rejectReason}`,
      metadata: {
        activityId,
        rejectReason: dto.rejectReason,
        suggestions: dto.suggestions,
        refundedAmount: result.refundedAmount,
      },
    });

    this.logger.log(
      `Activity ${activityId} rejected by admin ${reviewerId}, reason: ${dto.rejectReason}`,
    );

    const reviewerMap = await this.fetchUserNameMap([reviewerId]);

    return {
      success: true,
      message: result.message,
      activity: this.mapToListItem(updated, reviewerMap),
    };
  }

  // ==================== Private Helpers ====================

  /**
   * 运行合规性检查
   *
   * 需求18验收标准9: 显示合规性检查结果
   */
  private runComplianceCheck(activity: any): ComplianceCheckResult {
    const checks: ComplianceCheckResult['checks'] = [];

    // 1. 标题长度检查
    const title = activity.title as string;
    checks.push({
      name: '标题长度',
      passed: title.length >= 4 && title.length <= 30,
      message: title.length >= 4 && title.length <= 30
        ? '标题长度符合要求（4-30字符）'
        : `标题长度不符合要求（当前${title.length}字符，要求4-30字符）`,
    });

    // 2. 描述长度检查
    const description = activity.description as string;
    checks.push({
      name: '描述长度',
      passed: description.length >= 10 && description.length <= 500,
      message: description.length >= 10 && description.length <= 500
        ? '描述长度符合要求（10-500字符）'
        : `描述长度不符合要求（当前${description.length}字符，要求10-500字符）`,
    });

    // 3. 时间合理性检查
    const now = new Date();
    const startTime = new Date(activity.startTime);
    const endTime = new Date(activity.endTime);
    const durationDays = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24);

    checks.push({
      name: '开始时间',
      passed: startTime > now,
      message: startTime > now
        ? '开始时间在未来'
        : '开始时间已过期',
    });

    checks.push({
      name: '活动时长',
      passed: durationDays >= 1 && durationDays <= 30,
      message: durationDays >= 1 && durationDays <= 30
        ? `活动时长${Math.round(durationDays)}天，符合要求（1-30天）`
        : `活动时长${Math.round(durationDays)}天，不符合要求（要求1-30天）`,
    });

    // 4. 奖池检查
    const rewardPerPerson = activity.rewardPerPerson as number;
    const totalPool = activity.totalPool as number;
    const maxParticipants = activity.maxParticipants as number | null;

    checks.push({
      name: '单人奖励',
      passed: rewardPerPerson >= 1 && rewardPerPerson <= 100,
      message: rewardPerPerson >= 1 && rewardPerPerson <= 100
        ? `单人奖励${rewardPerPerson}零芥子，符合要求（1-100）`
        : `单人奖励${rewardPerPerson}零芥子，不符合要求（要求1-100）`,
    });

    const poolSufficient = maxParticipants
      ? totalPool >= rewardPerPerson * maxParticipants
      : totalPool >= rewardPerPerson;

    checks.push({
      name: '奖池充足',
      passed: poolSufficient,
      message: poolSufficient
        ? '奖池金额充足'
        : '奖池金额不足以覆盖所有参与者奖励',
    });

    // 5. 参与人数检查
    if (maxParticipants !== null) {
      checks.push({
        name: '参与人数上限',
        passed: maxParticipants >= 10 && maxParticipants <= 1000,
        message: maxParticipants >= 10 && maxParticipants <= 1000
          ? `参与人数上限${maxParticipants}人，符合要求（10-1000）`
          : `参与人数上限${maxParticipants}人，不符合要求（要求10-1000）`,
      });
    }

    const allPassed = checks.every((c) => c.passed);

    return {
      passed: allPassed,
      checks,
    };
  }

  /**
   * 获取活动参与统计
   */
  private async getParticipationStats(
    activityId: string,
  ): Promise<{ totalParticipants: number; completedCount: number; joinedCount: number }> {
    try {
      const [totalParticipants, completedCount, joinedCount] = await Promise.all([
        (this.prisma as any).activityParticipation.count({
          where: { activityId },
        }),
        (this.prisma as any).activityParticipation.count({
          where: { activityId, status: 'COMPLETED' },
        }),
        (this.prisma as any).activityParticipation.count({
          where: { activityId, status: 'JOINED' },
        }),
      ]);

      return {
        totalParticipants: totalParticipants as number,
        completedCount: completedCount as number,
        joinedCount: joinedCount as number,
      };
    } catch {
      return { totalParticipants: 0, completedCount: 0, joinedCount: 0 };
    }
  }

  /**
   * 批量获取用户名称映射
   */
  private async fetchUserNameMap(userIds: string[]): Promise<Map<string, string>> {
    if (userIds.length === 0) return new Map();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const users = await (this.prisma as any).user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true },
    });

    const map = new Map<string, string>();
    for (const user of users as any[]) {
      map.set(user.id as string, (user.displayName || user.username) as string);
    }
    return map;
  }

  /**
   * 映射到列表项 DTO
   */
  private mapToListItem(
    activity: any,
    reviewerMap: Map<string, string>,
  ): ActivityListItemDto {
    const creator = activity.creator;
    return {
      id: activity.id as string,
      title: activity.title as string,
      description: activity.description as string,
      coverImage: activity.coverImage as string | null,
      type: activity.type as string,
      typeName: ACTIVITY_TYPE_NAMES[activity.type as string] || (activity.type as string),
      status: activity.status as string,
      statusName: ACTIVITY_STATUS_NAMES[activity.status as string] || (activity.status as string),
      startTime: activity.startTime as Date,
      endTime: activity.endTime as Date,
      maxParticipants: activity.maxParticipants as number | null,
      rewardPerPerson: activity.rewardPerPerson as number,
      totalPool: activity.totalPool as number,
      lockedPool: activity.lockedPool as number,
      participantCount: activity._count?.participations as number ?? 0,
      creator: {
        id: creator?.id as string || '',
        username: creator?.username as string || '',
        displayName: creator?.displayName as string | null || null,
        avatar: creator?.avatar as string | null || null,
      },
      reviewerId: activity.reviewerId as string | null,
      reviewerName: activity.reviewerId
        ? reviewerMap.get(activity.reviewerId as string) || null
        : null,
      reviewedAt: activity.reviewedAt as Date | null,
      createdAt: activity.createdAt as Date,
    };
  }
}
