import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

/**
 * 排行榜类别枚举
 * 需求25: 赛季排行榜系统
 */
export enum LeaderboardCategory {
  READING = 'READING', // 阅读榜
  CREATION = 'CREATION', // 创作榜
  SOCIAL = 'SOCIAL', // 社交榜
  OVERALL = 'OVERALL', // 综合榜
}

/**
 * 赛季段位枚举（从低到高）
 */
export enum SeasonTier {
  NOVICE = 'NOVICE', // 新秀
  BRONZE = 'BRONZE', // 青铜
  SILVER = 'SILVER', // 白银
  GOLD = 'GOLD', // 黄金
  PLATINUM = 'PLATINUM', // 铂金
  DIAMOND = 'DIAMOND', // 钻石
  MASTER = 'MASTER', // 大师
  GRANDMASTER = 'GRANDMASTER', // 宗师
  KING = 'KING', // 王者
}

/**
 * 赛季状态枚举
 */
export enum SeasonStatus {
  UPCOMING = 'UPCOMING', // 即将开始
  ACTIVE = 'ACTIVE', // 进行中
  ENDED = 'ENDED', // 已结束
  SETTLED = 'SETTLED', // 已结算
}

/**
 * 排行榜查询参数 DTO
 */
export class LeaderboardQueryDto {
  /** 赛季ID（可选，默认当前赛季） */
  @IsOptional()
  @IsUUID()
  seasonId?: string;

  /** 排行榜类别 */
  @IsOptional()
  @IsEnum(LeaderboardCategory)
  category?: LeaderboardCategory;

  /** 页码 */
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  /** 每页数量 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** 排序字段 */
  @IsOptional()
  @IsString()
  sortBy?: 'score' | 'rank';

  /** 排序方向 */
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

/**
 * 用户排名查询参数 DTO
 */
export class UserRankQueryDto {
  /** 赛季ID（可选，默认当前赛季） */
  @IsOptional()
  @IsUUID()
  seasonId?: string;

  /** 排行榜类别（可选，默认返回所有类别） */
  @IsOptional()
  @IsEnum(LeaderboardCategory)
  category?: LeaderboardCategory;
}

/**
 * 赛季历史查询参数 DTO
 */
export class SeasonHistoryQueryDto {
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

  /** 赛季状态筛选 */
  @IsOptional()
  @IsEnum(SeasonStatus)
  status?: SeasonStatus;
}

/**
 * 用户赛季历史查询参数 DTO
 * 需求25.1.11: 赛季历史记录 API
 */
export class UserSeasonHistoryQueryDto {
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

  /** 开始日期筛选（ISO 8601格式） */
  @IsOptional()
  @IsString()
  startDate?: string;

  /** 结束日期筛选（ISO 8601格式） */
  @IsOptional()
  @IsString()
  endDate?: string;

  /** 最低段位筛选 */
  @IsOptional()
  @IsEnum(SeasonTier)
  minTier?: SeasonTier;

  /** 排序字段 */
  @IsOptional()
  @IsString()
  sortBy?: 'seasonNumber' | 'points' | 'rank';

  /** 排序方向 */
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
