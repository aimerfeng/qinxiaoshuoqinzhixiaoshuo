import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { LimitedEventStatusLocal } from './limited-event.service.js';

/**
 * 活动定时调度服务
 *
 * 需求26.1.11: 活动定时开启/结束服务
 *
 * 功能说明：
 * 1. 使用 NestJS @Cron 装饰器定期检查活动状态
 * 2. 自动将 UPCOMING 状态的活动在 startDate 到达时转换为 ACTIVE
 * 3. 自动将 ACTIVE 状态的活动在 endDate 到达时转换为 ENDED
 * 4. 状态变更时清除相关缓存
 * 5. 记录状态转换日志
 *
 * 执行频率：每5分钟执行一次
 */
@Injectable()
export class EventSchedulerService {
  private readonly logger = new Logger(EventSchedulerService.name);
  private readonly EVENT_CACHE_PREFIX = 'limited-event:';
  private readonly EVENT_LIST_CACHE_PREFIX = 'limited-event:list:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 定时检查并更新活动状态
   *
   * 每5分钟执行一次，检查所有活动的状态：
   * - UPCOMING → ACTIVE: 当 startDate <= 当前时间
   * - ACTIVE → ENDED: 当 endDate <= 当前时间
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAndUpdateEventStatus(): Promise<void> {
    this.logger.log('开始检查活动状态...');

    const now = new Date();
    let activatedCount = 0;
    let endedCount = 0;

    try {
      // 1. 查找需要激活的活动（UPCOMING → ACTIVE）
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
      const eventsToActivate = await (this.prisma as any).limitedEvent.findMany(
        {
          where: {
            status: LimitedEventStatusLocal.UPCOMING,
            startDate: { lte: now },
            isPublished: true,
          },
          select: {
            id: true,
            name: true,
            startDate: true,
          },
        },
      );

      // 2. 激活活动
      for (const event of eventsToActivate as any[]) {
        try {
          await (this.prisma as any).limitedEvent.update({
            where: { id: event.id },
            data: { status: LimitedEventStatusLocal.ACTIVE },
          });

          this.logger.log(`活动已激活: ${event.name} (ID: ${event.id})`);
          await this.clearEventCache(event.id as string);
          activatedCount++;
        } catch (error) {
          this.logger.error(
            `激活活动失败: ${event.name} (ID: ${event.id})`,
            error,
          );
        }
      }

      // 3. 查找需要结束的活动（ACTIVE → ENDED）
      const eventsToEnd = await (this.prisma as any).limitedEvent.findMany({
        where: {
          status: LimitedEventStatusLocal.ACTIVE,
          endDate: { lte: now },
        },
        select: {
          id: true,
          name: true,
          endDate: true,
        },
      });

      // 4. 结束活动
      for (const event of eventsToEnd as any[]) {
        try {
          await (this.prisma as any).limitedEvent.update({
            where: { id: event.id },
            data: { status: LimitedEventStatusLocal.ENDED },
          });

          this.logger.log(`活动已结束: ${event.name} (ID: ${event.id})`);
          await this.clearEventCache(event.id as string);
          endedCount++;
        } catch (error) {
          this.logger.error(
            `结束活动失败: ${event.name} (ID: ${event.id})`,
            error,
          );
        }
      }
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

      // 5. 如果有状态变更，清除列表缓存
      if (activatedCount > 0 || endedCount > 0) {
        await this.clearListCache();
        this.logger.log(
          `活动状态检查完成: ${activatedCount} 个活动已激活, ${endedCount} 个活动已结束`,
        );
      } else {
        this.logger.debug('活动状态检查完成: 无状态变更');
      }
    } catch (error) {
      this.logger.error('检查活动状态时发生错误', error);
    }
  }

  /**
   * 手动触发活动状态检查
   *
   * 可用于管理员手动触发状态更新，无需等待定时任务
   *
   * @returns 状态更新结果
   */
  async manualCheckAndUpdate(): Promise<{
    activatedCount: number;
    endedCount: number;
    activatedEvents: string[];
    endedEvents: string[];
  }> {
    this.logger.log('手动触发活动状态检查...');

    const now = new Date();
    const activatedEvents: string[] = [];
    const endedEvents: string[] = [];

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
    // 1. 激活活动
    const eventsToActivate = await (this.prisma as any).limitedEvent.findMany({
      where: {
        status: LimitedEventStatusLocal.UPCOMING,
        startDate: { lte: now },
        isPublished: true,
      },
      select: { id: true, name: true },
    });

    for (const event of eventsToActivate as any[]) {
      await (this.prisma as any).limitedEvent.update({
        where: { id: event.id },
        data: { status: LimitedEventStatusLocal.ACTIVE },
      });
      activatedEvents.push(event.name as string);
      await this.clearEventCache(event.id as string);
    }

    // 2. 结束活动
    const eventsToEnd = await (this.prisma as any).limitedEvent.findMany({
      where: {
        status: LimitedEventStatusLocal.ACTIVE,
        endDate: { lte: now },
      },
      select: { id: true, name: true },
    });

    for (const event of eventsToEnd as any[]) {
      await (this.prisma as any).limitedEvent.update({
        where: { id: event.id },
        data: { status: LimitedEventStatusLocal.ENDED },
      });
      endedEvents.push(event.name as string);
      await this.clearEventCache(event.id as string);
    }
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

    // 3. 清除列表缓存
    if (activatedEvents.length > 0 || endedEvents.length > 0) {
      await this.clearListCache();
    }

    return {
      activatedCount: activatedEvents.length,
      endedCount: endedEvents.length,
      activatedEvents,
      endedEvents,
    };
  }

  /**
   * 清除指定活动的缓存
   *
   * @param eventId 活动ID
   */
  private async clearEventCache(eventId: string): Promise<void> {
    try {
      await this.redis.del(`${this.EVENT_CACHE_PREFIX}${eventId}`);
      this.logger.debug(`已清除活动缓存: ${eventId}`);
    } catch (error) {
      this.logger.warn(`清除活动缓存失败: ${eventId}`, error);
    }
  }

  /**
   * 清除活动列表缓存
   */
  private async clearListCache(): Promise<void> {
    try {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
      const keys: string[] = await this.redis.keys(
        `${this.EVENT_LIST_CACHE_PREFIX}*`,
      );
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
      if (keys && keys.length > 0) {
        await Promise.all(keys.map((key: string) => this.redis.del(key)));
        this.logger.debug(`已清除 ${keys.length} 个列表缓存`);
      }
    } catch (error) {
      this.logger.warn('清除列表缓存失败', error);
    }
  }
}
