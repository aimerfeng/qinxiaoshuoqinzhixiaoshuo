import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsInt,
  IsEnum,
  IsUUID,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 主题解锁条件类型
 */
export enum ThemeUnlockType {
  DEFAULT = 'DEFAULT',
  MEMBERSHIP = 'MEMBERSHIP',
  ACHIEVEMENT = 'ACHIEVEMENT',
  PURCHASE = 'PURCHASE',
  EVENT = 'EVENT',
  CREATOR = 'CREATOR',
}

/**
 * 主题颜色配置 DTO
 */
export class ThemeColorsDto {
  /** 主色 */
  @IsString()
  primary!: string;

  /** 主色渐变 */
  @IsOptional()
  @IsString()
  primaryGradient?: string;

  /** 强调色-粉 */
  @IsOptional()
  @IsString()
  accentPink?: string;

  /** 强调色-绿 */
  @IsOptional()
  @IsString()
  accentGreen?: string;

  /** 主背景色 */
  @IsString()
  bgPrimary!: string;

  /** 次背景色 */
  @IsString()
  bgSecondary!: string;

  /** 卡片背景色 */
  @IsString()
  bgCard!: string;

  /** 主文字色 */
  @IsString()
  textPrimary!: string;

  /** 次文字色 */
  @IsString()
  textSecondary!: string;

  /** 弱化文字色 */
  @IsOptional()
  @IsString()
  textMuted?: string;

  /** 边框色 */
  @IsOptional()
  @IsString()
  border?: string;

  /** 卡片阴影 */
  @IsOptional()
  @IsString()
  shadowCard?: string;

  /** 悬浮阴影 */
  @IsOptional()
  @IsString()
  shadowHover?: string;
}

/**
 * 主题解锁条件 DTO
 */
export class ThemeUnlockConditionDto {
  /** 解锁类型 */
  @IsEnum(ThemeUnlockType)
  type!: ThemeUnlockType;

  /** 具体要求（会员等级、成就ID、价格等） */
  @IsOptional()
  requirement?: string | number | Record<string, unknown>;
}

/**
 * 创建主题 DTO
 */
export class CreateThemeDto {
  /** 主题标识符 */
  @IsString()
  @MaxLength(50)
  name!: string;

  /** 显示名称 */
  @IsString()
  @MaxLength(100)
  displayName!: string;

  /** 主题描述 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** 预览图URL */
  @IsOptional()
  @IsString()
  previewImage?: string;

  /** 颜色配置 */
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeColorsDto)
  colors!: ThemeColorsDto;

  /** 是否默认主题 */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  /** 是否高级主题 */
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  /** 是否需要解锁 */
  @IsOptional()
  @IsBoolean()
  isUnlockable?: boolean;

  /** 解锁条件 */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeUnlockConditionDto)
  unlockCondition?: ThemeUnlockConditionDto;

  /** 解锁类型 */
  @IsOptional()
  @IsEnum(ThemeUnlockType)
  unlockType?: ThemeUnlockType;

  /** 排序顺序 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * 更新主题 DTO
 */
export class UpdateThemeDto {
  /** 显示名称 */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  /** 主题描述 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** 预览图URL */
  @IsOptional()
  @IsString()
  previewImage?: string;

  /** 颜色配置 */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeColorsDto)
  colors?: ThemeColorsDto;

  /** 是否默认主题 */
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  /** 是否高级主题 */
  @IsOptional()
  @IsBoolean()
  isPremium?: boolean;

  /** 是否需要解锁 */
  @IsOptional()
  @IsBoolean()
  isUnlockable?: boolean;

  /** 解锁条件 */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeUnlockConditionDto)
  unlockCondition?: ThemeUnlockConditionDto;

  /** 解锁类型 */
  @IsOptional()
  @IsEnum(ThemeUnlockType)
  unlockType?: ThemeUnlockType;

  /** 排序顺序 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  /** 是否启用 */
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * 用户主题自定义配置 DTO
 */
export class ThemeCustomizationsDto {
  /** 自定义强调色 */
  @IsOptional()
  @IsString()
  accentColor?: string;

  /** 其他自定义配置 */
  @IsOptional()
  @IsObject()
  overrides?: Record<string, string>;
}

/**
 * 设置用户主题偏好 DTO
 */
export class SetUserThemePreferenceDto {
  /** 主题ID */
  @IsUUID()
  themeId!: string;

  /** 自定义配置 */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeCustomizationsDto)
  customizations?: ThemeCustomizationsDto;
}

/**
 * 更新用户主题自定义配置 DTO
 */
export class UpdateThemeCustomizationsDto {
  /** 自定义配置 */
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ThemeCustomizationsDto)
  customizations?: ThemeCustomizationsDto;
}
