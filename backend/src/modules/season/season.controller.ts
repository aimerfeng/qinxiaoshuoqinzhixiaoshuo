import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  NotFoundException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { SeasonService } from './season.service.js';
import { LeaderboardService } from './leaderboard.service.js';
import { SeasonSettlementService } from './season-settlement.service.js';
import { SeasonRewardService } from './season-reward.service.js';
import {
  SeasonHistoryQueryDto,
  LeaderboardCategory,
  UserSeasonHistoryQueryDto,
} from './dto/leaderboard.dto.js';
import {
  GetCurrentSeasonResponseDto,
  GetSeasonsResponseDto,
  SeasonInfoDto,
  GetLeaderboardResponseDto,
  LeaderboardEntryDto,
  GetUserRankResponseDto,
  GetUserSeasonHistoryResponseDto,
} from './dto/leaderboard-response.dto.js';
import {
  StartSettlementResponseDto,
  GetSettlementStatusResponseDto,
  SettlementProgressDto,
} from './dto/settlement-response.dto.js';
import {
  GetUserSeasonRewardsResponseDto,
  GetUserSeasonRewardsSummaryResponseDto,
  ClaimSeasonRewardResponseDto,
  BatchClaimSeasonRewardsResponseDto,
} from './dto/reward-response.dto.js';

