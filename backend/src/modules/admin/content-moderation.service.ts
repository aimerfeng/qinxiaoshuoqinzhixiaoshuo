import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminLogService } from './admin-log.service.js';
import {
  CreateReportDto,
  ReportListQueryDto,
  ProcessReportDto,
  ReportListItemDto,
  ReportDetailDto,
  ReportListResponseDto,
  ReportOperationResultDto,
  ReportStatusDto,
  ModerationActionDto,
} from './dto/content-moderation.dto.js';

/**
 * 内容审核服务
 * 处理内容举报的创建、查询和审核处理
 *
 * 需求18验收标准7: WHEN 审核员审核内容举报 THEN System SHALL 显示举报内容、举报原因、证据
 * 需求18验收标准8: WHEN 审核员处理违规内容 THEN System SHALL 支持删除、警告、封禁等操作
 *
 * 审核工作流: 举报提交 → 待审核队列 → 审核员领取 → 审核处理（通过/拒绝） → 结果通知 → 归档
 */
@Injectable()
export class ContentModerationService {
  private readonly logger = new Logger(ContentModerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminLogService: AdminLogService,
  ) {}

  /**
   * 创建内容举报（用户提交）
   */
  async createReport(
    reporterId: string,
    dto: CreateReportDto,
  ): Promise<ReportOperationResultDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const report = await (this.prisma as any).contentReport.create({
      data: {
        reporterId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description || null,
        evidence: dto.evidence || [],
        status: 'PENDING',
      },
    });

    this.logger.log(
      `Report created: ${report.id} by user ${reporterId} for ${dto.targetType}:${dto.targetId}`,
    );

