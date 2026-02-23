import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { EventTypeConfigService } from './config/event-type.config.js';
import { LimitedEventService } from './limited-event.service.js';
import { EventProgressService } from './event-progress.service.js';
import { EventRewardService } from './event-reward.service.js';
import { TaskCompletionDetectorService } from './task-completion-detector.service.js';
import { EventSchedulerService } from './event-scheduler.service.js';
import { LimitedEventController } from './limited-event.controller.js';

/**
 * 限时活动模块
 * 需求26: 限时活动系统
 *
 * 功能说明：
 * 1. 活动类型配置管理（节日/周年庆/主题/闪电）
 * 2. 限时活动CRUD管理
 * 3. 活动任务管理
 * 4. 活动里程碑管理
 * 5. 用户活动进度追踪
 * 6. 活动奖励发放
 * 7. 活动定时开启/结束（需求26.1.11）
 * 8. 活动任务完成检测（需求26.1.8）
 *
 * 活动类型特征：
 * - FESTIVAL (节日): 7-14天，主题奖励，特殊视觉元素
 * - ANNIVERSARY (周年庆): 7-21天，独家奖励，里程碑式
 * - THEME (主题): 3-7天，特定主题聚焦
 * - FLASH (闪电): 1-3天，紧急任务，快速奖励
 *
 * 定时任务：
 * - EventSchedulerService: 每5分钟检查活动状态
 *   - UPCOMING → ACTIVE: 当 startDate 到达时
 *   - ACTIVE → ENDED: 当 endDate 到达时
 *
 * 已实现的 API 端点：
 * - GET /api/v1/limited-events - 获取活动列表（需求26.1.4）
 * - GET /api/v1/limited-events/active - 获取进行中的活动
 * - GET /api/v1/limited-events/upcoming - 获取即将开始的活动
 * - GET /api/v1/limited-events/ended - 获取已结束的活动
 * - GET /api/v1/limited-events/types - 获取活动类型配置列表
 * - GET /api/v1/limited-events/types/:type - 获取指定活动类型配置
 * - GET /api/v1/limited-events/:id - 获取活动详情
 * - GET /api/v1/limited-events/:eventId/tasks - 获取活动任务列表（需求26.1.6）
 * - POST /api/v1/limited-events/:eventId/join - 参与活动（需求26.1.7）
 * - GET /api/v1/limited-events/:eventId/progress - 获取用户活动进度（需求26.1.7）
 * - POST /api/v1/limited-events/:eventId/tasks/:taskId/progress - 更新任务进度（需求26.1.7）
 * - POST /api/v1/limited-events/:eventId/tasks/:taskId/claim - 领取任务奖励（需求26.1.9）
 *
 * 待实现的 API 端点：
 * - POST /api/v1/limited-events - 创建活动（管理员）
 * - PUT /api/v1/limited-events/:id - 更新活动（管理员）
 * - DELETE /api/v1/limited-events/:id - 删除活动（管理员）
 * - POST /api/v1/limited-events/:id/tasks - 创建活动任务（管理员）
 * - GET /api/v1/limited-events/:id/milestones - 获取活动里程碑列表
 * - POST /api/v1/limited-events/:id/milestones - 创建活动里程碑（管理员）
 * - POST /api/v1/limited-events/:id/milestones/:milestoneId/claim - 领取里程碑奖励
 */
@Module({
  imports: [PrismaModule, RedisModule, ScheduleModule.forRoot(), AuthModule],
  controllers: [LimitedEventController],
  providers: [
    EventTypeConfigService,
    LimitedEventService,
    EventProgressService,
    EventRewardService,
    TaskCompletionDetectorService,
    EventSchedulerService,
  ],
  exports: [
    EventTypeConfigService,
    LimitedEventService,
    EventProgressService,
    EventRewardService,
    TaskCompletionDetectorService,
    EventSchedulerService,
  ],
})
export class LimitedEventModule {}
