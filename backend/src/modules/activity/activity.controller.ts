import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  CreateActivityDto,
  ActivityQueryDto,
  MyParticipationsQueryDto,
  UpdateProgressDto,
  ApproveActivityDto,
  RejectActivityDto,
  PendingActivitiesQueryDto,
  type CreateActivityResponseDto,
  type GetActivityListResponseDto,
  type GetActivityDetailResponseDto,
  type JoinActivityResponseDto,
  type LeaveActivityResponseDto,
  type GetMyParticipationsResponseDto,
  type UpdateProgressResponseDto,
  type GetProgressResponseDto,
  type ClaimRewardResponseDto,
  type DistributeRewardsResponseDto,
  type EndActivityResponseDto,
  type SubmitForReviewResponseDto,
  type ApproveActivityResponseDto,
  type RejectActivityResponseDto,
  type GetPendingActivitiesResponseDto,
} from './dto/activity.dto.js';

/**
 * 认证请求类型
 */
interface AuthenticatedRequest {
  user: {
    userId: string;
  };
}

/**
 * 可选认证请求类型
 */
interface OptionalAuthRequest {
  user?: {
    userId: string;
  };
}

/**
 * 活动控制器
 *
 * 需求16: 社区活动系统
 * 任务16.1.2: 创建活动 API
 * 任务16.1.3: 参与活动 API
 *
 * API 端点：
 * - POST /api/v1/activities - 创建活动
 * - GET /api/v1/activities - 获取活动列表
 * - GET /api/v1/activities/my-participations - 获取我的参与记录
 * - GET /api/v1/activities/:id - 获取活动详情
 * - POST /api/v1/activities/:id/join - 参与活动
 * - POST /api/v1/activities/:id/leave - 退出活动
 */
