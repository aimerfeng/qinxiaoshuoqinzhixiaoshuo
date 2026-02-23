import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AchievementService } from './achievement.service.js';
import { AchievementProgressService } from './achievement-progress.service.js';
import { AchievementUnlockService } from './achievement-unlock.service.js';
import { AchievementRewardService } from './achievement-reward.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import {
  AchievementCategory,
  AchievementTier,
  CreateAchievementDto,
  UpdateAchievementDto,
  GetAchievementsQueryDto,
  UpdateProgressDto,
} from './dto/achievement.dto.js';
import {
  GetCategoriesResponseDto,
  GetTiersResponseDto,
  GetAchievementsResponseDto,
  GetUserAchievementsResponseDto,
  GetAchievementResponseDto,
  GetUserAchievementDetailResponseDto,
  CreateAchievementResponseDto,
  UpdateAchievementResponseDto,
  DeleteAchievementResponseDto,
  UpdateProgressResponseDto,
  ClaimRewardResponseDto,
  CheckUnlockResponseDto,
  GetAchievementStatsResponseDto,
} from './dto/achievement-response.dto.js';

interface RequestWithUser extends Request {
  user: { userId: string };
}

/**
 * 成就控制器
 *
 * 需求24: 成就系统
 *
 * 提供以下功能：
 * - 24.1.3 成就类别管理 API
 * - 24.1.4 成就等级配置
 * - 24.1.8 成就列表 API（分类/筛选/排序）
 * - 24.1.9 用户成就详情 API
 * - 24.1.10 成就领取 API
 *
 * API 端点：
 *
 * 公开 API:
 * - GET /api/v1/achievements - 获取成就列表
 * - GET /api/v1/achievements/categories - 获取成就类别列表
 * - GET /api/v1/achievements/tiers - 获取成就等级列表
 * - GET /api/v1/achievements/category/:category - 按类别获取成就
 * - GET /api/v1/achievements/:id - 获取成就详情
 *
 * 用户 API:
 * - GET /api/v1/achievements/user - 获取用户成就列表
 * - GET /api/v1/achievements/user/stats - 获取用户成就统计
 * - GET /api/v1/achievements/user/:achievementId - 获取用户特定成就详情
 * - POST /api/v1/achievements/:id/claim - 领取成就奖励
 * - POST /api/v1/achievements/claim-all - 批量领取所有奖励
 * - POST /api/v1/achievements/check-unlock - 检查并解锁成就
 *
 * 管理员 API:
 * - GET /api/v1/achievements/admin/all - 获取所有成就（含禁用）
 * - POST /api/v1/achievements/admin - 创建成就
 * - PUT /api/v1/achievements/admin/:id - 更新成就
 * - DELETE /api/v1/achievements/admin/:id - 删除成就
 * - POST /api/v1/achievements/admin/progress - 更新用户进度
 * - POST /api/v1/achievements/admin/force-unlock/:userId/:achievementId - 强制解锁
 */
@Controller('achievements')
export class AchievementController {
  constructor(
    private readonly achievementService: AchievementService,
    private readonly progressService: AchievementProgressService,
    private readonly unlockService: AchievementUnlockService,
    private readonly rewardService: AchievementRewardService,
  ) {}

  // ==================== 公开 API ====================

  /**
   * 获取成就类别列表
   * GET /api/v1/achievements/categories
   *
   * 需求24.1.3: 成就类别管理 API
   */
  @Get('categories')
  @HttpCode(HttpStatus.OK)
  async getCategories(): Promise<GetCategoriesResponseDto> {
    return this.achievementService.getCategories();
  }

  /**
   * 获取成就等级列表
   * GET /api/v1/achievements/tiers
   *
   * 需求24.1.4: 成就等级配置
   */
  @Get('tiers')
  @HttpCode(HttpStatus.OK)
  async getTiers(): Promise<GetTiersResponseDto> {
    return this.achievementService.getTiers();
  }

  /**
   * 获取成就列表（公开）
   * GET /api/v1/achievements
   *
   * 需求24.1.8: 成就列表 API
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAchievements(
    @Query() query: GetAchievementsQueryDto,
  ): Promise<GetAchievementsResponseDto> {
    return this.achievementService.getActiveAchievements(query);
  }

  /**
   * 按类别获取成就
   * GET /api/v1/achievements/category/:category
   *
   * 需求24.1.3: 成就类别管理 API
   */
  @Get('category/:category')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAchievementsByCategory(
    @Param('category') category: AchievementCategory,
    @Query() query: GetAchievementsQueryDto,
  ): Promise<GetAchievementsResponseDto> {
    return this.achievementService.getAchievementsByCategory(category, query);
  }

  /**
   * 按等级获取成就
   * GET /api/v1/achievements/tier/:tier
   *
   * 需求24.1.4: 成就等级配置
   */
  @Get('tier/:tier')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAchievementsByTier(
    @Param('tier') tier: AchievementTier,
    @Query() query: GetAchievementsQueryDto,
  ): Promise<GetAchievementsResponseDto> {
    return this.achievementService.getAchievementsByTier(tier, query);
  }

