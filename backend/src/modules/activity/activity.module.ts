import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service.js';
import { ActivityController } from './activity.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

/**
 * 活动模块
 *
 * 需求16: 社区活动系统
 *
 * 包含功能：
 * - 创建活动 (任务16.1.2)
 * - 获取活动列表
 * - 获取活动详情
 *
 * 后续任务：
 * - 参与活动 API (任务16.1.3)
 * - 活动进度追踪 (任务16.1.4)
 * - 奖励发放服务 (任务16.1.5)
 * - 活动审核 API (任务16.1.6)
 */
@Module({
  imports: [PrismaModule],
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
