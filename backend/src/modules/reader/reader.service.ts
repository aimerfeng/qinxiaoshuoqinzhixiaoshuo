import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChapterStatus, ContentType, PageMode } from '@prisma/client';
import {
  ChapterContentResponseDto,
  ParagraphDto,
  MangaPageDto,
  SaveReadingProgressDto,
  SaveReadingProgressResponseDto,
  GetReadingProgressResponseDto,
  GetWorkReadingProgressResponseDto,
  SaveReadingSettingsDto,
  ReadingSettingsResponseDto,
  DEFAULT_READING_SETTINGS,
  AdjacentChaptersResponseDto,
  ChapterListResponseDto,
  ChapterBriefDto,
} from './dto/index.js';
import { AchievementUnlockService, AchievementEventType } from '../achievement/achievement-unlock.service.js';
import { AchievementProgressService } from '../achievement/achievement-progress.service.js';
import { Wenku8ProxyService } from '../wenku8-proxy/wenku8-proxy.service.js';

/**
 * 阅读器服务
 * 处理阅读器相关业务逻辑
 *
 * 需求4: 沉浸式阅读器
 */
@Injectable()
export class ReaderService {
  private readonly logger = new Logger(ReaderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementUnlockService: AchievementUnlockService,
    private readonly achievementProgressService: AchievementProgressService,
    private readonly wenku8ProxyService: Wenku8ProxyService,
  ) {}

