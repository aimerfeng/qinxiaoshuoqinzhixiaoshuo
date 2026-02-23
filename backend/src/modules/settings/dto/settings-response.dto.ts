import { ProfileVisibility, DirectMessagePermission } from '@prisma/client';

/**
 * 用户设置数据 DTO
 */
export interface UserSettingsDataDto {
  id: string;
  userId: string;

  // 账户安全设置
  twoFactorEnabled: boolean;
  loginNotificationEnabled: boolean;

  // 隐私设置
  profileVisibility: ProfileVisibility;
  showOnlineStatus: boolean;
  allowDirectMessages: DirectMessagePermission;
  showReadingActivity: boolean;

  // 通知设置
  emailNotifications: boolean;
  pushNotifications: boolean;
  commentNotifications: boolean;
  likeNotifications: boolean;
  followNotifications: boolean;
  mentionNotifications: boolean;
  updateNotifications: boolean;

  // 阅读设置
  defaultFontSize: number;
  defaultLineHeight: number;
  defaultTheme: string;
  autoNightMode: boolean;
  nightModeStartTime: string | null;
  nightModeEndTime: string | null;

  // 主题设置
  theme: string;
  accentColor: string | null;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取用户设置响应 DTO
 */
export interface GetSettingsResponseDto {
  message: string;
  settings: UserSettingsDataDto;
}

/**
 * 更新用户设置响应 DTO
 */
export interface UpdateSettingsResponseDto {
  message: string;
  settings: UserSettingsDataDto;
}

/**
 * 重置用户设置响应 DTO
 */
export interface ResetSettingsResponseDto {
  message: string;
  settings: UserSettingsDataDto;
}
