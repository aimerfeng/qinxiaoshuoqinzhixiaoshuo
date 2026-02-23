import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AchievementProgressService } from './achievement-progress.service.js';
import {
  AchievementCategory,
  AchievementRewardValueDto,
} from './dto/achievement.dto.js';
import {
  AchievementWithProgressDto,
  CheckUnlockResponseDto,
} from './dto/achievement-response.dto.js';

/**
 * 成就事件类型
 */
export enum AchievementEventType {
  // 阅读相关
  CHAPTER_READ = 'achievement.chapter_read',
  READING_TIME = 'achievement.reading_time',
  WORK_COMPLETED = 'achievement.work_completed',
  CONSECUTIVE_READING = 'achievement.consecutive_reading',
  GENRE_EXPLORED = 'achievement.genre_explored',

  // 创作相关
  WORK_PUBLISHED = 'achievement.work_published',
  CHAPTER_PUBLISHED = 'achievement.chapter_published',
  WORDS_WRITTEN = 'achievement.words_written',
  WORK_VIEWS = 'achievement.work_views',
  PARAGRAPH_QUOTED = 'achievement.paragraph_quoted',
  CONSECUTIVE_UPDATE = 'achievement.consecutive_update',

  // 社交相关
  FOLLOWER_GAINED = 'achievement.follower_gained',
  COMMENT_POSTED = 'achievement.comment_posted',
  LIKE_GIVEN = 'achievement.like_given',
  LIKE_RECEIVED = 'achievement.like_received',
  TIP_GIVEN = 'achievement.tip_given',
  TIP_RECEIVED = 'achievement.tip_received',

  // 收藏相关
  WORK_COLLECTED = 'achievement.work_collected',
  COLLECTION_CREATED = 'achievement.collection_created',

  // 特殊相关
  ACCOUNT_AGE = 'achievement.account_age',
  LATE_NIGHT_READING = 'achievement.late_night_reading',
  EARLY_BIRD_READING = 'achievement.early_bird_reading',
  EASTER_EGG_FOUND = 'achievement.easter_egg_found',
  LOGIN_STREAK = 'achievement.login_streak',
  EARLY_ADOPTER = 'achievement.early_adopter',
}

/**
 * 成就事件数据
 */
export interface AchievementEventData {
  userId: string;
  eventType: AchievementEventType;
  value?: number;
  metadata?: Record<string, unknown>;
}

/**
 * 成就解锁检测服务
 *
 * 需求24.1.6: 成就解锁检测服务（事件驱动）
 *
 * 功能：
 * - 监听各种用户行为事件
 * - 检测是否满足成就解锁条件
 * - 自动更新成就进度
 * - 触发成就解锁通知
 */
@Injectable()
export class AchievementUnlockService {
  private readonly logger = new Logger(AchievementUnlockService.name);

