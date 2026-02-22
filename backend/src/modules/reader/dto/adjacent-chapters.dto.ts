/**
 * 相邻章节信息 DTO
 *
 * 需求4: 沉浸式阅读器
 * 任务4.1.4: 相邻章节信息 API
 */

/**
 * 章节简要信息
 */
export interface ChapterBriefDto {
  id: string;
  title: string;
  orderIndex: number;
  wordCount: number;
  status: string;
  publishedAt: Date | null;
}

/**
 * 相邻章节响应 DTO
 */
export interface AdjacentChaptersResponseDto {
  message: string;
  currentChapter: ChapterBriefDto;
  prevChapter: ChapterBriefDto | null;
  nextChapter: ChapterBriefDto | null;
  // 章节总数
  totalChapters: number;
  // 当前章节在列表中的位置（从1开始）
  currentPosition: number;
}

/**
 * 章节目录响应 DTO
 */
export interface ChapterListResponseDto {
  message: string;
  workId: string;
  workTitle: string;
  contentType: string;
  chapters: ChapterBriefDto[];
  totalChapters: number;
}
