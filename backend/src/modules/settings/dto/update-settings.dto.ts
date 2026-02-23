import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  Matches,
} from 'class-validator';
import { ProfileVisibility, DirectMessagePermission } from '@prisma/client';

/**
 * 更新用户设置 DTO
 * 
 * 需求21: 设置中心
 * 验收标准8: WHEN 用户修改阅读设置 THEN System SHALL 保存为默认配置并同步到云端
 */
export class UpdateSettingsDto {
  // ==================== 账户安全设置 ====================

  @IsOptional()
  @IsBoolean()
  twoFactorEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  loginNotificationEnabled?: boolean;

  // ==================== 隐私设置 ====================

  @IsOptional()
  @IsEnum(ProfileVisibility)
  profileVisibility?: ProfileVisibility;

  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;

  @IsOptional()
  @IsEnum(DirectMessagePermission)
  allowDirectMessages?: DirectMessagePermission;

  @IsOptional()
  @IsBoolean()
  showReadingActivity?: boolean;

  // ==================== 通知设置 ====================

  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  commentNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  likeNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  followNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  mentionNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  updateNotifications?: boolean;

  // ==================== 阅读设置 ====================

  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(32)
  defaultFontSize?: number;

  @IsOptional()
  @IsNumber()
  @Min(1.2)
  @Max(3.0)
  defaultLineHeight?: number;

  @IsOptional()
  @IsString()
  defaultTheme?: string;

  @IsOptional()
  @IsBoolean()
  autoNightMode?: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'nightModeStartTime must be in HH:mm format',
  })
  nightModeStartTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'nightModeEndTime must be in HH:mm format',
  })
  nightModeEndTime?: string;

  // ==================== 主题设置 ====================

  @IsOptional()
  @IsString()
  theme?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'accentColor must be a valid hex color (e.g., #6366F1)',
  })
  accentColor?: string;
}
