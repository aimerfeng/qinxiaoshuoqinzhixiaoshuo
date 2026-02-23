import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminService, AdminLoginResponse, AdminUser } from './admin.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { Admin } from '../../common/decorators/admin.decorator.js';
import { UserManagementService } from './user-management.service.js';
import {
  UserListQueryDto,
  UserUpdateDto,
  UserListResponseDto,
  UserDetailDto,
  UserOperationResultDto,
} from './dto/user-management.dto.js';
import { ContentModerationService } from './content-moderation.service.js';
import {
  CreateReportDto,
  ReportListQueryDto,
  ProcessReportDto,
  ReportListResponseDto,
  ReportDetailDto,
  ReportOperationResultDto,
} from './dto/content-moderation.dto.js';
import { MembershipReviewService } from './membership-review.service.js';
import {
  ApplicationListQueryDto,
  ApproveApplicationDto,
  RejectApplicationDto as MembershipRejectDto,
  ApplicationListResponseDto,
  ApplicationDetailDto,
  ApplicationOperationResultDto,
} from './dto/membership-review.dto.js';
import { ActivityReviewService } from './activity-review.service.js';
import {
  ActivityListQueryDto,
  ApproveActivityDto,
  RejectActivityDto,
  ActivityListResponseDto,
  ActivityReviewDetailDto,
  ActivityOperationResultDto,
} from './dto/activity-review.dto.js';
import {
  StatisticsService,
  StatisticsOverview,
  UserStatistics,
  ContentStatistics,
  TransactionStatistics,
} from './statistics.service.js';

/**
 * 扩展 Request 类型以包含用户信息
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    userId: string;
    email: string;
    sessionId: string;
    isAdmin?: boolean;
  };
}

/**
 * 管理后台控制器
 * 提供管理员认证和管理功能的 API 端点
 * 
 * 需求18: 管理后台
 */