@Controller('activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  /**
   * 创建活动
   * POST /api/v1/activities
   *
   * 需求16验收标准2: WHEN 正式会员创建活动 THEN System SHALL 提供活动模板和条件配置界面
   * 需求16验收标准3: WHEN 用户设置活动奖池 THEN System SHALL 从用户零芥子余额中锁定对应数量
   * 需求16验收标准4: WHEN 活动创建完成 THEN System SHALL 提交审核并通知管理员
   *
   * 创建规则：
   * - 只有正式会员及以上才能创建活动
   * - 活动名称: 4-30字符
   * - 活动描述: 10-500字符
   * - 活动时长: 1-30天
   * - 参与人数上限: 10-1000人
   * - 单人奖励: 1-100零芥子
   * - 总奖池会从用户余额中锁定
   * - 活动初始状态为 DRAFT（草稿）
   *
   * 请求体：
   * - title: 活动名称（必填）
   * - description: 活动描述（必填）
   * - type: 活动类型（必填）
   * - startTime: 开始时间（必填）
   * - endTime: 结束时间（必填）
   * - rewardPerPerson: 单人奖励金额（必填）
   * - rules: 活动规则（可选）
   * - rewards: 奖励配置（可选）
   * - coverImage: 封面图片URL（可选）
   * - maxParticipants: 最大参与人数（可选）
   *
   * @param req 认证请求
   * @param dto 创建活动请求
   * @returns 创建结果
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createActivity(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateActivityDto,
  ): Promise<CreateActivityResponseDto> {
    const userId = req.user.userId;
    const result = await this.activityService.createActivity(userId, dto);

    return {
      message: result.message,
      data: result,
    };
  }

  /**
   * 获取活动列表
   * GET /api/v1/activities
   *
   * 需求16验收标准1: WHEN 正式会员进入活动中心 THEN System SHALL 显示可参与活动列表和已发起活动
   *
   * 查询参数：
   * - page: 页码（默认: 1）
   * - pageSize: 每页数量（默认: 20，最大: 50）
   * - status: 活动状态过滤（可选，DRAFT/PENDING/ACTIVE/ENDED/CANCELLED）
   * - type: 活动类型过滤（可选，READING_CHALLENGE/WRITING_CONTEST/COMMUNITY_EVENT/SPECIAL_EVENT）
   * - sortBy: 排序字段（可选，startTime/createdAt/participantCount，默认: createdAt）
   * - sortOrder: 排序方向（可选，asc/desc，默认: desc）
   * - creatorId: 创建者ID过滤（可选）
   *
   * @param query 查询参数
   * @returns 活动列表
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getActivityList(
    @Query() query: ActivityQueryDto,
  ): Promise<GetActivityListResponseDto> {
    const result = await this.activityService.getActivityList(query);

    return {
      message: '获取活动列表成功',
      data: result,
    };
  }

  /**
   * 获取我的参与记录
   * GET /api/v1/activities/my-participations
   *
   * 需求16验收标准1: WHEN 正式会员进入活动中心 THEN System SHALL 显示可参与活动列表和已发起活动
   *
   * 查询参数：
   * - page: 页码（默认: 1）
   * - pageSize: 每页数量（默认: 20，最大: 50）
   * - status: 参与状态过滤（可选，JOINED/COMPLETED/FAILED/WITHDRAWN）
   *
   * 返回信息：
   * - 参与记录列表（包含活动详情）
   * - 分页信息
   *
   * @param query 查询参数
   * @param req 认证请求
   * @returns 参与记录列表
   */
  @Get('my-participations')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getMyParticipations(
    @Query() query: MyParticipationsQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<GetMyParticipationsResponseDto> {
    const userId = req.user.userId;
    const result = await this.activityService.getMyParticipations(
      userId,
      query,
    );

    return {
      message: '获取参与记录成功',
      data: result,
    };
  }

  /**
   * 获取活动详情
   * GET /api/v1/activities/:id
   *
   * 需求16验收标准10: WHEN 用户查看活动详情 THEN System SHALL 显示规则、进度、参与者、奖励记录
   *
   * 返回信息：
   * - 活动基本信息（标题、描述、类型、状态等）
   * - 活动规则和奖励配置
   * - 参与人数和奖池信息
   * - 创建者信息
   * - 当前用户的参与状态（如果已登录）
   *
   * @param id 活动ID
   * @param req 可选认证请求
   * @returns 活动详情
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getActivityDetail(
    @Param('id') id: string,
    @Request() req: OptionalAuthRequest,
  ): Promise<GetActivityDetailResponseDto> {
    const userId = req.user?.userId;
    const result = await this.activityService.getActivityDetail(id, userId);

    return {
      message: '获取活动详情成功',
      data: result,
    };
  }

  /**
   * 参与活动
   * POST /api/v1/activities/:id/join
   *
   * 需求16验收标准7: WHEN 用户参与活动 THEN System SHALL 记录参与进度并实时显示
   * 需求16验收标准11: IF 活动参与人数达到上限 THEN System SHALL 关闭报名入口并显示已满提示
   *
   * 参与规则：
   * - 只有已登录用户才能参与
   * - 活动必须处于 ACTIVE 状态
   * - 活动参与人数未达到上限
   * - 用户未参与过该活动（或之前已退出）
   *
   * @param id 活动ID
   * @param req 认证请求
   * @returns 参与结果
   */
  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async joinActivity(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<JoinActivityResponseDto> {
    const userId = req.user.userId;
    const result = await this.activityService.joinActivity(id, userId);

    return {
      message: result.message,
      data: result,
    };
  }

  /**
   * 退出活动
   * POST /api/v1/activities/:id/leave
   *
   * 退出规则：
   * - 只有已登录用户才能退出
   * - 用户必须已参与该活动
   * - 活动必须处于 ACTIVE 状态（不能退出已结束的活动）
   * - 参与状态必须为 JOINED（已完成或已失败的不能退出）
   *
   * @param id 活动ID
   * @param req 认证请求
   * @returns 退出结果
   */
  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async leaveActivity(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<LeaveActivityResponseDto> {
    const userId = req.user.userId;
    const result = await this.activityService.leaveActivity(id, userId);

    return {
      message: result.message,
      data: result,
    };
  }

  /**
   * 更新活动进度
   * POST /api/v1/activities/:id/progress
   *
   * 任务16.1.4: 活动进度追踪
   * 需求16验收标准7: WHEN 用户参与活动 THEN System SHALL 记录参与进度并实时显示
   * 需求16验收标准8: WHEN 用户完成活动条件 THEN System SHALL 根据验证方式处理奖励发放
   *
   * 更新规则：
   * - 只有已登录用户才能更新进度
   * - 活动必须处于 ACTIVE 状态
   * - 用户必须已参与该活动且状态为 JOINED
   * - 自动检测是否完成活动条件
   *
   * 请求体：
   * - progressData: 进度数据（JSON格式）
   *   - 阅读打卡: { readChapters: number }
   *   - 评论征集: { commentCount: number, totalCommentLength: number }
   *   - 引用挑战: { quotedParagraphs: string[] }
   *
   * @param id 活动ID
   * @param req 认证请求
   * @param dto 更新进度请求
   * @returns 更新结果
   */
  @Post(':id/progress')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProgress(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateProgressDto,
  ): Promise<UpdateProgressResponseDto> {
    const userId = req.user.userId;
    const result = await this.activityService.updateProgress(
      id,
      userId,
      dto.progressData,
    );

    return {
      message: result.message,
      data: result,
    };
  }

  /**
   * 获取活动进度
   * GET /api/v1/activities/:id/progress
   *
   * 任务16.1.4: 活动进度追踪
   * 需求16验收标准7: WHEN 用户参与活动 THEN System SHALL 记录参与进度并实时显示
   *
   * 返回信息：
   * - 参与记录ID
   * - 参与状态
   * - 进度数据
   * - 是否已领取奖励
   * - 完成时间
   * - 活动规则（用于前端展示进度）
   *
   * @param id 活动ID
   * @param req 认证请求
   * @returns 进度信息
   */
  @Get(':id/progress')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getProgress(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<GetProgressResponseDto> {
    const userId = req.user.userId;
    const result = await this.activityService.getProgress(id, userId);

    if (!result) {
      return {
        message: '您尚未参与该活动',
        data: null,
      };
    }

    return {
      message: '获取进度成功',
      data: result,
    };
  }

  // ==================== 奖励发放 API (任务16.1.5) ====================

  /**
   * 领取活动奖励
   * POST /api/v1/activities/:id/claim-reward
   *
   * 任务16.1.5: 奖励发放服务
   * 需求16验收标准8: WHEN 用户完成活动条件 THEN System SHALL 根据验证方式处理奖励发放
   *
   * 领取规则：
   * - 需要登录认证
   * - 参与状态必须为 COMPLETED
   * - 奖励尚未领取
   * - 从活动奖池转移代币到用户钱包
   * - 创建 ActivityReward 记录
   *
   * @param id 活动ID
   * @param req 认证请求
   * @returns 领取结果
   */
  @Post(':id/claim-reward')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async claimReward(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<ClaimRewardResponseDto> {
    const userId = req.user.userId;
    const result = await this.activityService.claimReward(id, userId);

    return {
      message: result.message,
      data: result,
    };
  }

  /**
   * 批量发放活动奖励（管理员/活动创建者）
   * POST /api/v1/activities/:id/distribute-rewards
   *
   * 任务16.1.5: 奖励发放服务 - 批量发放
   *
   * 批量发放规则：
   * - 需要登录认证
   * - 只有活动创建者或管理员可以操作
   * - 只对状态为 COMPLETED 且未领取奖励的参与者发放
   *
   * @param id 活动ID
   * @param req 认证请求（用于权限验证）
   * @returns 发放结果
   */
  @Post(':id/distribute-rewards')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async distributeRewards(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<DistributeRewardsResponseDto> {
    // 权限检查：只有创建者或管理员可以操作
    // TODO: 实现完整的权限检查逻辑
    void req.user.userId; // 保留用于后续权限验证
    const result = await this.activityService.distributeRewards(id);

    return {
      message: result.message,
      data: result,
    };
  }

  /**
   * 结束活动并结算
   * POST /api/v1/activities/:id/end
   *
   * 任务16.1.5: 活动结束处理
   * 需求16验收标准9: WHEN 活动到期 THEN System SHALL 结算活动并退还未发放的奖池余额
   *
   * 结算规则：
   * - 需要登录认证
   * - 只有活动创建者或管理员可以操作
   * - 将未完成的参与记录标记为 FAILED
   * - 自动发放已完成参与者的奖励
   * - 退还未使用的奖池给创建者
   *
   * @param id 活动ID
   * @param req 认证请求（用于权限验证）
   * @returns 结算结果
   */
  @Post(':id/end')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async endActivity(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<EndActivityResponseDto> {
    // 权限检查：只有创建者或管理员可以操作
    // TODO: 实现完整的权限检查逻辑
    void req.user.userId; // 保留用于后续权限验证
    const result = await this.activityService.endActivity(id);

    return {
      message: result.message,
      data: result,
    };
  }

  // ==================== 活动审核 API (任务16.1.6) ====================

  /**
   * 获取待审核活动列表
   * GET /api/v1/activities/pending
   *
   * 任务16.1.6: 活动审核 API - 获取待审核列表
   *
   * 查询规则：
   * - 需要登录认证
   * - 只有管理员可以查看（TODO: 添加管理员权限检查）
   * - 只返回 PENDING 状态的活动
   * - 支持分页和筛选
   *
   * 查询参数：
   * - page: 页码（默认: 1）
   * - pageSize: 每页数量（默认: 20，最大: 50）
   * - type: 活动类型过滤（可选）
   * - sortBy: 排序字段（createdAt/startTime，默认: createdAt）
   * - sortOrder: 排序方向（asc/desc，默认: desc）
   *
   * @param query 查询参数
   * @param req 认证请求
   * @returns 待审核活动列表
   */
  @Get('pending')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getPendingActivities(
    @Query() query: PendingActivitiesQueryDto,
    @Request() req: AuthenticatedRequest,
  ): Promise<GetPendingActivitiesResponseDto> {
    // TODO: 添加管理员权限检查
    void req.user.userId; // 保留用于后续权限验证
    const result = await this.activityService.getPendingActivities(query);

    return {
      message: '获取待审核活动列表成功',
      data: result,
    };
  }

  /**
   * 提交活动审核
   * POST /api/v1/activities/:id/submit
   *
   * 任务16.1.6: 活动审核 API - 提交审核
   * 需求16验收标准4: WHEN 活动创建完成 THEN System SHALL 提交审核并通知管理员
   *
   * 提交规则：
   * - 需要登录认证
   * - 只有活动创建者可以提交审核
   * - 活动必须处于 DRAFT 状态
   * - 验证活动配置完整性
   *
   * @param id 活动ID
   * @param req 认证请求
   * @returns 提交结果
   */
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async submitForReview(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<SubmitForReviewResponseDto> {
    const userId = req.user.userId;
    const result = await this.activityService.submitForReview(id, userId);

    return {
      message: result.message,
      data: result,
    };
  }

  /**
   * 审核通过活动
   * POST /api/v1/activities/:id/approve
   *
   * 任务16.1.6: 活动审核 API - 审核通过
   * 需求16验收标准5: WHEN 管理员审核活动 THEN System SHALL 支持通过/拒绝操作
   *
   * 审核规则：
   * - 需要登录认证
   * - 只有管理员可以审核（TODO: 添加管理员权限检查）
   * - 活动必须处于 PENDING 状态
   * - 状态变更为 ACTIVE
   *
   * @param id 活动ID
   * @param req 认证请求
   * @param dto 审核请求（可选备注）
   * @returns 审核结果
   */
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async approveActivity(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: ApproveActivityDto,
  ): Promise<ApproveActivityResponseDto> {
    const reviewerId = req.user.userId;
    // TODO: 添加管理员权限检查
    const result = await this.activityService.approveActivity(
      id,
      reviewerId,
      dto.note,
    );

    return {
      message: result.message,
      data: result,
    };
  }

  /**
   * 拒绝活动
   * POST /api/v1/activities/:id/reject
   *
   * 任务16.1.6: 活动审核 API - 审核拒绝
   * 需求16验收标准5: WHEN 管理员审核活动 THEN System SHALL 支持通过/拒绝操作
   * 需求16验收标准6: IF 活动被拒绝 THEN System SHALL 退还锁定的零芥子并通知创建者
   *
   * 拒绝规则：
   * - 需要登录认证
   * - 只有管理员可以拒绝（TODO: 添加管理员权限检查）
   * - 活动必须处于 PENDING 状态
   * - 必须提供拒绝原因
   * - 退还锁定的奖池给创建者
   *
   * @param id 活动ID
   * @param req 认证请求
   * @param dto 拒绝请求（包含拒绝原因）
   * @returns 拒绝结果
   */
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async rejectActivity(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: RejectActivityDto,
  ): Promise<RejectActivityResponseDto> {
    const reviewerId = req.user.userId;
    // TODO: 添加管理员权限检查
    const result = await this.activityService.rejectActivity(
      id,
      reviewerId,
      dto.reason,
    );

    return {
      message: result.message,
      data: result,
    };
  }
}
