import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HotScoreService } from './hot-score.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';

/**
 * 热度分数模块
 *
 * 需求7: 热度排行系统
 * - 基于点赞、打赏、阅读量、分支数量计算热度分数
 * - 支持按热度分数降序排序
 * - 每小时更新一次热度分数
 * - 使用 Redis 缓存热度排行榜
 *
 * 热度分数计算公式：
 * hotScore = (likeCount × 1) + (tipAmount / 100 × 2) + (viewCount / 100 × 0.5) + (branchCount × 3)
 *
 * 包含功能：
 * - 计算热度分数
 * - 更新小说库热度分数
 * - 更新分支热度分数
 * - 定时批量更新所有热度分数
 * - Redis 缓存 Top 100 排行榜
 *
 * _Requirements: 1.6, 7.1, 7.2, 7.3, 7.5_
 */
@Module({
  imports: [PrismaModule, RedisModule, ScheduleModule.forRoot()],
  providers: [HotScoreService],
  exports: [HotScoreService],
})
export class HotScoreModule {}
