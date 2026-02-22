import { IsUUID, IsInt, IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * 阅读进度 DTO
 *
 * 需求4: 沉浸式阅读器
 * 任务4.1.2: 阅读进度保存 API
 */

/**
 * 保存阅读进度请求 DTO
 */
export class SaveReadingProgressDto {
  @IsUUID()
  chapterId!: string;

  @IsInt()
  @Min(0)
  paragraphIndex!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  scrollPosition?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  readPercentage!: number;
}

/**
 * 保存阅读进度响应 DTO
 */
export interface SaveReadingProgressResponseDto {
  message: string;
  progress: {
    id: string;
    userId: string;
    chapterId: string;
    paragraphIndex: number;
    scrollPosition: number | null;
    readPercentage: number;
    lastReadAt: Date;
  };
}

/**
 * 获取阅读进度响应 DTO
 */
export interface GetReadingProgressResponseDto {
  message: string;
  progress: {
    id: string;
    chapterId: string;
    chapterTitle: string;
    workId: string;
    workTitle: string;
    paragraphIndex: number;
    scrollPosition: number | null;
    readPercentage: number;
    lastReadAt: Date;
  } | null;
}

/**
 * 获取作品阅读进度列表响应 DTO
 */
export interface GetWorkReadingProgressResponseDto {
  message: string;
  workId: string;
  workTitle: string;
  progresses: {
    chapterId: string;
    chapterTitle: string;
    orderIndex: number;
    paragraphIndex: number;
    scrollPosition: number | null;
    readPercentage: number;
    lastReadAt: Date;
  }[];
  // 最近阅读的章节
  lastReadChapter: {
    chapterId: string;
    chapterTitle: string;
    orderIndex: number;
    paragraphIndex: number;
    readPercentage: number;
    lastReadAt: Date;
  } | null;
}
