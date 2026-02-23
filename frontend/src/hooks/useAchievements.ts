/**
 * 成就系统 React Query Hooks
 *
 * 需求24: 成就系统
 * 任务24.2.1: 成就中心页面布局
 *
 * 提供成就数据的获取和操作功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { achievementService } from '@/services/achievement';
import type {
  AchievementQueryParams,
  AchievementCategory,
  AchievementTier,
} from '@/types/achievement';

/**
 * 查询 Key 常量
 */
export const ACHIEVEMENT_QUERY_KEYS = {
  all: ['achievements'] as const,
  categories: ['achievements', 'categories'] as const,
  tiers: ['achievements', 'tiers'] as const,
  list: (params?: AchievementQueryParams) => ['achievements', 'list', params] as const,
  byCategory: (category: AchievementCategory, params?: AchievementQueryParams) =>
    ['achievements', 'category', category, params] as const,
  byTier: (tier: AchievementTier, params?: AchievementQueryParams) =>
    ['achievements', 'tier', tier, params] as const,
  detail: (id: string) => ['achievements', 'detail', id] as const,
  user: (params?: AchievementQueryParams) => ['achievements', 'user', params] as const,
  userStats: ['achievements', 'user', 'stats'] as const,
  userDetail: (achievementId: string) => ['achievements', 'user', 'detail', achievementId] as const,
};

/**
 * 获取成就类别列表 Hook
 */
export function useAchievementCategories() {
  return useQuery({
    queryKey: ACHIEVEMENT_QUERY_KEYS.categories,
    queryFn: async () => {
      const response = await achievementService.getCategories();
      return response.categories;
    },
    staleTime: 10 * 60 * 1000, // 10分钟
    gcTime: 30 * 60 * 1000, // 30分钟
  });
}

/**
 * 获取成就等级列表 Hook
 */
export function useAchievementTiers() {
  return useQuery({
    queryKey: ACHIEVEMENT_QUERY_KEYS.tiers,
    queryFn: async () => {
      const response = await achievementService.getTiers();
      return response.tiers;
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/**
 * 获取成就列表 Hook（公开）
 */
export function useAchievements(params?: AchievementQueryParams) {
  return useQuery({
    queryKey: ACHIEVEMENT_QUERY_KEYS.list(params),
    queryFn: async () => {
      const response = await achievementService.getAchievements(params);
      return response;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * 按类别获取成就 Hook
 */
export function useAchievementsByCategory(
  category: AchievementCategory,
  params?: AchievementQueryParams
) {
  return useQuery({
    queryKey: ACHIEVEMENT_QUERY_KEYS.byCategory(category, params),
    queryFn: async () => {
      const response = await achievementService.getAchievementsByCategory(category, params);
      return response;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * 按等级获取成就 Hook
 */
export function useAchievementsByTier(tier: AchievementTier, params?: AchievementQueryParams) {
  return useQuery({
    queryKey: ACHIEVEMENT_QUERY_KEYS.byTier(tier, params),
    queryFn: async () => {
      const response = await achievementService.getAchievementsByTier(tier, params);
      return response;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * 获取成就详情 Hook
 */
export function useAchievementDetail(id: string) {
  return useQuery({
    queryKey: ACHIEVEMENT_QUERY_KEYS.detail(id),
    queryFn: async () => {
      const response = await achievementService.getAchievementById(id);
      return response.achievement;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
}

/**
 * 获取用户成就列表 Hook
 */
export function useUserAchievements(params?: AchievementQueryParams) {
  return useQuery({
    queryKey: ACHIEVEMENT_QUERY_KEYS.user(params),
    queryFn: async () => {
      const response = await achievementService.getUserAchievements(params);
      return response;
    },
    staleTime: 2 * 60 * 1000, // 2分钟
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 获取用户成就统计 Hook
 */
export function useUserAchievementStats() {
  return useQuery({
    queryKey: ACHIEVEMENT_QUERY_KEYS.userStats,
    queryFn: async () => {
      const response = await achievementService.getUserStats();
      return response.stats;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 获取用户特定成就详情 Hook
 */
export function useUserAchievementDetail(achievementId: string) {
  return useQuery({
    queryKey: ACHIEVEMENT_QUERY_KEYS.userDetail(achievementId),
    queryFn: async () => {
      const response = await achievementService.getUserAchievementDetail(achievementId);
      return response.achievement;
    },
    enabled: !!achievementId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * 领取成就奖励 Hook
 */
export function useClaimReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (achievementId: string) => {
      const response = await achievementService.claimReward(achievementId);
      return response;
    },
    onSuccess: () => {
      // 更新用户成就列表缓存
      queryClient.invalidateQueries({ queryKey: ['achievements', 'user'] });
      // 更新用户统计缓存
      queryClient.invalidateQueries({ queryKey: ACHIEVEMENT_QUERY_KEYS.userStats });
    },
    onError: (error) => {
      console.error('Failed to claim reward:', error);
    },
  });
}

/**
 * 批量领取所有奖励 Hook
 */
export function useClaimAllRewards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await achievementService.claimAllRewards();
      return response;
    },
    onSuccess: () => {
      // 刷新所有用户成就相关缓存
      queryClient.invalidateQueries({ queryKey: ['achievements', 'user'] });
      queryClient.invalidateQueries({ queryKey: ACHIEVEMENT_QUERY_KEYS.userStats });
    },
    onError: (error) => {
      console.error('Failed to claim all rewards:', error);
    },
  });
}

/**
 * 检查并解锁成就 Hook
 */
export function useCheckAndUnlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await achievementService.checkAndUnlock();
      return response;
    },
    onSuccess: () => {
      // 刷新用户成就相关缓存
      queryClient.invalidateQueries({ queryKey: ['achievements', 'user'] });
      queryClient.invalidateQueries({ queryKey: ACHIEVEMENT_QUERY_KEYS.userStats });
    },
    onError: (error) => {
      console.error('Failed to check and unlock achievements:', error);
    },
  });
}
