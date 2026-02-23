import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LimitedEventService } from './limited-event.service.js';
import { EventTypeConfigService } from './config/event-type.config.js';
import { EventProgressService } from './event-progress.service.js';
import { EventRewardService } from './event-reward.service.js';
import { LimitedEventQueryDto, UpdateTaskProgressDto } from './dto/limited-event.dto.js';
import type {
  LimitedEventListResponseDto,
  GetLimitedEventResponseDto,
  GetEventTypeConfigsResponseDto,
  EventTypeConfigResponseDto,
  JoinEventResponseDto,
  GetUserEventProgressResponseDto,
  ClaimRewardResponseDto,
} from './dto/limited-event-response.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * 限时活动控制器
 *
 * 需求26.1.4: 活动列表 API（进行中/即将开始/已结束）
 *
 * 提供以下端点：
 * - GET /api/v1/limited-events - 获取活动列表（支持状态筛选、分页）
 * - GET /api/v1/limited-events/active - 获取进行中的活动
 * - GET /api/v1/limited-events/upcoming - 获取即将开始的活动
 * - GET /api/v1/limited-events/ended - 获取已结束的活动
 * - GET /api/v1/limited-events/types - 获取活动类型配置列表
 * - GET /api/v1/limited-events/types/:type - 获取指定活动类型配置
 * - GET /api/v1/limited-events/:id - 获取活动详情
 *
 * 设计语言:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
@Controller('limited-events')
export class LimitedEventController {
  constructor(
    private readonly limitedEventService: LimitedEventService,
    private readonly eventTypeConfigService: EventTypeConfigService,
    private readonly eventProgressService: EventProgressService,
    private readonly eventRewardService: EventRewardService,
  ) {}

  /**
   * 获取活动列表
   * GET /api/v1/limited-events
   *
   * 需求26.1.4: 活动列表 API（进行中/即将开始/已结束）
   *
   * 支持按状态筛选（UPCOMING/ACTIVE/ENDED）
   * 支持按活动类型筛选（FESTIVAL/ANNIVERSARY/THEME/FLASH）
   * 支持分页
   *
   * @param query 查询参数
   * - status: 活动状态筛选（UPCOMING, ACTIVE, ENDED）
   * - eventType: 活动类型筛选（FESTIVAL, ANNIVERSARY, THEME, FLASH）
   * - publishedOnly: 是否只显示已发布的活动（默认true）
   * - page: 页码（默认1）
   * - limit: 每页数量（默认10，最大50）
   * - sortBy: 排序字段（startDate, endDate, createdAt, name）
   * - sortOrder: 排序方向（asc, desc）
   *
   * @returns 活动列表和分页信息
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getEvents(
    @Query() query: LimitedEventQueryDto,
  ): Promise<LimitedEventListResponseDto> {
    // 限制每页数量
    if (query.limit) {
      query.limit = Math.min(query.limit, 50);
    }

    return this.limitedEventService.getEvents(query);
  }

  /**
   * 获取进行中的活动列表
   * GET /api/v1/limited-events/active
   *
   * 需求26.1.4: 活动列表 API（进行中/即将开始/已结束）
   *
   * 快捷端点，返回当前进行中的活动
   * 按结束时间升序排列（即将结束的排在前面）
   *
   * @param limit 数量限制（默认10，最大50）
   * @returns 进行中的活动列表
   */
  @Get('active')
  @HttpCode(HttpStatus.OK)
  async getActiveEvents(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{ message: string; items: any[] }> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const items = await this.limitedEventService.getActiveEvents(safeLimit);

    return {
      message: '获取进行中活动成功',
      items,
    };
  }

  /**
   * 获取即将开始的活动列表
   * GET /api/v1/limited-events/upcoming
   *
   * 需求26.1.4: 活动列表 API（进行中/即将开始/已结束）
   *
   * 快捷端点，返回即将开始的活动
   * 按开始时间升序排列（最快开始的排在前面）
   *
   * @param limit 数量限制（默认10，最大50）
   * @returns 即将开始的活动列表
   */
  @Get('upcoming')
  @HttpCode(HttpStatus.OK)
  async getUpcomingEvents(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{ message: string; items: any[] }> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const items = await this.limitedEventService.getUpcomingEvents(safeLimit);

    return {
      message: '获取即将开始活动成功',
      items,
    };
  }

