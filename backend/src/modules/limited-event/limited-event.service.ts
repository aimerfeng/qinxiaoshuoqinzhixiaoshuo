import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { EventTypeConfigService } from './config/event-type.config.js';
import { LimitedEventQueryDto } from './dto/limited-event.dto.js';
import type {
  LimitedEventResponseDto,
  LimitedEventListResponseDto,
  PaginationDto,
  EventTypeConfigResponseDto,
} from './dto/limited-event-response.dto.js';

/**
 * 限时活动状态枚举（本地定义，避免 Prisma 类型问题）
 */
export enum LimitedEventStatusLocal {
  UPCOMING = 'UPCOMING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
}

/**
 * 限时活动类型枚举（本地定义）
 */
export enum LimitedEventTypeLocal {
  FESTIVAL = 'FESTIVAL',
  ANNIVERSARY = 'ANNIVERSARY',
  THEME = 'THEME',
  FLASH = 'FLASH',
}

/**
 * 限时活动服务
 *
 * 需求26.1.4: 活动列表 API（进行中/即将开始/已结束）
 *
 * 提供以下功能：
 * - getEvents() - 获取活动列表（支持状态筛选、分页）
 * - getEventById() - 获取活动详情
 * - 计算活动剩余时间
 * - 包含活动类型配置信息
 */
