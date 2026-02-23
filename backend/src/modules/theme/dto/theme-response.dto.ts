import {
  ThemeUnlockType,
  ThemeColorsDto,
  ThemeUnlockConditionDto,
  ThemeCustomizationsDto,
} from './theme.dto.js';

/**
 * 主题数据 DTO
 */
export interface ThemeDataDto {
  /** 主题ID */
  id: string;

  /** 主题标识符 */
  name: string;

  /** 显示名称 */
  displayName: string;

  /** 主题描述 */
  description?: string | null;

  /** 预览图URL */
  previewImage?: string | null;

  /** 颜色配置 */
  colors: ThemeColorsDto;

  /** 是否默认主题 */
  isDefault: boolean;

  /** 是否高级主题 */
  isPremium: boolean;

  /** 是否需要解锁 */
  isUnlockable: boolean;

  /** 解锁条件 */
  unlockCondition?: ThemeUnlockConditionDto | null;

  /** 解锁类型 */
  unlockType: ThemeUnlockType;

  /** 排序顺序 */
  sortOrder: number;

  /** 是否启用 */
  isActive: boolean;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 用户主题偏好数据 DTO
 */
export interface UserThemePreferenceDataDto {
  /** 偏好ID */
  id: string;

  /** 用户ID */
  userId: string;

  /** 主题ID */
  themeId: string;

  /** 自定义配置 */
  customizations?: ThemeCustomizationsDto | null;

  /** 是否当前激活 */
  isActive: boolean;

  /** 解锁时间 */
  unlockedAt: Date;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 关联的主题数据 */
  theme?: ThemeDataDto;
}

/**
 * 带解锁状态的主题数据 DTO
 */
export interface ThemeWithUnlockStatusDto extends ThemeDataDto {
  /** 用户是否已解锁此主题 */
  isUnlocked: boolean;

  /** 是否当前激活的主题 */
  isCurrentActive: boolean;

  /** 用户自定义配置 */
  userCustomizations?: ThemeCustomizationsDto | null;
}

/**
 * 获取主题列表响应 DTO
 */
export interface GetThemesResponseDto {
  /** 响应消息 */
  message: string;

  /** 主题列表 */
  themes: ThemeDataDto[];

  /** 总数 */
  total: number;
}

/**
 * 获取用户可用主题列表响应 DTO
 */
export interface GetUserThemesResponseDto {
  /** 响应消息 */
  message: string;

  /** 主题列表（含解锁状态） */
  themes: ThemeWithUnlockStatusDto[];

  /** 总数 */
  total: number;
}

/**
 * 获取单个主题响应 DTO
 */
export interface GetThemeResponseDto {
  /** 响应消息 */
  message: string;

  /** 主题数据 */
  theme: ThemeDataDto;
}

/**
 * 创建主题响应 DTO
 */
export interface CreateThemeResponseDto {
  /** 响应消息 */
  message: string;

  /** 创建的主题数据 */
  theme: ThemeDataDto;
}

/**
 * 更新主题响应 DTO
 */
export interface UpdateThemeResponseDto {
  /** 响应消息 */
  message: string;

  /** 更新后的主题数据 */
  theme: ThemeDataDto;
}

/**
 * 删除主题响应 DTO
 */
export interface DeleteThemeResponseDto {
  /** 响应消息 */
  message: string;
}

/**
 * 获取用户当前主题响应 DTO
 */
export interface GetUserActiveThemeResponseDto {
  /** 响应消息 */
  message: string;

  /** 当前激活的主题偏好 */
  preference?: UserThemePreferenceDataDto | null;

  /** 当前激活的主题数据 */
  theme?: ThemeDataDto | null;
}

/**
 * 设置用户主题偏好响应 DTO
 */
export interface SetUserThemePreferenceResponseDto {
  /** 响应消息 */
  message: string;

  /** 用户主题偏好数据 */
  preference: UserThemePreferenceDataDto;
}

/**
 * 检查主题解锁状态响应 DTO
 */
export interface CheckThemeUnlockResponseDto {
  /** 响应消息 */
  message: string;

  /** 是否已解锁 */
  isUnlocked: boolean;

  /** 解锁条件说明 */
  unlockRequirement?: string;
}