  /**
   * 获取已结束的活动列表
   * GET /api/v1/limited-events/ended
   *
   * 需求26.1.4: 活动列表 API（进行中/即将开始/已结束）
   *
   * 快捷端点，返回已结束的活动
   * 按结束时间降序排列（最近结束的排在前面）
   *
   * @param limit 数量限制（默认10，最大50）
   * @returns 已结束的活动列表
   */
  @Get('ended')
  @HttpCode(HttpStatus.OK)
  async getEndedEvents(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{ message: string; items: any[] }> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const items = await this.limitedEventService.getEndedEvents(safeLimit);

    return {
      message: '获取已结束活动成功',
      items,
    };
  }

  /**
   * 获取活动类型配置列表
   * GET /api/v1/limited-events/types
   *
   * 需求26.1.3: 活动类型配置（节日/周年庆/主题/闪电）
   *
   * 返回所有活动类型的配置信息，包括：
   * - 类型名称和描述
   * - 持续时间范围
   * - 主题色和视觉配置
   * - 推荐的任务类型和奖励类型
   *
   * @returns 活动类型配置列表
   */
  @Get('types')
  @HttpCode(HttpStatus.OK)
  getEventTypeConfigs(): GetEventTypeConfigsResponseDto {
    const configs = this.eventTypeConfigService.getAllConfigs();

    return {
      message: '获取活动类型配置成功',
      configs: configs.map((config) => this.toTypeConfigResponseDto(config)),
    };
  }

  /**
   * 获取指定活动类型配置
   * GET /api/v1/limited-events/types/:type
   *
   * 需求26.1.3: 活动类型配置（节日/周年庆/主题/闪电）
   *
   * @param type 活动类型（FESTIVAL, ANNIVERSARY, THEME, FLASH）
   * @returns 活动类型配置
   */
  @Get('types/:type')
  @HttpCode(HttpStatus.OK)
  getEventTypeConfig(
    @Param('type') type: string,
  ): { message: string; config: EventTypeConfigResponseDto } {
    const config = this.eventTypeConfigService.getConfig(type as any);

    return {
      message: '获取活动类型配置成功',
      config: this.toTypeConfigResponseDto(config),
    };
  }

  /**
   * 获取活动任务列表
   * GET /api/v1/limited-events/:eventId/tasks
   *
   * 需求26.1.6: 活动任务列表 API
   *
   * 返回指定活动的所有任务，包含：
   * - 任务名称、描述
   * - 任务类型（taskType）、目标值（targetValue）
   * - 奖励类型（rewardType）、奖励值（rewardValue）
   * - 排序顺序（sortOrder）、是否必须完成（isRequired）
   *
   * @param eventId 活动ID
   * @returns 任务列表
   */
  @Get(':eventId/tasks')
  @HttpCode(HttpStatus.OK)
  async getEventTasks(
    @Param('eventId') eventId: string,
  ): Promise<{
    message: string;
    eventId: string;
    tasks: Array<{
      id: string;
      eventId: string;
      name: string;
      description: string | null;
      taskType: string;
      targetValue: number;
      rewardType: string;
      rewardValue: Record<string, unknown>;
      sortOrder: number;
      isRequired: boolean;
      createdAt: string;
      updatedAt: string;
    }>;
  }> {
    return this.limitedEventService.getEventTasks(eventId);
  }

  /**
   * 参与活动
   * POST /api/v1/limited-events/:eventId/join
   *
   * 需求26.1.7: 活动进度追踪服务 - joinEvent
   *
   * 用户参与活动，创建参与记录并初始化任务和里程碑进度
   *
   * @param eventId 活动ID
   * @param req 请求对象（包含用户信息）
   * @returns 参与记录
   */
  @Post(':eventId/join')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  async joinEvent(
    @Param('eventId') eventId: string,
    @Request() req: any,
  ): Promise<JoinEventResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id as string;
    const participation = await this.eventProgressService.joinEvent(
      userId,
      eventId,
    );