@Injectable()
export class LimitedEventService {
  private readonly logger = new Logger(LimitedEventService.name);
  private readonly EVENT_CACHE_PREFIX = 'limited-event:';
  private readonly EVENT_LIST_CACHE_PREFIX = 'limited-event:list:';
  private readonly CACHE_TTL = 300; // 5分钟缓存

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly eventTypeConfigService: EventTypeConfigService,
  ) {}

  /**
   * 获取活动列表
   *
   * 需求26.1.4: 活动列表 API（进行中/即将开始/已结束）
   *
   * 支持按状态筛选（UPCOMING/ACTIVE/ENDED）
   * 支持按活动类型筛选
   * 支持分页
   * 包含活动类型配置信息
   * 计算活动剩余时间
   *
   * @param query 查询参数
   * @returns 活动列表和分页信息
   */
  async getEvents(query: LimitedEventQueryDto): Promise<LimitedEventListResponseDto> {
    const {
      eventType,
      status,
      publishedOnly = true,
      page = 1,
      limit = 10,
      sortBy = 'startDate',
      sortOrder = 'desc',
    } = query;

    this.logger.debug(`获取活动列表，参数: ${JSON.stringify(query)}`);

    // 构建缓存键
    const cacheKey = this.buildListCacheKey(query);

    // 尝试从缓存获取
    const cachedResult = await this.redis.get(cacheKey);
    if (cachedResult) {
      try {
        const parsed = JSON.parse(cachedResult) as LimitedEventListResponseDto;
        // 重新计算剩余时间
        parsed.items = parsed.items.map((item) => this.updateRemainingTime(item));
        return parsed;
      } catch {
        // 缓存解析失败，继续从数据库获取
      }
    }

    // 构建查询条件
    const where: any = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 活动类型筛选
    if (eventType) {
      where.eventType = eventType;
    }

    // 是否只显示已发布的活动
    if (publishedOnly) {
      where.isPublished = true;
    }

    // 构建排序
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // 查询数据库
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const [events, total] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).limitedEvent.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          tasks: {
            orderBy: { sortOrder: 'asc' },
          },
          milestones: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      (this.prisma as any).limitedEvent.count({ where }),
    ]);

    // 转换为 DTO
    const items = (events as any[]).map((event) => this.toEventResponseDto(event));

    // 构建分页信息
    const pagination: PaginationDto = {
      page,
      limit,
      total: total as number,
      totalPages: Math.ceil((total as number) / limit),
      hasNext: page < Math.ceil((total as number) / limit),
      hasPrev: page > 1,
    };

    const result: LimitedEventListResponseDto = {
      message: '获取活动列表成功',
      items,
      pagination,
    };

    // 缓存结果
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    return result;
  }

  /**
   * 根据ID获取活动详情
   *
   * @param eventId 活动ID
   * @returns 活动详情
   */
  async getEventById(eventId: string): Promise<LimitedEventResponseDto> {
    // 尝试从缓存获取
    const cacheKey = `${this.EVENT_CACHE_PREFIX}${eventId}`;
    const cachedEvent = await this.redis.get(cacheKey);

    if (cachedEvent) {
      try {
        const event = JSON.parse(cachedEvent) as LimitedEventResponseDto;
        return this.updateRemainingTime(event);
      } catch {
        // 缓存解析失败，继续从数据库获取
      }
    }

    // 从数据库获取
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const event = await (this.prisma as any).limitedEvent.findUnique({
      where: { id: eventId },
      include: {
        tasks: {
          orderBy: { sortOrder: 'asc' },
        },
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`活动不存在: ${eventId}`);
    }

    const eventDto = this.toEventResponseDto(event);

    // 缓存结果
    await this.redis.set(cacheKey, JSON.stringify(eventDto), this.CACHE_TTL);

    return eventDto;
  }

  /**
   * 获取进行中的活动列表
   *
   * @param limit 数量限制
   * @returns 进行中的活动列表
   */
  async getActiveEvents(limit: number = 10): Promise<LimitedEventResponseDto[]> {
    return (await this.getEvents({
      status: LimitedEventStatusLocal.ACTIVE as any,
      publishedOnly: true,
      page: 1,
      limit,
      sortBy: 'endDate',
      sortOrder: 'asc', // 即将结束的排在前面
    })).items;
  }

  /**
   * 获取即将开始的活动列表
   *
   * @param limit 数量限制
   * @returns 即将开始的活动列表
   */
  async getUpcomingEvents(limit: number = 10): Promise<LimitedEventResponseDto[]> {
    return (await this.getEvents({
      status: LimitedEventStatusLocal.UPCOMING as any,
      publishedOnly: true,
      page: 1,
      limit,
      sortBy: 'startDate',
      sortOrder: 'asc', // 即将开始的排在前面
    })).items;
  }

  /**
   * 获取已结束的活动列表
   *
   * @param limit 数量限制
   * @returns 已结束的活动列表
   */
  async getEndedEvents(limit: number = 10): Promise<LimitedEventResponseDto[]> {
    return (await this.getEvents({
      status: LimitedEventStatusLocal.ENDED as any,
      publishedOnly: true,
      page: 1,
      limit,
      sortBy: 'endDate',
      sortOrder: 'desc', // 最近结束的排在前面
    })).items;
  }

  /**
   * 获取活动任务列表
   *
   * 需求26.1.6: 活动任务列表 API
   *
   * 返回指定活动的所有任务，包含：
   * - 任务名称、描述
   * - 任务类型、目标值
   * - 奖励类型、奖励值
   * - 排序顺序、是否必须完成
   *
   * @param eventId 活动ID
   * @returns 任务列表
   */
  async getEventTasks(eventId: string): Promise<{
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
    this.logger.debug(`获取活动任务列表，活动ID: ${eventId}`);

    // 先验证活动是否存在
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const event = await (this.prisma as any).limitedEvent.findUnique({
      where: { id: eventId },
      select: { id: true },
    });

    if (!event) {
      throw new NotFoundException(`活动不存在: ${eventId}`);
    }

    // 获取任务列表
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const tasks = await (this.prisma as any).limitedEventTask.findMany({
      where: { eventId },
      orderBy: { sortOrder: 'asc' },
    });

    // 转换为响应格式
    const taskList = (tasks as any[]).map((task) => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      id: task.id as string,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      eventId: task.eventId as string,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      name: task.name as string,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      description: task.description as string | null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      taskType: task.taskType as string,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      targetValue: task.targetValue as number,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      rewardType: task.rewardType as string,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      rewardValue: task.rewardValue as Record<string, unknown>,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      sortOrder: task.sortOrder as number,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      isRequired: task.isRequired as boolean,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      createdAt: (task.createdAt as Date).toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      updatedAt: (task.updatedAt as Date).toISOString(),
    }));

    return {
      message: '获取活动任务列表成功',
      eventId,
      tasks: taskList,
    };
  }



  /**
   * 将数据库模型转换为 DTO
   */
  private toEventResponseDto(event: any): LimitedEventResponseDto {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const eventType = event.eventType as string;
    const typeConfig = this.eventTypeConfigService.getConfig(eventType as any);

    // 计算剩余时间
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const endDate = new Date(event.endDate as string);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const startDate = new Date(event.startDate as string);
    const now = new Date();

    let remainingHours: number | undefined;
    let urgencyText: string | undefined;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (event.status === LimitedEventStatusLocal.ACTIVE) {
      remainingHours = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
      urgencyText = this.eventTypeConfigService.getUrgencyText(eventType as any, remainingHours);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    } else if (event.status === LimitedEventStatusLocal.UPCOMING) {
      // 对于即将开始的活动，计算距离开始的时间
      const hoursUntilStart = Math.max(0, Math.ceil((startDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
      if (hoursUntilStart <= 24) {
        urgencyText = '即将开始';
      } else if (hoursUntilStart <= 72) {
        urgencyText = `${Math.ceil(hoursUntilStart / 24)}天后开始`;
      }
    }

    // 转换任务列表
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const tasks = (event.tasks as any[] | undefined)?.map((task: any) => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      id: task.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      eventId: task.eventId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      name: task.name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      description: task.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      taskType: task.taskType,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      targetValue: task.targetValue,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      rewardType: task.rewardType,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      rewardValue: task.rewardValue,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      sortOrder: task.sortOrder,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      isRequired: task.isRequired,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      createdAt: (task.createdAt as Date).toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      updatedAt: (task.updatedAt as Date).toISOString(),
    }));

    // 转换里程碑列表
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const milestones = (event.milestones as any[] | undefined)?.map((milestone: any) => ({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      id: milestone.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      eventId: milestone.eventId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      name: milestone.name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      description: milestone.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      requiredProgress: milestone.requiredProgress,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      rewardType: milestone.rewardType,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      rewardValue: milestone.rewardValue,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      sortOrder: milestone.sortOrder,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      createdAt: (milestone.createdAt as Date).toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      updatedAt: (milestone.updatedAt as Date).toISOString(),
    }));

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      id: event.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      name: event.name,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      description: event.description,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      coverImageUrl: event.coverImageUrl,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      eventType: event.eventType,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      status: event.status,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      isPublished: event.isPublished,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      createdAt: (event.createdAt as Date).toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      updatedAt: (event.updatedAt as Date).toISOString(),
      tasks,
      milestones,
      typeConfig: typeConfig ? this.toTypeConfigResponseDto(typeConfig) : undefined,
      remainingHours,
      urgencyText,
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

  /**
   * 更新活动的剩余时间（用于缓存数据）
   */
  private updateRemainingTime(event: LimitedEventResponseDto): LimitedEventResponseDto {
    if (event.status === LimitedEventStatusLocal.ACTIVE) {
      const endDate = new Date(event.endDate);
      const now = new Date();
      event.remainingHours = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
      event.urgencyText = this.eventTypeConfigService.getUrgencyText(
        event.eventType as any,
        event.remainingHours,
      );
    }
    return event;
  }

  /**
   * 构建列表缓存键
   */
  private buildListCacheKey(query: LimitedEventQueryDto): string {
    const parts = [
      this.EVENT_LIST_CACHE_PREFIX,
      query.status || 'all',
      query.eventType || 'all',
      query.publishedOnly ? 'pub' : 'all',
      `p${query.page || 1}`,
      `l${query.limit || 10}`,
      query.sortBy || 'startDate',
      query.sortOrder || 'desc',
    ];
    return parts.join(':');
  }

  /**
   * 清除活动缓存
   */
  async clearEventCache(eventId?: string): Promise<void> {
    if (eventId) {
      await this.redis.del(`${this.EVENT_CACHE_PREFIX}${eventId}`);
    }
    // 清除列表缓存（使用模式匹配）
    const keys = await this.redis.keys(`${this.EVENT_LIST_CACHE_PREFIX}*`);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redis.del(key)));
    }
  }
}
