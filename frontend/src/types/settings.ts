/**
 * 设置中心类型定义
 *
 * 需求21: 设置中心
 * 任务21.2.1: 设置中心页面布局
 */

/**
 * 个人资料可见性
 */
export type ProfileVisibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE';

/**
 * 私信权限
 */
export type DirectMessagePermission = 'EVERYONE' | 'FOLLOWERS_ONLY' | 'NOBODY';

/**
 * 用户设置数据
 */
export interface UserSettings {
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
 * 更新设置请求
 */
export interface UpdateSettingsRequest {
  // 账户安全设置
  twoFactorEnabled?: boolean;
  loginNotificationEnabled?: boolean;

  // 隐私设置
  profileVisibility?: ProfileVisibility;
  showOnlineStatus?: boolean;
  allowDirectMessages?: DirectMessagePermission;
  showReadingActivity?: boolean;

  // 通知设置
  emailNotifications?: boolean;
  pushNotifications?: boolean;
  commentNotifications?: boolean;
  likeNotifications?: boolean;
  followNotifications?: boolean;
  mentionNotifications?: boolean;
  updateNotifications?: boolean;

  // 阅读设置
  defaultFontSize?: number;
  defaultLineHeight?: number;
  defaultTheme?: string;
  autoNightMode?: boolean;
  nightModeStartTime?: string | null;
  nightModeEndTime?: string | null;

  // 主题设置
  theme?: string;
  accentColor?: string | null;
}

/**
 * 获取设置响应
 */
export interface GetSettingsResponse {
  message: string;
  settings: UserSettings;
}

/**
 * 更新设置响应
 */
export interface UpdateSettingsResponse {
  message: string;
  settings: UserSettings;
}

/**
 * 登录设备信息
 */
export interface LoginDevice {
  id: string;
  fingerprint: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  ipAddress: string | null;
  location: string | null;
  lastActiveAt: Date;
  createdAt: Date;
  isCurrentDevice: boolean;
}

/**
 * 获取登录设备响应
 */
export interface GetLoginDevicesResponse {
  message: string;
  devices: LoginDevice[];
  total: number;
}

/**
 * 移除设备响应
 */
export interface RemoveDeviceResponse {
  success: boolean;
  message: string;
}

/**
 * 黑名单用户信息
 */
export interface BlacklistUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 黑名单条目
 */
export interface BlacklistEntry {
  id: string;
  blockedUserId: string;
  blockedUser: BlacklistUser;
  reason: string | null;
  createdAt: Date;
}

/**
 * 获取黑名单响应
 */
export interface GetBlacklistResponse {
  success: boolean;
  data: {
    users: BlacklistEntry[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * 添加黑名单响应
 */
export interface AddToBlacklistResponse {
  success: boolean;
  message: string;
  data?: BlacklistEntry;
}

/**
 * 移除黑名单响应
 */
export interface RemoveFromBlacklistResponse {
  success: boolean;
  message: string;
}

/**
 * 设置分类
 */
export type SettingsCategory =
  | 'security'
  | 'privacy'
  | 'notifications'
  | 'reading'
  | 'theme'
  | 'blacklist';

/**
 * 设置导航项
 */
export interface SettingsNavItem {
  id: SettingsCategory;
  label: string;
  description: string;
  href: string;
  icon: string;
}

/**
 * 修改密码请求
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * 修改密码响应
 */
export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}
