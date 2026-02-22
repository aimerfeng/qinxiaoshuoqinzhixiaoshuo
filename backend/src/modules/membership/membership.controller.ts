import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ContributionService } from './contribution.service.js';
import { MembershipApplicationService } from './application.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  GetTotalContributionResponseDto,
  GetDailyContributionResponseDto,
  GetContributionHistoryResponseDto,
  GetContributionConfigResponseDto,
  ContributionConfigItemDto,
  DailyContributionItemDto,
  CheckEligibilityResponseDto,
  CreateApplicationResponseDto,
  GetApplicationsResponseDto,
  GetApplicationDetailResponseDto,
  GetPendingApplicationsResponseDto,
  ReviewApplicationResponseDto,
} from './dto/index.js';
import {
  ContributionHistoryQueryDto,
  CreateApplicationDto,
  ApplicationQueryDto,
  AdminApplicationQueryDto,
  RejectApplicationDto,
} from './dto/index.js';

/**
 * 会员等级名称映射
 */
const LEVEL_NAMES: Record<number, string> = {
  0: '普通会员',
  1: '正式会员',
  2: '资深会员',
  3: '荣誉会员',
};

/**
 * 等级升级所需贡献度
 */
const LEVEL_THRESHOLDS: Record<number, number> = {
  0: 0,
  1: 500,
  2: 2000,
  3: 10000,
};

/**
 * 贡献类型中文名称映射
 */
const CONTRIBUTION_TYPE_NAMES: Record<string, string> = {
  READ_CHAPTER: '阅读章节',
  READ_DURATION: '阅读时长',
  COMMENT_VALID: '有效评论',
  COMMENT_LIKED: '评论被赞',
  QUOTE_INTERACTED: '引用互动',
  PUBLISH_CHAPTER: '发布章节',
  WORK_FAVORITED: '作品被藏',
  PARAGRAPH_QUOTED: '段落被引',
  REPORT_VALID: '有效举报',
  ACTIVITY_PARTICIPATE: '参与活动',
};

/**
 * 贡献类型分类映射
 */
const CONTRIBUTION_CATEGORIES: Record<
  string,
  'reading' | 'interaction' | 'creation' | 'community'