  /**
   * 获取成就详情
   * GET /api/v1/achievements/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async getAchievementById(
    @Param('id') id: string,
  ): Promise<GetAchievementResponseDto> {
    return this.achievementService.getAchievementById(id);
  }

  // ==================== 用户 API ====================

  /**
   * 获取用户成就列表
   * GET /api/v1/achievements/user
   *
   * 需求24.1.8: 成就列表 API
   */
  @Get('user')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getUserAchievements(
    @Request() req: RequestWithUser,
    @Query() query: GetAchievementsQueryDto,
  ): Promise<GetUserAchievementsResponseDto> {
    return this.achievementService.getUserAchievements(req.user.userId, query);
  }

  /**
   * 获取用户成就统计
   * GET /api/v1/achievements/user/stats
   */
  @Get('user/stats')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserStats(
    @Request() req: RequestWithUser,
  ): Promise<GetAchievementStatsResponseDto> {
    return this.achievementService.getUserStats(req.user.userId);
  }

  /**
   * 获取用户特定成就详情
   * GET /api/v1/achievements/user/:achievementId
   *
   * 需求24.1.9: 用户成就详情 API
   */
  @Get('user/:achievementId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserAchievementDetail(
    @Request() req: RequestWithUser,
    @Param('achievementId') achievementId: string,
  ): Promise<GetUserAchievementDetailResponseDto> {
    return this.achievementService.getUserAchievementDetail(
      req.user.userId,
      achievementId,
    );
  }

  /**
   * 领取成就奖励
   * POST /api/v1/achievements/:id/claim
   *
   * 需求24.1.10: 成就领取 API
   */
  @Post(':id/claim')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async claimReward(
    @Request() req: RequestWithUser,
    @Param('id') achievementId: string,
  ): Promise<ClaimRewardResponseDto> {
    return this.rewardService.claimReward(req.user.userId, achievementId);
  }

  /**
   * 批量领取所有可领取的奖励
   * POST /api/v1/achievements/claim-all
   */
  @Post('claim-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async claimAllRewards(
    @Request() req: RequestWithUser,
  ): Promise<{ message: string; results: ClaimRewardResponseDto[] }> {
    const results = await this.rewardService.claimAllRewards(req.user.userId);
    return {
      message: `成功领取 ${results.length} 个奖励`,
      results,
    };
  }

  /**
   * 检查并解锁成就
   * POST /api/v1/achievements/check-unlock
   */
  @Post('check-unlock')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async checkAndUnlock(
    @Request() req: RequestWithUser,
  ): Promise<CheckUnlockResponseDto> {
    return this.unlockService.checkAndUnlockAll(req.user.userId);
  }

  // ==================== 管理员 API ====================

  /**
   * 获取所有成就列表（管理员）
   * GET /api/v1/achievements/admin/all
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAllAchievements(
    @Query() query: GetAchievementsQueryDto,
  ): Promise<GetAchievementsResponseDto> {
    return this.achievementService.getAllAchievements(query);
  }

  /**
   * 创建成就（管理员）
   * POST /api/v1/achievements/admin
   */
  @Post('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createAchievement(
    @Body() data: CreateAchievementDto,
  ): Promise<CreateAchievementResponseDto> {
    return this.achievementService.createAchievement(data);
  }

  /**
   * 更新成就（管理员）
   * PUT /api/v1/achievements/admin/:id
   */
  @Put('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateAchievement(
    @Param('id') id: string,
    @Body() data: UpdateAchievementDto,
  ): Promise<UpdateAchievementResponseDto> {
    return this.achievementService.updateAchievement(id, data);
  }

  /**
   * 删除成就（管理员）
   * DELETE /api/v1/achievements/admin/:id
   */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteAchievement(
    @Param('id') id: string,
  ): Promise<DeleteAchievementResponseDto> {
    return this.achievementService.deleteAchievement(id);
  }

  /**
   * 更新用户成就进度（管理员）
   * POST /api/v1/achievements/admin/progress
   */
  @Post('admin/progress')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateProgress(
    @Body() data: UpdateProgressDto & { userId: string },
  ): Promise<UpdateProgressResponseDto> {
    return this.progressService.updateProgress(
      data.userId,
      data.achievementId,
      data.increment,
    );
  }

  /**
   * 强制解锁成就（管理员）
   * POST /api/v1/achievements/admin/force-unlock/:userId/:achievementId
   */
  @Post('admin/force-unlock/:userId/:achievementId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async forceUnlock(
    @Param('userId') userId: string,
    @Param('achievementId') achievementId: string,
  ): Promise<{ message: string }> {
    await this.unlockService.forceUnlock(userId, achievementId);
    return { message: '成就已强制解锁' };
  }

  /**
   * 重置用户成就进度（管理员）
   * DELETE /api/v1/achievements/admin/progress/:userId/:achievementId
   */
  @Delete('admin/progress/:userId/:achievementId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async resetProgress(
    @Param('userId') userId: string,
    @Param('achievementId') achievementId: string,
  ): Promise<{ message: string }> {
    await this.progressService.resetProgress(userId, achievementId);
    return { message: '进度已重置' };
  }
}
