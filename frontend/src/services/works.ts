/**
 * Works Service
 * 调用后端 /api/v1/works API 获取本地作品数据
 */

import { apiRequest } from '@/lib/api';
import type {
  ListWorksParams,
  PaginatedWorksResponse,
  WorkDetailResponse,
  WorkResponse,
} from '@/types/works';

// DisplayBook 接口（与主页保持一致）
export interface DisplayBook {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  source: 'wenku8' | 'local';
  tags?: string[];
}

/**
 * 构建查询字符串
 */
function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * 将 WorkResponse 转换为 DisplayBook
 */
export function workToDisplayBook(work: WorkResponse): DisplayBook {
  return {
    id: work.id,
    title: work.title,
    author: work.author.displayName || work.author.username,
    description: work.description || undefined,
    coverUrl: work.coverImage || undefined,
    source: 'local',
    tags: work.tags,
  };
}

export const worksService = {
  /**
   * 获取作品列表
   * GET /api/v1/works
   */
  async listWorks(params?: ListWorksParams): Promise<PaginatedWorksResponse> {
    const query = buildQueryString(params as Record<string, string | number | boolean | undefined | null> || {});
    return apiRequest<PaginatedWorksResponse>('get', `/works${query}`);
  },

  /**
   * 获取作品详情
   * GET /api/v1/works/:id
   */
  async getWorkById(id: string): Promise<WorkDetailResponse> {
    return apiRequest<WorkDetailResponse>('get', `/works/${id}`);
  },
};

export default worksService;
