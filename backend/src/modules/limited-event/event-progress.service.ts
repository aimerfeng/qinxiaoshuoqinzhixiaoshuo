import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import type {
  UserEventParticipationResponseDto,
  UserTaskProgressResponseDto,
  UserMilestoneProgressResponseDto,
} from './dto/limited-event-response.dto.js';
import { LimitedEventStatusLocal } from './limited-event.service.js';

/**
 * 活动进度追踪服务
 *
 * 需求26.1.7: 活动进度追踪服务
 *
 * 提供以下功能：
 * - joinEvent(userId, eventId) - 用户参与活动，创建参与记录
 * - getUserEventProgress(userId, eventId) - 获取用户在活动中的进度
 * - updateTaskProgress(userId, taskId, progressIncrement) - 更新任务进度
 * - checkMilestoneUnlock(userId, eventId) - 检查并解锁里程碑
 */
@Injectable()
export class EventProgressService {
  private readonly logger = new Logger(EventProgressService.name);
  private readonly PROGRESS_CACHE_PREFIX = 'event-progress:';
  private readonly CACHE_TTL = 60; // 1分钟缓存

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 用户参与活动
   *
   * 需求26.1.7: joinEvent(userId, eventId) - 用户参与活动，创建参与记录
   *
   * @param userId 用户ID
   * @param eventId 活动ID
   * @returns 参与记录
   */
  async joinEvent(
    userId: string,
    eventId: string,
  ): Promise<UserEventParticipationResponseDto> {
    this.logger.debug(`用户 ${userId} 参与活动 ${eventId}`);

    // 验证活动是否存在且可参与
    const event = await (this.prisma as any).limitedEvent.findUnique({
      where: { id: eventId },
      include: {
        tasks: { orderBy: { sortOrder: 'asc' } },
        milestones: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!event) {
      throw new NotFoundException(`活动不存在: ${eventId}`);
    }

    // 检查活动状态
    if (event.status !== LimitedEventStatusLocal.ACTIVE) {
      throw new BadRequestException(
        event.status === LimitedEventStatusLocal.UPCOMING
          ? '活动尚未开始'
          : '活动已结束',
      );
    }

    // 检查活动是否已发布
    if (!event.isPublished) {
      throw new BadRequestException('活动未发布，无法参与');
    }

    // 检查用户是否已参与
    const existingParticipation = await (
      this.prisma as any
    ).limitedEventParticipation.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (existingParticipation) {
      throw new ConflictException('您已参与此活动');
    }

    // 创建参与记录
    const participation = await (
      this.prisma as any
    ).limitedEventParticipation.create({
      data: {
        userId,
        eventId,
        joinedAt: new Date(),
        completedTaskCount: 0,
        lastActivityAt: new Date(),
      },
    });

    // 为用户初始化所有任务进度
    const tasks = event.tasks as any[];
    if (tasks.length > 0) {
      await (this.prisma as any).limitedEventUserTaskProgress.createMany({
        data: tasks.map((task: any) => ({
          userId,
          eventId,
          taskId: task.id,
          currentProgress: 0,
          isCompleted: false,
          isClaimed: false,
        })),
        skipDuplicates: true,
      });
    }

    // 为用户初始化所有里程碑进度
    const milestones = event.milestones as any[];
    if (milestones.length > 0) {
      await (this.prisma as any).limitedEventUserMilestoneProgress.createMany({
        data: milestones.map((milestone: any) => ({
          userId,
          eventId,
          milestoneId: milestone.id,
          isUnlocked: false,
          isClaimed: false,
        })),
        skipDuplicates: true,
      });
    }

    // 清除缓存
    await this.clearProgressCache(userId, eventId);

    return this.toParticipationResponseDto(participation, event, [], []);
  }

  /**
   * 获取用户活动进度
   *
   * 需求26.1.7: getUserEventProgress(userId, eventId) - 获取用户在活动中的进度
   *
   * @param userId 用户ID
   * @param eventId 活动ID
   * @returns 用户活动进度
   */
  async getUserEventProgress(
    userId: string,
    eventId: string,
  ): Promise<UserEventParticipationResponseDto> {
    this.logger.debug(`获取用户 ${userId} 在活动 ${eventId} 的进度`);

    // 尝试从缓存获取
    const cacheKey = `${this.PROGRESS_CACHE_PREFIX}${userId}:${eventId}`;
    const cachedProgress = await this.redis.get(cacheKey);

    if (cachedProgress) {
      try {
        return JSON.parse(cachedProgress) as UserEventParticipationResponseDto;
      } catch {
        // 缓存解析失败，继续从数据库获取
      }
    }

    // 获取参与记录
    const participation = await (
      this.prisma as any
    ).limitedEventParticipation.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (!participation) {
      throw new NotFoundException('您尚未参与此活动');
    }

    // 获取活动详情
    const event = await (this.prisma as any).limitedEvent.findUnique({
      where: { id: eventId },
      include: {
        tasks: { orderBy: { sortOrder: 'asc' } },
        milestones: { orderBy: { sortOrder: 'asc' } },
      },
    });

    if (!event) {
      throw new NotFoundException(`活动不存在: ${eventId}`);
    }

    // 获取任务进度
    const taskProgress = await (
      this.prisma as any
    ).limitedEventUserTaskProgress.findMany({
      where: { userId, eventId },
      include: { task: true },
      orderBy: { task: { sortOrder: 'asc' } },
    });

    // 获取里程碑进度
    const milestoneProgress = await (
      this.prisma as any
    ).limitedEventUserMilestoneProgress.findMany({
      where: { userId, eventId },
      include: { milestone: true },
      orderBy: { milestone: { sortOrder: 'asc' } },
    });

    const result = this.toParticipationResponseDto(
      participation,
      event,
      taskProgress,
      milestoneProgress,
    );

    // 缓存结果
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    return result;
  }

  /**
   * 更新任务进度
   *
   * 需求26.1.7: updateTaskProgress(userId, taskId, progressIncrement) - 更新任务进度
   *
   * @param userId 用户ID
   * @param taskId 任务ID
   * @param progressIncrement 进度增量
   * @returns 更新后的任务进度
   */
  async updateTaskProgress(
    userId: string,
    taskId: string,
    progressIncrement: number,
  ): Promise<UserTaskProgressResponseDto> {
    this.logger.debug(
      `更新用户 ${userId} 任务 ${taskId} 进度，增量: ${progressIncrement}`,
    );

    if (progressIncrement <= 0) {
      throw new BadRequestException('进度增量必须大于0');
    }

    // 获取任务信息
    const task = await (this.prisma as any).limitedEventTask.findUnique({
      where: { id: taskId },
      include: { event: true },
    });

    if (!task) {
      throw new NotFoundException(`任务不存在: ${taskId}`);
    }

    // 检查活动状态
    if (task.event.status !== LimitedEventStatusLocal.ACTIVE) {
      throw new BadRequestException('活动未在进行中，无法更新进度');
    }

    // 获取或创建任务进度记录
    let taskProgress = await (
      this.prisma as any
    ).limitedEventUserTaskProgress.findUnique({
      where: {
        userId_taskId: { userId, taskId },
      },
    });

    if (!taskProgress) {
      // 检查用户是否已参与活动
      const participation = await (
        this.prisma as any
      ).limitedEventParticipation.findUnique({
        where: {
          userId_eventId: { userId, eventId: task.eventId },
        },
      });

      if (!participation) {
        throw new BadRequestException('请先参与活动');
      }

      // 创建任务进度记录
      taskProgress = await (
        this.prisma as any
      ).limitedEventUserTaskProgress.create({
        data: {
          userId,
          eventId: task.eventId,
          taskId,
          currentProgress: 0,
          isCompleted: false,
          isClaimed: false,
        },
      });
    }

    // 如果任务已完成，不再更新
    if (taskProgress.isCompleted) {
      return this.toTaskProgressResponseDto(taskProgress, task);
    }

    // 计算新进度
    const newProgress = Math.min(
      taskProgress.currentProgress + progressIncrement,
      task.targetValue,
    );
    const isCompleted = newProgress >= task.targetValue;

    // 更新任务进度
    const updatedProgress = await (
      this.prisma as any
    ).limitedEventUserTaskProgress.update({
      where: { id: taskProgress.id },
      data: {
        currentProgress: newProgress,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });

    // 如果任务完成，更新参与记录的完成任务数
    if (isCompleted && !taskProgress.isCompleted) {
      await (this.prisma as any).limitedEventParticipation.update({
        where: {
          userId_eventId: { userId, eventId: task.eventId },
        },
        data: {
          completedTaskCount: { increment: 1 },
          lastActivityAt: new Date(),
        },
      });

      // 检查里程碑解锁
      await this.checkMilestoneUnlock(userId, task.eventId);
    } else {
      // 更新最后活动时间
      await (this.prisma as any).limitedEventParticipation.update({
        where: {
          userId_eventId: { userId, eventId: task.eventId },
        },
        data: {
          lastActivityAt: new Date(),
        },
      });
    }

    // 清除缓存
    await this.clearProgressCache(userId, task.eventId);

    return this.toTaskProgressResponseDto(updatedProgress, task);
  }

  /**
   * 检查并解锁里程碑
   *
   * 需求26.1.7: checkMilestoneUnlock(userId, eventId) - 检查并解锁里程碑
   *
   * @param userId 用户ID
   * @param eventId 活动ID
   * @returns 新解锁的里程碑列表
   */
  async checkMilestoneUnlock(
    userId: string,
    eventId: string,
  ): Promise<UserMilestoneProgressResponseDto[]> {
    this.logger.debug(`检查用户 ${userId} 在活动 ${eventId} 的里程碑解锁`);

    // 获取用户参与记录
    const participation = await (
      this.prisma as any
    ).limitedEventParticipation.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (!participation) {
      return [];
    }

    // 获取活动里程碑
    const milestones = await (
      this.prisma as any
    ).limitedEventMilestone.findMany({
      where: { eventId },
      orderBy: { sortOrder: 'asc' },
    });

    // 获取用户里程碑进度
    const milestoneProgress = await (
      this.prisma as any
    ).limitedEventUserMilestoneProgress.findMany({
      where: { userId, eventId },
    });

    const progressMap = new Map(
      (milestoneProgress as any[]).map((p: any) => [p.milestoneId, p]),
    );

    const newlyUnlocked: UserMilestoneProgressResponseDto[] = [];

    // 检查每个里程碑
    for (const milestone of milestones as any[]) {
      const progress = progressMap.get(milestone.id);

      // 如果已解锁，跳过
      if (progress?.isUnlocked) {
        continue;
      }

      // 检查是否达到解锁条件
      if (participation.completedTaskCount >= milestone.requiredProgress) {
        // 解锁里程碑
        let updatedProgress;

        if (progress) {
          updatedProgress = await (
            this.prisma as any
          ).limitedEventUserMilestoneProgress.update({
            where: { id: progress.id },
            data: {
              isUnlocked: true,
              unlockedAt: new Date(),
            },
            include: { milestone: true },
          });
        } else {
          // 创建里程碑进度记录
          updatedProgress = await (
            this.prisma as any
          ).limitedEventUserMilestoneProgress.create({
            data: {
              userId,
              eventId,
              milestoneId: milestone.id,
              isUnlocked: true,
              unlockedAt: new Date(),
              isClaimed: false,
            },
            include: { milestone: true },
          });
        }

        newlyUnlocked.push(
          this.toMilestoneProgressResponseDto(updatedProgress),
        );

        this.logger.log(
          `用户 ${userId} 解锁里程碑: ${milestone.name} (活动: ${eventId})`,
        );
      }
    }

    // 如果有新解锁的里程碑，清除缓存
    if (newlyUnlocked.length > 0) {
      await this.clearProgressCache(userId, eventId);
    }

    return newlyUnlocked;
  }

  /**
   * 检查用户是否已参与活动
   *
   * @param userId 用户ID
   * @param eventId 活动ID
   * @returns 是否已参与
   */
  async hasJoinedEvent(userId: string, eventId: string): Promise<boolean> {
    const participation = await (
      this.prisma as any
    ).limitedEventParticipation.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    return !!participation;
  }

  /**
   * 清除进度缓存
   */
  private async clearProgressCache(
    userId: string,
    eventId: string,
  ): Promise<void> {
    const cacheKey = `${this.PROGRESS_CACHE_PREFIX}${userId}:${eventId}`;
    await this.redis.del(cacheKey);
  }

  /**
   * 转换参与记录为响应 DTO
   */
  private toParticipationResponseDto(
    participation: any,
    event: any,
    taskProgress: any[],
    milestoneProgress: any[],
  ): UserEventParticipationResponseDto {
    const tasks = (event.tasks as any[]) || [];
    const totalTasks = tasks.length;
    const completionPercent =
      totalTasks > 0
        ? Math.round((participation.completedTaskCount / totalTasks) * 100)
        : 0;

    return {
      id: participation.id as string,
      userId: participation.userId as string,
      eventId: participation.eventId as string,
      joinedAt: (participation.joinedAt as Date).toISOString(),
      completedTaskCount: participation.completedTaskCount as number,
      lastActivityAt: participation.lastActivityAt
        ? (participation.lastActivityAt as Date).toISOString()
        : null,
      totalTasks,
      completionPercent,
      taskProgress: taskProgress.map((tp: any) =>
        this.toTaskProgressResponseDto(tp, tp.task),
      ),
      milestoneProgress: milestoneProgress.map((mp: any) =>
        this.toMilestoneProgressResponseDto(mp),
      ),
    };
  }

  /**
   * 转换任务进度为响应 DTO
   */
  private toTaskProgressResponseDto(
    progress: any,
    task: any,
  ): UserTaskProgressResponseDto {
    const targetValue = task?.targetValue || 1;
    const progressPercent = Math.round(
      (progress.currentProgress / targetValue) * 100,
    );

    return {
      id: progress.id as string,
      userId: progress.userId as string,
      eventId: progress.eventId as string,
      taskId: progress.taskId as string,
      currentProgress: progress.currentProgress as number,
      isCompleted: progress.isCompleted as boolean,
      completedAt: progress.completedAt
        ? (progress.completedAt as Date).toISOString()
        : null,
      isClaimed: progress.isClaimed as boolean,
      claimedAt: progress.claimedAt
        ? (progress.claimedAt as Date).toISOString()
        : null,
      progressPercent,
      task: task
        ? {
            id: task.id as string,
            eventId: task.eventId as string,
            name: task.name as string,
            description: task.description as string | null,
            taskType: task.taskType,
            targetValue: task.targetValue as number,
            rewardType: task.rewardType,
            rewardValue: task.rewardValue as Record<string, unknown>,
            sortOrder: task.sortOrder as number,
            isRequired: task.isRequired as boolean,
            createdAt: (task.createdAt as Date).toISOString(),
            updatedAt: (task.updatedAt as Date).toISOString(),
          }
        : undefined,
    };
  }

  /**
   * 转换里程碑进度为响应 DTO
   */
  private toMilestoneProgressResponseDto(
    progress: any,
  ): UserMilestoneProgressResponseDto {
    const milestone = progress.milestone;

    return {
      id: progress.id as string,
      userId: progress.userId as string,
      eventId: progress.eventId as string,
      milestoneId: progress.milestoneId as string,
      isUnlocked: progress.isUnlocked as boolean,
      unlockedAt: progress.unlockedAt
        ? (progress.unlockedAt as Date).toISOString()
        : null,
      isClaimed: progress.isClaimed as boolean,
      claimedAt: progress.claimedAt
        ? (progress.claimedAt as Date).toISOString()
        : null,
      milestone: milestone
        ? {
            id: milestone.id as string,
            eventId: milestone.eventId as string,
            name: milestone.name as string,
            description: milestone.description as string | null,
            requiredProgress: milestone.requiredProgress as number,
            rewardType: milestone.rewardType,
            rewardValue: milestone.rewardValue as Record<string, unknown>,
            sortOrder: milestone.sortOrder as number,
            createdAt: (milestone.createdAt as Date).toISOString(),
            updatedAt: (milestone.updatedAt as Date).toISOString(),
          }
        : undefined,
    };
  }
}