  /**
   * 事件类型到成就名称的映射
   * 用于快速查找需要更新的成就
   */
  private readonly eventToAchievementMap: Record<AchievementEventType, string[]> = {
    // 阅读成就 - 阅读量成就（初窥门径→阅尽天下）
    [AchievementEventType.CHAPTER_READ]: [
      'reading_count_beginner',     // 初窥门径 - 阅读10章节
      'reading_count_novice',       // 小有所成 - 阅读50章节
      'reading_count_intermediate', // 渐入佳境 - 阅读200章节
      'reading_count_advanced',     // 博览群书 - 阅读500章节
      'reading_count_expert',       // 学富五车 - 阅读1000章节
      'reading_count_master',       // 阅尽天下 - 阅读5000章节
    ],
    [AchievementEventType.READING_TIME]: [
      'reading_time_novice',      // 小试牛刀 - 累计阅读1小时
      'reading_time_beginner',    // 初露锋芒 - 累计阅读10小时
      'reading_time_intermediate', // 渐入佳境 - 累计阅读50小时
      'reading_time_advanced',    // 废寝忘食 - 累计阅读200小时
      'reading_time_expert',      // 书虫本虫 - 累计阅读500小时
      'reading_time_master',      // 时光旅人 - 累计阅读1000小时
    ],
    [AchievementEventType.WORK_COMPLETED]: [
      'completion_first',        // 初尝完结 - 完成1部作品
      'completion_novice',       // 小有成就 - 完成5部作品
      'completion_intermediate', // 阅读达人 - 完成20部作品
      'completion_expert',       // 完本专家 - 完成50部作品
      'completion_master',       // 书海遨游 - 完成100部作品
      'completion_legend',       // 完本狂魔 - 完成300部作品
    ],
    [AchievementEventType.CONSECUTIVE_READING]: [
      'streak_3days', // 三日不辍 - 连续阅读3天
      'streak_7days', // 周周有书 - 连续阅读7天
      'streak_30days', // 月读达人 - 连续阅读30天
      'streak_90days', // 季度书友 - 连续阅读90天
      'streak_180days', // 半年坚持 - 连续阅读180天
      'streak_365days', // 年度书友 - 连续阅读365天
    ],
    // 类型探索成就（类型新手→全类型通）
    [AchievementEventType.GENRE_EXPLORED]: [
      'genre_novice',       // 类型新手 - 阅读1种类型
      'genre_explorer',     // 类型探索者 - 阅读3种类型
      'genre_enthusiast',   // 类型爱好者 - 阅读5种类型
      'genre_expert',       // 类型达人 - 阅读8种类型
      'genre_master',       // 全类型通 - 阅读所有类型
    ],

    // 创作成就
    [AchievementEventType.WORK_PUBLISHED]: [
      'work_publish_first',    // 新人作者 - 发布1部作品
      'work_publish_rising',   // 初露锋芒 - 发布3部作品
      'work_publish_expert',   // 创作达人 - 发布5部作品
      'work_publish_prolific', // 多产作家 - 发布10部作品
      'work_publish_master',   // 高产作家 - 发布20部作品
    ],
    [AchievementEventType.CHAPTER_PUBLISHED]: [
      'chapter_first', // 首章发布 - 发布首个章节
      'chapter_100', // 百章作者 - 发布100个章节
    ],
    [AchievementEventType.WORDS_WRITTEN]: [
      'words_10k', // 万字新秀 - 累计创作1万字
      'words_100k', // 十万字作者 - 累计创作10万字
      'words_1m', // 百万字大神 - 累计创作100万字
      'words_10m', // 千万传奇 - 累计创作1000万字
    ],
    [AchievementEventType.WORK_VIEWS]: [
      'views_100', // 初露锋芒 - 作品累计阅读100次
      'views_1k', // 小有名气 - 作品累计阅读1000次
      'views_10k', // 人气作者 - 作品累计阅读1万次
      'views_100k', // 大神作者 - 作品累计阅读10万次
      'views_1m', // 百万人气 - 作品累计阅读100万次
    ],
    [AchievementEventType.PARAGRAPH_QUOTED]: [
      'quote_first',  // 金句初现 - 内容被引用1次
      'quote_10',     // 妙语连珠 - 内容被引用10次
      'quote_50',     // 引用达人 - 内容被引用50次
      'quote_200',    // 金句大师 - 内容被引用200次
      'quote_1000',   // 名言制造机 - 内容被引用1000次
    ],
    [AchievementEventType.CONSECUTIVE_UPDATE]: [
      'update_3days',   // 日更新手 - 连续更新3天
      'update_7days',   // 周更达人 - 连续更新7天
      'update_30days',  // 月更大神 - 连续更新30天
      'update_90days',  // 季更传说 - 连续更新90天
      'update_365days', // 年更传奇 - 连续更新365天
    ],

    // 社交成就
    [AchievementEventType.FOLLOWER_GAINED]: [
      'follower_first',  // 初有粉丝 - 获得首个粉丝
      'follower_10',     // 小有人气 - 获得10粉丝
      'follower_100',    // 人气新星 - 获得100粉丝
      'follower_1k',     // 万人迷 - 获得1000粉丝
      'follower_10k',    // 顶流达人 - 获得10000粉丝
    ],
    [AchievementEventType.COMMENT_POSTED]: [
      'comment_10',    // 话唠新手 - 发布10条评论
      'comment_50',    // 评论达人 - 发布50条评论
      'comment_200',   // 互动高手 - 发布200条评论
      'comment_500',   // 社区活跃者 - 发布500条评论
      'comment_1k',    // 互动之王 - 发布1000条评论
    ],
    [AchievementEventType.LIKE_GIVEN]: [
      'like_giver_10',   // 点赞新手 - 点赞10次
      'like_giver_100',  // 点赞达人 - 点赞100次
      'like_giver_500',  // 点赞狂魔 - 点赞500次
      'like_giver_1k',   // 点赞大师 - 点赞1000次
    ],
    [AchievementEventType.LIKE_RECEIVED]: [
      'like_receiver_10',   // 初获好评 - 获得10个赞
      'like_receiver_100',  // 人气内容 - 获得100个赞
      'like_receiver_1k',   // 爆款制造者 - 获得1000个赞
      'like_receiver_10k',  // 万赞达人 - 获得10000个赞
    ],
    [AchievementEventType.TIP_GIVEN]: [
      'tip_giver_first',  // 首次打赏 - 首次打赏
      'tip_giver_10',     // 打赏达人 - 打赏10次
      'tip_giver_50',     // 慷慨金主 - 打赏50次
      'tip_giver_100',    // 金主爸爸 - 打赏100次
    ],
    [AchievementEventType.TIP_RECEIVED]: [
      'tip_receiver_first',  // 首次收益 - 首次收到打赏
      'tip_receiver_10',     // 小有收益 - 收到10次打赏
      'tip_receiver_50',     // 人气创作者 - 收到50次打赏
      'tip_receiver_100',    // 收益达人 - 收到100次打赏
    ],

    // 收藏成就
    [AchievementEventType.WORK_COLLECTED]: [
      'collect_10', // 收藏新手 - 收藏10部作品
      'collect_100', // 收藏达人 - 收藏100部作品
      'collect_1k', // 收藏狂魔 - 收藏1000部作品
    ],
    [AchievementEventType.COLLECTION_CREATED]: [
      'collection_first', // 首个书单 - 创建首个书单
      'collection_10', // 书单达人 - 创建10个书单
    ],

    // 特殊成就
    [AchievementEventType.ACCOUNT_AGE]: [
      'veteran_1day',    // 新人报到 - 注册满1天
      'veteran_30days',  // 月度会员 - 注册满30天
      'veteran_90days',  // 季度元老 - 注册满90天
      'veteran_365days', // 年度元老 - 注册满1年
    ],
    [AchievementEventType.LATE_NIGHT_READING]: [
      'night_owl', // 深夜书虫 - 深夜时段（00:00-05:00）阅读10章节
    ],
    [AchievementEventType.EARLY_BIRD_READING]: [
      'early_bird', // 早起鸟儿 - 早晨时段（05:00-07:00）阅读10章节
    ],
    [AchievementEventType.EASTER_EGG_FOUND]: [
      'easter_egg_hunter',    // 彩蛋猎人 - 发现1个隐藏彩蛋
      'easter_egg_collector', // 彩蛋收藏家 - 发现5个隐藏彩蛋
    ],
    [AchievementEventType.LOGIN_STREAK]: [
      'weekly_perfect_attendance',  // 周全勤 - 连续登录7天
      'monthly_perfect_attendance', // 月全勤 - 连续登录30天
    ],
    [AchievementEventType.EARLY_ADOPTER]: [
      'genesis_user',  // 创世用户 - 前100名注册用户
      'pioneer_user',  // 先驱者 - 前1000名注册用户
    ],
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: AchievementProgressService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 处理成就事件
   *
   * 需求24.1.6: 成就解锁检测服务（事件驱动）
   */
  @OnEvent('achievement.*')
  async handleAchievementEvent(data: AchievementEventData): Promise<void> {
    try {
      const { userId, eventType, value = 1 } = data;

      this.logger.debug(
        `Processing achievement event: ${eventType} for user ${userId}`,
      );

      // 获取该事件类型对应的成就列表
      const achievementNames = this.eventToAchievementMap[eventType] || [];

      if (achievementNames.length === 0) {
        this.logger.debug(`No achievements mapped for event type: ${eventType}`);
        return;
      }

      // 更新每个相关成就的进度
      for (const achievementName of achievementNames) {
        const result = await this.progressService.updateProgressByName(
          userId,
          achievementName,
          value,
        );

        if (result?.isNewlyUnlocked) {
          // 发送成就解锁通知事件
          this.eventEmitter.emit('notification.achievement_unlocked', {
            userId,
            achievementName,
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to handle achievement event: ${errorMessage}`);
    }
  }

  /**
   * 触发成就事件
   *
   * @param eventType 事件类型
   * @param userId 用户ID
   * @param value 事件值（默认为1）
   * @param metadata 额外元数据
   */
  async triggerEvent(
    eventType: AchievementEventType,
    userId: string,
    value: number = 1,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    this.eventEmitter.emit(eventType, {
      userId,
      eventType,
      value,
      metadata,
    } as AchievementEventData);
  }

  /**
   * 检查并解锁用户的所有可解锁成就
   *
   * 用于用户登录时或手动触发时检查
   */
  async checkAndUnlockAll(userId: string): Promise<CheckUnlockResponseDto> {
    try {
      const unlockedAchievements: AchievementWithProgressDto[] = [];

      // 获取所有启用的成就
      const achievements = await this.prisma.achievement.findMany({
        where: { isActive: true },
      });

      // 获取用户当前的所有进度
      const userAchievements = await this.prisma.userAchievement.findMany({
        where: { userId },
      });

      const progressMap = new Map(
        userAchievements.map((ua) => [ua.achievementId, ua]),
      );

      // 检查每个成就是否应该解锁
      for (const achievement of achievements) {
        const progress = progressMap.get(achievement.id);

        // 如果已经解锁，跳过
        if (progress?.isUnlocked) {
          continue;
        }

        // 检查进度是否达到目标
        const currentProgress = progress?.currentProgress ?? 0;
        if (currentProgress >= achievement.targetValue) {
          // 解锁成就
          const updatedProgress = await this.prisma.userAchievement.upsert({
            where: { userId_achievementId: { userId, achievementId: achievement.id } },
            create: {
              userId,
              achievementId: achievement.id,
              currentProgress,
              isUnlocked: true,
              unlockedAt: new Date(),
            },
            update: {
              isUnlocked: true,
              unlockedAt: new Date(),
            },
          });

          unlockedAchievements.push({
            id: achievement.id,
            name: achievement.name,
            displayName: achievement.displayName,
            description: achievement.description,
            category: achievement.category as unknown as AchievementCategory,
            tier: achievement.tier as unknown as import('./dto/achievement.dto.js').AchievementTier,
            iconUrl: achievement.iconUrl,
            badgeUrl: achievement.badgeUrl,
            targetValue: achievement.targetValue,
            rewardType: achievement.rewardType as unknown as import('./dto/achievement.dto.js').AchievementRewardType,
            rewardValue: achievement.rewardValue as AchievementRewardValueDto,
            isHidden: achievement.isHidden,
            isActive: achievement.isActive,
            sortOrder: achievement.sortOrder,
            createdAt: achievement.createdAt,
            updatedAt: achievement.updatedAt,
            currentProgress: updatedProgress.currentProgress,
            progressPercent: 100,
            isUnlocked: true,
            unlockedAt: updatedProgress.unlockedAt,
            isClaimed: updatedProgress.isClaimed,
            claimedAt: updatedProgress.claimedAt,
          });

          this.logger.log(
            `User ${userId} unlocked achievement: ${achievement.name}`,
          );
        }
      }

      return {
        message:
          unlockedAchievements.length > 0
            ? `解锁了 ${unlockedAchievements.length} 个成就！`
            : '没有新成就解锁',
        unlockedAchievements,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check and unlock all: ${errorMessage}`);
      throw new InternalServerErrorException('检查成就解锁失败');
    }
  }

  /**
   * 检查特定成就是否应该解锁
   */
  async checkAchievement(
    userId: string,
    achievementId: string,
  ): Promise<boolean> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement || !achievement.isActive) {
        return false;
      }

      const progress = await this.prisma.userAchievement.findUnique({
        where: { userId_achievementId: { userId, achievementId } },
      });

      if (progress?.isUnlocked) {
        return true;
      }

      const currentProgress = progress?.currentProgress ?? 0;
      return currentProgress >= achievement.targetValue;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check achievement: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 手动解锁成就（管理员/系统用）
   */
  async forceUnlock(userId: string, achievementId: string): Promise<void> {
    try {
      const achievement = await this.prisma.achievement.findUnique({
        where: { id: achievementId },
      });

      if (!achievement) {
        throw new Error('成就不存在');
      }

      await this.prisma.userAchievement.upsert({
        where: { userId_achievementId: { userId, achievementId } },
        create: {
          userId,
          achievementId,
          currentProgress: achievement.targetValue,
          isUnlocked: true,
          unlockedAt: new Date(),
        },
        update: {
          currentProgress: achievement.targetValue,
          isUnlocked: true,
          unlockedAt: new Date(),
        },
      });

      this.logger.log(
        `Force unlocked achievement ${achievement.name} for user ${userId}`,
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to force unlock: ${errorMessage}`);
      throw new InternalServerErrorException('强制解锁成就失败');
    }
  }
}
