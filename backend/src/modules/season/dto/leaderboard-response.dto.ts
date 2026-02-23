import {
  LeaderboardCategory,
  SeasonTier,
  SeasonStatus,
} from './leaderboard.dto.js';

// ==================== 基础数据 DTO ====================

/**
 * 排行榜用户简要信息 DTO
 */
export interface LeaderboardUserDto {
  /** 用户ID */
  id: string;
  /** 用户昵称 */
  nickname: string;
  /** 用户头像URL */
  avatarUrl?: string | null;
  /** 会员等级 */
  memberLevel: string;
}

/**
 * 排行榜条目 DTO
 * 单个用户在排行榜中的数据
 */
export interface LeaderboardEntryDto {
  /** 记录ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 赛季ID */
  seasonId: string;
  /** 排行榜类别 */
  category: LeaderboardCategory;
  /** 当前得分 */
  score: number;
  /** 当前排名 */
  rank: number | null;
  /** 上次排名 */
  previousRank: number | null;
  /** 排名变化（正数上升，负数下降，0不变，null无上次排名） */
  rankChange: number | null;
  /** 本赛季最高排名 */
  peakRank: number | null;
  /** 本赛季最高得分 */
  peakScore: number;
  /** 更新时间 */
  updatedAt: string;
  /** 用户信息 */
  user: LeaderboardUserDto;
}

/**
 * 赛季基本信息 DTO
 */
export interface SeasonInfoDto {
  /** 赛季ID */
  id: string;
  /** 赛季名称 */
  name: string;
  /** 赛季描述 */
  description?: string | null;
  /** 赛季编号 */
  seasonNumber: number;
  /** 赛季状态 */
  status: SeasonStatus;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 赛季时长（天） */
  durationDays: number;
  /** 剩余天数（仅进行中赛季） */
  remainingDays?: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 用户赛季段位信息 DTO
 */
export interface UserSeasonRankDto {
  /** 记录ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 赛季ID */
  seasonId: string;
  /** 当前段位 */
  tier: SeasonTier;
  /** 赛季总积分 */
  points: number;
  /** 上赛季段位 */
  previousTier?: SeasonTier | null;
  /** 本赛季最高段位 */
  peakTier: SeasonTier;
  /** 本赛季最高积分 */
  peakPoints: number;
  /** 积分明细 */
  pointsBreakdown?: {
    readingPoints?: number;
    creationPoints?: number;
    socialPoints?: number;
  } | null;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 用户各类别排名汇总 DTO
 */
export interface UserLeaderboardSummaryDto {
  /** 用户ID */
  userId: string;
  /** 赛季ID */
  seasonId: string;
  /** 各类别排名 */
  rankings: {
    category: LeaderboardCategory;
    score: number;
    rank: number | null;
    previousRank: number | null;
    rankChange: number | null;
    /** 百分位（排名越高百分位越高，第1名为100%） */
    percentile: number | null;
    /** 该类别总参与人数 */
    totalParticipants: number;
  }[];
  /** 段位信息 */
  seasonRank?: UserSeasonRankDto | null;
}

// ==================== 分页相关 DTO ====================

/**
 * 分页信息 DTO
 */
export interface PaginationDto {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总数量 */
  total: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 排行榜分页响应 DTO
 */
export interface LeaderboardResponseDto {
  /** 响应消息 */
  message: string;
  /** 赛季信息 */
  season: SeasonInfoDto;
  /** 排行榜类别 */
  category: LeaderboardCategory;
  /** 排行榜条目列表 */
  entries: LeaderboardEntryDto[];
  /** 分页信息 */
  pagination: PaginationDto;
}

// ==================== API 响应 DTO ====================

/**
 * 获取当前赛季信息响应 DTO
 */
export interface GetCurrentSeasonResponseDto {
  message: string;
  season: SeasonInfoDto;
}

/**
 * 获取赛季列表响应 DTO
 */
export interface GetSeasonsResponseDto {
  message: string;
  seasons: SeasonInfoDto[];
  pagination: PaginationDto;
}

/**
 * 获取排行榜响应 DTO
 * 继承自 LeaderboardResponseDto，包含完整的排行榜数据
 */
export type GetLeaderboardResponseDto = LeaderboardResponseDto;

/**
 * 获取排行榜Top响应 DTO
 * 需求25.1.6: 排行榜数据 API
 */
export interface GetTopEntriesResponseDto {
  message: string;
  season: SeasonInfoDto;
  category: LeaderboardCategory;
  entries: LeaderboardEntryDto[];
}

/**
 * 获取用户在某类别排名响应 DTO
 * 需求25.1.6: 排行榜数据 API
 */
export interface GetUserRankInCategoryResponseDto {
  message: string;
  season: SeasonInfoDto;
  category: LeaderboardCategory;
  entry: LeaderboardEntryDto | null;
  totalParticipants: number;
}

/**
 * 获取用户排名响应 DTO
 */
export interface GetUserRankResponseDto {
  message: string;
  season: SeasonInfoDto;
  summary: UserLeaderboardSummaryDto;
}


/**
 * 获取用户赛季历史响应 DTO
 * 需求25.1.11: 赛季历史记录 API
 */
export interface GetUserSeasonHistoryResponseDto {
  message: string;
  history: UserSeasonHistoryEntryDto[];
  pagination: PaginationDto;
}

/**
 * 用户赛季历史条目 DTO
 * 需求25.1.11: 赛季历史记录 API
 */
export interface UserSeasonHistoryEntryDto {
  /** 赛季信息 */
  season: SeasonInfoDto;
  /** 用户段位信息 */
  rank: UserSeasonRankDto;
  /** 各类别最终排名 */
  rankings: {
    category: LeaderboardCategory;
    finalScore: number;
    finalRank: number | null;
  }[];
  /** 获得的奖励列表 */
  rewards: UserSeasonHistoryRewardDto[];
}

/**
 * 用户赛季历史奖励 DTO
 * 需求25.1.11: 赛季历史记录 API
 */
export interface UserSeasonHistoryRewardDto {
  /** 奖励ID */
  id: string;
  /** 奖励类型 */
  rewardType: string;
  /** 奖励描述 */
  description?: string | null;
  /** 奖励状态 */
  status: string;
  /** 领取时间 */
  claimedAt?: string | null;
}

// ==================== 排行榜类别信息 DTO ====================

/**
 * 排行榜类别信息 DTO
 */
export interface LeaderboardCategoryInfoDto {
  /** 类别标识 */
  category: LeaderboardCategory;
  /** 类别显示名称 */
  displayName: string;
  /** 类别描述 */
  description: string;
  /** 类别图标 */
  icon: string;
}

/**
 * 获取排行榜类别列表响应 DTO
 */
export interface GetLeaderboardCategoriesResponseDto {
  message: string;
  categories: LeaderboardCategoryInfoDto[];
}

// ==================== 段位信息 DTO ====================

/**
 * 段位信息 DTO
 */
export interface SeasonTierInfoDto {
  /** 段位标识 */
  tier: SeasonTier;
  /** 段位显示名称 */
  displayName: string;
  /** 段位描述 */
  description: string;
  /** 段位图标URL */
  iconUrl?: string;
  /** 段位颜色 */
  color: string;
  /** 所需最低积分 */
  minPoints: number;
  /** 段位排序值 */
  sortValue: number;
}

/**
 * 获取段位列表响应 DTO
 */
export interface GetSeasonTiersResponseDto {
  message: string;
  tiers: SeasonTierInfoDto[];
}
