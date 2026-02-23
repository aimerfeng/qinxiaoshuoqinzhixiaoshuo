/**
 * 设置中心 API 服务
 *
 * 需求21: 设置中心
 * 任务21.2.1: 设置中心页面布局
 */

import { api } from '@/lib/api';
import type {
  GetSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  GetLoginDevicesResponse,
  RemoveDeviceResponse,
  GetBlacklistResponse,
  AddToBlacklistResponse,
  RemoveFromBlacklistResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
} from '@/types/settings';

const SETTINGS_BASE_URL = '/api/v1/settings';

/**
 * 获取用户设置
 */
export async function getUserSettings(): Promise<GetSettingsResponse> {
  const response = await api.get<GetSettingsResponse>(SETTINGS_BASE_URL);
  return response.data;
}

/**
 * 更新用户设置
 */
export async function updateUserSettings(
  data: UpdateSettingsRequest
): Promise<UpdateSettingsResponse> {
  const response = await api.patch<UpdateSettingsResponse>(SETTINGS_BASE_URL, data);
  return response.data;
}

/**
 * 重置用户设置为默认值
 */
export async function resetUserSettings(): Promise<UpdateSettingsResponse> {
  const response = await api.post<UpdateSettingsResponse>(`${SETTINGS_BASE_URL}/reset`);
  return response.data;
}

/**
 * 获取登录设备列表
 */
export async function getLoginDevices(): Promise<GetLoginDevicesResponse> {
  const response = await api.get<GetLoginDevicesResponse>(`${SETTINGS_BASE_URL}/devices`);
  return response.data;
}

/**
 * 移除登录设备
 */
export async function removeDevice(deviceId: string): Promise<RemoveDeviceResponse> {
  const response = await api.delete<RemoveDeviceResponse>(
    `${SETTINGS_BASE_URL}/devices/${deviceId}`
  );
  return response.data;
}

/**
 * 移除所有其他设备
 */
export async function removeAllOtherDevices(): Promise<RemoveDeviceResponse> {
  const response = await api.delete<RemoveDeviceResponse>(
    `${SETTINGS_BASE_URL}/devices/others`
  );
  return response.data;
}

/**
 * 获取黑名单列表
 */
export async function getBlacklist(
  page: number = 1,
  limit: number = 20
): Promise<GetBlacklistResponse> {
  const response = await api.get<GetBlacklistResponse>(
    `${SETTINGS_BASE_URL}/blacklist`,
    { params: { page, limit } }
  );
  return response.data;
}

/**
 * 添加用户到黑名单
 */
export async function addToBlacklist(
  userId: string,
  reason?: string
): Promise<AddToBlacklistResponse> {
  const response = await api.post<AddToBlacklistResponse>(
    `${SETTINGS_BASE_URL}/blacklist/${userId}`,
    { reason }
  );
  return response.data;
}

/**
 * 从黑名单移除用户
 */
export async function removeFromBlacklist(
  userId: string
): Promise<RemoveFromBlacklistResponse> {
  const response = await api.delete<RemoveFromBlacklistResponse>(
    `${SETTINGS_BASE_URL}/blacklist/${userId}`
  );
  return response.data;
}

/**
 * 修改密码
 */
export async function changePassword(
  data: ChangePasswordRequest
): Promise<ChangePasswordResponse> {
  const response = await api.post<ChangePasswordResponse>(
    `${SETTINGS_BASE_URL}/password`,
    data
  );
  return response.data;
}

/**
 * 绑定新邮箱（发送验证邮件）
 */
export async function bindEmail(email: string): Promise<{ success: boolean; message: string }> {
  const response = await api.post<{ success: boolean; message: string }>(
    `${SETTINGS_BASE_URL}/email/bind`,
    { email }
  );
  return response.data;
}

/**
 * 验证邮箱绑定
 */
export async function verifyEmailBinding(
  token: string
): Promise<{ success: boolean; message: string }> {
  const response = await api.post<{ success: boolean; message: string }>(
    `${SETTINGS_BASE_URL}/email/verify`,
    { token }
  );
  return response.data;
}
