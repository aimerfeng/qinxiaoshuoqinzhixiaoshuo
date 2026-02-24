import { apiRequest } from '@/lib/api';
import type {
  ReadingListItem,
  ReadingListResponse,
  ReadingListQueryParams,
  ReadingListStatus,
} from '@/types/reading-list';

/**
 * 阅读列表服务
 */
export const readingListService = {
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
    return apiRequest<ReadingListResponse>('get', url);
  },

  async checkInList(workId: string): Promise<{ inList: boolean; item?: ReadingListItem }> {
    return apiRequest<{ inList: boolean; item?: ReadingListItem }>('get', `/reading-list/check/${workId}`);
  },

  async addToList(workId: string, status?: ReadingListStatus, note?: string): Promise<ReadingListItem> {
    return apiRequest<ReadingListItem>('post', '/reading-list', { workId, status, note });
  },

  async updateItem(itemId: string, data: { status?: ReadingListStatus; note?: string; rating?: number; hasUpdate?: boolean }): Promise<ReadingListItem> {
    return apiRequest<ReadingListItem>('patch', `/reading-list/${itemId}`, data);
  },

  async removeFromList(itemId: string): Promise<{ success: boolean }> {
    return apiRequest<{ success: boolean }>('delete', `/reading-list/${itemId}`);
  },

  async batchUpdate(itemIds: string[], data: { status?: ReadingListStatus; markAsRead?: boolean }): Promise<{ success: boolean; count: number }> {
    return apiRequest<{ success: boolean; count: number }>('post', '/reading-list/batch-update', { itemIds, ...data });
  },
};

export default readingListService;
