/**
 * 登录设备管理 Hook
 *
 * 需求21: 设置中心
 * 任务21.2.2: 账户安全设置
 *
 * 需求21验收标准2: WHEN 用户查看登录设备 THEN System SHALL 显示设备名称、登录时间、IP地址
 * 需求21验收标准3: WHEN 用户移除登录设备 THEN System SHALL 使该设备的会话失效
 *
 * 提供登录设备的获取和管理功能
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getLoginDevices,
  removeDevice,
  removeAllOtherDevices,
} from '@/services/settings';
import type { LoginDevice } from '@/types/settings';

/**
 * 登录设备查询 Key
 */
export const LOGIN_DEVICES_QUERY_KEY = ['loginDevices'];

/**
 * 获取登录设备列表 Hook
 */
export function useLoginDevices() {
  return useQuery({
    queryKey: LOGIN_DEVICES_QUERY_KEY,
    queryFn: async () => {
      const response = await getLoginDevices();
      return {
        devices: response.devices,
        total: response.total,
      };
    },
    staleTime: 60 * 1000, // 1分钟
    gcTime: 5 * 60 * 1000, // 5分钟
  });
}

/**
 * 移除登录设备 Hook
 */
export function useRemoveDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await removeDevice(deviceId);
      return response;
    },
    onSuccess: (_, deviceId) => {
      // 从缓存中移除设备
      queryClient.setQueryData<{ devices: LoginDevice[]; total: number }>(
        LOGIN_DEVICES_QUERY_KEY,
        (old) => {
          if (!old) return old;
          return {
            devices: old.devices.filter((d) => d.id !== deviceId),
            total: old.total - 1,
          };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to remove device:', error);
    },
  });
}

/**
 * 移除所有其他设备 Hook
 */
export function useRemoveAllOtherDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await removeAllOtherDevices();
      return response;
    },
    onSuccess: () => {
      // 只保留当前设备
      queryClient.setQueryData<{ devices: LoginDevice[]; total: number }>(
        LOGIN_DEVICES_QUERY_KEY,
        (old) => {
          if (!old) return old;
          const currentDevice = old.devices.find((d) => d.isCurrentDevice);
          return {
            devices: currentDevice ? [currentDevice] : [],
            total: currentDevice ? 1 : 0,
          };
        }
      );
    },
    onError: (error) => {
      console.error('Failed to remove all other devices:', error);
    },
  });
}
