import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  Achievement,
  UserAchievement,
  AchievementCategory as PrismaAchievementCategory,
  AchievementTier as PrismaAchievementTier,
  AchievementRewardType as PrismaAchievementRewardType,
} from '@prisma/client';
import {
  AchievementCategory,
  AchievementTier,
  AchievementRewardType,
  AchievementRewardValueDto,
  CreateAchievementDto,
  UpdateAchievementDto,
  GetAchievementsQueryDto,
} from './dto/achievement.dto.js';
import {
  AchievementDataDto,
  AchievementWithProgressDto,
  AchievementCategoryInfoDto,
  AchievementTierInfoDto,
  AchievementStatsDto,
  GetCategoriesResponseDto,
  GetTiersResponseDto,
  GetAchievementsResponseDto,
  GetUserAchievementsResponseDto,
  GetAchievementResponseDto,
  GetUserAchievementDetailResponseDto,
  CreateAchievementResponseDto,
  UpdateAchievementResponseDto,
  DeleteAchievementResponseDto,
  GetAchievementStatsResponseDto,
} from './dto/achievement-response.dto.js';

/**
 * 成就服务
 * 处理成就定义和用户成就进度相关业务逻辑
 *
 * 需求24: 成就系统
 * - 24.1.3 成就类别管理 API
 * - 24.1.4 成就等级配置
 * - 24.1.8 成就列表 API
 * - 24.1.9 用户成就详情 API
 */
