import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  DashboardResponseDto,
  WorkBriefDto,
  ActivityItemDto,
  TopWorkDto,
  RecentStatsDto,
  WorkStatsResponseDto,
  ChapterStatDto,
  TopQuotedParagraphDto,
  DateStatDto,
  ReaderActivityDto,
  CreateDraftDto,
  DraftResponseDto,
  DraftListItemDto,
  DraftListResponseDto,
} from './dto/index.js';

/**
 * 创作者控制台服务
 *
 * 需求6: 创作者控制台
 * 提供仪表板数据聚合、作品统计等功能
 */
@Injectable()
export class CreatorService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取创作者仪表板数据
   *
   * 需求6验收标准1: WHEN Creator 进入控制台 THEN System SHALL 展示作品列表和数据概览仪表板
   * 需求6验收标准6: WHEN Creator 查看作品数据 THEN System SHALL 显示阅读量、点赞数、引用数等统计
   *
   * @param userId 创作者用户ID
   * @returns 仪表板数据
   */
  async getDashboard(userId: string): Promise<DashboardResponseDto> {
    // 并行获取所有数据以提高性能
    const [works, totalStats, recentStats, topWorks] = await Promise.all([
      this.getCreatorWorks(userId),
      this.getTotalStats(userId),
      this.getRecentStats(userId),
      this.getTopPerformingWorks(userId),
    ]);

    // 计算近期活动
    const recentActivity = this.calculateRecentActivity(recentStats.viewsTrend);

    return {
      works,
      totalReads: totalStats.totalReads,
      totalLikes: totalStats.totalLikes,
      totalQuotes: totalStats.totalQuotes,
      totalChapters: totalStats.totalChapters,
      totalWorks: works.length,
      recentStats,
      topPerformingWorks: topWorks,
      recentActivity,
    };
  }

  /**
   * 获取创作者的所有作品
   */
  private async getCreatorWorks(userId: string): Promise<WorkBriefDto[]> {
    const works = await this.prisma.work.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            chapters: {
              where: { isDeleted: false },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return works.map((work) => ({
      id: work.id,
      title: work.title,
      coverImage: work.coverImage,
      status: work.status,
      contentType: work.contentType,
      viewCount: work.viewCount,
      likeCount: work.likeCount,
      quoteCount: work.quoteCount,
      chapterCount: work._count.chapters,
      wordCount: work.wordCount,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
    }));
  }

  /**
   * 获取总体统计数据
   */
  private async getTotalStats(userId: string): Promise<{
    totalReads: number;
    totalLikes: number;
    totalQuotes: number;
    totalChapters: number;
  }> {
    // 获取作品统计
    const workStats = await this.prisma.work.aggregate({
      where: {
        authorId: userId,
        isDeleted: false,
      },
      _sum: {
        viewCount: true,
        likeCount: true,
        quoteCount: true,
      },
    });

    // 获取章节总数
    const chapterCount = await this.prisma.chapter.count({
      where: {
        work: {
          authorId: userId,
          isDeleted: false,
        },
        isDeleted: false,
      },
    });

    return {
      totalReads: workStats._sum.viewCount ?? 0,
      totalLikes: workStats._sum.likeCount ?? 0,
      totalQuotes: workStats._sum.quoteCount ?? 0,
      totalChapters: chapterCount,
    };
  }

  /**
   * 获取近7天统计数据
   */
  private async getRecentStats(userId: string): Promise<RecentStatsDto> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 获取用户的所有作品ID
    const userWorks = await this.prisma.work.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
      },
      select: { id: true },
    });
    const workIds = userWorks.map((w) => w.id);

    // 获取用户的所有章节ID
    const userChapters = await this.prisma.chapter.findMany({
      where: {
        workId: { in: workIds },
        isDeleted: false,
      },
      select: { id: true },
    });
    const chapterIds = userChapters.map((c) => c.id);

    // 获取用户的所有段落ID
    const userParagraphs = await this.prisma.paragraph.findMany({
      where: {
        chapterId: { in: chapterIds },
        isDeleted: false,
      },
      select: { id: true },
    });
    const paragraphIds = userParagraphs.map((p) => p.id);

    // 获取用户的所有卡片ID
    const userCards = await this.prisma.card.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
      },
      select: { id: true },
    });
    const cardIds = userCards.map((c) => c.id);

    // 近7天点赞数（针对用户的卡片）
    const recentLikes =
      cardIds.length > 0
        ? await this.prisma.like.count({
            where: {
              cardId: { in: cardIds },
              createdAt: { gte: sevenDaysAgo },
            },
          })
        : 0;

    // 近7天引用数（针对用户的段落）
    const recentQuotes =
      paragraphIds.length > 0
        ? await this.prisma.quote.count({
            where: {
              paragraphId: { in: paragraphIds },
              createdAt: { gte: sevenDaysAgo },
            },
          })
        : 0;

    // 近7天评论数（针对用户的卡片）
    const recentComments =
      cardIds.length > 0
        ? await this.prisma.comment.count({
            where: {
              cardId: { in: cardIds },
              isDeleted: false,
              createdAt: { gte: sevenDaysAgo },
            },
          })
        : 0;

    // 生成近7天的日期趋势数据
    const viewsTrend = await this.generateViewsTrend(userId, sevenDaysAgo);

    // 计算近7天总阅读量
    const recentViews = viewsTrend.reduce((sum, item) => sum + item.count, 0);

    return {
      views: recentViews,
      likes: recentLikes,
      quotes: recentQuotes,
      comments: recentComments,
      viewsTrend,
    };
  }

  /**
   * 生成近7天阅读趋势数据
   */
  private async generateViewsTrend(
    userId: string,
    startDate: Date,
  ): Promise<ActivityItemDto[]> {
    const trend: ActivityItemDto[] = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    // 获取用户所有章节
    const userChapters = await this.prisma.chapter.findMany({
      where: {
        work: {
          authorId: userId,
          isDeleted: false,
        },
        isDeleted: false,
      },
      select: { id: true },
    });
    const chapterIds = userChapters.map((c) => c.id);

    // 为每一天生成数据
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      // 统计当天的阅读进度记录数作为阅读量近似值
      const viewCount =
        chapterIds.length > 0
          ? await this.prisma.readingProgress.count({
              where: {
                chapterId: { in: chapterIds },
                lastReadAt: {
                  gte: date,
                  lt: nextDate,
                },
              },
            })
          : 0;

      trend.push({
        type: 'view',
        count: viewCount,
        date: date.toISOString().split('T')[0],
      });
    }

    return trend;
  }

  /**
   * 获取热门作品（按阅读量排序）
   */
  private async getTopPerformingWorks(userId: string): Promise<TopWorkDto[]> {
    const topWorks = await this.prisma.work.findMany({
      where: {
        authorId: userId,
        isDeleted: false,
      },
      orderBy: {
        viewCount: 'desc',
      },
      take: 5,
      select: {
        id: true,
        title: true,
        coverImage: true,
        viewCount: true,
        likeCount: true,
        quoteCount: true,
      },
    });

    return topWorks.map((work) => ({
      id: work.id,
      title: work.title,
      coverImage: work.coverImage,
      viewCount: work.viewCount,
      likeCount: work.likeCount,
      quoteCount: work.quoteCount,
    }));
  }

  /**
   * 计算近期活动摘要
   */
  private calculateRecentActivity(
    viewsTrend: ActivityItemDto[],
  ): ActivityItemDto[] {
    // 返回最近3天的活动数据
    return viewsTrend.slice(-3);
  }

  /**
   * 获取作品详细统计数据
   *
   * 需求6验收标准6: WHEN Creator 查看作品数据 THEN System SHALL 显示阅读量、点赞数、引用数等统计
   * 需求13: 创作者数据分析
   *
   * @param workId 作品ID
   * @param userId 用户ID（用于验证所有权）
   * @returns 作品详细统计数据
   */
  async getWorkStats(
    workId: string,
    userId: string,
  ): Promise<WorkStatsResponseDto | null> {
    // 验证作品存在且属于该用户
    const work = await this.prisma.work.findFirst({
      where: {
        id: workId,
        authorId: userId,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        viewCount: true,
        likeCount: true,
        quoteCount: true,
      },
    });

    if (!work) {
      return null;
    }

    // 并行获取所有统计数据
    const [
      chapterStats,
      topQuotedParagraphs,
      viewsTrend,
      readerActivity,
      totalComments,
    ] = await Promise.all([
      this.getChapterStats(workId),
      this.getTopQuotedParagraphs(workId),
      this.getViewsTrend(workId),
      this.getReaderActivity(workId),
      this.getTotalComments(workId),
    ]);

    // 计算统计时间范围（最近30天）
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    return {
      workId: work.id,
      title: work.title,
      totalViews: work.viewCount,
      totalLikes: work.likeCount,
      totalQuotes: work.quoteCount,
      totalComments,
      chapterStats,
      viewsTrend,
      topQuotedParagraphs,
      readerActivity,
      statsRange: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      },
    };
  }

  /**
   * 获取章节统计数据
   */
  private async getChapterStats(workId: string): Promise<ChapterStatDto[]> {
    const chapters = await this.prisma.chapter.findMany({
      where: {
        workId,
        isDeleted: false,
      },
      orderBy: {
        orderIndex: 'asc',
      },
      select: {
        id: true,
        title: true,
        orderIndex: true,
        viewCount: true,
        wordCount: true,
      },
    });

    // 获取每个章节的阅读完成率
    const chapterStats: ChapterStatDto[] = [];

    for (const chapter of chapters) {
      // 计算完成率：完成阅读（readPercentage >= 90%）的用户数 / 总阅读用户数
      const totalReaders = await this.prisma.readingProgress.count({
        where: {
          chapterId: chapter.id,
        },
      });

      const completedReaders = await this.prisma.readingProgress.count({
        where: {
          chapterId: chapter.id,
          readPercentage: {
            gte: 90,
          },
        },
      });

      const completionRate =
        totalReaders > 0
          ? Math.round((completedReaders / totalReaders) * 100)
          : 0;

      chapterStats.push({
        chapterId: chapter.id,
        title: chapter.title,
        orderIndex: chapter.orderIndex,
        viewCount: chapter.viewCount,
        completionRate,
        wordCount: chapter.wordCount,
      });
    }

    return chapterStats;
  }

  /**
   * 获取热门引用段落
   */
  private async getTopQuotedParagraphs(
    workId: string,
  ): Promise<TopQuotedParagraphDto[]> {
    // 获取作品的所有章节
    const chapters = await this.prisma.chapter.findMany({
      where: {
        workId,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
      },
    });

    const chapterMap = new Map(chapters.map((c) => [c.id, c.title]));
    const chapterIds = chapters.map((c) => c.id);

    // 获取引用数最多的段落
    const topParagraphs = await this.prisma.paragraph.findMany({
      where: {
        chapterId: { in: chapterIds },
        isDeleted: false,
        quoteCount: { gt: 0 },
      },
      orderBy: {
        quoteCount: 'desc',
      },
      take: 10,
      select: {
        id: true,
        anchorId: true,
        content: true,
        quoteCount: true,
        chapterId: true,
      },
    });

    return topParagraphs.map((p) => ({
      paragraphId: p.id,
      anchorId: p.anchorId,
      content:
        p.content.length > 200
          ? p.content.substring(0, 200) + '...'
          : p.content,
      quoteCount: p.quoteCount,
      chapterTitle: chapterMap.get(p.chapterId) || '',
    }));
  }

  /**
   * 获取阅读趋势数据（日/周/月）
   */
  private async getViewsTrend(workId: string): Promise<{
    daily: DateStatDto[];
    weekly: DateStatDto[];
    monthly: DateStatDto[];
  }> {
    // 获取作品的所有章节ID
    const chapters = await this.prisma.chapter.findMany({
      where: {
        workId,
        isDeleted: false,
      },
      select: { id: true },
    });
    const chapterIds = chapters.map((c) => c.id);

    // 生成日趋势（最近7天）
    const daily = await this.generateDateTrend(chapterIds, 7, 'day');

    // 生成周趋势（最近4周）
    const weekly = await this.generateDateTrend(chapterIds, 4, 'week');

    // 生成月趋势（最近6个月）
    const monthly = await this.generateDateTrend(chapterIds, 6, 'month');

    return { daily, weekly, monthly };
  }

  /**
   * 生成日期趋势数据
   */
  private async generateDateTrend(
    chapterIds: string[],
    periods: number,
    periodType: 'day' | 'week' | 'month',
  ): Promise<DateStatDto[]> {
    const trend: DateStatDto[] = [];
    const now = new Date();

    for (let i = periods - 1; i >= 0; i--) {
      const startDate = new Date(now);
      const endDate = new Date(now);

      if (periodType === 'day') {
        startDate.setDate(now.getDate() - i);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(now.getDate() - i);
        endDate.setHours(23, 59, 59, 999);
      } else if (periodType === 'week') {
        startDate.setDate(now.getDate() - (i + 1) * 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(now.getDate() - i * 7);
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate.setMonth(now.getMonth() - i);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setMonth(now.getMonth() - i + 1);
        endDate.setDate(0);
        endDate.setHours(23, 59, 59, 999);
      }

      const count =
        chapterIds.length > 0
          ? await this.prisma.readingProgress.count({
              where: {
                chapterId: { in: chapterIds },
                lastReadAt: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            })
          : 0;

      trend.push({
        date: startDate.toISOString().split('T')[0],
        count,
      });
    }

    return trend;
  }

  /**
   * 获取读者活跃时段分布
   */
  private async getReaderActivity(
    workId: string,
  ): Promise<ReaderActivityDto[]> {
    // 获取作品的所有章节ID
    const chapters = await this.prisma.chapter.findMany({
      where: {
        workId,
        isDeleted: false,
      },
      select: { id: true },
    });
    const chapterIds = chapters.map((c) => c.id);

    if (chapterIds.length === 0) {
      // 返回24小时的空数据
      return Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    }

    // 获取最近30天的阅读记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const readingRecords = await this.prisma.readingProgress.findMany({
      where: {
        chapterId: { in: chapterIds },
        lastReadAt: { gte: thirtyDaysAgo },
      },
      select: {
        lastReadAt: true,
      },
    });

    // 按小时统计
    const hourCounts = new Map<number, number>();
    for (let i = 0; i < 24; i++) {
      hourCounts.set(i, 0);
    }

    for (const record of readingRecords) {
      const hour = record.lastReadAt.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCounts.get(hour) || 0,
    }));
  }

  /**
   * 获取作品相关的总评论数
   */
  private async getTotalComments(workId: string): Promise<number> {
    // 获取作品的所有段落ID
    const paragraphs = await this.prisma.paragraph.findMany({
      where: {
        chapter: {
          workId,
          isDeleted: false,
        },
        isDeleted: false,
      },
      select: { id: true },
    });
    const paragraphIds = paragraphs.map((p) => p.id);

    if (paragraphIds.length === 0) {
      return 0;
    }

    // 获取引用了这些段落的卡片
    const quotes = await this.prisma.quote.findMany({
      where: {
        paragraphId: { in: paragraphIds },
      },
      select: { cardId: true },
    });
    const cardIds = [...new Set(quotes.map((q) => q.cardId))];

    if (cardIds.length === 0) {
      return 0;
    }

    // 统计这些卡片的评论数
    return this.prisma.comment.count({
      where: {
        cardId: { in: cardIds },
        isDeleted: false,
      },
    });
  }

  // ==================== 草稿管理 ====================

  /**
   * 创建或更新草稿
   *
   * 需求6验收标准3: WHEN Creator 在 Editor 中输入内容 THEN System SHALL 实时自动保存草稿
   * 需求6验收标准9: WHILE Editor 处于编辑状态 THEN System SHALL 每30秒自动保存一次草稿
   *
   * @param userId 用户ID
   * @param dto 草稿数据
   * @returns 保存的草稿
   */
  async createOrUpdateDraft(
    userId: string,
    dto: CreateDraftDto,
  ): Promise<DraftResponseDto> {
    // 计算字数（简单统计中文字符和英文单词）
    const wordCount = this.calculateWordCount(dto.content);

    // 查找是否存在对应的草稿
    // 如果有 workId 和 chapterId，则按这个组合查找
    const existingDraft = await this.prisma.draft.findFirst({
      where: {
        userId,
        workId: dto.workId ?? null,
        chapterId: dto.chapterId ?? null,
        isDeleted: false,
      },
    });

    let draft;

    if (existingDraft) {
      // 更新现有草稿
      draft = await this.prisma.draft.update({
        where: { id: existingDraft.id },
        data: {
          title: dto.title,
          content: dto.content,
          cursorPosition: dto.cursorPosition,
          wordCount,
          lastSavedAt: new Date(),
        },
      });
    } else {
      // 创建新草稿
      draft = await this.prisma.draft.create({
        data: {
          userId,
          title: dto.title,
          content: dto.content,
          workId: dto.workId,
          chapterId: dto.chapterId,
          cursorPosition: dto.cursorPosition,
          wordCount,
          lastSavedAt: new Date(),
        },
      });
    }

    return this.mapDraftToResponse(draft);
  }

  /**
   * 获取用户的草稿列表
   *
   * @param userId 用户ID
   * @returns 草稿列表
   */
  async getDraftList(userId: string): Promise<DraftListResponseDto> {
    const drafts = await this.prisma.draft.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      orderBy: {
        lastSavedAt: 'desc',
      },
    });

    // 获取关联的作品和章节信息
    const workIds = drafts
      .map((d) => d.workId)
      .filter((id): id is string => id !== null);
    const chapterIds = drafts
      .map((d) => d.chapterId)
      .filter((id): id is string => id !== null);

    const [works, chapters] = await Promise.all([
      workIds.length > 0
        ? this.prisma.work.findMany({
            where: { id: { in: workIds } },
            select: { id: true, title: true },
          })
        : [],
      chapterIds.length > 0
        ? this.prisma.chapter.findMany({
            where: { id: { in: chapterIds } },
            select: { id: true, title: true },
          })
        : [],
    ]);

    const workMap = new Map(works.map((w) => [w.id, w.title]));
    const chapterMap = new Map(chapters.map((c) => [c.id, c.title]));

    const draftItems: DraftListItemDto[] = drafts.map((draft) => ({
      id: draft.id,
      title: draft.title,
      contentPreview:
        draft.content.length > 100
          ? draft.content.substring(0, 100) + '...'
          : draft.content,
      workId: draft.workId,
      workTitle: draft.workId ? (workMap.get(draft.workId) ?? null) : null,
      chapterId: draft.chapterId,
      chapterTitle: draft.chapterId
        ? (chapterMap.get(draft.chapterId) ?? null)
        : null,
      wordCount: draft.wordCount,
      lastSavedAt: draft.lastSavedAt,
      createdAt: draft.createdAt,
    }));

    return {
      drafts: draftItems,
      total: drafts.length,
    };
  }

  /**
   * 获取单个草稿详情
   *
   * @param draftId 草稿ID
   * @param userId 用户ID
   * @returns 草稿详情或 null
   */
  async getDraft(
    draftId: string,
    userId: string,
  ): Promise<DraftResponseDto | null> {
    const draft = await this.prisma.draft.findFirst({
      where: {
        id: draftId,
        userId,
        isDeleted: false,
      },
    });

    if (!draft) {
      return null;
    }

    return this.mapDraftToResponse(draft);
  }

  /**
   * 删除草稿
   *
   * @param draftId 草稿ID
   * @param userId 用户ID
   * @returns 是否删除成功
   */
  async deleteDraft(draftId: string, userId: string): Promise<boolean> {
    const draft = await this.prisma.draft.findFirst({
      where: {
        id: draftId,
        userId,
        isDeleted: false,
      },
    });

    if (!draft) {
      return false;
    }

    // 软删除
    await this.prisma.draft.update({
      where: { id: draftId },
      data: { isDeleted: true },
    });

    return true;
  }

  /**
   * 计算字数
   * 中文按字符计算，英文按单词计算
   */
  private calculateWordCount(content: string): number {
    // 移除 Markdown 标记
    const plainText = content
      .replace(/```[\s\S]*?```/g, '') // 移除代码块
      .replace(/`[^`]*`/g, '') // 移除行内代码
      .replace(/!\[.*?\]\(.*?\)/g, '') // 移除图片
      .replace(/\[.*?\]\(.*?\)/g, '') // 移除链接
      .replace(/[#*_~`>-]/g, '') // 移除 Markdown 符号
      .trim();

    // 统计中文字符
    const chineseChars = (plainText.match(/[\u4e00-\u9fa5]/g) || []).length;

    // 统计英文单词
    const englishWords = (plainText.match(/[a-zA-Z]+/g) || []).length;

    return chineseChars + englishWords;
  }

  /**
   * 将草稿实体映射为响应 DTO
   */
  private mapDraftToResponse(draft: {
    id: string;
    title: string | null;
    content: string;
    workId: string | null;
    chapterId: string | null;
    cursorPosition: number | null;
    wordCount: number;
    lastSavedAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }): DraftResponseDto {
    return {
      id: draft.id,
      title: draft.title,
      content: draft.content,
      workId: draft.workId,
      chapterId: draft.chapterId,
      cursorPosition: draft.cursorPosition,
      wordCount: draft.wordCount,
      lastSavedAt: draft.lastSavedAt,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }
}
