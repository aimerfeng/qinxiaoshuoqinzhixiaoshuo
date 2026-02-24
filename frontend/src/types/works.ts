/**
 * Works 类型定义
 * 用于前端调用 /api/v1/works API
 */

// 作品内容类型
export type ContentType = 'NOVEL' | 'MANGA';

// 作品状态
export type WorkStatus = 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'HIATUS' | 'ABANDONED';

// 排序字段
export type WorkSortField = 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount';

// 作者简要信息
export interface AuthorBrief {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

// 作品统计信息
export interface WorkStats {
  wordCount: number;
  viewCount: number;
  likeCount: number;
  quoteCount: number;
  chapterCount: number;
  pageCount?: number;
}

// 作品响应
export interface WorkResponse {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  type: ContentType;
  status: WorkStatus;
  tags: string[];
  author: AuthorBrief;
  stats: WorkStats;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 章节简要信息
export interface ChapterBrief {
  id: string;
  title: string;
  orderIndex: number;
  wordCount: number;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// 作品详情响应
export interface WorkDetailResponse extends WorkResponse {
  chapters: ChapterBrief[];
}

// 分页元数据
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// 分页作品响应
export interface PaginatedWorksResponse {
  data: WorkResponse[];
  meta: PaginationMeta;
}

// 查询参数
export interface ListWorksParams {
  page?: number;
  limit?: number;
  contentType?: ContentType;
  status?: WorkStatus;
  tag?: string;
  authorId?: string;
  sortBy?: WorkSortField;
  sortOrder?: 'asc' | 'desc';
}