  /**
   * 获取章节内容
   * 任务4.1.1: 章节内容获取 API
   *
   * 需求4验收标准2: WHEN 用户阅读章节 THEN System SHALL 按顺序渲染 Paragraph 并显示对应 Anchor_ID 标记
   */
  async getChapterContent(
    workId: string,
    chapterId: string,
    userId?: string,
  ): Promise<ChapterContentResponseDto> {
    // 获取章节信息
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      include: {
        work: {
          select: {
            id: true,
            title: true,
            authorId: true,
            contentType: true,
            readingDirection: true,
            status: true,
            author: {
              select: {
                id: true,
                displayName: true,
                username: true,
              },
            },
          },
        },
        paragraphs: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            anchorId: true,
            content: true,
            orderIndex: true,
            quoteCount: true,
          },
        },
        mangaPages: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            imageUrl: true,
            thumbnailUrl: true,
            orderIndex: true,
            width: true,
            height: true,
          },
        },
      },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    // 检查章节访问权限
    const isAuthor = userId && chapter.work.authorId === userId;
    if (chapter.status !== ChapterStatus.PUBLISHED && !isAuthor) {
      throw new NotFoundException('章节不存在');
    }

    // 增加阅读量
    await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { viewCount: { increment: 1 } },
    });

    // 需求24.4.3: 被阅读成就（初露锋芒→百万人气）
    // 当章节被阅读时，更新作者的被阅读成就进度
    if (chapter.work.authorId) {
      try {
        await this.achievementProgressService.trackWorkViews(
          chapter.work.authorId,
          1, // 每次阅读增加1
        );
        this.logger.debug(
          `Work views achievement progress updated for author ${chapter.work.authorId}`,
        );
      } catch (achievementError) {
        // 成就更新失败不应影响阅读功能
        this.logger.warn(
          `Failed to update work views achievement progress: ${achievementError}`,
        );
      }
    }

    // 获取相邻章节
    const [prevChapter, nextChapter] = await Promise.all([
      this.prisma.chapter.findFirst({
        where: {
          workId,
          orderIndex: { lt: chapter.orderIndex },
          isDeleted: false,
          status: isAuthor ? undefined : ChapterStatus.PUBLISHED,
        },
        orderBy: { orderIndex: 'desc' },
        select: { id: true, title: true, orderIndex: true },
      }),
      this.prisma.chapter.findFirst({
        where: {
          workId,
          orderIndex: { gt: chapter.orderIndex },
          isDeleted: false,
          status: isAuthor ? undefined : ChapterStatus.PUBLISHED,
        },
        orderBy: { orderIndex: 'asc' },
        select: { id: true, title: true, orderIndex: true },
      }),
    ]);

    // 获取用户阅读进度（如果已登录）
    let readingProgress = null;
    if (userId) {
      const progress = await this.prisma.readingProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId } },
        select: {
          paragraphIndex: true,
          scrollPosition: true,
          readPercentage: true,
          lastReadAt: true,
        },
      });
      readingProgress = progress;
    }

    const isManga = chapter.work.contentType === ContentType.MANGA;

    this.logger.log(
      `Chapter content retrieved: ${chapterId} for work: ${workId}${userId ? ` by user: ${userId}` : ''}`,
    );

    return {
      message: '获取章节内容成功',
      chapter: {
        id: chapter.id,
        workId: chapter.workId,
        title: chapter.title,
        orderIndex: chapter.orderIndex,
        wordCount: chapter.wordCount,
        viewCount: chapter.viewCount + 1, // 包含本次阅读
        status: chapter.status,
        publishedAt: chapter.publishedAt,
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
      },
      work: {
        id: chapter.work.id,
        title: chapter.work.title,
        authorId: chapter.work.authorId,
        authorName:
          chapter.work.author.displayName || chapter.work.author.username,
        contentType: chapter.work.contentType,
        readingDirection: chapter.work.readingDirection,
      },
      // 小说内容
      content: isManga ? undefined : chapter.content,
      paragraphs: isManga
        ? undefined
        : chapter.paragraphs.map(
            (p): ParagraphDto => ({
              id: p.id,
              anchorId: p.anchorId,
              content: p.content,
              orderIndex: p.orderIndex,
              quoteCount: p.quoteCount,
            }),
          ),
      // 漫画内容
      pages: isManga
        ? chapter.mangaPages.map(
            (p): MangaPageDto => ({
              id: p.id,
              imageUrl: p.imageUrl,
              thumbnailUrl: p.thumbnailUrl,
              orderIndex: p.orderIndex,
              width: p.width,
              height: p.height,
            }),
          )
        : undefined,
      readingProgress,
      prevChapter,
      nextChapter,
    };
  }

  /**
   * 保存阅读进度
   * 任务4.1.2: 阅读进度保存 API
   *
   * 需求4验收标准5: WHEN 用户滚动阅读 THEN System SHALL 记录阅读进度并支持断点续读
   * 需求4验收标准8: WHEN 用户退出 Reader THEN System SHALL 保存当前阅读位置
   * 需求24.3.2: 阅读时长成就 - 计算并累计阅读时长
   */
  async saveReadingProgress(
    userId: string,
    workId: string,
    saveProgressDto: SaveReadingProgressDto,
  ): Promise<SaveReadingProgressResponseDto> {
    const { chapterId, paragraphIndex, scrollPosition, readPercentage } =
      saveProgressDto;

    // 验证章节存在且属于该作品
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      select: { id: true, workId: true, status: true },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    if (chapter.status !== ChapterStatus.PUBLISHED) {
      throw new ForbiddenException('无法保存草稿章节的阅读进度');
    }

    try {
      // Check if this is a new chapter completion (readPercentage >= 100)
      const existingProgress = await this.prisma.readingProgress.findUnique({
        where: { userId_chapterId: { userId, chapterId } },
        select: { readPercentage: true, lastReadAt: true },
      });

      const isNewCompletion = 
        readPercentage >= 100 && 
        (!existingProgress || existingProgress.readPercentage < 100);

      // 需求24.3.2: 计算阅读时长（分钟）
      // 计算自上次保存进度以来经过的时间
      let readingMinutes = 0;
      if (existingProgress?.lastReadAt) {
        const now = new Date();
        const lastReadAt = new Date(existingProgress.lastReadAt);
        const diffMs = now.getTime() - lastReadAt.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        // 限制单次阅读时长最大为60分钟，防止异常数据
        // 如果超过60分钟，可能是用户离开后回来，不计入阅读时长
        if (diffMinutes > 0 && diffMinutes <= 60) {
          readingMinutes = diffMinutes;
        }
      }

      const progress = await this.prisma.readingProgress.upsert({
        where: { userId_chapterId: { userId, chapterId } },
        create: {
          userId,
          chapterId,
          paragraphIndex,
          scrollPosition: scrollPosition ?? null,
          readPercentage,
          lastReadAt: new Date(),
        },
        update: {
          paragraphIndex,
          scrollPosition: scrollPosition ?? null,
          readPercentage,
          lastReadAt: new Date(),
        },
      });

      this.logger.log(
        `Reading progress saved: user ${userId}, chapter ${chapterId}, paragraph ${paragraphIndex}, ${readPercentage}%`,
      );

      // 需求24.3.1: 阅读量成就（初窥门径→阅尽天下）
      // 当用户完成阅读一个章节时（readPercentage >= 100），触发阅读量成就进度更新
      if (isNewCompletion) {
        try {
          await this.achievementUnlockService.triggerEvent(
            AchievementEventType.CHAPTER_READ,
            userId,
            1, // 每完成一个章节增加1
          );
          this.logger.log(
            `Achievement progress triggered for user ${userId}: CHAPTER_READ`,
          );

          // 需求24.3.4: 完本成就（初尝完结→完本狂魔）
          // 检查是否完成了整部作品的阅读
          await this.checkWorkCompletion(userId, workId);

          // 需求24.3.5: 类型探索成就（类型新手→全类型通）
          // 追踪用户阅读的作品类型
          await this.achievementProgressService.trackGenreExploration(userId, workId);
          this.logger.log(
            `Genre exploration tracked for user ${userId}, work ${workId}`,
          );

          // 需求24.6.1: 时间相关成就（深夜书虫/早起鸟儿）
          // 检查当前时间是否在特殊时段，并触发相应成就进度更新
          const currentHour = new Date().getHours();
          
          // 深夜书虫成就：00:00-05:00（0-4点）
          if (currentHour >= 0 && currentHour < 5) {
            await this.achievementUnlockService.triggerEvent(
              AchievementEventType.LATE_NIGHT_READING,
              userId,
              1, // 每完成一个章节增加1
            );
            this.logger.log(
              `Achievement progress triggered for user ${userId}: LATE_NIGHT_READING (hour: ${currentHour})`,
            );
          }
          
          // 早起鸟儿成就：05:00-07:00（5-6点）
          if (currentHour >= 5 && currentHour < 7) {
            await this.achievementUnlockService.triggerEvent(
              AchievementEventType.EARLY_BIRD_READING,
              userId,
              1, // 每完成一个章节增加1
            );
            this.logger.log(
              `Achievement progress triggered for user ${userId}: EARLY_BIRD_READING (hour: ${currentHour})`,
            );
          }
        } catch (achievementError) {
          // 成就更新失败不应影响阅读进度保存
          this.logger.warn(
            `Failed to update achievement progress: ${achievementError}`,
          );
        }
      }

      // 需求24.3.2: 阅读时长成就（小试牛刀→时光旅人）
      // 累计阅读时长并触发成就进度更新
      if (readingMinutes > 0) {
        try {
          // 更新用户的累计阅读时长
          await this.prisma.user.update({
            where: { id: userId },
            data: {
              totalReadingMinutes: { increment: readingMinutes },
            },
          });

          // 触发阅读时长成就进度更新
          await this.achievementUnlockService.triggerEvent(
            AchievementEventType.READING_TIME,
            userId,
            readingMinutes, // 增加的阅读分钟数
          );
          this.logger.log(
            `Achievement progress triggered for user ${userId}: READING_TIME (+${readingMinutes} minutes)`,
          );
        } catch (achievementError) {
          // 成就更新失败不应影响阅读进度保存
          this.logger.warn(
            `Failed to update reading time achievement progress: ${achievementError}`,
          );
        }
      }

      // 需求24.3.3: 连续阅读成就（三日不辍→年度书友）
      // 更新连续阅读天数并触发成就进度更新
      try {
        await this.updateReadingStreak(userId);
      } catch (streakError) {
        // 连续阅读更新失败不应影响阅读进度保存
        this.logger.warn(
          `Failed to update reading streak: ${streakError}`,
        );
      }

      return {
        message: '阅读进度保存成功',
        progress: {
          id: progress.id,
          userId: progress.userId,
          chapterId: progress.chapterId,
          paragraphIndex: progress.paragraphIndex,
          scrollPosition: progress.scrollPosition,
          readPercentage: progress.readPercentage,
          lastReadAt: progress.lastReadAt,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to save reading progress: ${errorMessage}`);
      throw new InternalServerErrorException('保存阅读进度失败');
    }
  }

  /**
   * 获取章节阅读进度
   */
  async getReadingProgress(
    userId: string,
    workId: string,
    chapterId: string,
  ): Promise<GetReadingProgressResponseDto> {
    // 验证章节存在且属于该作品
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      select: {
        id: true,
        workId: true,
        title: true,
        work: { select: { id: true, title: true } },
      },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    const progress = await this.prisma.readingProgress.findUnique({
      where: { userId_chapterId: { userId, chapterId } },
    });

    if (!progress) {
      return {
        message: '未找到阅读进度',
        progress: null,
      };
    }

    return {
      message: '获取阅读进度成功',
      progress: {
        id: progress.id,
        chapterId: progress.chapterId,
        chapterTitle: chapter.title,
        workId: chapter.work.id,
        workTitle: chapter.work.title,
        paragraphIndex: progress.paragraphIndex,
        scrollPosition: progress.scrollPosition,
        readPercentage: progress.readPercentage,
        lastReadAt: progress.lastReadAt,
      },
    };
  }

  /**
   * 获取作品的所有阅读进度
   */
  async getWorkReadingProgress(
    userId: string,
    workId: string,
  ): Promise<GetWorkReadingProgressResponseDto> {
    const work = await this.prisma.work.findUnique({
      where: { id: workId, isDeleted: false },
      select: { id: true, title: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    const progresses = await this.prisma.readingProgress.findMany({
      where: {
        userId,
        chapter: { workId, isDeleted: false },
      },
      include: {
        chapter: {
          select: { id: true, title: true, orderIndex: true },
        },
      },
      orderBy: { lastReadAt: 'desc' },
    });

    const progressList = progresses.map((p) => ({
      chapterId: p.chapterId,
      chapterTitle: p.chapter.title,
      orderIndex: p.chapter.orderIndex,
      paragraphIndex: p.paragraphIndex,
      scrollPosition: p.scrollPosition,
      readPercentage: p.readPercentage,
      lastReadAt: p.lastReadAt,
    }));

    const lastReadChapter =
      progressList.length > 0
        ? {
            chapterId: progressList[0].chapterId,
            chapterTitle: progressList[0].chapterTitle,
            orderIndex: progressList[0].orderIndex,
            paragraphIndex: progressList[0].paragraphIndex,
            readPercentage: progressList[0].readPercentage,
            lastReadAt: progressList[0].lastReadAt,
          }
        : null;

    return {
      message: '获取作品阅读进度成功',
      workId: work.id,
      workTitle: work.title,
      progresses: progressList,
      lastReadChapter,
    };
  }

  /**
   * 保存阅读设置
   * 任务4.1.3: 阅读设置保存 API
   *
   * 需求4验收标准4: WHEN 用户调整阅读设置 THEN System SHALL 应用字体大小、行距、背景色等自定义配置
   */
  async saveReadingSettings(
    userId: string,
    saveSettingsDto: SaveReadingSettingsDto,
  ): Promise<ReadingSettingsResponseDto> {
    try {
      const settings = await this.prisma.readingSettings.upsert({
        where: { userId },
        create: {
          userId,
          fontSize:
            saveSettingsDto.fontSize ?? DEFAULT_READING_SETTINGS.fontSize,
          lineHeight:
            saveSettingsDto.lineHeight ?? DEFAULT_READING_SETTINGS.lineHeight,
          fontFamily:
            saveSettingsDto.fontFamily ?? DEFAULT_READING_SETTINGS.fontFamily,
          backgroundColor:
            saveSettingsDto.backgroundColor ??
            DEFAULT_READING_SETTINGS.backgroundColor,
          textColor:
            saveSettingsDto.textColor ?? DEFAULT_READING_SETTINGS.textColor,
          pageMode: (saveSettingsDto.pageMode as PageMode) ?? PageMode.SCROLL,
          nightMode:
            saveSettingsDto.nightMode ?? DEFAULT_READING_SETTINGS.nightMode,
        },
        update: {
          ...(saveSettingsDto.fontSize !== undefined && {
            fontSize: saveSettingsDto.fontSize,
          }),
          ...(saveSettingsDto.lineHeight !== undefined && {
            lineHeight: saveSettingsDto.lineHeight,
          }),
          ...(saveSettingsDto.fontFamily !== undefined && {
            fontFamily: saveSettingsDto.fontFamily,
          }),
          ...(saveSettingsDto.backgroundColor !== undefined && {
            backgroundColor: saveSettingsDto.backgroundColor,
          }),
          ...(saveSettingsDto.textColor !== undefined && {
            textColor: saveSettingsDto.textColor,
          }),
          ...(saveSettingsDto.pageMode !== undefined && {
            pageMode: saveSettingsDto.pageMode as PageMode,
          }),
          ...(saveSettingsDto.nightMode !== undefined && {
            nightMode: saveSettingsDto.nightMode,
          }),
        },
      });

      this.logger.log(`Reading settings saved for user: ${userId}`);

      return {
        message: '阅读设置保存成功',
        settings: {
          id: settings.id,
          userId: settings.userId,
          fontSize: settings.fontSize,
          lineHeight: settings.lineHeight,
          fontFamily: settings.fontFamily,
          backgroundColor: settings.backgroundColor,
          textColor: settings.textColor,
          pageMode: settings.pageMode,
          nightMode: settings.nightMode,
          createdAt: settings.createdAt,
          updatedAt: settings.updatedAt,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to save reading settings: ${errorMessage}`);
      throw new InternalServerErrorException('保存阅读设置失败');
    }
  }

  /**
   * 获取阅读设置
   */
  async getReadingSettings(
    userId: string,
  ): Promise<ReadingSettingsResponseDto> {
    let settings = await this.prisma.readingSettings.findUnique({
      where: { userId },
    });

    // 如果没有设置，创建默认设置
    if (!settings) {
      settings = await this.prisma.readingSettings.create({
        data: {
          userId,
          fontSize: DEFAULT_READING_SETTINGS.fontSize,
          lineHeight: DEFAULT_READING_SETTINGS.lineHeight,
          fontFamily: DEFAULT_READING_SETTINGS.fontFamily,
          backgroundColor: DEFAULT_READING_SETTINGS.backgroundColor,
          textColor: DEFAULT_READING_SETTINGS.textColor,
          pageMode: PageMode.SCROLL,
          nightMode: DEFAULT_READING_SETTINGS.nightMode,
        },
      });
    }

    return {
      message: '获取阅读设置成功',
      settings: {
        id: settings.id,
        userId: settings.userId,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,
        fontFamily: settings.fontFamily,
        backgroundColor: settings.backgroundColor,
        textColor: settings.textColor,
        pageMode: settings.pageMode,
        nightMode: settings.nightMode,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    };
  }

  /**
   * 获取相邻章节信息
   * 任务4.1.4: 相邻章节信息 API
   *
   * 需求4验收标准6: WHEN 用户切换章节 THEN System SHALL 平滑过渡并保持阅读设置
   */
  async getAdjacentChapters(
    workId: string,
    chapterId: string,
    userId?: string,
  ): Promise<AdjacentChaptersResponseDto> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      select: {
        id: true,
        workId: true,
        title: true,
        orderIndex: true,
        wordCount: true,
        status: true,
        publishedAt: true,
        work: { select: { authorId: true } },
      },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    const isAuthor = userId && chapter.work.authorId === userId;
    if (chapter.status !== ChapterStatus.PUBLISHED && !isAuthor) {
      throw new NotFoundException('章节不存在');
    }

    // 获取相邻章节和总章节数
    const statusFilter = isAuthor ? undefined : ChapterStatus.PUBLISHED;

    const [prevChapter, nextChapter, totalChapters, currentPosition] =
      await Promise.all([
        this.prisma.chapter.findFirst({
          where: {
            workId,
            orderIndex: { lt: chapter.orderIndex },
            isDeleted: false,
            status: statusFilter,
          },
          orderBy: { orderIndex: 'desc' },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            wordCount: true,
            status: true,
            publishedAt: true,
          },
        }),
        this.prisma.chapter.findFirst({
          where: {
            workId,
            orderIndex: { gt: chapter.orderIndex },
            isDeleted: false,
            status: statusFilter,
          },
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            wordCount: true,
            status: true,
            publishedAt: true,
          },
        }),
        this.prisma.chapter.count({
          where: {
            workId,
            isDeleted: false,
            status: statusFilter,
          },
        }),
        this.prisma.chapter.count({
          where: {
            workId,
            orderIndex: { lte: chapter.orderIndex },
            isDeleted: false,
            status: statusFilter,
          },
        }),
      ]);

    const formatChapter = (c: any): ChapterBriefDto => ({
      id: c.id,
      title: c.title,
      orderIndex: c.orderIndex,
      wordCount: c.wordCount,
      status: c.status,
      publishedAt: c.publishedAt,
    });

    return {
      message: '获取相邻章节信息成功',
      currentChapter: formatChapter(chapter),
      prevChapter: prevChapter ? formatChapter(prevChapter) : null,
      nextChapter: nextChapter ? formatChapter(nextChapter) : null,
      totalChapters,
      currentPosition,
    };
  }

  /**
   * 获取章节目录列表
   *
   * 需求4验收标准12: WHEN 用户查看章节目录 THEN System SHALL 显示侧边栏目录并支持快速跳转
   */
  async getChapterList(
    workId: string,
    userId?: string,
  ): Promise<ChapterListResponseDto> {
    const work = await this.prisma.work.findUnique({
      where: { id: workId, isDeleted: false },
      select: {
        id: true,
        title: true,
        authorId: true,
        contentType: true,
      },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    const isAuthor = userId && work.authorId === userId;
    const statusFilter = isAuthor ? undefined : ChapterStatus.PUBLISHED;

    const chapters = await this.prisma.chapter.findMany({
      where: {
        workId,
        isDeleted: false,
        status: statusFilter,
      },
      orderBy: { orderIndex: 'asc' },
      select: {
        id: true,
        title: true,
        orderIndex: true,
        wordCount: true,
        status: true,
        publishedAt: true,
      },
    });

    return {
      message: '获取章节目录成功',
      workId: work.id,
      workTitle: work.title,
      contentType: work.contentType,
      chapters: chapters.map(
        (c): ChapterBriefDto => ({
          id: c.id,
          title: c.title,
          orderIndex: c.orderIndex,
          wordCount: c.wordCount,
          status: c.status,
          publishedAt: c.publishedAt,
        }),
      ),
      totalChapters: chapters.length,
    };
  }

  // ==================== Wenku8 内容方法 ====================

  /**
   * 获取 Wenku8 章节内容
   * 将 wenku8 数据转换为统一的阅读器格式
   */
  async getWenku8ChapterContent(
    novelId: string,
    chapterId: string,
    _userId?: string,
  ): Promise<ChapterContentResponseDto> {
    // Get chapter content from wenku8
    const chapterData = await this.wenku8ProxyService.getChapterContent(novelId, chapterId);

    // Get novel info for work details
    const novelData = await this.wenku8ProxyService.getNovelInfo(novelId);

    // Convert content to paragraphs with anchor IDs
    const paragraphs = this.convertContentToParagraphs(chapterData.content, novelId, chapterId);

    // Build prev/next chapter info
    const prevChapter = chapterData.prevChapterId ? {
      id: chapterData.prevChapterId,
      title: '上一章',
      orderIndex: 0,
    } : null;

    const nextChapter = chapterData.nextChapterId ? {
      id: chapterData.nextChapterId,
      title: '下一章',
      orderIndex: 0,
    } : null;

    this.logger.log(
      `Wenku8 chapter content retrieved: novel ${novelId}, chapter ${chapterId}`,
    );

    return {
      message: '获取章节内容成功',
      chapter: {
        id: chapterId,
        workId: `wenku8-${novelId}`,
        title: chapterData.title,
        orderIndex: 0,
        wordCount: chapterData.content.length,
        viewCount: 0,
        status: 'PUBLISHED',
        publishedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      work: {
        id: `wenku8-${novelId}`,
        title: novelData.title,
        authorId: 'wenku8',
        authorName: novelData.author,
        contentType: 'NOVEL',
        readingDirection: 'LTR',
      },
      content: chapterData.content,
      paragraphs,
      readingProgress: null,
      prevChapter,
      nextChapter,
    };
  }

  /**
   * 获取 Wenku8 章节目录
   */
  async getWenku8ChapterList(
    novelId: string,
    _userId?: string,
  ): Promise<ChapterListResponseDto> {
    const novelData = await this.wenku8ProxyService.getNovelInfo(novelId);

    // Flatten volumes into chapter list
    const chapters: ChapterBriefDto[] = [];
    let orderIndex = 0;

    for (const volume of novelData.volumes) {
      for (const chapter of volume.chapters) {
        chapters.push({
          id: chapter.id,
          title: `${volume.name} - ${chapter.title}`,
          orderIndex: orderIndex++,
          wordCount: 0,
          status: 'PUBLISHED',
          publishedAt: null,
        });
      }
    }

    return {
      message: '获取章节目录成功',
      workId: `wenku8-${novelId}`,
      workTitle: novelData.title,
      contentType: 'NOVEL',
      chapters,
      totalChapters: chapters.length,
    };
  }

  /**
   * 将文本内容转换为段落数组
   */
  private convertContentToParagraphs(
    content: string,
    novelId: string,
    chapterId: string,
  ): ParagraphDto[] {
    const lines = content.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => ({
      id: `wenku8-${novelId}-${chapterId}-p${index}`,
      anchorId: `w8-${novelId}-${chapterId}-${index}`,
      content: line.trim(),
      orderIndex: index,
      quoteCount: 0,
    }));
  }

  /**
   * 更新用户连续阅读天数
   * 任务24.3.3: 连续阅读成就（三日不辍→年度书友）
   *
   * 逻辑：
   * - 当用户阅读时，检查是否是新的一天
   * - 如果是连续的一天（昨天有阅读），增加连续天数
   * - 如果间隔超过1天，重置连续天数为1
   * - 更新最长连续天数记录
   * - 触发连续阅读成就事件
   */
  private async updateReadingStreak(userId: string): Promise<void> {
    // 获取用户当前的连续阅读信息
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        lastReadDate: true,
        currentReadingStreak: true,
        longestReadingStreak: true,
      },
    });

    if (!user) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // 只保留日期部分

    const lastReadDate = user.lastReadDate
      ? new Date(user.lastReadDate)
      : null;
    if (lastReadDate) {
      lastReadDate.setHours(0, 0, 0, 0);
    }

    // 如果今天已经阅读过，不需要更新连续天数
    if (lastReadDate && lastReadDate.getTime() === today.getTime()) {
      return;
    }

    let newStreak = 1; // 默认为1天（今天）

    if (lastReadDate) {
      // 计算上次阅读日期和今天的差距
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastReadDate.getTime() === yesterday.getTime()) {
        // 昨天有阅读，连续天数+1
        newStreak = user.currentReadingStreak + 1;
      }
      // 如果间隔超过1天，newStreak保持为1（重置）
    }

    // 更新最长连续天数
    const newLongestStreak = Math.max(newStreak, user.longestReadingStreak);

    // 更新用户的连续阅读信息
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        lastReadDate: today,
        currentReadingStreak: newStreak,
        longestReadingStreak: newLongestStreak,
      },
    });

    this.logger.log(
      `Reading streak updated for user ${userId}: ${newStreak} days (longest: ${newLongestStreak})`,
    );

    // 触发连续阅读成就进度更新
    // 使用当前连续天数作为进度值
    await this.achievementUnlockService.triggerEvent(
      AchievementEventType.CONSECUTIVE_READING,
      userId,
      newStreak, // 当前连续天数
    );
  }

  /**
   * 检查用户是否完成了整部作品的阅读
   * 任务24.3.4: 完本成就（初尝完结→完本狂魔）
   *
   * 逻辑：
   * - 获取作品的所有已发布章节
   * - 检查用户是否阅读完成了所有章节（readPercentage >= 100）
   * - 如果是首次完成该作品，触发 WORK_COMPLETED 事件
   */
  private async checkWorkCompletion(
    userId: string,
    workId: string,
  ): Promise<void> {
    try {
      // 获取作品的所有已发布章节
      const publishedChapters = await this.prisma.chapter.findMany({
        where: {
          workId,
          isDeleted: false,
          status: ChapterStatus.PUBLISHED,
        },
        select: { id: true },
      });

      // 如果作品没有已发布章节，不处理
      if (publishedChapters.length === 0) {
        return;
      }

      const chapterIds = publishedChapters.map((c) => c.id);

      // 获取用户对这些章节的阅读进度
      const userProgress = await this.prisma.readingProgress.findMany({
        where: {
          userId,
          chapterId: { in: chapterIds },
          readPercentage: { gte: 100 }, // 只统计完成的章节
        },
        select: { chapterId: true },
      });

      // 检查是否所有章节都已完成
      const completedChapterIds = new Set(userProgress.map((p) => p.chapterId));
      const allChaptersCompleted = chapterIds.every((id) =>
        completedChapterIds.has(id),
      );

      if (!allChaptersCompleted) {
        return;
      }

      // 检查是否是首次完成该作品（避免重复触发）
      // 通过检查用户是否已经有该作品的完成记录
      const existingCompletion = await this.prisma.workCompletion.findUnique({
        where: { userId_workId: { userId, workId } },
      });

      if (existingCompletion) {
        // 已经完成过该作品，不重复触发
        return;
      }

      // 记录作品完成
      await this.prisma.workCompletion.create({
        data: {
          userId,
          workId,
          completedAt: new Date(),
        },
      });

      // 触发完本成就进度更新
      await this.achievementUnlockService.triggerEvent(
        AchievementEventType.WORK_COMPLETED,
        userId,
        1, // 每完成一部作品增加1
      );

      this.logger.log(
        `Work completion recorded for user ${userId}: work ${workId}`,
      );
    } catch (error) {
      // 完本检查失败不应影响阅读进度保存
      this.logger.warn(
        `Failed to check work completion: ${error}`,
      );
    }
  }
}
