import { api } from '@/lib/api';
import type {
  ReadingListItem,
  ReadingListResponse,
  ReadingListQueryParams,
  ReadingListStatus,
} from '@/types/reading-list';

/**
 * 阅读列表服务
 *
 * 需求12: 阅读列表管理前端 API 调用
 */
export const readingListService = {
  /**
   * 获取阅读列表
   */
  async getList(params?: ReadingListQueryParams): Promise<ReadingListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.hasUpdate !== undefined) searchParams.set('hasUpdate', String(params.hasUpdate));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const query = searchParams.toString();
    const url = query ? `/reading-list?${query}` : '/reading-list';
    return api.get<ReadingListResponse>(url);
  },

  /**
   * 检查作品是否在阅读列表中
   */
  async checkInList(workId: string): Promise<{ inList: boolean; item?: ReadingListItem }> {
    return api.get<{ inList: boolean; item?: ReadingListItem }>(`/reading-list/check/${workId}`);
  },

  /**
   * 添加到阅读列表
   */
  async addToList(
    workId: string,
    status?: ReadingListStatus,
    note?: string,
  ): Promise<ReadingListItem> {
    return api.post<ReadingListItem>('/reading-list', { workId, status, note });
  },

  /**
   * 更新阅读列表项
   */
  async updateItem(
    itemId: string,
    data: {
      status?: ReadingListStatus;
      note?: string;
      rating?: number;
      hasUpdate?: boolean;
    },
  ): Promise<ReadingListItem> {
    return api.patch<ReadingListItem>(`/reading-list/${itemId}`, data);
  },

  /**
   * 从阅读列表移除
   */
  async removeFromList(itemId: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/reading-list/${itemId}`);
  },

  /**
   * 批量更新
   */
  async batchUpdate(
    itemIds: string[],
    data: { status?: ReadingListStatus; markAsRead?: boolean },
  ): Promise<{ success: boolean; count: number }> {
    return api.post<{ success: boolean; count: number }>('/reading-list/batch-update', {
      itemIds,
      ...data,
    });
  },
};

export default readingListService;
