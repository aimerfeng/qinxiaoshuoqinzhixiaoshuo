import { IsString, IsEnum, IsOptional, IsBoolean, IsInt, Min, IsUUID } from 'class-validator';

/**
 * 惩罚类型枚举
 *
 * 需求19: 风控与反作弊系统 - 惩罚执行服务
 *
 * 惩罚等级:
 * - WARNING: 警告（记录但不限制）
 * - MUTE: 禁言（限制发言、评论、弹幕）
 * - FEATURE_RESTRICT: 功能限制（限制特定功能如打赏、发布）
 * - ACCOUNT_FREEZE: 账户冻结（暂停账户活动）
 * - ACCOUNT_BAN: 账户封禁（永久封禁）
 */
export enum PunishmentType {
  WARNING = 'WARNING',
  MUTE = 'MUTE',
  FEATURE_RESTRICT = 'FEATURE_RESTRICT',
  ACCOUNT_FREEZE = 'ACCOUNT_FREEZE',
  ACCOUNT_BAN = 'ACCOUNT_BAN',
}

/**
 * 惩罚状态枚举
 */
export enum PunishmentStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

/**
 * 创建惩罚 DTO
 */
export class CreatePunishmentDto {
  @IsUUID()
  userId!: string;

  @IsEnum(PunishmentType)
  type!: PunishmentType;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPermanent?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number; // 惩罚时长（分钟）

  @IsOptional()
  @IsUUID()
  alertId?: string; // 关联的风控告警ID

  @IsUUID()
  createdBy!: string; // 创建人ID（管理员）
}

/**
 * 撤销惩罚 DTO
 */
export class RevokePunishmentDto {
  @IsString()
  reason!: string;

  @IsUUID()
  revokedBy!: string;
}

/**
 * 从告警执行惩罚 DTO
 */
export class ExecutePunishmentFromAlertDto {
  @IsUUID()
  alertId!: string;

  @IsEnum(PunishmentType)
  type!: PunishmentType;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutes?: number;

  @IsUUID()
  createdBy!: string;
}

/**
 * 惩罚查询过滤 DTO
 */
export class PunishmentFiltersDto {
  @IsOptional()
  @IsEnum(PunishmentType)
  type?: PunishmentType;

  @IsOptional()
  @IsEnum(PunishmentStatus)
  status?: PunishmentStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * 惩罚响应接口
 */
export interface PunishmentResponse {
  id: string;
  userId: string;
  type: PunishmentType;
  status: PunishmentStatus;
  reason: string;
  description?: string;
  alertId?: string;
  isPermanent: boolean;
  expiresAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokeReason?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 惩罚列表响应接口
 */
export interface PunishmentListResponse {
  punishments: PunishmentResponse[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * 惩罚检查结果接口
 */
export interface PunishmentCheckResult {
  hasPunishment: boolean;
  punishment?: PunishmentResponse;
  remainingMinutes?: number;
}

/**
 * 用户惩罚状态接口
 */
export interface UserPunishmentStatus {
  userId: string;
  isMuted: boolean;
  isBanned: boolean;
  isFrozen: boolean;
  hasFeatureRestriction: boolean;
  hasWarning: boolean;
  activePunishments: PunishmentResponse[];
  totalPunishments: number;
}

/**
 * 惩罚历史统计接口
 */
export interface PunishmentHistoryStats {
  userId: string;
  totalPunishments: number;
  byType: Record<PunishmentType, number>;
  byStatus: Record<PunishmentStatus, number>;
  lastPunishmentAt?: Date;
  firstPunishmentAt?: Date;
}

/**
 * 惩罚时长预设（分钟）
 */
export const PUNISHMENT_DURATION_PRESETS = {
  // 警告无时长
  WARNING: 0,
  // 禁言时长
  MUTE_1_HOUR: 60,
  MUTE_6_HOURS: 360,
  MUTE_1_DAY: 1440,
  MUTE_3_DAYS: 4320,
  MUTE_7_DAYS: 10080,
  MUTE_30_DAYS: 43200,
  // 功能限制时长
  FEATURE_RESTRICT_1_DAY: 1440,
  FEATURE_RESTRICT_7_DAYS: 10080,
  FEATURE_RESTRICT_30_DAYS: 43200,
  // 账户冻结时长
  ACCOUNT_FREEZE_1_DAY: 1440,
  ACCOUNT_FREEZE_7_DAYS: 10080,
  ACCOUNT_FREEZE_30_DAYS: 43200,
  // 永久
  PERMANENT: -1,
} as const;

/**
 * 惩罚类型默认配置
 */
export const PUNISHMENT_TYPE_DEFAULTS: Record<
  PunishmentType,
  { defaultDurationMinutes: number; isPermanentByDefault: boolean }
> = {
  [PunishmentType.WARNING]: {
    defaultDurationMinutes: 0,
    isPermanentByDefault: false,
  },
  [PunishmentType.MUTE]: {
    defaultDurationMinutes: PUNISHMENT_DURATION_PRESETS.MUTE_1_DAY,
    isPermanentByDefault: false,
  },
  [PunishmentType.FEATURE_RESTRICT]: {
    defaultDurationMinutes: PUNISHMENT_DURATION_PRESETS.FEATURE_RESTRICT_7_DAYS,
    isPermanentByDefault: false,
  },
  [PunishmentType.ACCOUNT_FREEZE]: {
    defaultDurationMinutes: PUNISHMENT_DURATION_PRESETS.ACCOUNT_FREEZE_7_DAYS,
    isPermanentByDefault: false,
  },
  [PunishmentType.ACCOUNT_BAN]: {
    defaultDurationMinutes: 0,
    isPermanentByDefault: true,
  },
};