    return {
      success: true,
      message: '举报已提交，我们会尽快处理',
      report: this.mapToListItem(report),
    };
  }

  /**
   * 获取举报列表（管理员查询）
   */
  async getReportList(query: ReportListQueryDto): Promise<ReportListResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.targetType) {
      where.targetType = query.targetType;
    }
    if (query.reason) {
      where.reason = query.reason;
    }
    if (query.search) {
      where.description = {
        contains: query.search,
        mode: 'insensitive',
      };
    }

    // Build orderBy
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';
    const orderBy = { [sortBy]: sortOrder };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const [reports, total] = await Promise.all([
      (this.prisma as any).contentReport.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      (this.prisma as any).contentReport.count({ where }),
    ]);

    // Fetch reporter and reviewer names
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mappedReports: ReportListItemDto[] = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      (reports as any[]).map(async (report: any) => {
        const names = await this.fetchUserNames(
          report.reporterId,
          report.reviewerId,
        );
        return {
          ...this.mapToListItem(report),
          reporterName: names.reporterName,
          reviewerName: names.reviewerName,
        };
      }),
    );

    return {
      reports: mappedReports,
      pagination: {
        page,
        limit,
        total: total as number,
        totalPages: Math.ceil((total as number) / limit),
      },
    };
  }

  /**
   * 获取举报详情（管理员查看）
   */
  async getReportDetail(reportId: string): Promise<ReportDetailDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const report = await (this.prisma as any).contentReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('举报记录不存在');
    }

    const names = await this.fetchUserNames(
      report.reporterId,
      report.reviewerId,
    );

    // Fetch target content for context
    const targetContent = await this.fetchTargetContent(
      report.targetType,
      report.targetId,
    );

    return {
      id: report.id,
      reporterId: report.reporterId,
      reporterName: names.reporterName,
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      description: report.description,
      evidence: report.evidence || [],
      status: report.status,
      reviewerId: report.reviewerId,
      reviewerName: names.reviewerName,
      reviewNote: report.reviewNote,
      action: report.action,
      targetContent,
      createdAt: report.createdAt,
      reviewedAt: report.reviewedAt,
      updatedAt: report.updatedAt,
    };
  }

  /**
   * 处理举报（管理员审核）
   *
   * 审核工作流: 审核员领取 → 审核处理（通过/拒绝/需补充） → 结果通知 → 归档
   */
  async processReport(
    reportId: string,
    reviewerId: string,
    dto: ProcessReportDto,
  ): Promise<ReportOperationResultDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const report = await (this.prisma as any).contentReport.findUnique({
      where: { id: reportId },
    });

    if (!report) {
      throw new NotFoundException('举报记录不存在');
    }

    // Validate status transition
    if (report.status === 'ARCHIVED') {
      throw new BadRequestException('已归档的举报不能再次处理');
    }

    // If approving, action is required
    if (dto.status === ReportStatusDto.APPROVED && !dto.action) {
      throw new BadRequestException('通过举报时必须指定处理动作');
    }

    // Update report
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const updated = await (this.prisma as any).contentReport.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        reviewerId,
        reviewNote: dto.reviewNote || null,
        action: dto.action || null,
        reviewedAt: new Date(),
      },
    });

    // Execute moderation action if approved
    if (dto.status === ReportStatusDto.APPROVED && dto.action) {
      await this.executeModerationAction(
        dto.action,
        report.targetType,
        report.targetId,
        reviewerId,
        dto.reviewNote,
      );
    }

    // Log admin action
    this.adminLogService.logAction({
      adminId: reviewerId,
      actionType: 'CONTENT_REVIEW',
      targetType: this.mapTargetTypeToLogType(report.targetType),
      targetId: report.targetId,
      description: `审核举报 ${reportId}: ${dto.status}${dto.action ? ` (${dto.action})` : ''}`,
      metadata: {
        reportId,
        reason: report.reason,
        action: dto.action,
        reviewNote: dto.reviewNote,
      },
    });

    this.logger.log(
      `Report ${reportId} processed by ${reviewerId}: ${dto.status}`,
    );

    const names = await this.fetchUserNames(
      updated.reporterId,
      updated.reviewerId,
    );

    return {
      success: true,
      message: this.getProcessMessage(dto.status),
      report: {
        ...this.mapToListItem(updated),
        reporterName: names.reporterName,
        reviewerName: names.reviewerName,
      },
    };
  }

  // ==================== Private Helpers ====================

  /**
   * 执行审核处理动作
   */
  private async executeModerationAction(
    action: ModerationActionDto,
    targetType: string,
    targetId: string,
    reviewerId: string,
    reviewNote?: string,
  ): Promise<void> {
    try {
      switch (action) {
        case ModerationActionDto.DELETE_CONTENT:
          await this.softDeleteContent(targetType, targetId);
          this.adminLogService.logAction({
            adminId: reviewerId,
            actionType: 'CONTENT_DELETE',
            targetType: this.mapTargetTypeToLogType(targetType),
            targetId,
            description: `删除违规内容: ${targetType}:${targetId}`,
            metadata: { reviewNote },
          });
          break;

        case ModerationActionDto.WARN_USER: {
          const userId = await this.getContentOwnerId(targetType, targetId);
          if (userId) {
            this.logger.log(
              `Warning issued to user ${userId} for ${targetType}:${targetId}`,
            );
            // TODO: Send notification to user when notification service is integrated
          }
          break;
        }

        case ModerationActionDto.BAN_USER: {
          const ownerId = await this.getContentOwnerId(targetType, targetId);
          if (ownerId) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            await (this.prisma as any).user.update({
              where: { id: ownerId },
              data: { isActive: false },
            });
            this.adminLogService.logAction({
              adminId: reviewerId,
              actionType: 'USER_BAN',
              targetType: 'USER',
              targetId: ownerId,
              description: `因违规内容封禁用户: ${targetType}:${targetId}`,
              metadata: { reviewNote },
            });
          }
          break;
        }

        case ModerationActionDto.DISMISS:
          // No action needed for dismissal
          break;
      }
    } catch (error) {
      this.logger.error(
        `Failed to execute moderation action ${action} on ${targetType}:${targetId}`,
        error,
      );
    }
  }

  /**
   * 软删除内容
   */
  private async softDeleteContent(
    targetType: string,
    targetId: string,
  ): Promise<void> {
    const modelMap: Record<string, string> = {
      WORK: 'work',
      CHAPTER: 'chapter',
      CARD: 'card',
      COMMENT: 'comment',
      DANMAKU: 'danmaku',
    };

    const model = modelMap[targetType];
    if (model) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any)[model].update({
        where: { id: targetId },
        data: { isDeleted: true },
      });
    }
  }

  /**
   * 获取内容所有者ID
   */
  private async getContentOwnerId(
    targetType: string,
    targetId: string,
  ): Promise<string | null> {
    try {
      const ownerFieldMap: Record<string, { model: string; field: string }> = {
        WORK: { model: 'work', field: 'authorId' },
        CHAPTER: { model: 'chapter', field: 'authorId' },
        CARD: { model: 'card', field: 'authorId' },
        COMMENT: { model: 'comment', field: 'authorId' },
        DANMAKU: { model: 'danmaku', field: 'authorId' },
        USER: { model: 'user', field: 'id' },
      };

      const mapping = ownerFieldMap[targetType];
      if (!mapping) return null;

      if (targetType === 'USER') return targetId;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const record = await (this.prisma as any)[mapping.model].findUnique({
        where: { id: targetId },
        select: { [mapping.field]: true },
      });

      return record?.[mapping.field] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * 获取被举报内容的详情（用于审核员查看）
   */
  private async fetchTargetContent(
    targetType: string,
    targetId: string,
  ): Promise<unknown | null> {
    try {
      switch (targetType) {
        case 'WORK':
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          return await (this.prisma as any).work.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              title: true,
              description: true,
              authorId: true,
              status: true,
            },
          });
        case 'CHAPTER':
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          return await (this.prisma as any).chapter.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              title: true,
              content: true,
              authorId: true,
              workId: true,
            },
          });
        case 'CARD':
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          return await (this.prisma as any).card.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              content: true,
              authorId: true,
            },
          });
        case 'COMMENT':
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          return await (this.prisma as any).comment.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              content: true,
              authorId: true,
              cardId: true,
            },
          });
        case 'DANMAKU':
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          return await (this.prisma as any).danmaku.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              content: true,
              authorId: true,
              anchorId: true,
            },
          });
        case 'USER':
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          return await (this.prisma as any).user.findUnique({
            where: { id: targetId },
            select: {
              id: true,
              username: true,
              displayName: true,
              email: true,
              isActive: true,
            },
          });
        default:
          return null;
      }
    } catch {
      return null;
    }
  }

  /**
   * 获取用户名称（举报者和审核员）
   */
  private async fetchUserNames(
    reporterId: string,
    reviewerId: string | null,
  ): Promise<{ reporterName: string; reviewerName: string | null }> {
    const userIds = [reporterId];
    if (reviewerId) userIds.push(reviewerId);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const users = await (this.prisma as any).user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, displayName: true },
    });

    const userMap = new Map<string, string>();
    for (const user of users as any[]) {
      userMap.set(user.id, user.displayName || user.username);
    }

    return {
      reporterName: userMap.get(reporterId) || '未知用户',
      reviewerName: reviewerId ? (userMap.get(reviewerId) || null) : null,
    };
  }

  /**
   * 映射到列表项 DTO
   */
  private mapToListItem(report: any): ReportListItemDto {
    return {
      id: report.id,
      reporterId: report.reporterId,
      reporterName: '', // Will be filled by caller
      targetType: report.targetType,
      targetId: report.targetId,
      reason: report.reason,
      description: report.description,
      status: report.status,
      reviewerId: report.reviewerId,
      reviewerName: null, // Will be filled by caller
      action: report.action,
      createdAt: report.createdAt,
      reviewedAt: report.reviewedAt,
    };
  }

  /**
   * 映射目标类型到日志类型
   */
  private mapTargetTypeToLogType(
    targetType: string,
  ): 'WORK' | 'CHAPTER' | 'CARD' | 'COMMENT' | 'USER' | 'SYSTEM' {
    const map: Record<string, any> = {
      WORK: 'WORK',
      CHAPTER: 'CHAPTER',
      CARD: 'CARD',
      COMMENT: 'COMMENT',
      DANMAKU: 'COMMENT', // Map danmaku to comment for logging
      USER: 'USER',
    };
    return map[targetType] || 'SYSTEM';
  }

  /**
   * 获取处理结果消息
   */
  private getProcessMessage(status: ReportStatusDto): string {
    switch (status) {
      case ReportStatusDto.APPROVED:
        return '举报已通过，违规内容已处理';
      case ReportStatusDto.REJECTED:
        return '举报已驳回';
      case ReportStatusDto.ARCHIVED:
        return '举报已归档';
      case ReportStatusDto.REVIEWING:
        return '举报已领取，进入审核中';
      default:
        return '举报状态已更新';
    }
  }
}
