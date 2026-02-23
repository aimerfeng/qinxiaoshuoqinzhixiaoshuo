import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { SeasonConfigService } from './season-config.service.js';
import { SeasonService } from './season.service.js';
import { LeaderboardService } from './leaderboard.service.js';
import { SeasonPointsService } from './season-points.service.js';
import { LeaderboardRealtimeService } from './leaderboard-realtime.service.js';
import { SeasonSettlementService } from './season-settlement.service.js';
import { SeasonRewardService } from './season-reward.service.js';
import { SeasonController } from './season.controller.js';

/**
 * 赛季排行榜模块
 * 需求25: 赛季排行榜系统
 *
 * 功能说明：
 * 1. 赛季配置管理（90天/季度/软重置）
 * 2. 赛季状态管理（UPCOMING → ACTIVE → ENDED → SETTLED）
 * 3. 排行榜数据管理
 * 4. 赛季奖励管理
 * 5. 赛季积分计算（需求25.1.8）
 * 6. 排行榜实时更新服务（需求25.1.9）
 * 7. 赛季结算服务（需求25.1.10）
 * 8. 赛季奖励领取服务（需求25.1.12）
 *
 * API 端点：
 * - GET /api/v1/seasons/current - 获取当前赛季信息（需求25.1.5）
 * - GET /api/v1/seasons/:id - 根据ID获取赛季详情（需求25.1.5）
 * - GET /api/v1/seasons - 获取赛季列表（分页）（需求25.1.5）
 * - GET /api/v1/seasons/:seasonId/leaderboard - 获取排行榜（分页）（需求25.1.6）
 * - GET /api/v1/seasons/:seasonId/leaderboard/top - 获取排行榜前N名（需求25.1.6）
 * - POST /api/v1/seasons/:seasonId/settle - 启动赛季结算（需求25.1.10）
 * - GET /api/v1/seasons/:seasonId/settlement/status - 获取结算状态（需求25.1.10）
 * - GET /api/v1/seasons/:seasonId/rewards - 获取用户赛季奖励列表（需求25.1.12）
 * - POST /api/v1/seasons/:seasonId/rewards/:rewardId/claim - 领取单个奖励（需求25.1.12）
 * - POST /api/v1/seasons/:seasonId/rewards/claim-all - 领取所有奖励（需求25.1.12）
 */
@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [SeasonController],
  providers: [
    SeasonConfigService,
    SeasonService,
    LeaderboardService,
    LeaderboardRealtimeService,
    SeasonPointsService,
    SeasonSettlementService,
    SeasonRewardService,
  ],
  exports: [
    SeasonConfigService,
    SeasonService,
    LeaderboardService,
    LeaderboardRealtimeService,
    SeasonPointsService,
    SeasonSettlementService,
    SeasonRewardService,
  ],
})
export class SeasonModule {}
