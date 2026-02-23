/**
 * 成就系统类型定义
 *
 * 需求24: 成就系统
 * 任务24.2.1: 成就中心页面布局
 */

/**
 * 成就类别枚举
 */
export type AchievementCategory =
  | 'READING'
  | 'CREATION'
  | 'SOCIAL'
  | 'COLLECTION'
  | 'SPECIAL'
  | 'SEASONAL'
  | 'EVENT';

/**
 * 成就等级枚举
 */
export type AchievementTier =
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'LEGENDARY';

/**
 * 成就奖励类型枚举
 */
export type AchievementRewardType =
  | 'TOKENS'
  | 'BADGE'
  | 'TITLE'
  | 'AVATAR_FRAME'
  | 'THEME';

/**
 * 成就类别中文名称映射
 */
export const ACHIEVEMENT_CATEGORY_NAMES: Record<AchievementCategory, string> = {
  READING: '阅读成就',
  CREATION: '创作成就',
  SOCIAL: '社交成就',
  COLLECTION: '收藏成就',
  SPECIAL: '特殊成就',
  SEASONAL: '赛季成就',
  EVENT: '活动成就',
};

/**
 * 成就类别图标映射
 */
export const ACHIEVEMENT_CATEGORY_ICONS: Record<AchievementCategory, string> = {
  READING: '📚',
  CREATION: '✍️',
  SOCIAL: '💬',
  COLLECTION: '⭐',
  SPECIAL: '🎯',
  SEASONAL: '🏆',
  EVENT: '🎉',
};

/**
 * 成就等级中文名称映射
 */
export const ACHIEVEMENT_TIER_NAMES: Record<AchievementTier, string> = {
  BRONZE: '青铜',
  SILVER: '白银',
  GOLD: '黄金',
  PLATINUM: '铂金',
  DIAMOND: '钻石',
  LEGENDARY: '传说',
};

/**
 * 成就等级颜色配置
 */
export const ACHIEVEMENT_TIER_COLORS: Record<
  AchievementTier,
  { text: string; bg: string; border: string; gradient: string }
> = {
  BRONZE: {
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-300 dark:border-amber-700',
    gradient: 'from-amber-400 to-amber-600',
  },
  SILVER: {
    text: 'text-gray-600 dark:text-gray-300',
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    border: 'border-gray-300 dark:border-gray-600',
    gradient: 'from-gray-300 to-gray-500',
  },
  GOLD: {
    text: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-400 dark:border-yellow-600',
    gradient: 'from-yellow-400 to-yellow-600',
  },
  PLATINUM: {
    text: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border-cyan-300 dark:border-cyan-600',
    gradient: 'from-cyan-300 to-cyan-500',
  },
  DIAMOND: {
    text: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-400 dark:border-blue-500',
    gradient: 'from-blue-400 to-indigo-500',
  },
  LEGENDARY: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-400 dark:border-purple-500',
    gradient: 'from-purple-500 to-pink-500',
  },
};

/**
 * 成就奖励类型中文名称映射
 */
export const ACHIEVEMENT_REWARD_TYPE_NAMES: Record<AchievementRewardType, string> = {
  TOKENS: '零芥子',
  BADGE: '徽章',
  TITLE: '称号',
  AVATAR_FRAME: '头像框',
  THEME: '主题皮肤',
};

// ==================== 成就奖励相关 ====================

/**
 * 成就奖励值
 */
export interface AchievementRewardValue {
  /** 代币数量（TOKENS类型） */
  amount?: number;
  /** 徽章ID（BADGE类型） */
  badgeId?: string;
  /** 称号（TITLE类型） */
  title?: string;
  /** 头像框ID（AVATAR_FRAME类型） */
  frameId?: string;
  /** 主题ID（THEME类型） */
  themeId?: string;
}

// ==================== 成就数据相关 ====================

/**
 * 成就数据
 */
