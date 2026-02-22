/**
 * 创作者控制台仪表板 DTO
 *
 * 需求6验收标准1: WHEN Creator 进入控制台 THEN System SHALL 展示作品列表和数据概览仪表板
 * 需求6验收标准6: WHEN Creator 查看作品数据 THEN System SHALL 显示阅读量、点赞数、引用数等统计
 */

/**
 * 作品简要信息
 */
export interface WorkBriefDto {
  id: string;
  title: string;
  coverImage: string | null;
  status: string;
  contentType: string;
  viewCount: number;
  likeCount: number;
  quoteCount: number;
  chapterCount: number;
  wordCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 近期活动项
 */
export interface ActivityItemDto {
  type: 'view' | 'like' | 'quote' | 'comment';
  count: number;
  date: string;
}

/**
 * 热门作品信息
 */
export interface TopWorkDto {
  id: string;
  title: string;
  coverImage: string | null;
  viewCount: number;
  likeCount: number;
  quoteCount: number;
}

/**
 * 近7天统计数据
 */
export interface RecentStatsDto {
  views: number;
  likes: number;
  quotes: number;
  comments: number;
  viewsTrend: ActivityItemDto[];
}

/**
 * 仪表板响应 DTO
 *
 * GET /api/v1/creator/dashboard
 */
export interface DashboardResponseDto {
  /** 创作者的作品列表 */
  works: WorkBriefDto[];

  /** 总阅读量 */
  totalReads: number;

  /** 总点赞数 */
  totalLikes: number;

  /** 总引用数 */
  totalQuotes: number;

  /** 总章节数 */
  totalChapters: number;

  /** 总作品数 */
  totalWorks: number;

  /** 近7天统计 */
  recentStats: RecentStatsDto;

  /** 热门作品（按阅读量排序） */
  topPerformingWorks: TopWorkDto[];

  /** 近期活动 */
  recentActivity: ActivityItemDto[];
}
