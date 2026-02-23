/**
 * 设置数据获取 Hook
 *
 * 需求21: 设置中心
 * 任务21.2.2: 账户安全设置
 *
 * 提供设置数据的获取和更新功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUserSettings,
  updateUserSettings,
  changePassword,
} from '@/services/settings';
import type {
  UserSettings,
  UpdateSettingsRequest,
  ChangePasswordRequest,
} from '@/types/settings';

/**
 * 设置查询 Key
 */
export const SETTINGS_QUERY_KEY = ['settings'];

/**
 * 获取用户设置 Hook
 */
export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const response = await getUserSettings();
      return response.settings;
    },
    staleTime: 5 * 60 * 1000, // 5分钟
    gcTime: 30 * 60 * 1000, // 30分钟
  });
}

/**
 * 更新用户设置 Hook
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSettingsRequest) => {
      const response = await updateUserSettings(data);
      return response.settings;
    },
    onSuccess: (newSettings) => {
      // 更新缓存
      queryClient.setQueryData<UserSettings>(SETTINGS_QUERY_KEY, newSettings);
    },
    onError: (error) => {
      console.error('Failed to update settings:', error);
    },
  });
}

/**
 * 修改密码 Hook
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordRequest) => {
      const response = await changePassword(data);
      return response;
    },
  });
}