export interface Achievement {
  /** 成就ID */
  id: string;
  /** 成就标识符 */
  name: string;
  /** 显示名称 */
  displayName: string;
  /** 成就描述 */
  description: string;
  /** 成就类别 */
  category: AchievementCategory;
  /** 成就等级 */
  tier: AchievementTier;
  /** 成就图标URL */
  iconUrl?: string | null;
  /** 成就徽章URL */
  badgeUrl?: string | null;
  /** 目标值 */
  targetValue: number;
  /** 奖励类型 */
  rewardType: AchievementRewardType;
  /** 奖励详情 */
  rewardValue: AchievementRewardValue;
  /** 是否隐藏成就 */
  isHidden: boolean;
  /** 是否启用 */
  isActive: boolean;
  /** 排序顺序 */
  sortOrder: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 带用户进度的成就数据
 */
export interface AchievementWithProgress extends Achievement {
  /** 用户当前进度 */
  currentProgress: number;
  /** 进度百分比 */
  progressPercent: number;
  /** 是否已解锁 */
  isUnlocked: boolean;
  /** 解锁时间 */
  unlockedAt?: string | null;
  /** 是否已领取奖励 */
  isClaimed: boolean;
  /** 领取时间 */
  claimedAt?: string | null;
}

// ==================== 成就类别信息 ====================

/**
 * 成就类别信息
 */
export interface AchievementCategoryInfo {
  /** 类别标识 */
  category: AchievementCategory;
  /** 类别显示名称 */
  displayName: string;
  /** 类别描述 */
  description: string;
  /** 该类别成就总数 */
  totalCount: number;
  /** 用户已解锁数量 */
  unlockedCount?: number;
}

/**
 * 成就等级信息
 */
export interface AchievementTierInfo {
  /** 等级标识 */
  tier: AchievementTier;
  /** 等级显示名称 */
  displayName: string;
  /** 等级描述 */
  description: string;
  /** 等级颜色 */
  color: string;
  /** 等级排序值 */
  sortValue: number;
}

// ==================== 成就统计 ====================

/**
 * 成就统计
 */
export interface AchievementStats {
  /** 成就总数 */
  totalAchievements: number;
  /** 已解锁数量 */
  unlockedCount: number;
  /** 已领取奖励数量 */
  claimedCount: number;
  /** 解锁百分比 */
  unlockPercent: number;
  /** 各类别统计 */
  categoryStats: {
    category: AchievementCategory;
    total: number;
    unlocked: number;
  }[];
  /** 各等级统计 */
  tierStats: {
    tier: AchievementTier;
    total: number;
    unlocked: number;
  }[];
}

// ==================== 分页相关 ====================

/**
 * 分页信息
 */
export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * 成就查询参数
 */
export interface AchievementQueryParams {
  /** 成就类别筛选 */
  category?: AchievementCategory;
  /** 成就等级筛选 */
  tier?: AchievementTier;
  /** 是否只显示已解锁 */
  unlockedOnly?: boolean;
  /** 是否只显示未领取 */
  unclaimedOnly?: boolean;
  /** 是否包含隐藏成就 */
  includeHidden?: boolean;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 排序字段 */
  sortBy?: 'sortOrder' | 'tier' | 'category' | 'createdAt';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

// ==================== API 响应类型 ====================

/**
 * 获取成就类别列表响应
 */
export interface GetCategoriesResponse {
  message: string;
  categories: AchievementCategoryInfo[];
}

/**
 * 获取成就等级列表响应
 */
export interface GetTiersResponse {
  message: string;
  tiers: AchievementTierInfo[];
}

/**
 * 获取成就列表响应
 */
export interface GetAchievementsResponse {
  message: string;
  achievements: Achievement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 获取用户成就列表响应
 */
export interface GetUserAchievementsResponse {
  message: string;
  achievements: AchievementWithProgress[];
  stats: AchievementStats;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 获取成就详情响应
 */
export interface GetAchievementResponse {
  message: string;
  achievement: Achievement;
}

/**
 * 获取用户成就详情响应
 */
export interface GetUserAchievementDetailResponse {
  message: string;
  achievement: AchievementWithProgress;
}

/**
 * 领取奖励响应
 */
export interface ClaimRewardResponse {
  message: string;
  achievement: AchievementWithProgress;
  reward: {
    type: AchievementRewardType;
    value: AchievementRewardValue;
  };
}

/**
 * 获取成就统计响应
 */
export interface GetAchievementStatsResponse {
  message: string;
  stats: AchievementStats;
}
