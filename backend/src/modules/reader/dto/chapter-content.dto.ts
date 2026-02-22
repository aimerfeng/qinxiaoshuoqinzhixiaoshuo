/**
 * 章节内容获取 DTO
 *
 * 需求4: 沉浸式阅读器
 * 任务4.1.1: 章节内容获取 API
 */

/**
 * 段落信息
 */
export interface ParagraphDto {
  id: string;
  anchorId: string;
  content: string;
  orderIndex: number;
  quoteCount: number;
}

/**
 * 漫画页面信息
 */
export interface MangaPageDto {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  orderIndex: number;
  width: number | null;
  height: number | null;
}

/**
 * 章节内容响应 DTO
 */
export interface ChapterContentResponseDto {
  message: string;
  chapter: {
    id: string;
    workId: string;
    title: string;
    orderIndex: number;
    wordCount: number;
    viewCount: number;
    status: string;
    publishedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  work: {
    id: string;
    title: string;
    authorId: string;
    authorName: string;
    contentType: string;
    readingDirection?: string | null;
  };
  // 小说内容
  content?: string;
  paragraphs?: ParagraphDto[];
  // 漫画内容
  pages?: MangaPageDto[];
  // 阅读进度（如果用户已登录）
  readingProgress?: {
    paragraphIndex: number;
    scrollPosition: number | null;
    readPercentage: number;
    lastReadAt: Date;
  } | null;
  // 相邻章节信息
  prevChapter: {
    id: string;
    title: string;
    orderIndex: number;
  } | null;
  nextChapter: {
    id: string;
    title: string;
    orderIndex: number;
  } | null;
}