> = {
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

/**
 * 计算用户等级
 */
function calculateLevel(totalScore: number): {
  current: number;
  name: string;
  nextLevelScore: number | null;
  progress: number;
} {
  let currentLevel = 0;
  for (let level = 3; level >= 0; level--) {
    if (totalScore >= LEVEL_THRESHOLDS[level]) {
      currentLevel = level;
      break;
    }
  }

  const nextLevel = currentLevel + 1;
  const nextLevelScore = nextLevel <= 3 ? LEVEL_THRESHOLDS[nextLevel] : null;

  let progress = 100;
  if (nextLevelScore !== null) {
    const currentThreshold = LEVEL_THRESHOLDS[currentLevel];
    const range = nextLevelScore - currentThreshold;
    const earned = totalScore - currentThreshold;
    progress = Math.min(100, Math.floor((earned / range) * 100));
  }

  return {
    current: currentLevel,
    name: LEVEL_NAMES[currentLevel],
    nextLevelScore,
    progress,
  };
}

/**
 * 会员系统控制器
 * 处理会员等级和贡献度相关的 HTTP 请求
 *
 * 需求14: 会员等级体系
 * 任务14.1.3: 贡献度记录 API
 * 任务14.1.4: 会员申请 API
 */
@Controller('membership')
export class MembershipController {
  constructor(
    private readonly contributionService: ContributionService,
    private readonly applicationService: MembershipApplicationService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 获取用户总贡献度
   * GET /api/v1/membership/contribution
   *
   * 需求14验收标准7: WHEN 用户查看个人等级 THEN System SHALL 显示当前等级、贡献度、升级进度
   *
   * 功能：
   * - 获取用户总贡献度
   * - 获取各维度贡献度分解（阅读/互动/创作/社区）
   * - 计算当前等级和升级进度
   */
  @Get('contribution')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getTotalContribution(
    @Request() req: any,
  ): Promise<GetTotalContributionResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    const result = await this.contributionService.getTotalContribution(userId);

    const level = calculateLevel(result.totalScore);

    return {
      message: '获取贡献度成功',
      data: {
        totalScore: result.totalScore,
        breakdown: result.breakdown,
        level,
      },
    };
  }

  /**
   * 获取今日贡献度统计
   * GET /api/v1/membership/contribution/daily
   *
   * 需求14验收标准2: WHEN 用户完成贡献行为 THEN System SHALL 实时计算并更新 Contribution_Score
   *
   * 功能：
   * - 获取今日所有类型的贡献度统计
   * - 显示每种类型的当前积分、每日上限、剩余可获得积分
   */
  @Get('contribution/daily')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getDailyContribution(
    @Request() req: any,
  ): Promise<GetDailyContributionResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    const dailyContributions =
      await this.contributionService.getAllDailyContributions(userId);

    const contributions: DailyContributionItemDto[] = dailyContributions.map(
      (item) => ({
        type: String(item.type),
        typeName:
          CONTRIBUTION_TYPE_NAMES[String(item.type)] || String(item.type),
        currentPoints: item.currentPoints,
        dailyLimit: item.dailyLimit,
        remaining: item.remaining,
        isLimitReached: item.isLimitReached,
      }),
    );

    const totalEarnedToday = contributions.reduce(
      (sum, item) => sum + item.currentPoints,
      0,
    );

    const today = new Date().toISOString().split('T')[0];

    return {
      message: '获取今日贡献度统计成功',
      data: {
        date: today,
        contributions,
        totalEarnedToday,
      },
    };
  }

  /**
   * 获取贡献度历史记录
   * GET /api/v1/membership/contribution/history
   *
   * 需求14验收标准8: WHEN 用户查看贡献明细 THEN System SHALL 显示各维度贡献记录和积分变化
   *
   * 功能：
   * - 分页获取贡献度历史记录
   * - 支持按类型筛选
   */
  @Get('contribution/history')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getContributionHistory(
    @Request() req: any,
    @Query() query: ContributionHistoryQueryDto,
  ): Promise<GetContributionHistoryResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    const { page = 1, pageSize = 20 } = query;

    const result = await this.contributionService.getContributionHistory(
      userId,
      {
        page,
        pageSize,
      },
    );

    return {
      message: '获取贡献度历史成功',
      data: {
        records: result.records,
        pagination: result.pagination,
      },
    };
  }

  /**
   * 获取贡献度配置
   * GET /api/v1/membership/contribution/config
   *
   * 功能：
   * - 获取所有贡献类型的配置信息
   * - 包括积分值、每日上限、描述等
   */
  @Get('contribution/config')
  @HttpCode(HttpStatus.OK)
  getContributionConfig(): GetContributionConfigResponseDto {
    const config = this.contributionService.getContributionConfig();

    const configs: ContributionConfigItemDto[] = Object.entries(config).map(
      ([type, cfg]) => ({
        type,
        typeName: CONTRIBUTION_TYPE_NAMES[type] || type,
        points: cfg.points,
        dailyLimit: cfg.dailyLimit,
        description: cfg.description,
        category: CONTRIBUTION_CATEGORIES[type] || 'community',
      }),
    );

    return {
      message: '获取贡献度配置成功',
      data: {
        configs,
      },
    };
  }

  // ==================== 会员申请 API ====================

  /**
   * 检查用户升级资格
   * GET /api/v1/membership/eligibility
   *
   * 需求14验收标准3: WHEN 用户贡献度达到500分 THEN System SHALL 解锁"申请正式会员"入口
   *
   * 功能：
   * - 获取用户当前等级和贡献度
   * - 检查可申请的等级列表
   * - 显示每个等级的申请条件和状态
   */
  @Get('eligibility')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async checkEligibility(
    @Request() req: any,
  ): Promise<CheckEligibilityResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    const result = await this.applicationService.checkEligibility(userId);

    return {
      message: '获取升级资格成功',
      data: result,
    };
  }

  /**
   * 提交会员申请
   * POST /api/v1/membership/apply
   *
   * 需求14验收标准4: WHEN 用户提交正式会员申请 THEN System SHALL 创建审核工单并通知管理员
   *
   * 功能：
   * - 验证用户资格
   * - 创建会员申请记录
   * - 通知管理员审核（后续任务实现）
   */
  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createApplication(
    @Request() req: any,
    @Body() dto: CreateApplicationDto,
  ): Promise<CreateApplicationResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    const application = await this.applicationService.createApplication(
      userId,
      dto.targetLevel,
      dto.reason,
    );

    return {
      message: '会员申请提交成功，请等待审核',
      data: {
        application,
      },
    };
  }

  /**
   * 获取用户的申请历史
   * GET /api/v1/membership/applications
   *
   * 功能：
   * - 分页获取用户的会员申请历史
   * - 支持按状态筛选
   */
  @Get('applications')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getMyApplications(
    @Request() req: any,
    @Query() query: ApplicationQueryDto,
  ): Promise<GetApplicationsResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    const { page = 1, pageSize = 10, status } = query;

    const result = await this.applicationService.getMyApplications(
      userId,
      { page, pageSize },
      status,
    );

    return {
      message: '获取申请历史成功',
      data: result,
    };
  }

  /**
   * 获取申请详情
   * GET /api/v1/membership/applications/:id
   *
   * 功能：
   * - 获取指定申请的详细信息
   * - 只能查看自己的申请
   */
  @Get('applications/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getApplicationDetail(
    @Request() req: any,
    @Param('id') applicationId: string,
  ): Promise<GetApplicationDetailResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.userId as string;
    const application = await this.applicationService.getApplicationStatus(
      userId,
      applicationId,
    );

    return {
      message: '获取申请详情成功',
      data: {
        application,
      },
    };
  }

  // ==================== 管理员审核 API ====================

  /**
   * 获取待审核申请列表（管理员）
   * GET /api/v1/membership/admin/applications
   *
   * 需求14验收标准5: WHEN 管理员审核通过申请 THEN System SHALL 升级用户为 Official_Member 并发放欢迎奖励
   * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
   *
   * 功能：
   * - 分页获取待审核的会员申请
   * - 支持按状态和目标等级筛选
   * - 包含申请用户的详细信息
   *
   * 注意：当前使用简单的管理员检查（检查用户是否有 admin 角色）
   * TODO: 后续可以集成更完善的权限系统
   */
  @Get('admin/applications')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getPendingApplications(
    @Request() req: any,
    @Query() query: AdminApplicationQueryDto,
  ): Promise<GetPendingApplicationsResponseDto> {
    // 简单的管理员检查
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    await this.checkAdminPermission(req.user.userId as string);

    const { page = 1, pageSize = 10, status, targetLevel } = query;

    const result = await this.applicationService.getPendingApplications(
      { page, pageSize },
      status,
      targetLevel,
    );

    return {
      message: '获取待审核申请列表成功',
      data: result,
    };
  }

  /**
   * 审核通过申请（管理员）
   * POST /api/v1/membership/admin/applications/:id/approve
   *
   * 需求14验收标准5: WHEN 管理员审核通过申请 THEN System SHALL 升级用户为 Official_Member 并发放欢迎奖励
   *
   * 功能：
   * - 将申请状态更新为 APPROVED
   * - 升级用户的会员等级
   * - 记录审核人和审核时间
   * - TODO: 发送通知给用户
   * - TODO: 发放欢迎奖励
   */
  @Post('admin/applications/:id/approve')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async approveApplication(
    @Request() req: any,
    @Param('id') applicationId: string,
  ): Promise<ReviewApplicationResponseDto> {
    // 简单的管理员检查
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const reviewerId = req.user.userId as string;
    await this.checkAdminPermission(reviewerId);

    const application = await this.applicationService.approveApplication(
      applicationId,
      reviewerId,
    );

    return {
      message: '申请已通过，用户等级已升级',
      data: {
        application,
      },
    };
  }

  /**
   * 拒绝申请（管理员）
   * POST /api/v1/membership/admin/applications/:id/reject
   *
   * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
   *
   * 功能：
   * - 将申请状态更新为 REJECTED
   * - 记录拒绝原因、审核人和审核时间
   * - TODO: 发送通知给用户，说明拒绝原因
   */
  @Post('admin/applications/:id/reject')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async rejectApplication(
    @Request() req: any,
    @Param('id') applicationId: string,
    @Body() dto: RejectApplicationDto,
  ): Promise<ReviewApplicationResponseDto> {
    // 简单的管理员检查
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const reviewerId = req.user.userId as string;
    await this.checkAdminPermission(reviewerId);

    const application = await this.applicationService.rejectApplication(
      applicationId,
      reviewerId,
      dto.rejectReason,
    );

    return {
      message: '申请已拒绝',
      data: {
        application,
      },
    };
  }

  /**
   * 简单的管理员权限检查
   *
   * 当前实现：检查用户是否有 isAdmin 标记或特定的管理员用户ID
   * TODO: 后续可以集成更完善的 RBAC 权限系统
   *
   * @param userId 用户ID
   * @throws ForbiddenException 如果用户不是管理员
   */
  private async checkAdminPermission(userId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isAdmin: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!user.isAdmin) {
      throw new ForbiddenException('需要管理员权限');
    }
  }
}
