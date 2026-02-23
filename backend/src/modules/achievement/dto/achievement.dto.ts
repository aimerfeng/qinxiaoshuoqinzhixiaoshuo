import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsUUID,
  Min,
  Max,
  MaxLength,
  IsObject,
} from 'class-validator';

/**
 * 成就类别枚举
 * 需求24: 成就系统
 */
export enum AchievementCategory {
  READING = 'READING', // 阅读成就
  CREATION = 'CREATION', // 创作成就
  SOCIAL = 'SOCIAL', // 社交成就
  COLLECTION = 'COLLECTION', // 收藏成就
  SPECIAL = 'SPECIAL', // 特殊成就
  SEASONAL = 'SEASONAL', // 赛季成就
  EVENT = 'EVENT', // 活动成就
}

/**
 * 成就等级枚举
 * 青铜→白银→黄金→铂金→钻石→传说
 */
export enum AchievementTier {
  BRONZE = 'BRONZE', // 青铜
  SILVER = 'SILVER', // 白银
  GOLD = 'GOLD', // 黄金
  PLATINUM = 'PLATINUM', // 铂金
  DIAMOND = 'DIAMOND', // 钻石
  LEGENDARY = 'LEGENDARY', // 传说
}

/**
 * 成就奖励类型枚举
 */
export enum AchievementRewardType {
  TOKENS = 'TOKENS', // 零芥子代币
  BADGE = 'BADGE', // 徽章
  TITLE = 'TITLE', // 称号
  AVATAR_FRAME = 'AVATAR_FRAME', // 头像框
  THEME = 'THEME', // 主题皮肤
}

/**
 * 成就奖励值 DTO
 */
export class AchievementRewardValueDto {
  /** 代币数量（TOKENS类型） */
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  /** 徽章ID（BADGE类型） */
  @IsOptional()
  @IsString()
  badgeId?: string;

  /** 称号（TITLE类型） */
  @IsOptional()
  @IsString()
  title?: string;

  /** 头像框ID（AVATAR_FRAME类型） */
  @IsOptional()
  @IsString()
  frameId?: string;

  /** 主题ID（THEME类型） */
  @IsOptional()
  @IsString()
  themeId?: string;
}

/**
 * 创建成就 DTO（管理员用）
 */
export class CreateAchievementDto {
  /** 成就标识符 */
  @IsString()
  @MaxLength(100)
  name!: string;

  /** 显示名称 */
  @IsString()
  @MaxLength(100)
  displayName!: string;

  /** 成就描述 */
  @IsString()
  @MaxLength(500)
  description!: string;

  /** 成就类别 */
  @IsEnum(AchievementCategory)
  category!: AchievementCategory;

  /** 成就等级 */
  @IsEnum(AchievementTier)
  tier!: AchievementTier;

  /** 成就图标URL */
  @IsOptional()
  @IsString()
  iconUrl?: string;

  /** 成就徽章URL */
  @IsOptional()
  @IsString()
  badgeUrl?: string;

  /** 目标值 */
  @IsInt()
  @Min(1)
  targetValue!: number;

  /** 奖励类型 */
  @IsEnum(AchievementRewardType)
  rewardType!: AchievementRewardType;

  /** 奖励详情 */
  @IsObject()
  rewardValue!: AchievementRewardValueDto;

  /** 是否隐藏成就 */
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  /** 是否启用 */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** 排序顺序 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * 更新成就 DTO（管理员用）
 */
export class UpdateAchievementDto {
  /** 显示名称 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  /** 成就描述 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** 成就图标URL */
  @IsOptional()
  @IsString()
  iconUrl?: string;

  /** 成就徽章URL */
  @IsOptional()
  @IsString()
  badgeUrl?: string;

  /** 目标值 */
  @IsOptional()
  @IsInt()
  @Min(1)
  targetValue?: number;

  /** 奖励类型 */
  @IsOptional()
  @IsEnum(AchievementRewardType)
  rewardType?: AchievementRewardType;

  /** 奖励详情 */
  @IsOptional()
  @IsObject()
  rewardValue?: AchievementRewardValueDto;

  /** 是否隐藏成就 */
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  /** 是否启用 */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** 排序顺序 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * 成就列表查询参数 DTO
 */
export class GetAchievementsQueryDto {
  /** 成就类别筛选 */
  @IsOptional()
  @IsEnum(AchievementCategory)
  category?: AchievementCategory;

  /** 成就等级筛选 */
  @IsOptional()
  @IsEnum(AchievementTier)
  tier?: AchievementTier;

  /** 是否只显示已解锁 */
  @IsOptional()
  @IsBoolean()
  unlockedOnly?: boolean;

  /** 是否只显示未领取 */
  @IsOptional()
  @IsBoolean()
  unclaimedOnly?: boolean;

  /** 是否包含隐藏成就 */
  @IsOptional()
  @IsBoolean()
  includeHidden?: boolean;

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
  sortBy?: 'sortOrder' | 'tier' | 'category' | 'createdAt';

  /** 排序方向 */
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

/**
 * 更新成就进度 DTO
 */
export class UpdateProgressDto {
  /** 成就ID */
  @IsUUID()
  achievementId!: string;

  /** 增加的进度值 */
  @IsInt()
  @Min(1)
  increment!: number;
}

/**
 * 领取成就奖励 DTO
 */
export class ClaimRewardDto {
  /** 成就ID */
  @IsUUID()
  achievementId!: string;
}
