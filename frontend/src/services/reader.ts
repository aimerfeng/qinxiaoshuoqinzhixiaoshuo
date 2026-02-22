/**
 * 阅读器 API 服务
 *
 * 需求4: 沉浸式阅读器
 */

import { api } from '@/lib/api';
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
  const response = await api.get<ChapterContentResponse>(
    `/reader/works/${workId}/chapters/${chapterId}`
  );
  return response.data;
}

/**
 * 获取章节目录
 * GET /api/v1/reader/works/:workId/chapters
 */
export async function getChapterList(workId: string): Promise<ChapterListResponse> {
  const response = await api.get<ChapterListResponse>(`/reader/works/${workId}/chapters`);
  return response.data;
}

/**
 * 获取相邻章节信息
 * GET /api/v1/reader/works/:workId/chapters/:chapterId/adjacent
 */
export async function getAdjacentChapters(
  workId: string,
  chapterId: string
): Promise<AdjacentChaptersResponse> {
  const response = await api.get<AdjacentChaptersResponse>(
    `/reader/works/${workId}/chapters/${chapterId}/adjacent`
  );
  return response.data;
}

/**
 * 保存阅读进度
 * POST /api/v1/reader/works/:workId/progress
 */
export async function saveReadingProgress(
  workId: string,
  data: SaveProgressRequest
): Promise<SaveProgressResponse> {
  const response = await api.post<SaveProgressResponse>(`/reader/works/${workId}/progress`, data);
  return response.data;
}

/**
 * 获取阅读设置
 * GET /api/v1/reader/settings
 */
export async function getReadingSettings(): Promise<ReadingSettingsResponse> {
  const response = await api.get<ReadingSettingsResponse>('/reader/settings');
  return response.data;
}

/**
 * 保存阅读设置
 * PATCH /api/v1/reader/settings
 */
export async function saveReadingSettings(
  settings: Partial<ReaderSettings>
): Promise<ReadingSettingsResponse> {
  const response = await api.patch<ReadingSettingsResponse>('/reader/settings', {
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    fontFamily: settings.fontFamily,
    backgroundColor: settings.backgroundColor,
    textColor: settings.textColor,
    pageMode: settings.readingMode,
    nightMode: settings.nightMode,
  });
  return response.data;
}
