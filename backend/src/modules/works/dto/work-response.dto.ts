import { ContentType, WorkStatus, ChapterStatus } from '@prisma/client';
import { WorkCategory, ReadingDirection } from './create-work.dto.js';

/**
 * 作者简要信息
 */
export interface AuthorBrief {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 作品统计信息
 */
export interface WorkStats {
  wordCount: number;
  viewCount: number;
  likeCount: number;
  quoteCount: number;
  chapterCount: number;
  pageCount?: number; // 漫画总页数
}

/**
 * 章节简要信息
 * 用于作品详情中的章节列表
 */
export interface ChapterBrief {
  id: string;
  title: string;
  orderIndex: number;
  wordCount: number;
  status: ChapterStatus;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 作品响应 DTO
 * 用于返回作品详情
 * 支持小说和漫画两种类型
 */
export interface WorkResponseDto {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  type: ContentType;
  category: WorkCategory | null;
  status: WorkStatus;
  tags: string[];
  author: AuthorBrief;
  stats: WorkStats;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Manga-specific fields (漫画特有字段)
  readingDirection?: ReadingDirection | null; // 阅读方向（仅漫画）
}

/**
 * 作品详情响应 DTO
 * 包含章节列表摘要
 *
 * 需求2验收标准7: 保存标题、简介、封面、标签等信息
 * 需求8验收标准3: 显示作品信息、章节目录和统计数据
 */
export interface WorkDetailResponseDto {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  type: ContentType;
  status: WorkStatus;
  tags: string[];
  author: AuthorBrief;
  stats: WorkStats;
  chapters: ChapterBrief[];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  // Manga-specific fields (漫画特有字段)
  readingDirection?: ReadingDirection | null; // 阅读方向（仅漫画）
}

/**
 * 创建作品响应 DTO
 */
export interface CreateWorkResponseDto {
  message: string;
  work: WorkResponseDto;
}

/**
 * 删除作品响应 DTO
 */
export interface DeleteWorkResponseDto {
  message: string;
}
