import {
  AchievementCategory,
  AchievementTier,
  AchievementRewardType,
  AchievementRewardValueDto,
} from './achievement.dto.js';

/**
 * 成就数据 DTO
 */
export interface AchievementDataDto {
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
  rewardValue: AchievementRewardValueDto;

  /** 是否隐藏成就 */
  isHidden: boolean;

  /** 是否启用 */
  isActive: boolean;

  /** 排序顺序 */
  sortOrder: number;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 用户成就进度数据 DTO
 */
export interface UserAchievementDataDto {
  /** 记录ID */
  id: string;

  /** 用户ID */
  userId: string;

  /** 成就ID */
  achievementId: string;

  /** 当前进度 */
  currentProgress: number;

  /** 是否已解锁 */
  isUnlocked: boolean;

  /** 解锁时间 */
  unlockedAt?: Date | null;

  /** 是否已领取奖励 */
  isClaimed: boolean;

  /** 领取时间 */
  claimedAt?: Date | null;

  /** 创建时间 */
  createdAt: Date;

  /** 更新时间 */
  updatedAt: Date;

  /** 关联的成就数据 */
  achievement?: AchievementDataDto;
}

/**
 * 带用户进度的成就数据 DTO
 */
export interface AchievementWithProgressDto extends AchievementDataDto {
  /** 用户当前进度 */
  currentProgress: number;

  /** 进度百分比 */
  progressPercent: number;

  /** 是否已解锁 */
  isUnlocked: boolean;

  /** 解锁时间 */
  unlockedAt?: Date | null;

  /** 是否已领取奖励 */
  isClaimed: boolean;

  /** 领取时间 */
  claimedAt?: Date | null;
}

/**
 * 成就类别信息 DTO
 */
export interface AchievementCategoryInfoDto {
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
 * 成就等级信息 DTO
 */
export interface AchievementTierInfoDto {
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

/**
 * 成就统计 DTO
 */
export interface AchievementStatsDto {
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

// ==================== 响应 DTO ====================

/**
 * 获取成就类别列表响应 DTO
 */
export interface GetCategoriesResponseDto {
  message: string;
  categories: AchievementCategoryInfoDto[];
}

/**
 * 获取成就等级列表响应 DTO
 */
export interface GetTiersResponseDto {
  message: string;
  tiers: AchievementTierInfoDto[];
}

/**
 * 获取成就列表响应 DTO
 */
export interface GetAchievementsResponseDto {
  message: string;
  achievements: AchievementDataDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 获取用户成就列表响应 DTO
 */
export interface GetUserAchievementsResponseDto {
  message: string;
  achievements: AchievementWithProgressDto[];
  stats: AchievementStatsDto;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 获取单个成就响应 DTO
 */
export interface GetAchievementResponseDto {
  message: string;
  achievement: AchievementDataDto;
}

/**
 * 获取用户成就详情响应 DTO
 */
export interface GetUserAchievementDetailResponseDto {
  message: string;
  achievement: AchievementWithProgressDto;
}

/**
 * 创建成就响应 DTO
 */
export interface CreateAchievementResponseDto {
  message: string;
  achievement: AchievementDataDto;
}

/**
 * 更新成就响应 DTO
 */
export interface UpdateAchievementResponseDto {
  message: string;
  achievement: AchievementDataDto;
}

/**
 * 删除成就响应 DTO
 */
export interface DeleteAchievementResponseDto {
  message: string;
}

/**
 * 更新进度响应 DTO
 */
export interface UpdateProgressResponseDto {
  message: string;
  progress: UserAchievementDataDto;
  isNewlyUnlocked: boolean;
}

/**
 * 领取奖励响应 DTO
 */
export interface ClaimRewardResponseDto {
  message: string;
  achievement: AchievementWithProgressDto;
  reward: {
    type: AchievementRewardType;
    value: AchievementRewardValueDto;
  };
}

/**
 * 检查解锁响应 DTO
 */
export interface CheckUnlockResponseDto {
  message: string;
  unlockedAchievements: AchievementWithProgressDto[];
}

/**
 * 获取成就统计响应 DTO
 */
export interface GetAchievementStatsResponseDto {
  message: string;
  stats: AchievementStatsDto;
}
