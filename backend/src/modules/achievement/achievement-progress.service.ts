import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UserAchievement } from '@prisma/client';
import {
  UserAchievementDataDto,
  UpdateProgressResponseDto,
} from './dto/achievement-response.dto.js';

/**
 * 成就进度追踪服务
 *
 * 需求24.1.5: 成就进度追踪服务
 *
 * 功能：
 * - 更新用户成就进度
 * - 检查进度是否达到目标
 * - 自动解锁成就
 */
@Injectable()
export class AchievementProgressService {
  private readonly logger = new Logger(AchievementProgressService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 将数据库用户成就转换为 DTO
   */
  private toUserAchievementDto(userAchievement: UserAchievement): UserAchievementDataDto {
    return {
      id: userAchievement.id,
      userId: userAchievement.userId,
      achievementId: userAchievement.achievementId,
      currentProgress: userAchievement.currentProgress,
      isUnlocked: userAchievement.isUnlocked,
      unlockedAt: userAchievement.unlockedAt,
      isClaimed: userAchievement.isClaimed,
      claimedAt: userAchievement.claimedAt,
      createdAt: userAchievement.createdAt,
      updatedAt: userAchievement.updatedAt,
    };
  }

  /**
   * 更新用户成就进度
   *
   * 需求24.1.5: 成就进度追踪服务
   *
   * @param userId 用户ID
   * @param achievementId 成就ID
   * @param increment 增加的进度值
   * @returns 更新后的进度信息和是否新解锁
   */
  async updateProgress(
    userId: string,
    achievementId: string,
    increment: number,
  ): Promise<UpdateProgressResponseDto> {
    try {
      // 获取成就定义
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        throw new NotFoundException('成就不存在');
      }

      if (!achievement.isActive) {
        throw new NotFoundException('成就已禁用');
      }

      // 获取或创建用户成就进度记录
      let userAchievement = await this.prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId } },
      });

      const wasUnlocked = userAchievement?.isUnlocked ?? false;

      if (!userAchievement) {
        // 创建新的进度记录
        userAchievement = await this.prisma.userAchievement.create({
          data: {
            userId,
            achievementId,
            currentProgress: Math.min(increment, achievement.targetValue),
            isUnlocked: increment >= achievement.targetValue,
            unlockedAt: increment >= achievement.targetValue ? new Date() : null,
          },
        });
      } else if (!userAchievement.isUnlocked) {
        // 更新现有进度
        const newProgress = Math.min(
          userAchievement.currentProgress + increment,
          achievement.targetValue,
        );
        const shouldUnlock = newProgress >= achievement.targetValue;

        userAchievement = await this.prisma.userAchievement.update({
          where: { id: userAchievement.id },
          data: {
            currentProgress: newProgress,
            isUnlocked: shouldUnlock,
            unlockedAt: shouldUnlock ? new Date() : null,
          },
        });
      }

      const isNewlyUnlocked = !wasUnlocked && userAchievement.isUnlocked;

      if (isNewlyUnlocked) {
        this.logger.log(
          `User ${userId} unlocked achievement: ${achievement.name}`,
        );
      }

      return {
        message: isNewlyUnlocked ? '成就已解锁！' : '进度已更新',
        progress: this.toUserAchievementDto(userAchievement),
        isNewlyUnlocked,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update progress: ${errorMessage}`);
      throw new InternalServerErrorException('更新进度失败');
    }
  }

  /**
   * 设置用户成就进度（绝对值）
   *
   * @param userId 用户ID
   * @param achievementId 成就ID
   * @param progress 进度值
   */
  async setProgress(
    userId: string,
    achievementId: string,
    progress: number,
  ): Promise<UpdateProgressResponseDto> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        throw new NotFoundException('成就不存在');
      }

      if (!achievement.isActive) {
        throw new NotFoundException('成就已禁用');
      }

      const clampedProgress = Math.min(Math.max(0, progress), achievement.targetValue);
      const shouldUnlock = clampedProgress >= achievement.targetValue;

      let userAchievement = await this.prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId } },
      });

      const wasUnlocked = userAchievement?.isUnlocked ?? false;

      if (!userAchievement) {
        userAchievement = await this.prisma.userAchievement.create({
          data: {
            userId,
            achievementId,
            currentProgress: clampedProgress,
            isUnlocked: shouldUnlock,
            unlockedAt: shouldUnlock ? new Date() : null,
          },
        });
      } else if (!userAchievement.isUnlocked) {
        userAchievement = await this.prisma.userAchievement.update({
          where: { id: userAchievement.id },
          data: {
            currentProgress: clampedProgress,
            isUnlocked: shouldUnlock,
            unlockedAt: shouldUnlock ? new Date() : null,
          },
        });
      }

      const isNewlyUnlocked = !wasUnlocked && userAchievement.isUnlocked;

      return {
        message: isNewlyUnlocked ? '成就已解锁！' : '进度已更新',
        progress: this.toUserAchievementDto(userAchievement),
        isNewlyUnlocked,
      };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to set progress: ${errorMessage}`);
      throw new InternalServerErrorException('设置进度失败');
    }
  }

  /**
   * 批量更新用户成就进度
   *
   * @param userId 用户ID
   * @param updates 进度更新列表
   */
  async batchUpdateProgress(
    userId: string,
    updates: { achievementId: string; increment: number }[],
  ): Promise<UpdateProgressResponseDto[]> {
    const results: UpdateProgressResponseDto[] = [];

    for (const update of updates) {
      try {
        const result = await this.updateProgress(
          userId,
          update.achievementId,
          update.increment,
        );
        results.push(result);
      } catch (error) {
        this.logger.warn(
          `Failed to update progress for achievement ${update.achievementId}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 通过成就名称更新进度
   *
   * @param userId 用户ID
   * @param achievementName 成就标识符
   * @param increment 增加的进度值
   */
  async updateProgressByName(
    userId: string,
    achievementName: string,
    increment: number,
  ): Promise<UpdateProgressResponseDto | null> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { name: achievementName },
      });

      if (!achievement || !achievement.isActive) {
        this.logger.warn(`Achievement not found or inactive: ${achievementName}`);
        return null;
      }

      return this.updateProgress(userId, achievement.id, increment);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update progress by name: ${errorMessage}`);
      return null;
    }
  }

  /**
   * 获取用户特定成就的进度
   *
   * @param userId 用户ID
   * @param achievementId 成就ID
   */
  async getProgress(
    userId: string,
    achievementId: string,
  ): Promise<UserAchievementDataDto | null> {
    try {
      const userAchievement = await this.prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId } },
      });

      if (!userAchievement) {
        return null;
      }

      return this.toUserAchievementDto(userAchievement);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get progress: ${errorMessage}`);
      return null;
    }
  }

  /**
   * 获取用户所有成就进度
   *
   * @param userId 用户ID
   */
  async getAllProgress(userId: string): Promise<UserAchievementDataDto[]> {
    try {
      const userAchievements = await this.prisma.userAchievement.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });

      return userAchievements.map((ua) => this.toUserAchievementDto(ua));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get all progress: ${errorMessage}`);
      return [];
    }
  }

  /**
   * 重置用户成就进度（管理员用）
   *
   * @param userId 用户ID
   * @param achievementId 成就ID
   */
  async resetProgress(userId: string, achievementId: string): Promise<void> {
    try {
      await this.prisma.userAchievement.deleteMany({
        where: { userId, achievementId },
      });

      this.logger.log(
        `Reset progress for user ${userId} on achievement ${achievementId}`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reset progress: ${errorMessage}`);
      throw new InternalServerErrorException('重置进度失败');
    }
  }

  /**
   * 追踪用户阅读章节进度
   * 
   * 需求24.3.1: 阅读量成就（初窥门径→阅尽天下）
   * 
   * 当用户阅读一个章节时调用此方法，更新所有阅读量相关成就的进度
   * 
   * 成就列表：
   * - reading_count_beginner: 初窥门径 - 阅读10章节
   * - reading_count_novice: 小有所成 - 阅读50章节
   * - reading_count_intermediate: 渐入佳境 - 阅读200章节
   * - reading_count_advanced: 博览群书 - 阅读500章节
   * - reading_count_expert: 学富五车 - 阅读1000章节
   * - reading_count_master: 阅尽天下 - 阅读5000章节
   * 
   * @param userId 用户ID
   * @param increment 增加的阅读章节数（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackReadingCount(
    userId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const readingCountAchievements = [
      'reading_count_beginner',     // 初窥门径 - 阅读10章节
      'reading_count_novice',       // 小有所成 - 阅读50章节
      'reading_count_intermediate', // 渐入佳境 - 阅读200章节
      'reading_count_advanced',     // 博览群书 - 阅读500章节
      'reading_count_expert',       // 学富五车 - 阅读1000章节
      'reading_count_master',       // 阅尽天下 - 阅读5000章节
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of readingCountAchievements) {
      try {
        const result = await this.updateProgressByName(userId, achievementName, increment);
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked reading count achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update reading count progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 追踪用户类型探索进度
   * 
   * 需求24.3.5: 类型探索成就（类型新手→全类型通）
   * 
   * 当用户阅读一个新类型的作品时调用此方法，记录类型并更新成就进度
   * 
   * 成就列表：
   * - genre_novice: 类型新手 - 阅读1种类型
   * - genre_explorer: 类型探索者 - 阅读3种类型
   * - genre_enthusiast: 类型爱好者 - 阅读5种类型
   * - genre_expert: 类型达人 - 阅读8种类型
   * - genre_master: 全类型通 - 阅读所有类型
   * 
   * @param userId 用户ID
   * @param workId 作品ID（用于获取作品的标签/类型）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackGenreExploration(
    userId: string,
    workId: string,
  ): Promise<UpdateProgressResponseDto[]> {
    const results: UpdateProgressResponseDto[] = [];

    try {
      // 获取作品的所有标签
      const workTags = await this.prisma.workTag.findMany({
        where: { workId },
        include: { tag: true },
      });

      if (workTags.length === 0) {
        this.logger.debug(`Work ${workId} has no tags, skipping genre tracking`);
        return results;
      }

      // 检查并记录用户阅读的新类型
      let newGenresCount = 0;
      for (const workTag of workTags) {
        // 检查用户是否已经阅读过这个类型
        const existingRecord = await this.prisma.userGenreRead.findUnique({
          where: {
            userId_tagId: {
              userId,
              tagId: workTag.tagId,
            },
          },
        });

        if (!existingRecord) {
          // 记录新类型
          await this.prisma.userGenreRead.create({
            data: {
              userId,
              tagId: workTag.tagId,
            },
          });
          newGenresCount++;
          this.logger.log(
            `User ${userId} explored new genre: ${workTag.tag.name}`,
          );
        }
      }

      // 如果有新类型被探索，更新成就进度
      if (newGenresCount > 0) {
        // 获取用户当前已阅读的类型总数
        const totalGenresRead = await this.prisma.userGenreRead.count({
          where: { userId },
        });

        // 更新所有类型探索成就的进度
        const genreAchievements = [
          'genre_novice',       // 类型新手 - 阅读1种类型
          'genre_explorer',     // 类型探索者 - 阅读3种类型
          'genre_enthusiast',   // 类型爱好者 - 阅读5种类型
          'genre_expert',       // 类型达人 - 阅读8种类型
          'genre_master',       // 全类型通 - 阅读所有类型
        ];

        for (const achievementName of genreAchievements) {
          try {
            // 使用 setProgress 设置绝对值，而不是增量
            const achievement = await this.prisma.achievement.findUnique({
              where: { name: achievementName },
            });

            if (achievement && achievement.isActive) {
              const result = await this.setProgress(
                userId,
                achievement.id,
                totalGenresRead,
              );
              results.push(result);

              if (result.isNewlyUnlocked) {
                this.logger.log(
                  `User ${userId} unlocked genre exploration achievement: ${achievementName}`,
                );
              }
            }
          } catch (error) {
            this.logger.warn(
              `Failed to update genre exploration progress for ${achievementName}: ${error}`,
            );
          }
        }
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to track genre exploration: ${errorMessage}`);
      return results;
    }
  }

  /**
   * 获取用户已阅读的类型数量
   * 
   * @param userId 用户ID
   * @returns 已阅读的类型数量
   */
  async getGenresReadCount(userId: string): Promise<number> {
    try {
      return await this.prisma.userGenreRead.count({
        where: { userId },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get genres read count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 获取用户已阅读的类型列表
   * 
   * @param userId 用户ID
   * @returns 已阅读的类型列表
   */
  async getGenresRead(userId: string): Promise<{ tagId: string; tagName: string; firstReadAt: Date }[]> {
    try {
      const genresRead = await this.prisma.userGenreRead.findMany({
        where: { userId },
        include: { tag: true },
        orderBy: { firstReadAt: 'asc' },
      });

      return genresRead.map((gr) => ({
        tagId: gr.tagId,
        tagName: gr.tag.name,
        firstReadAt: gr.firstReadAt,
      }));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get genres read: ${errorMessage}`);
      return [];
    }
  }

  /**
   * 追踪用户发布作品进度
   * 
   * 需求24.4.1: 发布作品成就（新人作者→高产作家）
   * 
   * 当用户发布一部作品时调用此方法，更新所有发布作品相关成就的进度
   * 
   * 成就列表：
   * - work_publish_first: 新人作者 - 发布1部作品
   * - work_publish_rising: 初露锋芒 - 发布3部作品
   * - work_publish_expert: 创作达人 - 发布5部作品
   * - work_publish_prolific: 多产作家 - 发布10部作品
   * - work_publish_master: 高产作家 - 发布20部作品
   * 
   * @param userId 用户ID
   * @param increment 增加的发布作品数（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackWorkPublishCount(
    userId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const workPublishAchievements = [
      'work_publish_first',    // 新人作者 - 发布1部作品
      'work_publish_rising',   // 初露锋芒 - 发布3部作品
      'work_publish_expert',   // 创作达人 - 发布5部作品
      'work_publish_prolific', // 多产作家 - 发布10部作品
      'work_publish_master',   // 高产作家 - 发布20部作品
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of workPublishAchievements) {
      try {
        const result = await this.updateProgressByName(userId, achievementName, increment);
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked work publish achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update work publish progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 获取用户已发布的作品数量
   * 
   * @param userId 用户ID
   * @returns 已发布的作品数量
   */
  async getPublishedWorkCount(userId: string): Promise<number> {
    try {
      return await this.prisma.work.count({
        where: {
          authorId: userId,
          status: 'PUBLISHED',
          isDeleted: false,
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get published work count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 追踪用户字数成就进度
   * 
   * 需求24.4.2: 字数成就（万字新秀→千万传奇）
   * 
   * 当用户发布章节时调用此方法，更新所有字数相关成就的进度
   * 
   * 成就列表：
   * - words_10k: 万字新秀 - 累计创作10,000字
   * - words_100k: 十万字作者 - 累计创作100,000字
   * - words_1m: 百万字大神 - 累计创作1,000,000字
   * - words_5m: 五百万传说 - 累计创作5,000,000字
   * - words_10m: 千万传奇 - 累计创作10,000,000字
   * 
   * @param userId 用户ID
   * @param wordCount 新增的字数
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackWordCount(
    userId: string,
    wordCount: number,
  ): Promise<UpdateProgressResponseDto[]> {
    const wordCountAchievements = [
      'words_10k',   // 万字新秀 - 累计创作10,000字
      'words_100k',  // 十万字作者 - 累计创作100,000字
      'words_1m',    // 百万字大神 - 累计创作1,000,000字
      'words_5m',    // 五百万传说 - 累计创作5,000,000字
      'words_10m',   // 千万传奇 - 累计创作10,000,000字
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of wordCountAchievements) {
      try {
        const result = await this.updateProgressByName(
          userId,
          achievementName,
          wordCount,
        );
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked word count achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update word count progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 获取用户累计创作字数
   * 
   * @param userId 用户ID
   * @returns 累计创作字数
   */
  async getTotalWordCount(userId: string): Promise<number> {
    try {
      const result = await this.prisma.work.aggregate({
        where: {
          authorId: userId,
          isDeleted: false,
        },
        _sum: {
          wordCount: true,
        },
      });
      return result._sum.wordCount ?? 0;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get total word count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 同步用户字数成就进度
   * 
   * 用于初始化或修复用户的字数成就进度，基于用户当前的累计字数设置进度
   * 
   * @param userId 用户ID
   * @returns 更新结果列表
   */
  async syncWordCountProgress(userId: string): Promise<UpdateProgressResponseDto[]> {
    const totalWordCount = await this.getTotalWordCount(userId);
    
    if (totalWordCount === 0) {
      return [];
    }

    const wordCountAchievements = [
      'words_10k',   // 万字新秀 - 累计创作10,000字
      'words_100k',  // 十万字作者 - 累计创作100,000字
      'words_1m',    // 百万字大神 - 累计创作1,000,000字
      'words_5m',    // 五百万传说 - 累计创作5,000,000字
      'words_10m',   // 千万传奇 - 累计创作10,000,000字
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of wordCountAchievements) {
      try {
        const achievement = await this.prisma.achievement.findUnique({
          where: { name: achievementName },
        });

        if (achievement && achievement.isActive) {
          const result = await this.setProgress(
            userId,
            achievement.id,
            totalWordCount,
          );
          results.push(result);

          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked word count achievement: ${achievementName} (synced)`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync word count progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 追踪作者被阅读成就进度
   * 
   * 需求24.4.3: 被阅读成就（初露锋芒→百万人气）
   * 
   * 当用户的作品被阅读时调用此方法，更新所有被阅读相关成就的进度
   * 
   * 成就列表：
   * - views_100: 初露锋芒 - 作品累计被阅读100次
   * - views_1k: 小有名气 - 作品累计被阅读1,000次
   * - views_10k: 人气作者 - 作品累计被阅读10,000次
   * - views_100k: 大神作者 - 作品累计被阅读100,000次
   * - views_1m: 百万人气 - 作品累计被阅读1,000,000次
   * 
   * @param authorId 作者用户ID
   * @param increment 增加的阅读次数（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackWorkViews(
    authorId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const workViewsAchievements = [
      'views_100',   // 初露锋芒 - 作品累计被阅读100次
      'views_1k',    // 小有名气 - 作品累计被阅读1,000次
      'views_10k',   // 人气作者 - 作品累计被阅读10,000次
      'views_100k',  // 大神作者 - 作品累计被阅读100,000次
      'views_1m',    // 百万人气 - 作品累计被阅读1,000,000次
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of workViewsAchievements) {
      try {
        const result = await this.updateProgressByName(
          authorId,
          achievementName,
          increment,
        );
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `Author ${authorId} unlocked work views achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update work views progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 获取作者作品累计被阅读次数
   * 
   * @param authorId 作者用户ID
   * @returns 累计被阅读次数
   */
  async getTotalWorkViews(authorId: string): Promise<number> {
    try {
      const result = await this.prisma.work.aggregate({
        where: {
          authorId,
          isDeleted: false,
        },
        _sum: {
          viewCount: true,
        },
      });
      return result._sum.viewCount ?? 0;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get total work views: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 同步作者被阅读成就进度
   * 
   * 用于初始化或修复作者的被阅读成就进度，基于作者当前的累计被阅读次数设置进度
   * 
   * @param authorId 作者用户ID
   * @returns 更新结果列表
   */
  async syncWorkViewsProgress(authorId: string): Promise<UpdateProgressResponseDto[]> {
    const totalViews = await this.getTotalWorkViews(authorId);
    
    if (totalViews === 0) {
      return [];
    }

    const workViewsAchievements = [
      'views_100',   // 初露锋芒 - 作品累计被阅读100次
      'views_1k',    // 小有名气 - 作品累计被阅读1,000次
      'views_10k',   // 人气作者 - 作品累计被阅读10,000次
      'views_100k',  // 大神作者 - 作品累计被阅读100,000次
      'views_1m',    // 百万人气 - 作品累计被阅读1,000,000次
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of workViewsAchievements) {
      try {
        const achievement = await this.prisma.achievement.findUnique({
          where: { name: achievementName },
        });

        if (achievement && achievement.isActive) {
          const result = await this.setProgress(
            authorId,
            achievement.id,
            totalViews,
          );
          results.push(result);

          if (result.isNewlyUnlocked) {
            this.logger.log(
              `Author ${authorId} unlocked work views achievement: ${achievementName} (synced)`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync work views progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 追踪作者被引用成就进度
   * 
   * 需求24.4.4: 被引用成就（金句初现→名言制造机）
   * 
   * 当用户的内容被引用时调用此方法，更新所有被引用相关成就的进度
   * 
   * 成就列表：
   * - quote_first: 金句初现 - 内容被引用1次
   * - quote_10: 妙语连珠 - 内容被引用10次
   * - quote_50: 引用达人 - 内容被引用50次
   * - quote_200: 金句大师 - 内容被引用200次
   * - quote_1000: 名言制造机 - 内容被引用1000次
   * 
   * @param authorId 作者用户ID（被引用内容的作者）
   * @param increment 增加的引用次数（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackBeingQuoted(
    authorId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const beingQuotedAchievements = [
      'quote_first',  // 金句初现 - 内容被引用1次
      'quote_10',     // 妙语连珠 - 内容被引用10次
      'quote_50',     // 引用达人 - 内容被引用50次
      'quote_200',    // 金句大师 - 内容被引用200次
      'quote_1000',   // 名言制造机 - 内容被引用1000次
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of beingQuotedAchievements) {
      try {
        const result = await this.updateProgressByName(
          authorId,
          achievementName,
          increment,
        );
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `Author ${authorId} unlocked being quoted achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update being quoted progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 获取作者内容累计被引用次数
   * 
   * 统计作者所有作品中所有段落的被引用总次数
   * 
   * @param authorId 作者用户ID
   * @returns 累计被引用次数
   */
  async getTotalQuoteCount(authorId: string): Promise<number> {
    try {
      // 获取作者所有作品的段落被引用总数
      const result = await this.prisma.paragraph.aggregate({
        where: {
          chapter: {
            work: {
              authorId,
              isDeleted: false,
            },
          },
        },
        _sum: {
          quoteCount: true,
        },
      });
      return result._sum.quoteCount ?? 0;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get total quote count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 同步作者被引用成就进度
   * 
   * 用于初始化或修复作者的被引用成就进度，基于作者当前的累计被引用次数设置进度
   * 
   * @param authorId 作者用户ID
   * @returns 更新结果列表
   */
  async syncBeingQuotedProgress(authorId: string): Promise<UpdateProgressResponseDto[]> {
    const totalQuotes = await this.getTotalQuoteCount(authorId);
    
    if (totalQuotes === 0) {
      return [];
    }

    const beingQuotedAchievements = [
      'quote_first',  // 金句初现 - 内容被引用1次
      'quote_10',     // 妙语连珠 - 内容被引用10次
      'quote_50',     // 引用达人 - 内容被引用50次
      'quote_200',    // 金句大师 - 内容被引用200次
      'quote_1000',   // 名言制造机 - 内容被引用1000次
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of beingQuotedAchievements) {
      try {
        const achievement = await this.prisma.achievement.findUnique({
          where: { name: achievementName },
        });

        if (achievement && achievement.isActive) {
          const result = await this.setProgress(
            authorId,
            achievement.id,
            totalQuotes,
          );
          results.push(result);

          if (result.isNewlyUnlocked) {
            this.logger.log(
              `Author ${authorId} unlocked being quoted achievement: ${achievementName} (synced)`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync being quoted progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 追踪用户连续更新成就进度
   * 
   * 需求24.4.5: 连续更新成就（日更新手→年更传奇）
   * 
   * 当用户发布章节时调用此方法，更新连续更新天数并检查成就解锁
   * 
   * 逻辑：
   * - 如果今天已经更新过，不重复计算
   * - 如果是连续的第二天更新，增加连续天数
   * - 如果中断了（超过一天没更新），重置连续天数为1
   * 
   * 成就列表：
   * - update_3days: 日更新手 - 连续更新3天
   * - update_7days: 周更达人 - 连续更新7天
   * - update_30days: 月更大神 - 连续更新30天
   * - update_90days: 季更传说 - 连续更新90天
   * - update_365days: 年更传奇 - 连续更新365天
   * 
   * @param userId 用户ID
   * @returns 更新结果，包含新的连续天数和解锁的成就
   */
  async trackConsecutiveUpdate(
    userId: string,
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    isNewDay: boolean;
    achievements: UpdateProgressResponseDto[];
  }> {
    const results: UpdateProgressResponseDto[] = [];

    try {
      // 获取用户当前的更新统计
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          lastUpdateDate: true,
          currentUpdateStreak: true,
          longestUpdateStreak: true,
        },
      });

      if (!user) {
        this.logger.warn(`User not found: ${userId}`);
        return {
          currentStreak: 0,
          longestStreak: 0,
          isNewDay: false,
          achievements: [],
        };
      }

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastUpdate = user.lastUpdateDate
        ? new Date(
            user.lastUpdateDate.getFullYear(),
            user.lastUpdateDate.getMonth(),
            user.lastUpdateDate.getDate(),
          )
        : null;

      // 计算日期差
      let newStreak = user.currentUpdateStreak;
      let isNewDay = false;

      if (!lastUpdate) {
        // 首次更新
        newStreak = 1;
        isNewDay = true;
      } else {
        const daysDiff = Math.floor(
          (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysDiff === 0) {
          // 今天已经更新过，不重复计算
          isNewDay = false;
        } else if (daysDiff === 1) {
          // 连续更新（昨天更新过）
          newStreak = user.currentUpdateStreak + 1;
          isNewDay = true;
        } else {
          // 中断了，重置连续天数
          newStreak = 1;
          isNewDay = true;
        }
      }

      // 更新最长连续天数
      const newLongestStreak = Math.max(newStreak, user.longestUpdateStreak);

      // 如果是新的一天，更新用户记录
      if (isNewDay) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            lastUpdateDate: now,
            currentUpdateStreak: newStreak,
            longestUpdateStreak: newLongestStreak,
          },
        });

        this.logger.log(
          `User ${userId} consecutive update streak: ${newStreak} days`,
        );

        // 更新连续更新成就进度
        const consecutiveUpdateAchievements = [
          'update_3days',   // 日更新手 - 连续更新3天
          'update_7days',   // 周更达人 - 连续更新7天
          'update_30days',  // 月更大神 - 连续更新30天
          'update_90days',  // 季更传说 - 连续更新90天
          'update_365days', // 年更传奇 - 连续更新365天
        ];

        for (const achievementName of consecutiveUpdateAchievements) {
          try {
            const achievement = await this.prisma.achievement.findUnique({
              where: { name: achievementName },
            });

            if (achievement && achievement.isActive) {
              // 使用 setProgress 设置绝对值（当前连续天数）
              const result = await this.setProgress(
                userId,
                achievement.id,
                newStreak,
              );
              results.push(result);

              if (result.isNewlyUnlocked) {
                this.logger.log(
                  `User ${userId} unlocked consecutive update achievement: ${achievementName}`,
                );
              }
            }
          } catch (error) {
            this.logger.warn(
              `Failed to update consecutive update progress for ${achievementName}: ${error}`,
            );
          }
        }
      }

      return {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        isNewDay,
        achievements: results,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to track consecutive update: ${errorMessage}`);
      return {
        currentStreak: 0,
        longestStreak: 0,
        isNewDay: false,
        achievements: [],
      };
    }
  }

  /**
   * 获取用户当前连续更新天数
   * 
   * @param userId 用户ID
   * @returns 当前连续更新天数
   */
  async getCurrentUpdateStreak(userId: string): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          lastUpdateDate: true,
          currentUpdateStreak: true,
        },
      });

      if (!user || !user.lastUpdateDate) {
        return 0;
      }

      // 检查连续性是否已中断
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const lastUpdate = new Date(
        user.lastUpdateDate.getFullYear(),
        user.lastUpdateDate.getMonth(),
        user.lastUpdateDate.getDate(),
      );

      const daysDiff = Math.floor(
        (today.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24),
      );

      // 如果超过1天没更新，连续性已中断
      if (daysDiff > 1) {
        return 0;
      }

      return user.currentUpdateStreak;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get current update streak: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 获取用户最长连续更新天数
   * 
   * @param userId 用户ID
   * @returns 最长连续更新天数
   */
  async getLongestUpdateStreak(userId: string): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { longestUpdateStreak: true },
      });

      return user?.longestUpdateStreak ?? 0;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get longest update streak: ${errorMessage}`,
      );
      return 0;
    }
  }

  /**
   * 重置用户连续更新天数（管理员用）
   * 
   * @param userId 用户ID
   */
  async resetUpdateStreak(userId: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastUpdateDate: null,
          currentUpdateStreak: 0,
        },
      });

      this.logger.log(`Reset update streak for user ${userId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reset update streak: ${errorMessage}`);
      throw new InternalServerErrorException('重置连续更新天数失败');
    }
  }

  /**
   * 追踪用户粉丝成就进度
   * 
   * 需求24.5.1: 粉丝成就（初有粉丝→顶流达人）
   * 
   * 当用户获得新粉丝时调用此方法，更新所有粉丝相关成就的进度
   * 
   * 成就列表：
   * - follower_first: 初有粉丝 - 获得1个粉丝
   * - follower_10: 小有人气 - 获得10个粉丝
   * - follower_100: 人气新星 - 获得100个粉丝
   * - follower_1k: 万人迷 - 获得1,000个粉丝
   * - follower_10k: 顶流达人 - 获得10,000个粉丝
   * 
   * @param userId 被关注的用户ID（获得粉丝的用户）
   * @param increment 增加的粉丝数（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackFollowerCount(
    userId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const followerAchievements = [
      'follower_first',  // 初有粉丝 - 获得1个粉丝
      'follower_10',     // 小有人气 - 获得10个粉丝
      'follower_100',    // 人气新星 - 获得100个粉丝
      'follower_1k',     // 万人迷 - 获得1,000个粉丝
      'follower_10k',    // 顶流达人 - 获得10,000个粉丝
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of followerAchievements) {
      try {
        const result = await this.updateProgressByName(
          userId,
          achievementName,
          increment,
        );
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked follower achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update follower progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 获取用户当前粉丝数量
   * 
   * @param userId 用户ID
   * @returns 粉丝数量
   */
  async getFollowerCount(userId: string): Promise<number> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const count = await (this.prisma as any).follow.count({
        where: { followingId: userId },
      });
      return count as number;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get follower count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 同步用户粉丝成就进度
   * 
   * 用于初始化或修复用户的粉丝成就进度，基于用户当前的粉丝数量设置进度
   * 
   * @param userId 用户ID
   * @returns 更新结果列表
   */
  async syncFollowerProgress(userId: string): Promise<UpdateProgressResponseDto[]> {
    const followerCount = await this.getFollowerCount(userId);
    
    if (followerCount === 0) {
      return [];
    }

    const followerAchievements = [
      'follower_first',  // 初有粉丝 - 获得1个粉丝
      'follower_10',     // 小有人气 - 获得10个粉丝
      'follower_100',    // 人气新星 - 获得100个粉丝
      'follower_1k',     // 万人迷 - 获得1,000个粉丝
      'follower_10k',    // 顶流达人 - 获得10,000个粉丝
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of followerAchievements) {
      try {
        const achievement = await this.prisma.achievement.findUnique({
          where: { name: achievementName },
        });

        if (achievement && achievement.isActive) {
          const result = await this.setProgress(
            userId,
            achievement.id,
            followerCount,
          );
          results.push(result);

          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked follower achievement: ${achievementName} (synced)`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync follower progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 处理取消关注时的粉丝成就进度
   * 
   * 当用户被取消关注时调用此方法，同步粉丝成就进度到实际粉丝数
   * 注意：已解锁的成就不会被撤销
   * 
   * @param userId 被取消关注的用户ID
   * @returns 更新结果列表
   */
  async decreaseFollowerProgress(
    userId: string,
  ): Promise<UpdateProgressResponseDto[]> {
    // 同步到实际粉丝数（不会低于0，已解锁的成就不会被撤销）
    return this.syncFollowerProgress(userId);
  }

  /**
   * 追踪用户互动成就进度（评论数）
   * 
   * 需求24.5.2: 互动成就（话唠新手→互动之王）
   * 
   * 当用户发布评论时调用此方法，更新所有互动相关成就的进度
   * 
   * 成就列表：
   * - comment_10: 话唠新手 - 发布10条评论
   * - comment_50: 评论达人 - 发布50条评论
   * - comment_200: 互动高手 - 发布200条评论
   * - comment_500: 社区活跃者 - 发布500条评论
   * - comment_1k: 互动之王 - 发布1,000条评论
   * 
   * @param userId 用户ID
   * @param increment 增加的评论数（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackCommentCount(
    userId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const commentAchievements = [
      'comment_10',    // 话唠新手 - 发布10条评论
      'comment_50',    // 评论达人 - 发布50条评论
      'comment_200',   // 互动高手 - 发布200条评论
      'comment_500',   // 社区活跃者 - 发布500条评论
      'comment_1k',    // 互动之王 - 发布1,000条评论
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of commentAchievements) {
      try {
        const result = await this.updateProgressByName(
          userId,
          achievementName,
          increment,
        );
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked comment achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update comment progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 获取用户当前评论数量
   * 
   * @param userId 用户ID
   * @returns 评论数量
   */
  async getCommentCount(userId: string): Promise<number> {
    try {
      const count = await this.prisma.comment.count({
        where: { authorId: userId },
      });
      return count;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get comment count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 同步用户互动成就进度
   * 
   * 用于初始化或修复用户的互动成就进度，基于用户当前的评论数量设置进度
   * 
   * @param userId 用户ID
   * @returns 更新结果列表
   */
  async syncCommentProgress(userId: string): Promise<UpdateProgressResponseDto[]> {
    const commentCount = await this.getCommentCount(userId);
    
    if (commentCount === 0) {
      return [];
    }

    const commentAchievements = [
      'comment_10',    // 话唠新手 - 发布10条评论
      'comment_50',    // 评论达人 - 发布50条评论
      'comment_200',   // 互动高手 - 发布200条评论
      'comment_500',   // 社区活跃者 - 发布500条评论
      'comment_1k',    // 互动之王 - 发布1,000条评论
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of commentAchievements) {
      try {
        const achievement = await this.prisma.achievement.findUnique({
          where: { name: achievementName },
        });

        if (achievement && achievement.isActive) {
          const result = await this.setProgress(
            userId,
            achievement.id,
            commentCount,
          );
          results.push(result);

          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked comment achievement: ${achievementName} (synced)`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync comment progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 追踪用户点赞给予成就进度
   * 
   * 需求24.5.3: 点赞成就（给予）
   * 
   * 当用户给予点赞时调用此方法，更新所有点赞给予相关成就的进度
   * 
   * 成就列表：
   * - like_giver_10: 点赞新手 - 给予10个点赞
   * - like_giver_100: 点赞达人 - 给予100个点赞
   * - like_giver_500: 点赞狂魔 - 给予500个点赞
   * - like_giver_1k: 点赞大师 - 给予1,000个点赞
   * 
   * @param userId 点赞的用户ID
   * @param increment 增加的点赞数（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackLikesGiven(
    userId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const likeGivenAchievements = [
      'like_giver_10',   // 点赞新手 - 给予10个点赞
      'like_giver_100',  // 点赞达人 - 给予100个点赞
      'like_giver_500',  // 点赞狂魔 - 给予500个点赞
      'like_giver_1k',   // 点赞大师 - 给予1,000个点赞
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of likeGivenAchievements) {
      try {
        const result = await this.updateProgressByName(
          userId,
          achievementName,
          increment,
        );
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked like given achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update like given progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 获取用户给予的点赞数量
   * 
   * @param userId 用户ID
   * @returns 给予的点赞数量
   */
  async getLikesGivenCount(userId: string): Promise<number> {
    try {
      const count = await this.prisma.like.count({
        where: { userId },
      });
      return count;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get likes given count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 同步用户点赞给予成就进度
   * 
   * 用于初始化或修复用户的点赞给予成就进度，基于用户当前给予的点赞数量设置进度
   * 
   * @param userId 用户ID
   * @returns 更新结果列表
   */
  async syncLikesGivenProgress(userId: string): Promise<UpdateProgressResponseDto[]> {
    const likesGivenCount = await this.getLikesGivenCount(userId);
    
    if (likesGivenCount === 0) {
      return [];
    }

    const likeGivenAchievements = [
      'like_giver_10',   // 点赞新手 - 给予10个点赞
      'like_giver_100',  // 点赞达人 - 给予100个点赞
      'like_giver_500',  // 点赞狂魔 - 给予500个点赞
      'like_giver_1k',   // 点赞大师 - 给予1,000个点赞
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of likeGivenAchievements) {
      try {
        const achievement = await this.prisma.achievement.findUnique({
          where: { name: achievementName },
        });

        if (achievement && achievement.isActive) {
          const result = await this.setProgress(
            userId,
            achievement.id,
            likesGivenCount,
          );
          results.push(result);

          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked like given achievement: ${achievementName} (synced)`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync like given progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 追踪用户点赞获得成就进度
   * 
   * 需求24.5.3: 点赞成就（获得）
   * 
   * 当用户获得点赞时调用此方法，更新所有点赞获得相关成就的进度
   * 
   * 成就列表：
   * - like_receiver_10: 初获好评 - 获得10个点赞
   * - like_receiver_100: 人气内容 - 获得100个点赞
   * - like_receiver_1k: 爆款制造者 - 获得1,000个点赞
   * - like_receiver_10k: 万赞达人 - 获得10,000个点赞
   * 
   * @param userId 获得点赞的用户ID（内容作者）
   * @param increment 增加的点赞数（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackLikesReceived(
    userId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const likeReceivedAchievements = [
      'like_receiver_10',   // 初获好评 - 获得10个点赞
      'like_receiver_100',  // 人气内容 - 获得100个点赞
      'like_receiver_1k',   // 爆款制造者 - 获得1,000个点赞
      'like_receiver_10k',  // 万赞达人 - 获得10,000个点赞
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of likeReceivedAchievements) {
      try {
        const result = await this.updateProgressByName(
          userId,
          achievementName,
          increment,
        );
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked like received achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update like received progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 获取用户获得的点赞数量
   * 
   * 统计用户所有内容（卡片和评论）获得的点赞总数
   * 
   * @param userId 用户ID
   * @returns 获得的点赞数量
   */
  async getLikesReceivedCount(userId: string): Promise<number> {
    try {
      // 获取用户卡片获得的点赞数
      const cardLikes = await this.prisma.like.count({
        where: {
          targetType: 'CARD',
          card: {
            authorId: userId,
          },
        },
      });

      // 获取用户评论获得的点赞数
      const commentLikes = await this.prisma.like.count({
        where: {
          targetType: 'COMMENT',
          targetId: {
            in: await this.prisma.comment
              .findMany({
                where: { authorId: userId },
                select: { id: true },
              })
              .then((comments) => comments.map((c) => c.id)),
          },
        },
      });

      return cardLikes + commentLikes;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get likes received count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 同步用户点赞获得成就进度
   * 
   * 用于初始化或修复用户的点赞获得成就进度，基于用户当前获得的点赞数量设置进度
   * 
   * @param userId 用户ID
   * @returns 更新结果列表
   */
  async syncLikesReceivedProgress(userId: string): Promise<UpdateProgressResponseDto[]> {
    const likesReceivedCount = await this.getLikesReceivedCount(userId);
    
    if (likesReceivedCount === 0) {
      return [];
    }

    const likeReceivedAchievements = [
      'like_receiver_10',   // 初获好评 - 获得10个点赞
      'like_receiver_100',  // 人气内容 - 获得100个点赞
      'like_receiver_1k',   // 爆款制造者 - 获得1,000个点赞
      'like_receiver_10k',  // 万赞达人 - 获得10,000个点赞
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of likeReceivedAchievements) {
      try {
        const achievement = await this.prisma.achievement.findUnique({
          where: { name: achievementName },
        });

        if (achievement && achievement.isActive) {
          const result = await this.setProgress(
            userId,
            achievement.id,
            likesReceivedCount,
          );
          results.push(result);

          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked like received achievement: ${achievementName} (synced)`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync like received progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 追踪用户打赏给予成就进度
   * 
   * 需求24.5.4: 打赏成就（给予）
   * 
   * 当用户给予打赏时调用此方法，更新所有打赏给予相关成就的进度
   * 
   * 成就列表：
   * - tip_giver_first: 首次打赏 - 给予1次打赏
   * - tip_giver_10: 打赏达人 - 给予10次打赏
   * - tip_giver_50: 慷慨金主 - 给予50次打赏
   * - tip_giver_100: 金主爸爸 - 给予100次打赏
   * 
   * @param userId 打赏的用户ID
   * @param increment 增加的打赏次数（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackTipsGiven(
    userId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const tipGivenAchievements = [
      'tip_giver_first',  // 首次打赏 - 给予1次打赏
      'tip_giver_10',     // 打赏达人 - 给予10次打赏
      'tip_giver_50',     // 慷慨金主 - 给予50次打赏
      'tip_giver_100',    // 金主爸爸 - 给予100次打赏
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of tipGivenAchievements) {
      try {
        const result = await this.updateProgressByName(
          userId,
          achievementName,
          increment,
        );
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked tip given achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update tip given progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 获取用户给予的打赏次数
   * 
   * @param userId 用户ID
   * @returns 给予的打赏次数
   */
  async getTipsGivenCount(userId: string): Promise<number> {
    try {
      const count = await this.prisma.tipRecord.count({
        where: { fromUserId: userId },
      });
      return count;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get tips given count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 同步用户打赏给予成就进度
   * 
   * 用于初始化或修复用户的打赏给予成就进度，基于用户当前给予的打赏次数设置进度
   * 
   * @param userId 用户ID
   * @returns 更新结果列表
   */
  async syncTipsGivenProgress(userId: string): Promise<UpdateProgressResponseDto[]> {
    const tipsGivenCount = await this.getTipsGivenCount(userId);
    
    if (tipsGivenCount === 0) {
      return [];
    }

    const tipGivenAchievements = [
      'tip_giver_first',  // 首次打赏 - 给予1次打赏
      'tip_giver_10',     // 打赏达人 - 给予10次打赏
      'tip_giver_50',     // 慷慨金主 - 给予50次打赏
      'tip_giver_100',    // 金主爸爸 - 给予100次打赏
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of tipGivenAchievements) {
      try {
        const achievement = await this.prisma.achievement.findUnique({
          where: { name: achievementName },
        });

        if (achievement && achievement.isActive) {
          const result = await this.setProgress(
            userId,
            achievement.id,
            tipsGivenCount,
          );
          results.push(result);

          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked tip given achievement: ${achievementName} (synced)`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync tip given progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 追踪用户打赏获得成就进度
   * 
   * 需求24.5.4: 打赏成就（获得）
   * 
   * 当用户获得打赏时调用此方法，更新所有打赏获得相关成就的进度
   * 
   * 成就列表：
   * - tip_receiver_first: 首次收益 - 获得1次打赏
   * - tip_receiver_10: 小有收益 - 获得10次打赏
   * - tip_receiver_50: 人气创作者 - 获得50次打赏
   * - tip_receiver_100: 收益达人 - 获得100次打赏
   * 
   * @param userId 获得打赏的用户ID（创作者）
   * @param increment 增加的打赏次数（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackTipsReceived(
    userId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const tipReceivedAchievements = [
      'tip_receiver_first',  // 首次收益 - 获得1次打赏
      'tip_receiver_10',     // 小有收益 - 获得10次打赏
      'tip_receiver_50',     // 人气创作者 - 获得50次打赏
      'tip_receiver_100',    // 收益达人 - 获得100次打赏
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of tipReceivedAchievements) {
      try {
        const result = await this.updateProgressByName(
          userId,
          achievementName,
          increment,
        );
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked tip received achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update tip received progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 获取用户获得的打赏次数
   * 
   * @param userId 用户ID
   * @returns 获得的打赏次数
   */
  async getTipsReceivedCount(userId: string): Promise<number> {
    try {
      const count = await this.prisma.tipRecord.count({
        where: { toUserId: userId },
      });
      return count;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get tips received count: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 同步用户打赏获得成就进度
   * 
   * 用于初始化或修复用户的打赏获得成就进度，基于用户当前获得的打赏次数设置进度
   * 
   * @param userId 用户ID
   * @returns 更新结果列表
   */
  async syncTipsReceivedProgress(userId: string): Promise<UpdateProgressResponseDto[]> {
    const tipsReceivedCount = await this.getTipsReceivedCount(userId);
    
    if (tipsReceivedCount === 0) {
      return [];
    }

    const tipReceivedAchievements = [
      'tip_receiver_first',  // 首次收益 - 获得1次打赏
      'tip_receiver_10',     // 小有收益 - 获得10次打赏
      'tip_receiver_50',     // 人气创作者 - 获得50次打赏
      'tip_receiver_100',    // 收益达人 - 获得100次打赏
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of tipReceivedAchievements) {
      try {
        const achievement = await this.prisma.achievement.findUnique({
          where: { name: achievementName },
        });

        if (achievement && achievement.isActive) {
          const result = await this.setProgress(
            userId,
            achievement.id,
            tipsReceivedCount,
          );
          results.push(result);

          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked tip received achievement: ${achievementName} (synced)`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to sync tip received progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 追踪用户账户年龄成就进度
   * 
   * 需求24.6.1: 元老用户成就（新人报到/月度会员/季度元老/年度元老）
   * 
   * 在用户登录时调用此方法，检查账户年龄并更新成就进度
   * 
   * 成就列表：
   * - veteran_1day: 新人报到 - 注册满1天
   * - veteran_30days: 月度会员 - 注册满30天
   * - veteran_90days: 季度元老 - 注册满90天
   * - veteran_365days: 年度元老 - 注册满365天
   * 
   * @param userId 用户ID
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackAccountAge(userId: string): Promise<UpdateProgressResponseDto[]> {
    const results: UpdateProgressResponseDto[] = [];

    try {
      // 获取用户注册时间
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) {
        this.logger.warn(`User ${userId} not found for account age tracking`);
        return results;
      }

      // 计算账户年龄（天数）
      const now = new Date();
      const createdAt = new Date(user.createdAt);
      const diffMs = now.getTime() - createdAt.getTime();
      const accountAgeDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      this.logger.debug(
        `User ${userId} account age: ${accountAgeDays} days`,
      );

      // 元老用户成就列表
      const veteranAchievements = [
        'veteran_1day',    // 新人报到 - 注册满1天
        'veteran_30days',  // 月度会员 - 注册满30天
        'veteran_90days',  // 季度元老 - 注册满90天
        'veteran_365days', // 年度元老 - 注册满365天
      ];

      // 更新所有元老用户成就的进度
      for (const achievementName of veteranAchievements) {
        try {
          const achievement = await this.prisma.achievement.findUnique({
            where: { name: achievementName },
          });

          if (achievement && achievement.isActive) {
            // 使用 setProgress 设置绝对值（账户年龄天数）
            const result = await this.setProgress(
              userId,
              achievement.id,
              accountAgeDays,
            );
            results.push(result);

            if (result.isNewlyUnlocked) {
              this.logger.log(
                `User ${userId} unlocked veteran achievement: ${achievementName} (${accountAgeDays} days)`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failed to update account age progress for ${achievementName}: ${error}`,
          );
        }
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to track account age: ${errorMessage}`);
      return results;
    }
  }

  /**
   * 获取用户账户年龄（天数）
   * 
   * @param userId 用户ID
   * @returns 账户年龄（天数）
   */
  async getAccountAgeDays(userId: string): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) {
        return 0;
      }

      const now = new Date();
      const createdAt = new Date(user.createdAt);
      const diffMs = now.getTime() - createdAt.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get account age: ${errorMessage}`);
      return 0;
    }
  }

  // ==================== 隐藏成就追踪方法 ====================

  /**
   * 追踪用户发现彩蛋进度
   * 
   * 需求24.6.2: 隐藏成就（彩蛋猎人）
   * 
   * 当用户发现一个隐藏彩蛋时调用此方法，更新彩蛋猎人相关成就的进度
   * 
   * 成就列表：
   * - easter_egg_hunter: 彩蛋猎人 - 发现1个隐藏彩蛋
   * - easter_egg_collector: 彩蛋收藏家 - 发现5个隐藏彩蛋
   * 
   * @param userId 用户ID
   * @param increment 增加的彩蛋数量（默认为1）
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackEasterEggFound(
    userId: string,
    increment: number = 1,
  ): Promise<UpdateProgressResponseDto[]> {
    const easterEggAchievements = [
      'easter_egg_hunter',    // 彩蛋猎人 - 发现1个隐藏彩蛋
      'easter_egg_collector', // 彩蛋收藏家 - 发现5个隐藏彩蛋
    ];

    const results: UpdateProgressResponseDto[] = [];

    for (const achievementName of easterEggAchievements) {
      try {
        const result = await this.updateProgressByName(userId, achievementName, increment);
        if (result) {
          results.push(result);
          
          if (result.isNewlyUnlocked) {
            this.logger.log(
              `User ${userId} unlocked easter egg achievement: ${achievementName}`,
            );
          }
        }
      } catch (error) {
        this.logger.warn(
          `Failed to update easter egg progress for ${achievementName}: ${error}`,
        );
      }
    }

    return results;
  }

  /**
   * 追踪用户连续登录进度（全勤王）
   * 
   * 需求24.6.2: 隐藏成就（全勤王）
   * 
   * 当用户登录时调用此方法，更新连续登录天数并检查全勤王成就解锁
   * 
   * 逻辑：
   * - 如果今天已经登录过，不重复计算
   * - 如果是连续的第二天登录，增加连续天数
   * - 如果中断了（超过一天没登录），重置连续天数为1
   * 
   * 成就列表：
   * - weekly_perfect_attendance: 周全勤 - 连续登录7天
   * - monthly_perfect_attendance: 月全勤 - 连续登录30天
   * 
   * @param userId 用户ID
   * @returns 更新结果列表，包含新解锁的成就
   */
  async trackLoginStreak(userId: string): Promise<UpdateProgressResponseDto[]> {
    const results: UpdateProgressResponseDto[] = [];

    try {
      // 获取用户的登录连续天数记录
      let loginStreak = await this.prisma.userLoginStreak.findUnique({
        where: { userId },
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (!loginStreak) {
        // 首次登录，创建记录
        loginStreak = await this.prisma.userLoginStreak.create({
          data: {
            userId,
            currentStreak: 1,
            lastLoginDate: today,
            longestStreak: 1,
          },
        });
        this.logger.log(`User ${userId} started login streak tracking`);
      } else {
        const lastLogin = new Date(loginStreak.lastLoginDate);
        lastLogin.setHours(0, 0, 0, 0);

        const diffDays = Math.floor(
          (today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays === 0) {
          // 今天已经登录过，不重复计算
          this.logger.debug(`User ${userId} already logged in today`);
          return results;
        } else if (diffDays === 1) {
          // 连续登录，增加天数
          const newStreak = loginStreak.currentStreak + 1;
          loginStreak = await this.prisma.userLoginStreak.update({
            where: { userId },
            data: {
              currentStreak: newStreak,
              lastLoginDate: today,
              longestStreak: Math.max(loginStreak.longestStreak, newStreak),
            },
          });
          this.logger.log(
            `User ${userId} login streak increased to ${newStreak} days`,
          );
        } else {
          // 中断了，重置连续天数
          loginStreak = await this.prisma.userLoginStreak.update({
            where: { userId },
            data: {
              currentStreak: 1,
              lastLoginDate: today,
            },
          });
          this.logger.log(`User ${userId} login streak reset to 1 day`);
        }
      }

      // 更新全勤王成就进度
      const loginStreakAchievements = [
        'weekly_perfect_attendance',  // 周全勤 - 连续登录7天
        'monthly_perfect_attendance', // 月全勤 - 连续登录30天
      ];

      for (const achievementName of loginStreakAchievements) {
        try {
          const achievement = await this.prisma.achievement.findUnique({
            where: { name: achievementName },
          });

          if (achievement && achievement.isActive) {
            // 使用 setProgress 设置绝对值（当前连续天数）
            const result = await this.setProgress(
              userId,
              achievement.id,
              loginStreak.currentStreak,
            );
            results.push(result);

            if (result.isNewlyUnlocked) {
              this.logger.log(
                `User ${userId} unlocked login streak achievement: ${achievementName} (${loginStreak.currentStreak} days)`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(
            `Failed to update login streak progress for ${achievementName}: ${error}`,
          );
        }
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to track login streak: ${errorMessage}`);
      return results;
    }
  }

  /**
   * 获取用户当前连续登录天数
   * 
   * @param userId 用户ID
   * @returns 当前连续登录天数
   */
  async getLoginStreakDays(userId: string): Promise<number> {
    try {
      const loginStreak = await this.prisma.userLoginStreak.findUnique({
        where: { userId },
      });

      if (!loginStreak) {
        return 0;
      }

      // 检查是否今天或昨天登录过（连续有效）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const lastLogin = new Date(loginStreak.lastLoginDate);
      lastLogin.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24),
      );

      // 如果超过1天没登录，连续天数已失效
      if (diffDays > 1) {
        return 0;
      }

      return loginStreak.currentStreak;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get login streak: ${errorMessage}`);
      return 0;
    }
  }

  /**
   * 检查并授予早期用户成就
   * 
   * 需求24.6.2: 隐藏成就（第一批用户）
   * 
   * 当用户注册时调用此方法，检查用户是否为早期用户并授予相应成就
   * 
   * 成就列表：
   * - genesis_user: 创世用户 - 前100名注册用户
   * - pioneer_user: 先驱者 - 前1000名注册用户
   * 
   * @param userId 用户ID
   * @returns 更新结果列表，包含新解锁的成就
   */
  async checkEarlyAdopterAchievement(
    userId: string,
  ): Promise<UpdateProgressResponseDto[]> {
    const results: UpdateProgressResponseDto[] = [];

    try {
      // 获取用户的注册顺序（基于用户ID的创建顺序）
      const userRank = await this.prisma.user.count({
        where: {
          createdAt: {
            lte: (
              await this.prisma.user.findUnique({
                where: { id: userId },
                select: { createdAt: true },
              })
            )?.createdAt,
          },
        },
      });

      if (userRank === 0) {
        this.logger.warn(`User ${userId} not found for early adopter check`);
        return results;
      }

      this.logger.debug(`User ${userId} is the #${userRank} registered user`);

      // 检查创世用户成就（前100名）
      if (userRank <= 100) {
        try {
          const result = await this.updateProgressByName(userId, 'genesis_user', 1);
          if (result) {
            results.push(result);
            if (result.isNewlyUnlocked) {
              this.logger.log(
                `User ${userId} unlocked genesis_user achievement (rank: #${userRank})`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to update genesis_user progress: ${error}`);
        }
      }

      // 检查先驱者成就（前1000名）
      if (userRank <= 1000) {
        try {
          const result = await this.updateProgressByName(userId, 'pioneer_user', 1);
          if (result) {
            results.push(result);
            if (result.isNewlyUnlocked) {
              this.logger.log(
                `User ${userId} unlocked pioneer_user achievement (rank: #${userRank})`,
              );
            }
          }
        } catch (error) {
          this.logger.warn(`Failed to update pioneer_user progress: ${error}`);
        }
      }

      return results;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check early adopter achievement: ${errorMessage}`);
      return results;
    }
  }

  /**
   * 获取用户的注册排名
   * 
   * @param userId 用户ID
   * @returns 用户的注册排名（第几个注册的用户）
   */
  async getUserRegistrationRank(userId: string): Promise<number> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) {
        return 0;
      }

      return await this.prisma.user.count({
        where: {
          createdAt: {
            lte: user.createdAt,
          },
        },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user registration rank: ${errorMessage}`);
      return 0;
    }
  }
}