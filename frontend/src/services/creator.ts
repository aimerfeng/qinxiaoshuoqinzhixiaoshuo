/**
 * 创作者控制台 API 服务
 *
 * 需求6: 创作者控制台
 * 任务 8.2.2: 仪表板页面 - 与仪表板 API 集成显示创作者统计数据
 */

import { api } from '@/lib/api';

// ==================== 类型定义 ====================

/**
 * 作品简要信息
 */
export interface WorkBrief {
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
  createdAt: string;
  updatedAt: string;
}

/**
 * 近期活动项
 */
export interface ActivityItem {
  type: 'view' | 'like' | 'quote' | 'comment';
  count: number;
  date: string;
}

/**
 * 热门作品信息
 */
export interface TopWork {
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
export interface RecentStats {
  views: number;
  likes: number;
  quotes: number;
  comments: number;
  viewsTrend: ActivityItem[];
}

/**
 * 仪表板响应数据
 */
export interface DashboardData {
  /** 创作者的作品列表 */
  works: WorkBrief[];
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
  recentStats: RecentStats;
  /** 热门作品（按阅读量排序） */
  topPerformingWorks: TopWork[];
  /** 近期活动 */
  recentActivity: ActivityItem[];
}

// ==================== API 函数 ====================

/**
 * 获取创作者仪表板数据
 *
 * GET /api/v1/creator/dashboard
 */
export async function getDashboard(): Promise<DashboardData> {
  const response = await api.get<DashboardData>('/creator/dashboard');
  return response.data;
}

/**
 * 获取作品详细统计数据
 *
 * GET /api/v1/creator/works/:workId/stats
 */
export async function getWorkStats(workId: string) {
  const response = await api.get(`/creator/works/${workId}/stats`);
  return response.data;
}
