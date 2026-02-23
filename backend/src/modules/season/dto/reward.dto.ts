import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsUUID,
  IsObject,
  Min,
  Max,
} from 'class-validator';
import { SeasonTier } from './leaderboard.dto.js';

/**
 * 赛季奖励类型枚举
 * 需求25.1.3: 赛季奖励数据模型
 */
export enum SeasonRewardType {
  TOKENS = 'TOKENS', // 零芥子代币
  BADGE = 'BADGE', // 徽章
  TITLE = 'TITLE', // 称号
  AVATAR_FRAME = 'AVATAR_FRAME', // 头像框
}

/**
 * 用户赛季奖励状态枚举
 */
export enum UserSeasonRewardStatus {
  PENDING = 'PENDING', // 待领取
  CLAIMED = 'CLAIMED', // 已领取
  EXPIRED = 'EXPIRED', // 已过期
}

/**
 * 奖励值 DTO - 代币类型
 */
export class TokenRewardValueDto {
  @IsInt()
  @Min(1)
  amount!: number;
}

/**
 * 奖励值 DTO - 徽章类型
 */
export class BadgeRewardValueDto {
  @IsString()
  badgeId!: string;

  @IsOptional()
  @IsString()
  badgeName?: string;
}

/**
 * 奖励值 DTO - 称号类型
 */
export class TitleRewardValueDto {
  @IsString()
  titleId!: string;

  @IsOptional()
  @IsString()
  titleName?: string;
}

/**
 * 奖励值 DTO - 头像框类型
 */
export class AvatarFrameRewardValueDto {
  @IsString()
  frameId!: string;

  @IsOptional()
  @IsString()
  frameName?: string;
}

/**
 * 创建赛季奖励 DTO
 */
export class CreateSeasonRewardDto {
  /** 赛季ID */
  @IsUUID()
  seasonId!: string;

  /** 对应的段位 */
  @IsEnum(SeasonTier)
  tier!: SeasonTier;

  /** 奖励类型 */
  @IsEnum(SeasonRewardType)
  rewardType!: SeasonRewardType;

  /** 奖励详情（JSON格式） */
  @IsObject()
  rewardValue!:
    | TokenRewardValueDto
    | BadgeRewardValueDto
    | TitleRewardValueDto
    | AvatarFrameRewardValueDto;

  /** 奖励描述 */
  @IsOptional()
  @IsString()
  description?: string;

  /** 排序顺序 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * 更新赛季奖励 DTO
 */
export class UpdateSeasonRewardDto {
  /** 奖励类型 */
  @IsOptional()
  @IsEnum(SeasonRewardType)
  rewardType?: SeasonRewardType;

  /** 奖励详情（JSON格式） */
  @IsOptional()
  @IsObject()
  rewardValue?:
    | TokenRewardValueDto
    | BadgeRewardValueDto
    | TitleRewardValueDto
    | AvatarFrameRewardValueDto;

  /** 奖励描述 */
  @IsOptional()
  @IsString()
  description?: string;

  /** 排序顺序 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * 赛季奖励查询参数 DTO
 */
export class SeasonRewardQueryDto {
  /** 赛季ID（可选，默认当前赛季） */
  @IsOptional()
  @IsUUID()
  seasonId?: string;

  /** 段位筛选 */
  @IsOptional()
  @IsEnum(SeasonTier)
  tier?: SeasonTier;

  /** 奖励类型筛选 */
  @IsOptional()
  @IsEnum(SeasonRewardType)
  rewardType?: SeasonRewardType;
}

/**
 * 用户赛季奖励查询参数 DTO
 */
export class UserSeasonRewardQueryDto {
  /** 赛季ID（可选，默认当前赛季） */
  @IsOptional()
  @IsUUID()
  seasonId?: string;

  /** 奖励状态筛选 */
  @IsOptional()
  @IsEnum(UserSeasonRewardStatus)
  status?: UserSeasonRewardStatus;

  /** 页码 */
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  /** 每页数量 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

/**
 * 领取赛季奖励 DTO
 */
export class ClaimSeasonRewardDto {
  /** 奖励ID */
  @IsUUID()
  rewardId!: string;
}

/**
 * 批量领取赛季奖励 DTO
 */
export class BatchClaimSeasonRewardsDto {
  /** 奖励ID列表 */
  @IsUUID('4', { each: true })
  rewardIds!: string[];
}