    return {
      message: '参与活动成功',
      participation,
    };
  }

  /**
   * 获取用户活动进度
   * GET /api/v1/limited-events/:eventId/progress
   *
   * 需求26.1.7: 活动进度追踪服务 - getUserEventProgress
   *
   * 获取用户在指定活动中的进度，包括：
   * - 参与信息（参与时间、完成任务数）
   * - 任务进度列表
   * - 里程碑进度列表
   *
   * @param eventId 活动ID
   * @param req 请求对象（包含用户信息）
   * @returns 用户活动进度
   */
  @Get(':eventId/progress')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async getUserEventProgress(
    @Param('eventId') eventId: string,
    @Request() req: any,
  ): Promise<GetUserEventProgressResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id as string;
    const participation = await this.eventProgressService.getUserEventProgress(
      userId,
      eventId,
    );

    return {
      message: '获取活动进度成功',
      participation,
    };
  }

  /**
   * 更新任务进度
   * POST /api/v1/limited-events/:eventId/tasks/:taskId/progress
   *
   * 需求26.1.7: 活动进度追踪服务 - updateTaskProgress
   *
   * 更新用户在指定任务上的进度
   *
   * @param eventId 活动ID
   * @param taskId 任务ID
   * @param body 进度更新数据
   * @param req 请求对象（包含用户信息）
   * @returns 更新后的任务进度
   */
  @Post(':eventId/tasks/:taskId/progress')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateTaskProgress(
    @Param('eventId') _eventId: string,
    @Param('taskId') taskId: string,
    @Body() body: UpdateTaskProgressDto,
    @Request() req: any,
  ): Promise<{
    message: string;
    taskProgress: any;
  }> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id as string;
    const taskProgress = await this.eventProgressService.updateTaskProgress(
      userId,
      taskId,
      body.progressIncrement,
    );

    return {
      message: '更新任务进度成功',
      taskProgress,
    };
  }

  /**
   * 领取任务奖励
   * POST /api/v1/limited-events/:eventId/tasks/:taskId/claim
   *
   * 需求26.1.9: 活动奖励领取 API
   *
   * 领取已完成任务的奖励
   * - 验证任务已完成
   * - 防止重复领取
   * - 处理不同奖励类型（TOKENS/BADGE/TITLE/AVATAR_FRAME/THEME/EXPERIENCE/EXCLUSIVE_ITEM）
   *
   * @param eventId 活动ID
   * @param taskId 任务ID
   * @param req 请求对象（包含用户信息）
   * @returns 领取结果
   */
  @Post(':eventId/tasks/:taskId/claim')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async claimTaskReward(
    @Param('eventId') _eventId: string,
    @Param('taskId') taskId: string,
    @Request() req: any,
  ): Promise<ClaimRewardResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id as string;
    return this.eventRewardService.claimTaskReward(userId, taskId);
  }

  /**
   * 领取里程碑奖励
   * POST /api/v1/limited-events/:eventId/milestones/:milestoneId/claim
   *
   * 需求26.1.10: 活动里程碑奖励服务
   *
   * 领取已解锁里程碑的奖励
   * - 验证里程碑已解锁
   * - 防止重复领取
   * - 处理不同奖励类型（TOKENS/BADGE/TITLE/AVATAR_FRAME/THEME/EXPERIENCE/EXCLUSIVE_ITEM）
   *
   * @param eventId 活动ID
   * @param milestoneId 里程碑ID
   * @param req 请求对象（包含用户信息）
   * @returns 领取结果
   */
  @Post(':eventId/milestones/:milestoneId/claim')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async claimMilestoneReward(
    @Param('eventId') _eventId: string,
    @Param('milestoneId') milestoneId: string,
    @Request() req: any,
  ): Promise<ClaimRewardResponseDto> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const userId = req.user.id as string;
    return this.eventRewardService.claimMilestoneReward(userId, milestoneId);
  }

  /**
   * 获取活动详情
   * GET /api/v1/limited-events/:id
   *
   * 需求26.1.5: 活动详情 API
   *
   * 返回活动的完整信息，包括：
   * - 活动基本信息（名称、描述、封面、类型、状态）
   * - 活动时间（开始日期、结束日期、剩余时间）
   * - 活动任务列表
   * - 活动里程碑列表
   * - 活动类型配置
   *
   * @param id 活动ID
   * @returns 活动详情
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getEventById(
    @Param('id') id: string,
  ): Promise<GetLimitedEventResponseDto> {
    const event = await this.limitedEventService.getEventById(id);

    return {
      message: '获取活动详情成功',
      event,
    };
  }

  /**
   * 将活动类型配置转换为响应 DTO
   */
  private toTypeConfigResponseDto(config: any): EventTypeConfigResponseDto {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      type: config.type,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      displayName: config.displayName,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      displayNameCn: config.displayNameCn,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      description: config.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      descriptionCn: config.descriptionCn,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      minDurationDays: config.minDurationDays,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      maxDurationDays: config.maxDurationDays,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      recommendedDurationDays: config.recommendedDurationDays,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      themeColor: config.themeColor,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      gradientColors: config.gradientColors,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      iconName: config.iconName,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      hasThemeDecorations: config.hasThemeDecorations,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      hasSpecialEffects: config.hasSpecialEffects,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      recommendedTaskTypes: config.recommendedTaskTypes,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      recommendedRewardTypes: config.recommendedRewardTypes,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      taskCountRange: config.taskCountRange,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      milestoneCountRange: config.milestoneCountRange,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      urgencyLevel: config.urgencyLevel,
    };
  }
}