@Injectable()
export class AchievementService {
  private readonly logger = new Logger(AchievementService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== 类别和等级配置 ====================

  /**
   * 成就类别配置
   * 需求24.1.3: 成就类别管理 API（阅读/创作/社交/收藏/特殊/赛季/活动）
   */
  private readonly categoryConfig: Record<AchievementCategory, { displayName: string; description: string }> = {
    [AchievementCategory.READING]: {
      displayName: '阅读成就',
      description: '通过阅读作品获得的成就，从初窥门径到阅尽天下',
    },
    [AchievementCategory.CREATION]: {
      displayName: '创作成就',
      description: '通过创作作品获得的成就，从新人作者到千万传奇',
    },
    [AchievementCategory.SOCIAL]: {
      displayName: '社交成就',
      description: '通过社交互动获得的成就，从初有粉丝到互动之王',
    },
    [AchievementCategory.COLLECTION]: {
      displayName: '收藏成就',
      description: '通过收藏作品获得的成就',
    },
    [AchievementCategory.SPECIAL]: {
      displayName: '特殊成就',
      description: '特殊条件触发的成就，如元老用户、深夜书虫、彩蛋猎人',
    },
    [AchievementCategory.SEASONAL]: {
      displayName: '赛季成就',
      description: '赛季期间获得的限定成就',
    },
    [AchievementCategory.EVENT]: {
      displayName: '活动成就',
      description: '参与活动获得的限定成就',
    },
  };

  /**
   * 成就等级配置
   * 需求24.1.4: 成就等级配置（青铜→白银→黄金→铂金→钻石→传说）
   */
  private readonly tierConfig: Record<AchievementTier, { displayName: string; description: string; color: string; sortValue: number }> = {
    [AchievementTier.BRONZE]: {
      displayName: '青铜',
      description: '入门级成就',
      color: '#CD7F32',
      sortValue: 1,
    },
    [AchievementTier.SILVER]: {
      displayName: '白银',
      description: '进阶级成就',
      color: '#C0C0C0',
      sortValue: 2,
    },
    [AchievementTier.GOLD]: {
      displayName: '黄金',
      description: '高级成就',
      color: '#FFD700',
      sortValue: 3,
    },
    [AchievementTier.PLATINUM]: {
      displayName: '铂金',
      description: '精英级成就',
      color: '#E5E4E2',
      sortValue: 4,
    },
    [AchievementTier.DIAMOND]: {
      displayName: '钻石',
      description: '大师级成就',
      color: '#B9F2FF',
      sortValue: 5,
    },
    [AchievementTier.LEGENDARY]: {
      displayName: '传说',
      description: '传奇级成就',
      color: '#FF6B35',
      sortValue: 6,
    },
  };

  // ==================== 数据转换方法 ====================

  /**
   * 将数据库成就转换为 DTO
   */
  private toAchievementDto(achievement: Achievement): AchievementDataDto {
    return {
      id: achievement.id,
      name: achievement.name,
      displayName: achievement.displayName,
      description: achievement.description,
      category: achievement.category as unknown as AchievementCategory,
      tier: achievement.tier as unknown as AchievementTier,
      iconUrl: achievement.iconUrl,
      badgeUrl: achievement.badgeUrl,
      targetValue: achievement.targetValue,
      rewardType: achievement.rewardType as unknown as AchievementRewardType,
      rewardValue: achievement.rewardValue as AchievementRewardValueDto,
      isHidden: achievement.isHidden,
      isActive: achievement.isActive,
      sortOrder: achievement.sortOrder,
      createdAt: achievement.createdAt,
      updatedAt: achievement.updatedAt,
    };
  }

  /**
   * 将成就和用户进度合并为带进度的 DTO
   */
  private toAchievementWithProgressDto(
    achievement: Achievement,
    userProgress?: UserAchievement | null,
  ): AchievementWithProgressDto {
    const currentProgress = userProgress?.currentProgress ?? 0;
    const progressPercent = Math.min(
      Math.round((currentProgress / achievement.targetValue) * 100),
      100,
    );

    return {
      ...this.toAchievementDto(achievement),
      currentProgress,
      progressPercent,
      isUnlocked: userProgress?.isUnlocked ?? false,
      unlockedAt: userProgress?.unlockedAt ?? null,
      isClaimed: userProgress?.isClaimed ?? false,
      claimedAt: userProgress?.claimedAt ?? null,
    };
  }

  // ==================== 类别和等级 API ====================

  /**
   * 获取所有成就类别
   * 需求24.1.3: 成就类别管理 API
   */
  async getCategories(userId?: string): Promise<GetCategoriesResponseDto> {
    try {
      const categories: AchievementCategoryInfoDto[] = [];

      for (const [category, config] of Object.entries(this.categoryConfig)) {
        // 获取该类别的成就总数
        const totalCount = await this.prisma.achievement.count({
          where: {
            category: category as PrismaAchievementCategory,
            isActive: true,
          },
        });

        let unlockedCount: number | undefined;
        if (userId) {
          // 获取用户已解锁的数量
          unlockedCount = await this.prisma.userAchievement.count({
            where: {
              userId,
              isUnlocked: true,
              achievement: {
                category: category as PrismaAchievementCategory,
                isActive: true,
              },
            },
          });
        }

        categories.push({
          category: category as AchievementCategory,
          displayName: config.displayName,
          description: config.description,
          totalCount,
          unlockedCount,
        });
      }

      return {
        message: '获取成就类别列表成功',
        categories,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get categories: ${errorMessage}`);
      throw new InternalServerErrorException('获取成就类别列表失败');
    }
  }

  /**
   * 获取所有成就等级
   * 需求24.1.4: 成就等级配置
   */
  async getTiers(): Promise<GetTiersResponseDto> {
    const tiers: AchievementTierInfoDto[] = Object.entries(this.tierConfig)
      .map(([tier, config]) => ({
        tier: tier as AchievementTier,
        displayName: config.displayName,
        description: config.description,
        color: config.color,
        sortValue: config.sortValue,
      }))
      .sort((a, b) => a.sortValue - b.sortValue);

    return {
      message: '获取成就等级列表成功',
      tiers,
    };
  }

  // ==================== 成就列表 API ====================

  /**
   * 获取所有成就列表（管理员用）
   */
  async getAllAchievements(query: GetAchievementsQueryDto): Promise<GetAchievementsResponseDto> {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};

      if (query.category) {
        where.category = query.category as PrismaAchievementCategory;
      }
      if (query.tier) {
        where.tier = query.tier as PrismaAchievementTier;
      }
      if (!query.includeHidden) {
        where.isHidden = false;
      }

      const orderBy: Record<string, string> = {};
      const sortBy = query.sortBy ?? 'sortOrder';
      const sortOrder = query.sortOrder ?? 'asc';
      orderBy[sortBy] = sortOrder;

      const [achievements, total] = await Promise.all([
        this.prisma.achievement.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.achievement.count({ where }),
      ]);

      return {
        message: '获取成就列表成功',
        achievements: achievements.map((a) => this.toAchievementDto(a)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get all achievements: ${errorMessage}`);
      throw new InternalServerErrorException('获取成就列表失败');
    }
  }

  /**
   * 获取启用的成就列表（公开）
   * 需求24.1.8: 成就列表 API（分类/筛选/排序）
   */
  async getActiveAchievements(query: GetAchievementsQueryDto): Promise<GetAchievementsResponseDto> {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {
        isActive: true,
      };

      if (query.category) {
        where.category = query.category as PrismaAchievementCategory;
      }
      if (query.tier) {
        where.tier = query.tier as PrismaAchievementTier;
      }
      if (!query.includeHidden) {
        where.isHidden = false;
      }

      const orderBy: Record<string, string> = {};
      const sortBy = query.sortBy ?? 'sortOrder';
      const sortOrder = query.sortOrder ?? 'asc';
      orderBy[sortBy] = sortOrder;

      const [achievements, total] = await Promise.all([
        this.prisma.achievement.findMany({
          where,
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.achievement.count({ where }),
      ]);

      return {
        message: '获取成就列表成功',
        achievements: achievements.map((a) => this.toAchievementDto(a)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get active achievements: ${errorMessage}`);
      throw new InternalServerErrorException('获取成就列表失败');
    }
  }

  /**
   * 按类别获取成就
   * 需求24.1.3: 成就类别管理 API
   */
  async getAchievementsByCategory(
    category: AchievementCategory,
    query: GetAchievementsQueryDto,
  ): Promise<GetAchievementsResponseDto> {
    return this.getActiveAchievements({ ...query, category });
  }

  /**
   * 按等级获取成就
   * 需求24.1.4: 成就等级配置
   */
  async getAchievementsByTier(
    tier: AchievementTier,
    query: GetAchievementsQueryDto,
  ): Promise<GetAchievementsResponseDto> {
    return this.getActiveAchievements({ ...query, tier });
  }

  /**
   * 获取单个成就详情
   */
  async getAchievementById(achievementId: string): Promise<GetAchievementResponseDto> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        throw new NotFoundException('成就不存在');
      }

      return {
        message: '获取成就详情成功',
        achievement: this.toAchievementDto(achievement),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get achievement by id: ${errorMessage}`);
      throw new InternalServerErrorException('获取成就详情失败');
    }
  }

  // ==================== 用户成就 API ====================

  /**
   * 获取用户成就列表（含进度）
   * 需求24.1.8: 成就列表 API
   */
  async getUserAchievements(
    userId: string,
    query: GetAchievementsQueryDto,
  ): Promise<GetUserAchievementsResponseDto> {
    try {
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;

      // 构建成就查询条件
      const achievementWhere: Record<string, unknown> = {
        isActive: true,
      };

      if (query.category) {
        achievementWhere.category = query.category as PrismaAchievementCategory;
      }
      if (query.tier) {
        achievementWhere.tier = query.tier as PrismaAchievementTier;
      }
      if (!query.includeHidden) {
        achievementWhere.isHidden = false;
      }

      // 获取所有符合条件的成就
      const achievements = await this.prisma.achievement.findMany({
        where: achievementWhere,
        orderBy: { sortOrder: 'asc' },
      });

      // 获取用户的成就进度
      const userAchievements = await this.prisma.userAchievement.findMany({
        where: {
          userId,
          achievementId: { in: achievements.map((a) => a.id) },
        },
      });

      const progressMap = new Map(
        userAchievements.map((ua) => [ua.achievementId, ua]),
      );

      // 合并成就和进度
      let achievementsWithProgress = achievements.map((achievement) =>
        this.toAchievementWithProgressDto(achievement, progressMap.get(achievement.id)),
      );

      // 应用筛选条件
      if (query.unlockedOnly) {
        achievementsWithProgress = achievementsWithProgress.filter((a) => a.isUnlocked);
      }
      if (query.unclaimedOnly) {
        achievementsWithProgress = achievementsWithProgress.filter(
          (a) => a.isUnlocked && !a.isClaimed,
        );
      }

      // 计算统计数据
      const stats = await this.calculateUserStats(userId);

      // 分页
      const total = achievementsWithProgress.length;
      const paginatedAchievements = achievementsWithProgress.slice(skip, skip + limit);

      return {
        message: '获取用户成就列表成功',
        achievements: paginatedAchievements,
        stats,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user achievements: ${errorMessage}`);
      throw new InternalServerErrorException('获取用户成就列表失败');
    }
  }

  /**
   * 获取用户特定成就详情
   * 需求24.1.9: 用户成就详情 API
   */
  async getUserAchievementDetail(
    userId: string,
    achievementId: string,
  ): Promise<GetUserAchievementDetailResponseDto> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        throw new NotFoundException('成就不存在');
      }

      const userProgress = await this.prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId } },
      });

      return {
        message: '获取用户成就详情成功',
        achievement: this.toAchievementWithProgressDto(achievement, userProgress),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user achievement detail: ${errorMessage}`);
      throw new InternalServerErrorException('获取用户成就详情失败');
    }
  }

  /**
   * 获取用户成就统计
   */
  async getUserStats(userId: string): Promise<GetAchievementStatsResponseDto> {
    try {
      const stats = await this.calculateUserStats(userId);
      return {
        message: '获取成就统计成功',
        stats,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user stats: ${errorMessage}`);
      throw new InternalServerErrorException('获取成就统计失败');
    }
  }

  /**
   * 计算用户成就统计数据
   */
  private async calculateUserStats(userId: string): Promise<AchievementStatsDto> {
    // 获取所有启用的成就总数
    const totalAchievements = await this.prisma.achievement.count({
      where: { isActive: true },
    });

    // 获取用户已解锁和已领取的数量
    const [unlockedCount, claimedCount] = await Promise.all([
      this.prisma.userAchievement.count({
        where: { userId, isUnlocked: true },
      }),
      this.prisma.userAchievement.count({
        where: { userId, isClaimed: true },
      }),
    ]);

    // 计算各类别统计
    const categoryStats = await Promise.all(
      Object.keys(this.categoryConfig).map(async (category) => {
        const [total, unlocked] = await Promise.all([
          this.prisma.achievement.count({
            where: {
              category: category as PrismaAchievementCategory,
              isActive: true,
            },
          }),
          this.prisma.userAchievement.count({
            where: {
              userId,
              isUnlocked: true,
              achievement: {
                category: category as PrismaAchievementCategory,
                isActive: true,
              },
            },
          }),
        ]);
        return {
          category: category as AchievementCategory,
          total,
          unlocked,
        };
      }),
    );

    // 计算各等级统计
    const tierStats = await Promise.all(
      Object.keys(this.tierConfig).map(async (tier) => {
        const [total, unlocked] = await Promise.all([
          this.prisma.achievement.count({
            where: {
              tier: tier as PrismaAchievementTier,
              isActive: true,
            },
          }),
          this.prisma.userAchievement.count({
            where: {
              userId,
              isUnlocked: true,
              achievement: {
                tier: tier as PrismaAchievementTier,
                isActive: true,
              },
            },
          }),
        ]);
        return {
          tier: tier as AchievementTier,
          total,
          unlocked,
        };
      }),
    );

    return {
      totalAchievements,
      unlockedCount,
      claimedCount,
      unlockPercent: totalAchievements > 0
        ? Math.round((unlockedCount / totalAchievements) * 100)
        : 0,
      categoryStats,
      tierStats,
    };
  }

  // ==================== 管理员 API ====================

  /**
   * 创建成就（管理员用）
   */
  async createAchievement(data: CreateAchievementDto): Promise<CreateAchievementResponseDto> {
    try {
      // 检查名称是否已存在
      const existingAchievement = await this.prisma.achievement.findUnique({
        where: { name: data.name },
      });

      if (existingAchievement) {
        throw new ConflictException('成就标识符已存在');
      }

      const achievement = await this.prisma.achievement.create({
        data: {
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          category: data.category as PrismaAchievementCategory,
          tier: data.tier as PrismaAchievementTier,
          iconUrl: data.iconUrl,
          badgeUrl: data.badgeUrl,
          targetValue: data.targetValue,
          rewardType: data.rewardType as PrismaAchievementRewardType,
          rewardValue: data.rewardValue as object,
          isHidden: data.isHidden ?? false,
          isActive: data.isActive ?? true,
          sortOrder: data.sortOrder ?? 0,
        },
      });

      this.logger.log(`Created achievement: ${achievement.name}`);

      return {
        message: '创建成就成功',
        achievement: this.toAchievementDto(achievement),
      };
    } catch (error: unknown) {
      if (error instanceof ConflictException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create achievement: ${errorMessage}`);
      throw new InternalServerErrorException('创建成就失败');
    }
  }

  /**
   * 更新成就（管理员用）
   */
  async updateAchievement(
    achievementId: string,
    data: UpdateAchievementDto,
  ): Promise<UpdateAchievementResponseDto> {
    try {
      const existingAchievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!existingAchievement) {
        throw new NotFoundException('成就不存在');
      }

      const achievement = await this.prisma.achievement.update({
        where: { id: achievementId },
        data: {
          displayName: data.displayName,
          description: data.description,
          iconUrl: data.iconUrl,
          badgeUrl: data.badgeUrl,
          targetValue: data.targetValue,
          rewardType: data.rewardType as PrismaAchievementRewardType | undefined,
          rewardValue: data.rewardValue as object | undefined,
          isHidden: data.isHidden,
          isActive: data.isActive,
          sortOrder: data.sortOrder,
        },
      });

      this.logger.log(`Updated achievement: ${achievement.name}`);

      return {
        message: '更新成就成功',
        achievement: this.toAchievementDto(achievement),
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update achievement: ${errorMessage}`);
      throw new InternalServerErrorException('更新成就失败');
    }
  }

  /**
   * 删除成就（管理员用）
   */
  async deleteAchievement(achievementId: string): Promise<DeleteAchievementResponseDto> {
    try {
      const existingAchievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!existingAchievement) {
        throw new NotFoundException('成就不存在');
      }

      await this.prisma.achievement.delete({
        where: { id: achievementId },
      });

      this.logger.log(`Deleted achievement: ${existingAchievement.name}`);

      return {
        message: '删除成就成功',
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete achievement: ${errorMessage}`);
      throw new InternalServerErrorException('删除成就失败');
    }
  }
}
