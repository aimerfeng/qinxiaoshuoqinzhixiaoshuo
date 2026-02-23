import { SeasonTier } from './leaderboard.dto.js';
import { SeasonInfoDto, PaginationDto } from './leaderboard-response.dto.js';
import { SeasonRewardType, UserSeasonRewardStatus } from './reward.dto.js';

// ==================== 奖励值类型 ====================

/**
 * 代币奖励值
 */
export interface TokenRewardValue {
  amount: number;
}

/**
 * 徽章奖励值
 */
export interface BadgeRewardValue {
  badgeId: string;
  badgeName?: string;
  badgeIconUrl?: string;
}

/**
 * 称号奖励值
 */
export interface TitleRewardValue {
  titleId: string;
  titleName?: string;
}

/**
 * 头像框奖励值
 */
export interface AvatarFrameRewardValue {
  frameId: string;
  frameName?: string;
  frameImageUrl?: string;
}

/**
 * 奖励值联合类型
 */
export type RewardValue =
  | TokenRewardValue
  | BadgeRewardValue
  | TitleRewardValue
  | AvatarFrameRewardValue;

// ==================== 赛季奖励 DTO ====================

/**
 * 赛季奖励定义 DTO
 */
export interface SeasonRewardDto {
  /** 奖励ID */
  id: string;
  /** 赛季ID */
  seasonId: string;
  /** 对应的段位 */
  tier: SeasonTier;
  /** 奖励类型 */
  rewardType: SeasonRewardType;
  /** 奖励详情 */
  rewardValue: RewardValue;
  /** 奖励描述 */
  description?: string | null;
  /** 排序顺序 */
  sortOrder: number;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 用户赛季奖励记录 DTO
 */
export interface UserSeasonRewardDto {
  /** 记录ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 赛季ID */
  seasonId: string;
  /** 奖励ID */
  rewardId: string;
  /** 奖励状态 */
  status: UserSeasonRewardStatus;
  /** 领取时间 */
  claimedAt?: string | null;
  /** 过期时间 */
  expiresAt?: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 奖励详情 */
  reward: SeasonRewardDto;
}

/**
 * 段位奖励汇总 DTO
 * 按段位分组的奖励列表
 */
export interface TierRewardsSummaryDto {
  /** 段位 */
  tier: SeasonTier;
  /** 段位显示名称 */
  tierDisplayName: string;
  /** 该段位的所有奖励 */
  rewards: SeasonRewardDto[];
  /** 是否已达成该段位 */
  isAchieved: boolean;
  /** 是否可领取 */
  canClaim: boolean;
}

/**
 * 用户赛季奖励汇总 DTO
 */
export interface UserSeasonRewardsSummaryDto {
  /** 用户ID */
  userId: string;
  /** 赛季ID */
  seasonId: string;
  /** 用户当前段位 */
  currentTier: SeasonTier;
  /** 待领取奖励数量 */
  pendingCount: number;
  /** 已领取奖励数量 */
  claimedCount: number;
  /** 已过期奖励数量 */
  expiredCount: number;
  /** 各段位奖励汇总 */
  tierRewards: TierRewardsSummaryDto[];
}

// ==================== API 响应 DTO ====================

/**
 * 获取赛季奖励列表响应 DTO
 */
export interface GetSeasonRewardsResponseDto {
  message: string;
  season: SeasonInfoDto;
  rewards: SeasonRewardDto[];
}

/**
 * 获取赛季奖励详情响应 DTO
 */
export interface GetSeasonRewardResponseDto {
  message: string;
  reward: SeasonRewardDto;
}

/**
 * 获取用户赛季奖励列表响应 DTO
 */
export interface GetUserSeasonRewardsResponseDto {
  message: string;
  season: SeasonInfoDto;
  rewards: UserSeasonRewardDto[];
  pagination: PaginationDto;
}

/**
 * 获取用户赛季奖励汇总响应 DTO
 */
export interface GetUserSeasonRewardsSummaryResponseDto {
  message: string;
  season: SeasonInfoDto;
  summary: UserSeasonRewardsSummaryDto;
}

/**
 * 领取赛季奖励响应 DTO
 */
export interface ClaimSeasonRewardResponseDto {
  message: string;
  reward: UserSeasonRewardDto;
  /** 领取的奖励详情（用于前端展示） */
  claimedReward: {
    type: SeasonRewardType;
    value: RewardValue;
    description?: string;
  };
}

/**
 * 批量领取赛季奖励响应 DTO
 */
export interface BatchClaimSeasonRewardsResponseDto {
  message: string;
  /** 成功领取的奖励 */
  claimedRewards: UserSeasonRewardDto[];
  /** 领取失败的奖励ID及原因 */
  failedRewards: {
    rewardId: string;
    reason: string;
  }[];
  /** 领取汇总 */
  summary: {
    totalRequested: number;
    successCount: number;
    failedCount: number;
    /** 获得的代币总数 */
    totalTokens: number;
  };
}

/**
 * 创建赛季奖励响应 DTO（管理员）
 */
export interface CreateSeasonRewardResponseDto {
  message: string;
  reward: SeasonRewardDto;
}

/**
 * 更新赛季奖励响应 DTO（管理员）
 */
export interface UpdateSeasonRewardResponseDto {
  message: string;
  reward: SeasonRewardDto;
}

/**
 * 删除赛季奖励响应 DTO（管理员）
 */
export interface DeleteSeasonRewardResponseDto {
  message: string;
  deletedId: string;
}

// ==================== 奖励类型信息 DTO ====================

/**
 * 奖励类型信息 DTO
 */
export interface SeasonRewardTypeInfoDto {
  /** 奖励类型标识 */
  type: SeasonRewardType;
  /** 奖励类型显示名称 */
  displayName: string;
  /** 奖励类型描述 */
  description: string;
  /** 奖励类型图标 */
  icon: string;
}

/**
 * 获取奖励类型列表响应 DTO
 */
export interface GetSeasonRewardTypesResponseDto {
  message: string;
  types: SeasonRewardTypeInfoDto[];
}
