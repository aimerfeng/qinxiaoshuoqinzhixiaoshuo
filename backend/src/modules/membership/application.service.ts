import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  MemberLevelEnum,
  MemberApplicationStatusEnum,
  LEVEL_THRESHOLDS,
  LEVEL_NAMES,
  LEVEL_VALUES,
  APPLICATION_STATUS_NAMES,
  type ApplicationRecordDto,
  type EligibilityResultDto,
  type AdminApplicationRecordDto,
} from './dto/application.dto.js';

/**
 * 会员申请服务
 *
 * 需求14: 会员等级体系
 * 任务14.1.4: 会员申请 API
 *
 * 功能说明：
 * 1. 检查用户升级资格
 * 2. 创建会员申请
 * 3. 获取用户申请历史
 * 4. 获取申请详情
 *
 * 等级升级阈值：
 * - Lv.1 (正式会员): 500 贡献度
 * - Lv.2 (资深会员): 2000 贡献度
 * - Lv.3 (荣誉会员): 10000 贡献度 (需要管理员审核)
 */
@Injectable()
export class MembershipApplicationService {
  private readonly logger = new Logger(MembershipApplicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 将数据库 MemberLevel 字符串转换为 DTO 枚举
   */
  private toMemberLevelEnum(level: string): MemberLevelEnum {
    return level as MemberLevelEnum;
  }

  /**
   * 将数据库 MemberApplicationStatus 字符串转换为 DTO 枚举
   */
  private toApplicationStatusEnum(status: string): MemberApplicationStatusEnum {
    return status as MemberApplicationStatusEnum;
  }

  /**
   * 检查用户升级资格
   *
   * 需求14验收标准3: WHEN 用户贡献度达到500分 THEN System SHALL 解锁"申请正式会员"入口
   *
   * @param userId 用户ID
   * @returns 资格检查结果
   */
  async checkEligibility(userId: string): Promise<EligibilityResultDto> {
    // 获取用户信息
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        memberLevel: true,
        contributionScore: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const currentLevel = this.toMemberLevelEnum(user.memberLevel as string);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const currentScore: number = user.contributionScore;
    const currentLevelValue = LEVEL_VALUES[currentLevel];

    // 获取用户待审核的申请
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const pendingApplications = await (
      this.prisma as any
    ).memberApplication.findMany({
      where: {
        userId,
        status: 'PENDING',
      },
      select: {
        targetLevel: true,
      },
    });

    const pendingLevels = new Set(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      pendingApplications.map(
        (app: { targetLevel: string }) => app.targetLevel,
      ),
    );

    // 检查每个可升级的等级
    const eligibleLevels = Object.values(MemberLevelEnum)
      .filter((level) => LEVEL_VALUES[level] > currentLevelValue)
      .map((level) => {
        const requiredScore = LEVEL_THRESHOLDS[level];
        const isEligible = currentScore >= requiredScore;
        const hasPendingApplication = pendingLevels.has(level);

        let canApply = false;
        let reason = '';

        if (hasPendingApplication) {
          reason = '已有待审核的申请';
        } else if (!isEligible) {
          reason = `贡献度不足，需要 ${requiredScore} 分，当前 ${currentScore} 分`;
        } else {
          canApply = true;
          reason = '可以申请';
        }

        return {
          level,
          levelName: LEVEL_NAMES[level],
          requiredScore,
          isEligible,
          hasPendingApplication,
          canApply,
          reason,
        };
      });

    return {
      currentLevel,
      currentLevelName: LEVEL_NAMES[currentLevel],
      currentScore,
      eligibleLevels,
    };
  }

  /**
   * 创建会员申请
   *
   * 需求14验收标准4: WHEN 用户提交正式会员申请 THEN System SHALL 创建审核工单并通知管理员
   *
   * @param userId 用户ID
   * @param targetLevel 目标等级
   * @param reason 申请理由（可选）
   * @returns 创建的申请记录
   */
  async createApplication(
    userId: string,
    targetLevel: MemberLevelEnum,
    reason?: string,
  ): Promise<ApplicationRecordDto> {
    // 获取用户信息
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        memberLevel: true,
        contributionScore: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const currentLevel = this.toMemberLevelEnum(user.memberLevel as string);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const currentScore: number = user.contributionScore;
    const currentLevelValue = LEVEL_VALUES[currentLevel];
    const targetLevelValue = LEVEL_VALUES[targetLevel];

    // 验证目标等级是否高于当前等级
    if (targetLevelValue <= currentLevelValue) {
      throw new BadRequestException('目标等级必须高于当前等级');
    }

    // 验证贡献度是否达标
    const requiredScore = LEVEL_THRESHOLDS[targetLevel];
    if (currentScore < requiredScore) {
      throw new BadRequestException(
        `贡献度不足，申请 ${LEVEL_NAMES[targetLevel]} 需要 ${requiredScore} 分，当前 ${currentScore} 分`,
      );
    }

    // 检查是否已有待审核的同等级申请
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const existingApplication = await (
      this.prisma as any
    ).memberApplication.findFirst({
      where: {
        userId,
        targetLevel: targetLevel,
        status: 'PENDING',
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        `已有待审核的 ${LEVEL_NAMES[targetLevel]} 申请`,
      );
    }

    // 创建申请记录
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const application = await (this.prisma as any).memberApplication.create({
      data: {
        userId,
        targetLevel: targetLevel,
        currentScore,
        reason: reason || null,
      },
    });

    this.logger.log(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      `Member application created: userId=${userId}, targetLevel=${targetLevel}, applicationId=${application.id}`,
    );

    // TODO: 任务14.1.5 - 通知管理员有新的会员申请

    return this.formatApplicationRecord(application);
  }

  /**
   * 获取用户的申请历史
   *
   * @param userId 用户ID
   * @param pagination 分页参数
   * @param status 状态筛选（可选）
   * @returns 申请历史列表
   */
  async getMyApplications(
    userId: string,
    pagination: { page: number; pageSize: number },
    status?: MemberApplicationStatusEnum,
  ): Promise<{
    applications: ApplicationRecordDto[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status;
    }

    // 获取总数
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const total = await (this.prisma as any).memberApplication.count({ where });

    // 获取记录
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const applications = await (this.prisma as any).memberApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    return {
      applications: (applications as Array<Record<string, unknown>>).map(
        (app) => this.formatApplicationRecord(app),
      ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取申请详情
   *
   * @param userId 用户ID
   * @param applicationId 申请ID
   * @returns 申请详情
   */
  async getApplicationStatus(
    userId: string,
    applicationId: string,
  ): Promise<ApplicationRecordDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const application = await (this.prisma as any).memberApplication.findFirst({
      where: {
        id: applicationId,
        userId,
      },
    });

    if (!application) {
      throw new NotFoundException('申请记录不存在');
    }

    return this.formatApplicationRecord(application);
  }

  /**
   * 格式化申请记录为 DTO
   */
  private formatApplicationRecord(
    application: Record<string, unknown>,
  ): ApplicationRecordDto {
    const targetLevel = this.toMemberLevelEnum(
      application.targetLevel as string,
    );
    const status = this.toApplicationStatusEnum(application.status as string);

    return {
      id: application.id as string,
      targetLevel,
      targetLevelName: LEVEL_NAMES[targetLevel],
      currentScore: application.currentScore as number,
      status,
      statusName: APPLICATION_STATUS_NAMES[status],
      reason: application.reason as string | null,
      rejectReason: application.rejectReason as string | null,
      reviewedAt: application.reviewedAt as Date | null,
      createdAt: application.createdAt as Date,
      updatedAt: application.updatedAt as Date,
    };
  }

  // ==================== 管理员审核 API ====================

  /**
   * 获取待审核申请列表（管理员）
   *
   * 需求14验收标准5: WHEN 管理员审核通过申请 THEN System SHALL 升级用户为 Official_Member 并发放欢迎奖励
   * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
   *
   * @param pagination 分页参数
   * @param status 状态筛选（可选，默认为 PENDING）
   * @param targetLevel 目标等级筛选（可选）
   * @returns 申请列表
   */
  async getPendingApplications(
    pagination: { page: number; pageSize: number },
    status?: MemberApplicationStatusEnum,
    targetLevel?: MemberLevelEnum,
  ): Promise<{
    applications: AdminApplicationRecordDto[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    } else {
      // 默认只查询待审核的申请
      where.status = 'PENDING';
    }
    if (targetLevel) {
      where.targetLevel = targetLevel;
    }

    // 获取总数
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const total: number = await (this.prisma as any).memberApplication.count({
      where,
    });

    // 获取记录（包含用户信息）
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const applications = await (this.prisma as any).memberApplication.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            memberLevel: true,
            contributionScore: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      applications: (applications as Array<Record<string, unknown>>).map(
        (app) => this.formatAdminApplicationRecord(app),
      ),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 审核通过申请
   *
   * 需求14验收标准5: WHEN 管理员审核通过申请 THEN System SHALL 升级用户为 Official_Member 并发放欢迎奖励
   *
   * @param applicationId 申请ID
   * @param reviewerId 审核人ID
   * @returns 更新后的申请记录
   */
  async approveApplication(
    applicationId: string,
    reviewerId: string,
  ): Promise<AdminApplicationRecordDto> {
    // 获取申请记录
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const application = await (this.prisma as any).memberApplication.findUnique(
      {
        where: { id: applicationId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true,
              avatar: true,
              memberLevel: true,
              contributionScore: true,
              createdAt: true,
            },
          },
        },
      },
    );

    if (!application) {
      throw new NotFoundException('申请记录不存在');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (application.status !== 'PENDING') {
      throw new BadRequestException('该申请已被处理，无法重复审核');
    }

    // 使用事务更新申请状态和用户等级
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const updatedApplication = await this.prisma.$transaction(async (tx) => {
      // 更新申请状态
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const updated = await (tx as any).memberApplication.update({
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
              nickname: true,
              avatar: true,
              memberLevel: true,
              contributionScore: true,
              createdAt: true,
            },
          },
        },
      });

      // 升级用户等级
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (tx as any).user.update({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        where: { id: application.userId },
        data: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          memberLevel: application.targetLevel,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return updated;
    });

    this.logger.log(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      `Application approved: applicationId=${applicationId}, userId=${application.userId}, targetLevel=${application.targetLevel}, reviewerId=${reviewerId}`,
    );

    // TODO: 发送通知给用户（欢迎成为正式会员）
    // TODO: 发放欢迎奖励（如零芥子）

    return this.formatAdminApplicationRecord(
      updatedApplication as Record<string, unknown>,
    );
  }

  /**
   * 拒绝申请
   *
   * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
   *
   * @param applicationId 申请ID
   * @param reviewerId 审核人ID
   * @param rejectReason 拒绝原因
   * @returns 更新后的申请记录
   */
  async rejectApplication(
    applicationId: string,
    reviewerId: string,
    rejectReason: string,
  ): Promise<AdminApplicationRecordDto> {
    // 获取申请记录
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const application = await (this.prisma as any).memberApplication.findUnique(
      {
        where: { id: applicationId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              nickname: true,
              avatar: true,
              memberLevel: true,
              contributionScore: true,
              createdAt: true,
            },
          },
        },
      },
    );

    if (!application) {
      throw new NotFoundException('申请记录不存在');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (application.status !== 'PENDING') {
      throw new BadRequestException('该申请已被处理，无法重复审核');
    }

    // 更新申请状态
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const updatedApplication = await (
      this.prisma as any
    ).memberApplication.update({
      where: { id: applicationId },
      data: {
        status: 'REJECTED',
        rejectReason,
        reviewerId,
        reviewedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            nickname: true,
            avatar: true,
            memberLevel: true,
            contributionScore: true,
            createdAt: true,
          },
        },
      },
    });

    this.logger.log(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      `Application rejected: applicationId=${applicationId}, userId=${application.userId}, reason=${rejectReason}, reviewerId=${reviewerId}`,
    );

    // TODO: 发送通知给用户（申请被拒绝，说明原因）

    return this.formatAdminApplicationRecord(
      updatedApplication as Record<string, unknown>,
    );
  }

  /**
   * 格式化管理员申请记录为 DTO（包含用户信息）
   */
  private formatAdminApplicationRecord(
    application: Record<string, unknown>,
  ): AdminApplicationRecordDto {
    const targetLevel = this.toMemberLevelEnum(
      application.targetLevel as string,
    );
    const status = this.toApplicationStatusEnum(application.status as string);
    const user = application.user as Record<string, unknown>;

    return {
      id: application.id as string,
      targetLevel,
      targetLevelName: LEVEL_NAMES[targetLevel],
      currentScore: application.currentScore as number,
      status,
      statusName: APPLICATION_STATUS_NAMES[status],
      reason: application.reason as string | null,
      rejectReason: application.rejectReason as string | null,
      reviewerId: application.reviewerId as string | null,
      reviewedAt: application.reviewedAt as Date | null,
      createdAt: application.createdAt as Date,
      updatedAt: application.updatedAt as Date,
      user: {
        id: user.id as string,
        username: user.username as string,
        nickname: user.nickname as string | null,
        avatar: user.avatar as string | null,
        memberLevel: this.toMemberLevelEnum(user.memberLevel as string),
        contributionScore: user.contributionScore as number,
        createdAt: user.createdAt as Date,
      },
    };
  }
}
