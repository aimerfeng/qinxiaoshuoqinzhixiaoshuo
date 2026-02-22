import { ChapterStatus } from '@prisma/client';

/**
 * 章节响应 DTO
 */
export interface ChapterResponseDto {
  id: string;
  workId: string;
  title: string;
  content: string;
  orderIndex: number;
  wordCount: number;
  status: ChapterStatus;
  version: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建章节响应 DTO
 */
export interface CreateChapterResponseDto {
  message: string;
  chapter: ChapterResponseDto;
}

/**
 * 更新章节响应 DTO
 */
export interface UpdateChapterResponseDto {
  message: string;
  chapter: ChapterResponseDto;
  previousVersion: number;
}

/**
 * 删除章节响应 DTO
 */
export interface DeleteChapterResponseDto {
  message: string;
}
