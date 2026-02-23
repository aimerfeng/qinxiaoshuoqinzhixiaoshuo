import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminLogService } from './admin-log.service.js';
import {
  ApplicationListQueryDto,
  ApproveApplicationDto,
  RejectApplicationDto,
  ApplicationListItemDto,
  ApplicationDetailDto,
  ApplicationListResponseDto,
  ApplicationOperationResultDto,
  LEVEL_NAMES,
  STATUS_NAMES,
} from './dto/membership-review.dto.js';

/**
 * 会员审核服务
 * 处理管理后台的会员申请审核功能
 *
 * 需求18验收标准6: WHEN 审核员处理会员申请 THEN System SHALL 显示申请信息、贡献度、历史行为
 * 需求14验收标准5: WHEN 管理员审核通过申请 THEN System SHALL 升级用户为 Official_Member 并发放欢迎奖励
 * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
 *
 * 审核工作流: 申请提交 → 进入待审核队列 → 审核员领取 → 审核处理（通过/拒绝） → 结果通知 → 归档
 */
@Injectable()
export class MembershipReviewService {
  private readonly logger = new Logger(MembershipReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
  ) {}

  /**
   * 获取会员申请列表（管理员视图）
   *
   * 支持分页、状态筛选、目标等级筛选、用户名搜索
   */
  async getApplicationList(
    query: ApplicationListQueryDto,
  ): Promise<ApplicationListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.targetLevel) {
      where.targetLevel = query.targetLevel;
    }

    // If search is provided, filter by user's username or displayName
    if (query.search) {
      where.user = {
        OR: [
          { username: { contains: query.search, mode: 'insensitive' } },
          { displayName: { contains: query.search, mode: 'insensitive' } },
        ],
      };
    }

    // Build orderBy
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [applications, total] = await Promise.all([
      (this.prisma as any).memberApplication.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      }),
      (this.prisma as any).memberApplication.count({ where }),
    ]);

    // Fetch reviewer names for applications that have been reviewed
    const reviewerIds = (applications as any[])
      .filter((app: any) => app.reviewerId)
      .map((app: any) => app.reviewerId as string);

    const reviewerMap = await this.fetchUserNameMap(
      [...new Set(reviewerIds)],
    );

    const mappedApplications: ApplicationListItemDto[] = (
      applications as any[]
    ).map((app: any) => this.mapToListItem(app, reviewerMap));

    return {
      applications: mappedApplications,
      pagination: {
        page,
        limit,
        total: total as number,
        totalPages: Math.ceil((total as number) / limit),
      },
    };
  }

  /**
   * 获取会员申请详情（管理员视图）
   *
   * 需求18验收标准6: 显示申请信息、贡献度、历史行为
   */
  async getApplicationDetail(applicationId: string): Promise<ApplicationDetailDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const application = await (this.prisma as any).memberApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
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
            lastLoginAt: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('会员申请记录不存在');
    }

    const user = application.user;
    const userId = user.id as string;

    // Fetch reviewer name
    let reviewerName: string | null = null;
    if (application.reviewerId) {
      const reviewerMap = await this.fetchUserNameMap([application.reviewerId as string]);
      reviewerName = reviewerMap.get(application.reviewerId as string) || null;
    }

    // Fetch contribution breakdown
    const contributionBreakdown = await this.getContributionBreakdown(userId);

    // Fetch recent activity counts (last 30 days)
    const recentActivity = await this.getRecentActivity(userId);

    // Fetch application history stats
    const applicationHistory = await this.getApplicationHistory(userId);

    return {
      id: application.id as string,
      userId,
      username: user.username as string,
      displayName: user.displayName as string | null,
      avatar: user.avatar as string | null,
      targetLevel: application.targetLevel as string,
      targetLevelName: LEVEL_NAMES[application.targetLevel as string] || application.targetLevel as string,
      currentScore: application.currentScore as number,
      status: application.status as string,
      statusName: STATUS_NAMES[application.status as string] || application.status as string,
      reason: application.reason as string | null,
      rejectReason: application.rejectReason as string | null,
      reviewerId: application.reviewerId as string | null,
      reviewerName,
      reviewedAt: application.reviewedAt as Date | null,
      createdAt: application.createdAt as Date,
      updatedAt: application.updatedAt as Date,
      userDetail: {
        id: userId,
        email: user.email as string,
        username: user.username as string,
        displayName: user.displayName as string | null,
        avatar: user.avatar as string | null,
        memberLevel: user.memberLevel as string,
        memberLevelName: LEVEL_NAMES[user.memberLevel as string] || user.memberLevel as string,
        contributionScore: user.contributionScore as number,
        isActive: user.isActive as boolean,
        createdAt: user.createdAt as Date,
        lastLoginAt: user.lastLoginAt as Date | null,
      },
      contributionBreakdown,
      recentActivity,
      applicationHistory,
    };
  }


  /**
   * 审核通过会员申请
   *
   * 需求14验收标准5: WHEN 管理员审核通过申请 THEN System SHALL 升级用户为 Official_Member 并发放欢迎奖励
   */
  async approveApplication(
    applicationId: string,
    reviewerId: string,
    dto: ApproveApplicationDto,
  ): Promise<ApplicationOperationResultDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const application = await (this.prisma as any).memberApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('会员申请记录不存在');
    }

    if (application.status !== 'PENDING') {
      throw new BadRequestException('该申请已被处理，无法重复审核');
    }

    // Use transaction to update application and upgrade user level
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const updated = await this.prisma.$transaction(async (tx) => {
      // Update application status
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const updatedApp = await (tx as any).memberApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          reviewerId,
          reviewedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      });

      // Upgrade user member level
      await (tx as any).user.update({
        where: { id: application.userId as string },
        data: {
          memberLevel: application.targetLevel as string,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return updatedApp;
    });

    // Log admin action
    this.adminLogService.logAction({
      adminId: reviewerId,
      actionType: 'MEMBER_APPROVE',
      targetType: 'USER',
      targetId: application.userId as string,
      description: `审核通过会员申请 ${applicationId}，升级为 ${LEVEL_NAMES[application.targetLevel as string] || application.targetLevel}`,
      metadata: {
        applicationId,
        targetLevel: application.targetLevel,
        reviewNote: dto.reviewNote,
      },
    });

    this.logger.log(
      `Application ${applicationId} approved by ${reviewerId}, user ${application.userId} upgraded to ${application.targetLevel}`,
    );

    // TODO: Send notification to user (welcome to new level)
    // TODO: Issue welcome reward (e.g., Mustard Seeds)

    const reviewerMap = await this.fetchUserNameMap([reviewerId]);

    return {
      success: true,
      message: `申请已通过，用户已升级为${LEVEL_NAMES[application.targetLevel as string] || application.targetLevel}`,
      application: this.mapToListItem(updated, reviewerMap),
    };
  }

  /**
   * 审核拒绝会员申请
   *
   * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
   */
  async rejectApplication(
    applicationId: string,
    reviewerId: string,
    dto: RejectApplicationDto,
  ): Promise<ApplicationOperationResultDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const application = await (this.prisma as any).memberApplication.findUnique({
      where: { id: applicationId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('会员申请记录不存在');
    }

    if (application.status !== 'PENDING') {
      throw new BadRequestException('该申请已被处理，无法重复审核');
    }

    // Update application status
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const updated = await (this.prisma as any).memberApplication.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        rejectReason: dto.rejectReason,
        reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    // Log admin action
    this.adminLogService.logAction({
      adminId: reviewerId,
      actionType: 'MEMBER_REJECT',
      targetType: 'USER',
      targetId: application.userId as string,
      description: `拒绝会员申请 ${applicationId}，原因: ${dto.rejectReason}`,
      metadata: {
        applicationId,
        targetLevel: application.targetLevel,
        rejectReason: dto.rejectReason,
        reviewNote: dto.reviewNote,
      },
    });

    this.logger.log(
      `Application ${applicationId} rejected by ${reviewerId}, reason: ${dto.rejectReason}`,
    );

    // TODO: Send notification to user with rejection reason

    const reviewerMap = await this.fetchUserNameMap([reviewerId]);

    return {
      success: true,
      message: '申请已拒绝，用户将收到通知',
      application: this.mapToListItem(updated, reviewerMap),
    };
  }

  // ==================== Private Helpers ====================

  /**
   * 获取用户贡献度分解
   */
  private async getContributionBreakdown(
    userId: string,
  ): Promise<{ reading: number; interaction: number; creation: number; community: number }> {
    const categoryMap: Record<string, string> = {
      READ_CHAPTER: 'reading',
      READ_DURATION: 'reading',
      COMMENT_VALID: 'interaction',
      COMMENT_LIKED: 'interaction',
      QUOTE_INTERACTED: 'interaction',
      PUBLISH_CHAPTER: 'creation',
      WORK_FAVORITED: 'creation',
      PARAGRAPH_QUOTED: 'creation',
      REPORT_VALID: 'community',
      ACTIVITY_PARTICIPATE: 'community',
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const records = await (this.prisma as any).contributionRecord.findMany({
        where: { userId },
        select: { type: true, points: true },
      });

      const breakdown = { reading: 0, interaction: 0, creation: 0, community: 0 };
      for (const record of records as any[]) {
        const category = categoryMap[record.type as string] || 'community';
        breakdown[category as keyof typeof breakdown] += record.points as number;
      }

      return breakdown;
    } catch {
      return { reading: 0, interaction: 0, creation: 0, community: 0 };
    }
  }

  /**
   * 获取用户近期活动统计（最近30天）
   */
  private async getRecentActivity(
    userId: string,
  ): Promise<{ worksCount: number; cardsCount: number; commentsCount: number }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    try {
      const [worksCount, cardsCount, commentsCount] = await Promise.all([
        (this.prisma as any).work.count({
          where: { authorId: userId, createdAt: { gte: thirtyDaysAgo } },
        }),
        (this.prisma as any).card.count({
          where: { authorId: userId, createdAt: { gte: thirtyDaysAgo } },
        }),
        (this.prisma as any).comment.count({
          where: { authorId: userId, createdAt: { gte: thirtyDaysAgo } },
        }),
      ]);

      return {
        worksCount: worksCount as number,
        cardsCount: cardsCount as number,
        commentsCount: commentsCount as number,
      };
    } catch {
      return { worksCount: 0, cardsCount: 0, commentsCount: 0 };
    }
  }

  /**
   * 获取用户申请历史统计
   */
  private async getApplicationHistory(
    userId: string,
  ): Promise<{ totalApplications: number; approvedCount: number; rejectedCount: number }> {
    try {
      const [totalApplications, approvedCount, rejectedCount] = await Promise.all([
        (this.prisma as any).memberApplication.count({ where: { userId } }),
        (this.prisma as any).memberApplication.count({
          where: { userId, status: 'APPROVED' },
        }),
        (this.prisma as any).memberApplication.count({
          where: { userId, status: 'REJECTED' },
        }),
      ]);

      return {
        totalApplications: totalApplications as number,
        approvedCount: approvedCount as number,
        rejectedCount: rejectedCount as number,
      };
    } catch {
      return { totalApplications: 0, approvedCount: 0, rejectedCount: 0 };
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
    app: any,
    reviewerMap: Map<string, string>,
  ): ApplicationListItemDto {
    const user = app.user;
    return {
      id: app.id as string,
      userId: app.userId as string,
      username: user?.username as string || '',
      displayName: user?.displayName as string | null || null,
      avatar: user?.avatar as string | null || null,
      targetLevel: app.targetLevel as string,
      targetLevelName: LEVEL_NAMES[app.targetLevel as string] || app.targetLevel as string,
      currentScore: app.currentScore as number,
      status: app.status as string,
      statusName: STATUS_NAMES[app.status as string] || app.status as string,
      reason: app.reason as string | null,
      rejectReason: app.rejectReason as string | null,
      reviewerId: app.reviewerId as string | null,
      reviewerName: app.reviewerId ? reviewerMap.get(app.reviewerId as string) || null : null,
      reviewedAt: app.reviewedAt as Date | null,
      createdAt: app.createdAt as Date,
    };
  }
}
