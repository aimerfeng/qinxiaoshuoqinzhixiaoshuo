/**
 * 黑名单管理 Hook
 *
 * 需求21: 设置中心
 * 任务21.2.7: 黑名单管理
 *
 * 需求21验收标准10: WHEN 用户拉黑其他用户 THEN System SHALL 屏蔽对方内容和互动
 * 需求21验收标准11: WHEN 用户解除拉黑 THEN System SHALL 恢复正常显示
 *
 * 提供黑名单的获取和管理功能
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import {
  getBlacklist,
  addToBlacklist,
  removeFromBlacklist,
} from '@/services/settings';
import type { BlacklistEntry } from '@/types/settings';

/**
 * 黑名单查询 Key
 */
export const BLACKLIST_QUERY_KEY = ['blacklist'];

/**
 * 每页数量
 */
const PAGE_SIZE = 20;

/**
 * 获取黑名单列表 Hook（分页）
 */
export function useBlacklist(page: number = 1) {
  return useQuery({
    queryKey: [...BLACKLIST_QUERY_KEY, page],
    queryFn: async () => {
      const response = await getBlacklist(page, PAGE_SIZE);
      return response.data;
    },
    staleTime: 60 * 1000, // 1分钟
    gcTime: 5 * 60 * 1000, // 5分钟
  });
}

/**
 * 获取黑名单列表 Hook（无限滚动）
 */
export function useInfiniteBlacklist() {
  return useInfiniteQuery({
    queryKey: [...BLACKLIST_QUERY_KEY, 'infinite'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await getBlacklist(pageParam, PAGE_SIZE);
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.hasMore) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * 添加用户到黑名单 Hook
 */
export function useAddToBlacklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason?: string }) => {
      const response = await addToBlacklist(userId, reason);
      return response;
    },
    onSuccess: () => {
      // 刷新黑名单列表
      queryClient.invalidateQueries({ queryKey: BLACKLIST_QUERY_KEY });
    },
    onError: (error) => {
      console.error('Failed to add to blacklist:', error);
    },
  });
}

/**
 * 从黑名单移除用户 Hook
 */
export function useRemoveFromBlacklist() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await removeFromBlacklist(userId);
      return response;
    },
    onSuccess: (_, userId) => {
      // 乐观更新：从缓存中移除用户
      queryClient.setQueriesData<{
        users: BlacklistEntry[];
        total: number;
        page: number;
        limit: number;
        hasMore: boolean;
      }>(
        { queryKey: BLACKLIST_QUERY_KEY },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            users: old.users.filter((entry) => entry.blockedUserId !== userId),
            total: old.total - 1,
          };
        }
      );
      // 同时刷新以确保数据一致性
      queryClient.invalidateQueries({ queryKey: BLACKLIST_QUERY_KEY });
    },
    onError: (error) => {
      console.error('Failed to remove from blacklist:', error);
    },
  });
}
