import { SeasonInfoDto } from './leaderboard-response.dto.js';
import { SettlementStatus } from './settlement.dto.js';
import { LeaderboardCategory } from './leaderboard.dto.js';

/**
 * 结算进度 DTO
 * 需求25.1.10: 赛季结算服务
 */
export interface SettlementProgressDto {
  /** 赛季ID */
  seasonId: string;
  /** 结算状态 */
  status: SettlementStatus;
  /** 开始时间 */
  startedAt?: string;
  /** 完成时间 */
  completedAt?: string;
  /** 当前步骤描述 */
  currentStep: string;
  /** 总用户数 */
  totalUsers: number;
  /** 已处理用户数 */
  processedUsers: number;
  /** 进度百分比 (0-100) */
  progress: number;
  /** 错误信息（如果失败） */
  error?: string;
}

/**
 * 启动结算响应 DTO
 */
export interface StartSettlementResponseDto {
  message: string;
  season: SeasonInfoDto;
  settlement: SettlementProgressDto;
}

/**
 * 获取结算状态响应 DTO
 */
export interface GetSettlementStatusResponseDto {
  message: string;
  season: SeasonInfoDto;
  settlement: SettlementProgressDto;
}

/**
 * 排名同步结果 DTO
 */
export interface RankingSyncResultDto {
  /** 总参与用户数 */
  totalUsers: number;
  /** 各类别同步数量 */
  categorySynced: Record<LeaderboardCategory, number>;
}

/**
 * 同步排名响应 DTO
 */
export interface FinalizeRankingsResponseDto {
  message: string;
  season: SeasonInfoDto;
  result: RankingSyncResultDto;
}

/**
 * 确定段位响应 DTO
 */
export interface DetermineUserTiersResponseDto {
  message: string;
  season: SeasonInfoDto;
  /** 处理的用户数量 */
  processedUsers: number;
}

/**
 * 发放奖励响应 DTO
 */
export interface DistributeRewardsResponseDto {
  message: string;
  season: SeasonInfoDto;
  /** 创建的奖励记录数量 */
  rewardsCreated: number;
}
