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

/**
 * 阅读器服务
 * 处理阅读器相关业务逻辑
 *
 * 需求4: 沉浸式阅读器
 */
@Injectable()
export class ReaderService {
  private readonly logger = new Logger(ReaderService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