/**
 * 赛季控制器
 *
 * 需求25.1.5: 当前赛季信息 API
 * 需求25.1.6: 排行榜数据 API（阅读/创作/社交/综合）
 * 需求25.1.7: 用户排名查询 API
 * 需求25.1.11: 赛季历史记录 API
 * 需求25.1.12: 赛季奖励领取 API
 *
 * 提供以下端点：
 * - GET /api/v1/seasons/current - 获取当前赛季信息
 * - GET /api/v1/seasons/:id - 根据ID获取赛季详情
 * - GET /api/v1/seasons - 获取赛季列表（分页）
 * - GET /api/v1/seasons/:seasonId/leaderboard - 获取排行榜（分页）
 * - GET /api/v1/seasons/:seasonId/leaderboard/top - 获取排行榜前N名
 * - GET /api/v1/seasons/:seasonId/users/:userId/ranking - 获取用户排名
 * - GET /api/v1/seasons/users/:userId/history - 获取用户赛季历史（需求25.1.11）
 * - POST /api/v1/seasons/:seasonId/settle - 启动赛季结算（需求25.1.10）
 * - GET /api/v1/seasons/:seasonId/settlement/status - 获取结算状态（需求25.1.10）
 * - GET /api/v1/seasons/:seasonId/rewards - 获取用户赛季奖励列表（需求25.1.12）
 * - POST /api/v1/seasons/:seasonId/rewards/:rewardId/claim - 领取单个奖励（需求25.1.12）
 * - POST /api/v1/seasons/:seasonId/rewards/claim-all - 领取所有奖励（需求25.1.12）
 *
 * 设计语言:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
@Controller('seasons')
export class SeasonController {
  constructor(
    private readonly seasonService: SeasonService,
    private readonly leaderboardService: LeaderboardService,
    private readonly settlementService: SeasonSettlementService,
    private readonly rewardService: SeasonRewardService,
  ) {}

  /**
   * 获取当前赛季信息
   * GET /api/v1/seasons/current
   *
   * 需求25.1.5: 当前赛季信息 API
   *
   * 返回当前活跃赛季的详细信息，包括：
   * - 赛季基本信息（id, name, description, seasonNumber）
   * - 状态和日期（startDate, endDate, durationDays）
   * - 剩余天数（remainingDays，仅活跃赛季）
   * - 时间戳（createdAt, updatedAt）
   */
  @Get('current')
  @HttpCode(HttpStatus.OK)
  async getCurrentSeason(): Promise<GetCurrentSeasonResponseDto> {
    const season = await this.seasonService.getCurrentSeason();

    if (!season) {
      throw new NotFoundException('当前没有进行中的赛季');
    }

    return {
      message: '获取当前赛季成功',
      season,
    };
  }

  /**
   * 获取赛季列表
   * GET /api/v1/seasons
   *
   * 需求25.1.5: 当前赛季信息 API
   *
   * 支持分页和状态筛选
   *
   * @param query 查询参数
   * - status: 赛季状态筛选（UPCOMING, ACTIVE, ENDED, SETTLED）
   * - page: 页码（默认1）
   * - limit: 每页数量（默认10，最大50）
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getSeasonList(
    @Query() query: SeasonHistoryQueryDto,
  ): Promise<GetSeasonsResponseDto> {
    const { status, page = 1, limit = 10 } = query;

    const result = await this.seasonService.getSeasonList({
      status,
      page,
      limit: Math.min(limit, 50), // 限制最大每页数量
    });

    return {
      message: '获取赛季列表成功',
      seasons: result.seasons,
      pagination: result.pagination,
    };
  }

  /**
   * 获取排行榜数据（分页）
   * GET /api/v1/seasons/:seasonId/leaderboard
   *
   * 需求25.1.6: 排行榜数据 API（阅读/创作/社交/综合）
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别（READING, CREATION, SOCIAL, OVERALL）
   * @param page 页码（默认1）
   * @param limit 每页数量（默认20，最大100）
   *
   * 返回：
   * - 赛季信息
   * - 排行榜类别
   * - 排行榜条目列表（包含用户信息、分数、排名、排名变化）
   * - 分页信息
   */
  @Get(':seasonId/leaderboard')
  @HttpCode(HttpStatus.OK)
  async getLeaderboard(
    @Param('seasonId') seasonId: string,
    @Query('category') category: LeaderboardCategory = LeaderboardCategory.OVERALL,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ): Promise<GetLeaderboardResponseDto> {
    // 验证类别参数
    if (!Object.values(LeaderboardCategory).includes(category)) {
      category = LeaderboardCategory.OVERALL;
    }

    // 限制每页数量
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);

    const result = await this.leaderboardService.getLeaderboard(
      seasonId === 'current' ? undefined : seasonId,
      category,
      safePage,
      safeLimit,
    );

    return {
      message: '获取排行榜成功',
      season: result.season,
      category: result.category,
      entries: result.entries,
      pagination: result.pagination,
    };
  }

  /**
   * 获取排行榜前N名（快速展示）
   * GET /api/v1/seasons/:seasonId/leaderboard/top
   *
   * 需求25.1.6: 排行榜数据 API（阅读/创作/社交/综合）
   *
   * @param seasonId 赛季ID
   * @param category 排行榜类别（READING, CREATION, SOCIAL, OVERALL）
   * @param limit 获取数量（默认10，最大100）
   *
   * 返回：
   * - 赛季信息
   * - 排行榜类别
   * - 排行榜前N名条目
   */
  @Get(':seasonId/leaderboard/top')
  @HttpCode(HttpStatus.OK)
  async getTopEntries(
    @Param('seasonId') seasonId: string,
    @Query('category') category: LeaderboardCategory = LeaderboardCategory.OVERALL,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{
    message: string;
    season: SeasonInfoDto;
    category: LeaderboardCategory;
    entries: LeaderboardEntryDto[];
  }> {
    // 验证类别参数
    if (!Object.values(LeaderboardCategory).includes(category)) {
      category = LeaderboardCategory.OVERALL;
    }

    // 限制数量
    const safeLimit = Math.min(Math.max(limit, 1), 100);

    const result = await this.leaderboardService.getTopEntries(
      seasonId === 'current' ? undefined : seasonId,
      category,
      safeLimit,
    );

    return {
      message: '获取排行榜Top成功',
      season: result.season,
      category: result.category,
      entries: result.entries,
    };
  }

  /**
   * 获取用户排名汇总
   * GET /api/v1/seasons/:seasonId/users/:userId/ranking
   *
   * 需求25.1.7: 用户排名查询 API
   *
   * 返回用户在当前赛季或指定赛季的所有排行榜类别中的排名信息，包括：
   * - 各类别的分数、排名、排名变化、百分位
   * - 用户的段位信息（tier, points, peakTier等）
   *
   * @param seasonId 赛季ID（使用 'current' 表示当前赛季）
   * @param userId 用户ID
   *
   * 返回：
   * - 赛季信息
   * - 用户排名汇总（各类别排名、段位信息）
   */
  @Get(':seasonId/users/:userId/ranking')
  @HttpCode(HttpStatus.OK)
  async getUserRanking(
    @Param('seasonId') seasonId: string,
    @Param('userId') userId: string,
  ): Promise<GetUserRankResponseDto> {
    const result = await this.leaderboardService.getUserRanking(
      userId,
      seasonId === 'current' ? undefined : seasonId,
    );

    return {
      message: '获取用户排名成功',
      season: result.season,
      summary: result.summary,
    };
  }

  /**
   * 获取用户赛季历史记录
   * GET /api/v1/seasons/users/:userId/history
   *
   * 需求25.1.11: 赛季历史记录 API
   *
   * 返回用户过去参与的赛季记录，包括：
   * - 赛季基本信息（名称、编号、日期）
   * - 用户最终段位和积分
   * - 各类别的最终排名（READING, CREATION, SOCIAL, OVERALL）
   * - 获得的奖励（如有）
   *
   * 支持筛选：
   * - 日期范围（startDate, endDate）
   * - 最低段位（minTier）
   *
   * 支持排序：
   * - 赛季编号（seasonNumber，默认降序）
   * - 最终积分（points）
   * - 最终排名（rank）
   *
   * @param userId 用户ID
   * @param query 查询参数
   */
  @Get('users/:userId/history')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getUserSeasonHistory(
    @Param('userId') userId: string,
    @Query() query: UserSeasonHistoryQueryDto,
  ): Promise<GetUserSeasonHistoryResponseDto> {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      minTier,
      sortBy = 'seasonNumber',
      sortOrder = 'desc',
    } = query;

    const result = await this.seasonService.getUserSeasonHistory(userId, {
      page,
      limit: Math.min(limit, 50), // 限制最大每页数量
      startDate,
      endDate,
      minTier,
      sortBy,
      sortOrder,
    });

    return {
      message: '获取用户赛季历史成功',
      history: result.history,
      pagination: result.pagination,
    };
  }

  /**
   * 根据ID获取赛季详情
   * GET /api/v1/seasons/:id
   *
   * 需求25.1.5: 当前赛季信息 API
   *
   * @param id 赛季ID
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getSeasonById(
    @Param('id') id: string,
  ): Promise<{ message: string; season: SeasonInfoDto }> {
    const season = await this.seasonService.getSeasonById(id);

    return {
      message: '获取赛季详情成功',
      season,
    };
  }

  /**
   * 启动赛季结算
   * POST /api/v1/seasons/:seasonId/settle
   *
   * 需求25.1.10: 赛季结算服务（段位确定/奖励发放）
   *
   * 启动异步结算流程，包括：
   * 1. 从Redis同步排名到数据库
   * 2. 确定所有用户的最终段位
   * 3. 为符合条件的用户发放奖励
   * 4. 更新赛季状态为已结算
   *
   * 奖励分配规则：
   * - Top 1: 王者段位奖励 + 特殊称号
   * - Top 10: 钻石段位奖励
   * - Top 100: 铂金段位奖励
   * - 其他用户: 根据段位发放对应奖励
   *
   * @param seasonId 赛季ID
   */
  @Post(':seasonId/settle')
  @HttpCode(HttpStatus.ACCEPTED)
  async startSettlement(
    @Param('seasonId') seasonId: string,
  ): Promise<StartSettlementResponseDto> {
    const season = await this.seasonService.getSeasonById(seasonId);
    const progress = await this.settlementService.settleSeasonAsync(seasonId);

    return {
      message: '赛季结算已启动',
      season,
      settlement: this.toSettlementProgressDto(progress),
    };
  }

  /**
   * 获取结算状态
   * GET /api/v1/seasons/:seasonId/settlement/status
   *
   * 需求25.1.10: 赛季结算服务（段位确定/奖励发放）
   *
   * 获取当前结算进度，包括：
   * - 结算状态（未开始/进行中/完成/失败）
   * - 当前步骤描述
   * - 进度百分比
   * - 处理的用户数量
   *
   * @param seasonId 赛季ID
   */
  @Get(':seasonId/settlement/status')
  @HttpCode(HttpStatus.OK)
  async getSettlementStatus(
    @Param('seasonId') seasonId: string,
  ): Promise<GetSettlementStatusResponseDto> {
    const season = await this.seasonService.getSeasonById(seasonId);
    const progress = await this.settlementService.getSettlementStatus(seasonId);

    return {
      message: '获取结算状态成功',
      season,
      settlement: this.toSettlementProgressDto(progress),
    };
  }

  // ==================== 赛季奖励 API（需求25.1.12）====================

  /**
   * 获取用户赛季奖励列表
   * GET /api/v1/seasons/:seasonId/rewards
   *
   * 需求25.1.12: 赛季奖励领取 API
   *
   * 返回用户在指定赛季的所有奖励记录，包括：
   * - 奖励基本信息（类型、值、描述）
   * - 奖励状态（待领取/已领取/已过期）
   * - 领取时间和过期时间
   *
   * @param seasonId 赛季ID
   * @param userId 用户ID（查询参数）
   */
  @Get(':seasonId/rewards')
  @HttpCode(HttpStatus.OK)
  async getUserSeasonRewards(
    @Param('seasonId') seasonId: string,
    @Query('userId') userId: string,
  ): Promise<GetUserSeasonRewardsResponseDto> {
    if (!userId) {
      throw new NotFoundException('用户ID不能为空');
    }

    const result = await this.rewardService.getUserRewards(userId, seasonId);

    return {
      message: '获取用户赛季奖励成功',
      season: result.season,
      rewards: result.rewards,
      pagination: {
        page: 1,
        limit: result.rewards.length,
        total: result.rewards.length,
        totalPages: 1,
      },
    };
  }

  /**
   * 获取用户赛季奖励汇总
   * GET /api/v1/seasons/:seasonId/rewards/summary
   *
   * 需求25.1.12: 赛季奖励领取 API
   *
   * 返回用户在指定赛季的奖励汇总信息，包括：
   * - 用户当前段位
   * - 各状态奖励数量（待领取/已领取/已过期）
   * - 按段位分组的奖励列表
   *
   * @param seasonId 赛季ID
   * @param userId 用户ID（查询参数）
   */
  @Get(':seasonId/rewards/summary')
  @HttpCode(HttpStatus.OK)
  async getUserSeasonRewardsSummary(
    @Param('seasonId') seasonId: string,
    @Query('userId') userId: string,
  ): Promise<GetUserSeasonRewardsSummaryResponseDto> {
    if (!userId) {
      throw new NotFoundException('用户ID不能为空');
    }

    const result = await this.rewardService.getUserRewardsSummary(
      userId,
      seasonId,
    );

    return {
      message: '获取用户赛季奖励汇总成功',
      season: result.season,
      summary: result.summary,
    };
  }

  /**
   * 领取所有可领取的奖励
   * POST /api/v1/seasons/:seasonId/rewards/claim-all
   *
   * 需求25.1.12: 赛季奖励领取 API
   *
   * 批量领取用户在指定赛季的所有待领取奖励
   *
   * 奖励领取逻辑：
   * 1. 检查奖励状态是否为 PENDING
   * 2. 检查奖励是否已过期
   * 3. 更新状态为 CLAIMED 并设置 claimedAt
   * 4. 对于 TOKENS 类型：添加代币到用户钱包
   * 5. 对于 BADGE/TITLE/AVATAR_FRAME：添加到用户库存
   *
   * @param seasonId 赛季ID
   * @param userId 用户ID（查询参数）
   */
  @Post(':seasonId/rewards/claim-all')
  @HttpCode(HttpStatus.OK)
  async claimAllRewards(
    @Param('seasonId') seasonId: string,
    @Query('userId') userId: string,
  ): Promise<BatchClaimSeasonRewardsResponseDto> {
    if (!userId) {
      throw new NotFoundException('用户ID不能为空');
    }

    const result = await this.rewardService.claimAllRewards(userId, seasonId);

    return {
      message:
        result.summary.successCount > 0
          ? `成功领取 ${result.summary.successCount} 个奖励`
          : '没有可领取的奖励',
      claimedRewards: result.claimedRewards,
      failedRewards: result.failedRewards,
      summary: result.summary,
    };
  }

  /**
   * 领取单个奖励
   * POST /api/v1/seasons/:seasonId/rewards/:rewardId/claim
   *
   * 需求25.1.12: 赛季奖励领取 API
   *
   * 领取指定的单个奖励
   *
   * 奖励领取逻辑：
   * 1. 检查奖励状态是否为 PENDING
   * 2. 检查奖励是否已过期
   * 3. 更新状态为 CLAIMED 并设置 claimedAt
   * 4. 对于 TOKENS 类型：添加代币到用户钱包
   * 5. 对于 BADGE/TITLE/AVATAR_FRAME：添加到用户库存
   *
   * 错误响应：
   * - 404: 奖励不存在或不属于当前用户
   * - 400: 奖励已领取或已过期
   *
   * @param seasonId 赛季ID
   * @param rewardId 奖励记录ID（UserSeasonReward的ID）
   * @param userId 用户ID（查询参数）
   */
  @Post(':seasonId/rewards/:rewardId/claim')
  @HttpCode(HttpStatus.OK)
  async claimReward(
    @Param('seasonId') seasonId: string,
    @Param('rewardId') rewardId: string,
    @Query('userId') userId: string,
  ): Promise<ClaimSeasonRewardResponseDto> {
    if (!userId) {
      throw new NotFoundException('用户ID不能为空');
    }

    const result = await this.rewardService.claimReward(
      userId,
      seasonId,
      rewardId,
    );

    return {
      message: '奖励领取成功',
      reward: result.reward,
      claimedReward: result.claimedReward,
    };
  }

  /**
   * 转换结算进度为DTO
   */
  private toSettlementProgressDto(progress: any): SettlementProgressDto {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      seasonId: progress.seasonId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      status: progress.status,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      startedAt: progress.startedAt
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ? (progress.startedAt as Date).toISOString()
        : undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      completedAt: progress.completedAt
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        ? (progress.completedAt as Date).toISOString()
        : undefined,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      currentStep: progress.currentStep,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      totalUsers: progress.totalUsers,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      processedUsers: progress.processedUsers,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      progress: progress.progress,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      error: progress.error,
    };
  }
}