@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userManagementService: UserManagementService,
    private readonly contentModerationService: ContentModerationService,
    private readonly membershipReviewService: MembershipReviewService,
    private readonly activityReviewService: ActivityReviewService,
    private readonly statisticsService: StatisticsService,
  ) {}

  /**
   * 管理员登录
   * 
   * POST /api/v1/admin/login
   * 
   * 需求18验收标准1: WHEN 运营人员登录后台 THEN System SHALL 验证权限并显示对应功能模块
   * 
   * @param loginDto 登录信息
   * @param req 请求对象
   * @returns 登录结果
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: AdminLoginDto,
    @Req() req: Request,
  ): Promise<AdminLoginResponse> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.adminService.login(loginDto, ipAddress, userAgent);
  }

  /**
   * 获取当前管理员信息
   * 
   * GET /api/v1/admin/profile
   * 
   * @param req 请求对象
   * @returns 管理员信息
   */
  @Get('profile')
  @UseGuards(AdminGuard)
  @Admin()
  async getProfile(@Req() req: AuthenticatedRequest): Promise<AdminUser | null> {
    return this.adminService.getAdminProfile(req.user.id);
  }

  /**
   * 验证管理员身份
   * 
   * GET /api/v1/admin/verify
   * 
   * 用于前端检查当前用户是否为管理员
   * 
   * @param req 请求对象
   * @returns 验证结果
   */
  @Get('verify')
  @UseGuards(AdminGuard)
  @Admin()
  async verifyAdmin(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ isAdmin: boolean; userId: string }> {
    const isAdmin = await this.adminService.verifyAdmin(req.user.id);
    return {
      isAdmin,
      userId: req.user.id,
    };
  }

  /**
   * 获取客户端 IP 地址
   */
  private getClientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress;
  }

  // ==================== 用户管理 API ====================

  /**
   * 获取用户列表
   *
   * GET /api/v1/admin/users
   *
   * 需求18验收标准3: WHEN 运营人员搜索用户 THEN System SHALL 支持按ID、昵称、邮箱等条件查询
   */
  @Get('users')
  @UseGuards(AdminGuard)
  @Admin()
  async getUserList(
    @Query() query: UserListQueryDto,
  ): Promise<UserListResponseDto> {
    return this.userManagementService.getUserList(query);
  }

  /**
   * 获取用户详情
   *
   * GET /api/v1/admin/users/:userId
   *
   * 需求18验收标准4: WHEN 运营人员查看用户详情 THEN System SHALL 显示资料、行为记录、处罚历史
   */
  @Get('users/:userId')
  @UseGuards(AdminGuard)
  @Admin()
  async getUserDetail(@Param('userId') userId: string): Promise<UserDetailDto> {
    return this.userManagementService.getUserDetail(userId);
  }

  /**
   * 更新用户信息
   *
   * PUT /api/v1/admin/users/:userId
   *
   * 需求18验收标准5: WHEN 运营人员封禁用户 THEN System SHALL 记录原因、生效时间并通知用户
   */
  @Put('users/:userId')
  @UseGuards(AdminGuard)
  @Admin()
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateDto: UserUpdateDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserOperationResultDto> {
    return this.userManagementService.updateUser(userId, updateDto, req.user.id);
  }

  /**
   * 封禁用户
   *
   * POST /api/v1/admin/users/:userId/ban
   */
  @Post('users/:userId/ban')
  @UseGuards(AdminGuard)
  @Admin()
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserOperationResultDto> {
    return this.userManagementService.banUser(userId, reason, req.user.id);
  }

  /**
   * 解封用户
   *
   * POST /api/v1/admin/users/:userId/unban
   */
  @Post('users/:userId/unban')
  @UseGuards(AdminGuard)
  @Admin()
  @HttpCode(HttpStatus.OK)
  async unbanUser(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserOperationResultDto> {
    return this.userManagementService.unbanUser(userId, reason, req.user.id);
  }

  // ==================== 内容审核 API ====================

  /**
   * 创建内容举报（用户提交）
   *
   * POST /api/v1/admin/reports
   *
   * 需求18验收标准7: 审核员审核内容举报
   */
  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  async createReport(
    @Body() dto: CreateReportDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ReportOperationResultDto> {
    // Use user ID from JWT if authenticated, otherwise require auth
    const reporterId = req.user?.id || req.user?.userId;
    if (!reporterId) {
      throw new Error('用户未认证');
    }
    return this.contentModerationService.createReport(reporterId, dto);
  }

  /**
   * 获取举报列表（管理员查看）
   *
   * GET /api/v1/admin/reports
   *
   * 需求18审核工作流: 进入待审核队列
   */
  @Get('reports')
  @UseGuards(AdminGuard)
  @Admin()
  async getReportList(
    @Query() query: ReportListQueryDto,
  ): Promise<ReportListResponseDto> {
    return this.contentModerationService.getReportList(query);
  }

  /**
   * 获取举报详情（管理员查看）
   *
   * GET /api/v1/admin/reports/:id
   *
   * 需求18验收标准7: WHEN 审核员审核内容举报 THEN System SHALL 显示举报内容、举报原因、证据
   */
  @Get('reports/:id')
  @UseGuards(AdminGuard)
  @Admin()
  async getReportDetail(@Param('id') id: string): Promise<ReportDetailDto> {
    return this.contentModerationService.getReportDetail(id);
  }

  /**
   * 处理举报（管理员审核）
   *
   * PATCH /api/v1/admin/reports/:id/process
   *
   * 需求18验收标准8: WHEN 审核员处理违规内容 THEN System SHALL 支持删除、警告、封禁等操作
   * 审核工作流: 审核员领取 → 审核处理（通过/拒绝/需补充） → 结果通知 → 归档
   */
  @Patch('reports/:id/process')
  @UseGuards(AdminGuard)
  @Admin()
  async processReport(
    @Param('id') id: string,
    @Body() dto: ProcessReportDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ReportOperationResultDto> {
    return this.contentModerationService.processReport(id, req.user.id, dto);
  }

  // ==================== 会员审核 API ====================

  /**
   * 获取会员申请列表（管理员查看）
   *
   * GET /api/v1/admin/membership/applications
   *
   * 需求18验收标准6: WHEN 审核员处理会员申请 THEN System SHALL 显示申请信息、贡献度、历史行为
   * 审核工作流: 进入待审核队列
   */
  @Get('membership/applications')
  @UseGuards(AdminGuard)
  @Admin()
  async getMembershipApplicationList(
    @Query() query: ApplicationListQueryDto,
  ): Promise<ApplicationListResponseDto> {
    return this.membershipReviewService.getApplicationList(query);
  }

  /**
   * 获取会员申请详情（管理员查看）
   *
   * GET /api/v1/admin/membership/applications/:id
   *
   * 需求18验收标准6: 显示申请信息、贡献度、历史行为
   */
  @Get('membership/applications/:id')
  @UseGuards(AdminGuard)
  @Admin()
  async getMembershipApplicationDetail(
    @Param('id') id: string,
  ): Promise<ApplicationDetailDto> {
    return this.membershipReviewService.getApplicationDetail(id);
  }

  /**
   * 审核通过会员申请
   *
   * PATCH /api/v1/admin/membership/applications/:id/approve
   *
   * 需求14验收标准5: WHEN 管理员审核通过申请 THEN System SHALL 升级用户为 Official_Member 并发放欢迎奖励
   */
  @Patch('membership/applications/:id/approve')
  @UseGuards(AdminGuard)
  @Admin()
  async approveMembershipApplication(
    @Param('id') id: string,
    @Body() dto: ApproveApplicationDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApplicationOperationResultDto> {
    return this.membershipReviewService.approveApplication(id, req.user.id, dto);
  }

  /**
   * 审核拒绝会员申请
   *
   * PATCH /api/v1/admin/membership/applications/:id/reject
   *
   * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
   */
  @Patch('membership/applications/:id/reject')
  @UseGuards(AdminGuard)
  @Admin()
  async rejectMembershipApplication(
    @Param('id') id: string,
    @Body() dto: MembershipRejectDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ApplicationOperationResultDto> {
    return this.membershipReviewService.rejectApplication(id, req.user.id, dto);
  }

  // ==================== 活动审核 API ====================

  /**
   * 获取活动列表（管理员查看）
   *
   * GET /api/v1/admin/activities
   *
   * 需求18验收标准9: WHEN 运营人员审核用户活动 THEN System SHALL 显示活动详情和合规性检查结果
   */
  @Get('activities')
  @UseGuards(AdminGuard)
  @Admin()
  async getActivityList(
    @Query() query: ActivityListQueryDto,
  ): Promise<ActivityListResponseDto> {
    return this.activityReviewService.getActivityList(query);
  }

  /**
   * 获取活动审核详情（管理员查看）
   *
   * GET /api/v1/admin/activities/:id
   *
   * 需求18验收标准9: 显示活动详情和合规性检查结果
   */
  @Get('activities/:id')
  @UseGuards(AdminGuard)
  @Admin()
  async getActivityDetail(
    @Param('id') id: string,
  ): Promise<ActivityReviewDetailDto> {
    return this.activityReviewService.getActivityDetail(id);
  }

  /**
   * 审核通过活动
   *
   * PATCH /api/v1/admin/activities/:id/approve
   *
   * 需求16验收标准5: WHEN 管理员审核通过 THEN System SHALL 发布活动并在广场/作品页展示
   */
  @Patch('activities/:id/approve')
  @UseGuards(AdminGuard)
  @Admin()
  async approveActivity(
    @Param('id') id: string,
    @Body() dto: ApproveActivityDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ActivityOperationResultDto> {
    return this.activityReviewService.approveActivity(id, req.user.id, dto);
  }

  /**
   * 拒绝活动
   *
   * PATCH /api/v1/admin/activities/:id/reject
   *
   * 需求16验收标准6: WHEN 管理员拒绝活动 THEN System SHALL 解锁奖池并通知发起者修改建议
   */
  @Patch('activities/:id/reject')
  @UseGuards(AdminGuard)
  @Admin()
  async rejectActivity(
    @Param('id') id: string,
    @Body() dto: RejectActivityDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ActivityOperationResultDto> {
    return this.activityReviewService.rejectActivity(id, req.user.id, dto);
  }

  // ==================== 数据统计 API ====================

  /**
   * 获取统计概览数据
   *
   * GET /api/v1/admin/statistics/overview
   *
   * 需求18验收标准2: WHEN 运营人员查看数据看板 THEN System SHALL 显示实时和历史数据图表
   */
  @Get('statistics/overview')
  @UseGuards(AdminGuard)
  @Admin()
  async getStatisticsOverview(): Promise<StatisticsOverview> {
    return this.statisticsService.getOverview();
  }

  /**
   * 获取用户统计数据
   *
   * GET /api/v1/admin/statistics/users
   *
   * 需求18验收标准2: 显示用户增长趋势、DAU/MAU、会员等级分布
   */
  @Get('statistics/users')
  @UseGuards(AdminGuard)
  @Admin()
  async getUserStatistics(): Promise<UserStatistics> {
    return this.statisticsService.getUserStatistics();
  }

  /**
   * 获取内容统计数据
   *
   * GET /api/v1/admin/statistics/content
   *
   * 需求18验收标准2: 显示内容发布趋势、类型分布、热门标签
   */
  @Get('statistics/content')
  @UseGuards(AdminGuard)
  @Admin()
  async getContentStatistics(): Promise<ContentStatistics> {
    return this.statisticsService.getContentStatistics();
  }

  /**
   * 获取交易统计数据
   *
   * GET /api/v1/admin/statistics/transactions
   *
   * 需求18验收标准2: 显示交易趋势、类型分布、代币流通量
   */
  @Get('statistics/transactions')
  @UseGuards(AdminGuard)
  @Admin()
  async getTransactionStatistics(): Promise<TransactionStatistics> {
    return this.statisticsService.getTransactionStatistics();
  }
}
