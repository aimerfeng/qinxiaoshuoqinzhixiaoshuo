/**
 * 作品统计 DTO
 *
 * 需求6验收标准6: WHEN Creator 查看作品数据 THEN System SHALL 显示阅读量、点赞数、引用数等统计
 * 需求13: 创作者数据分析
 */

/**
 * 日期统计项
 */
export interface DateStatDto {
  date: string;
  count: number;
}

/**
 * 章节统计信息
 */
export interface ChapterStatDto {
  chapterId: string;
  title: string;
  orderIndex: number;
  viewCount: number;
  completionRate: number;
  wordCount: number;
}

/**
 * 热门引用段落
 */
export interface TopQuotedParagraphDto {
  paragraphId: string;
  anchorId: string;
  content: string;
  quoteCount: number;
  chapterTitle: string;
}

/**
 * 读者活跃时段分布
 */
export interface ReaderActivityDto {
  hour: number;
  count: number;
}

/**
 * 趋势数据
 */
export interface TrendDataDto {
  daily: DateStatDto[];
  weekly: DateStatDto[];
  monthly: DateStatDto[];
}

/**
 * 作品统计响应 DTO
 *
 * GET /api/v1/creator/works/:workId/stats
 */
export interface WorkStatsResponseDto {
  /** 作品ID */
  workId: string;

  /** 作品标题 */
  title: string;

  /** 总阅读量 */
  totalViews: number;

  /** 总点赞数 */
  totalLikes: number;

  /** 总引用数 */
  totalQuotes: number;

  /** 总评论数 */
  totalComments: number;

  /** 章节统计（按章节分解） */
  chapterStats: ChapterStatDto[];

  /** 阅读趋势（日/周/月） */
  viewsTrend: TrendDataDto;

  /** 热门引用段落 */
  topQuotedParagraphs: TopQuotedParagraphDto[];

  /** 读者活跃时段分布 */
  readerActivity: ReaderActivityDto[];

  /** 统计时间范围 */
  statsRange: {
    startDate: string;
    endDate: string;
  };
}
