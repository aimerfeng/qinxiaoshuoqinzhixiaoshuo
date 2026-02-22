import { apiRequest } from '@/lib/api';
import type {
  SearchQuery,
  SearchResponse,
  AutocompleteResponse,
  SearchHistoryItem,
} from '@/types/search';

export const searchService = {
  /**
   * 主搜索
   */
  search: async (query: SearchQuery): Promise<SearchResponse> => {
    const params = new URLSearchParams();
    params.append('q', query.q);
    if (query.type) params.append('type', query.type);
    if (query.sort) params.append('sort', query.sort);
    if (query.contentType) params.append('contentType', query.contentType);
    if (query.status) params.append('status', query.status);
    if (query.tags && query.tags.length > 0) {
      params.append('tags', query.tags.join(','));
    }
    if (query.page) params.append('page', query.page.toString());
    if (query.pageSize) params.append('pageSize', query.pageSize.toString());

    return apiRequest<SearchResponse>('get', `/search?${params.toString()}`);
  },

  /**
   * 自动补全
   */
  autocomplete: async (
    q: string,
    limit: number = 5,
  ): Promise<AutocompleteResponse> => {
    const params = new URLSearchParams();
    params.append('q', q);
    params.append('limit', limit.toString());

    return apiRequest<AutocompleteResponse>(
      'get',
      `/search/autocomplete?${params.toString()}`,
    );
  },

  /**
   * 获取热门搜索
   */
  getPopularSearches: async (
    limit: number = 10,
  ): Promise<{ searches: string[] }> => {
    return apiRequest<{ searches: string[] }>(
      'get',
      `/search/popular?limit=${limit}`,
    );
  },

  /**
   * 获取搜索历史
   */
  getSearchHistory: async (
    limit: number = 10,
  ): Promise<{ history: SearchHistoryItem[] }> => {
    return apiRequest<{ history: SearchHistoryItem[] }>(
      'get',
      `/search/history?limit=${limit}`,
    );
  },

  /**
   * 删除搜索历史
   */
  deleteSearchHistory: async (
    historyId?: string,
  ): Promise<{ success: boolean }> => {
    const url = historyId ? `/search/history/${historyId}` : '/search/history';
    return apiRequest<{ success: boolean }>('delete', url);
  },
};
