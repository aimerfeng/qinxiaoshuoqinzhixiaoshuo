/**
 * 阅读器 API 服务
 *
 * 需求4: 沉浸式阅读器
 */

import { apiRequest } from '@/lib/api';
import type {
  ChapterContentResponse,
  ChapterListResponse,
  AdjacentChaptersResponse,
  SaveProgressRequest,
  SaveProgressResponse,
  ReadingSettingsResponse,
  ReaderSettings,
} from '@/types/reader';

/**
 * 获取章节内容
 * GET /api/v1/reader/works/:workId/chapters/:chapterId
 */
export async function getChapterContent(
  workId: string,
  chapterId: string
): Promise<ChapterContentResponse> {
  return apiRequest<ChapterContentResponse>(
    'get',
    `/reader/works/${workId}/chapters/${chapterId}`
  );
}

/**
 * 获取章节目录
 * GET /api/v1/reader/works/:workId/chapters
 */
export async function getChapterList(workId: string): Promise<ChapterListResponse> {
  return apiRequest<ChapterListResponse>('get', `/reader/works/${workId}/chapters`);
}

/**
 * 获取相邻章节信息
 * GET /api/v1/reader/works/:workId/chapters/:chapterId/adjacent
 */
export async function getAdjacentChapters(
  workId: string,
  chapterId: string
): Promise<AdjacentChaptersResponse> {
  return apiRequest<AdjacentChaptersResponse>(
    'get',
    `/reader/works/${workId}/chapters/${chapterId}/adjacent`
  );
}

/**
 * 保存阅读进度
 * POST /api/v1/reader/works/:workId/progress
 */
export async function saveReadingProgress(
  workId: string,
  data: SaveProgressRequest
): Promise<SaveProgressResponse> {
  return apiRequest<SaveProgressResponse>('post', `/reader/works/${workId}/progress`, data);
}

/**
 * 获取阅读设置
 * GET /api/v1/reader/settings
 */
export async function getReadingSettings(): Promise<ReadingSettingsResponse> {
  return apiRequest<ReadingSettingsResponse>('get', '/reader/settings');
}

/**
 * 保存阅读设置
 * PATCH /api/v1/reader/settings
 */
export async function saveReadingSettings(
  settings: Partial<ReaderSettings>
): Promise<ReadingSettingsResponse> {
  return apiRequest<ReadingSettingsResponse>('patch', '/reader/settings', {
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    fontFamily: settings.fontFamily,
    backgroundColor: settings.backgroundColor,
    textColor: settings.textColor,
    pageMode: settings.readingMode,
    nightMode: settings.nightMode,
  });
}

/**
 * 获取 Wenku8 章节内容
 * GET /api/v1/reader/wenku8/:novelId/chapters/:chapterId
 */
export async function getWenku8ChapterContent(
  novelId: string,
  chapterId: string
): Promise<ChapterContentResponse> {
  return apiRequest<ChapterContentResponse>(
    'get',
    `/reader/wenku8/${novelId}/chapters/${chapterId}`
  );
}

/**
 * 获取 Wenku8 章节目录
 * GET /api/v1/reader/wenku8/:novelId/chapters
 */
export async function getWenku8ChapterList(novelId: string): Promise<ChapterListResponse> {
  return apiRequest<ChapterListResponse>('get', `/reader/wenku8/${novelId}/chapters`);
}
