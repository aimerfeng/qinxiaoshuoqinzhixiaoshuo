import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 会员申请 DTO
 *
 * 需求14: 会员等级体系
 * 任务14.1.4: 会员申请 API
 */

/**
 * 会员等级枚举（与 Prisma 枚举保持一致）
 */
export enum MemberLevelEnum {
  REGULAR = 'REGULAR', // Lv.0 普通会员
  OFFICIAL = 'OFFICIAL', // Lv.1 正式会员
  SENIOR = 'SENIOR', // Lv.2 资深会员
  HONORARY = 'HONORARY', // Lv.3 荣誉会员
}

/**
 * 会员申请状态枚举
 */
export enum MemberApplicationStatusEnum {
  PENDING = 'PENDING', // 待审核
  APPROVED = 'APPROVED', // 已通过
  REJECTED = 'REJECTED', // 已拒绝
}

/**
 * 等级升级所需贡献度阈值
 */
export const LEVEL_THRESHOLDS: Record<MemberLevelEnum, number> = {
  [MemberLevelEnum.REGULAR]: 0,
  [MemberLevelEnum.OFFICIAL]: 500,
  [MemberLevelEnum.SENIOR]: 2000,
  [MemberLevelEnum.HONORARY]: 10000,
};

/**
 * 等级中文名称映射
 */
export const LEVEL_NAMES: Record<MemberLevelEnum, string> = {
  [MemberLevelEnum.REGULAR]: '普通会员',
  [MemberLevelEnum.OFFICIAL]: '正式会员',
  [MemberLevelEnum.SENIOR]: '资深会员',
  [MemberLevelEnum.HONORARY]: '荣誉会员',
};

/**
 * 等级数值映射（用于比较）
 */
export const LEVEL_VALUES: Record<MemberLevelEnum, number> = {
  [MemberLevelEnum.REGULAR]: 0,
  [MemberLevelEnum.OFFICIAL]: 1,
  [MemberLevelEnum.SENIOR]: 2,
  [MemberLevelEnum.HONORARY]: 3,
};

/**
 * 提交会员申请请求 DTO
 *
 * 需求14验收标准4: WHEN 用户提交正式会员申请 THEN System SHALL 创建审核工单并通知管理员
 */
export class CreateApplicationDto {
  @IsEnum(MemberLevelEnum)
  targetLevel!: MemberLevelEnum;

  @IsOptional()
  @IsString()
  @MinLength(10, { message: '申请理由至少10个字符' })
  @MaxLength(500, { message: '申请理由最多500个字符' })
  reason?: string;
}

/**
 * 会员申请分页查询 DTO
 */
export class ApplicationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;

  @IsOptional()
  @IsEnum(MemberApplicationStatusEnum)
  status?: MemberApplicationStatusEnum;
}

/**
 * 会员申请记录 DTO
 */
export interface ApplicationRecordDto {
  id: string;
  targetLevel: MemberLevelEnum;
  targetLevelName: string;
  currentScore: number;
  status: MemberApplicationStatusEnum;
  statusName: string;
  reason: string | null;
  rejectReason: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 资格检查结果 DTO
 *
 * 需求14验收标准3: WHEN 用户贡献度达到500分 THEN System SHALL 解锁"申请正式会员"入口
 */
export interface EligibilityResultDto {
  currentLevel: MemberLevelEnum;
  currentLevelName: string;
  currentScore: number;
  eligibleLevels: {
    level: MemberLevelEnum;
    levelName: string;
    requiredScore: number;
    isEligible: boolean;
    hasPendingApplication: boolean;
    canApply: boolean;
    reason: string;
  }[];
}

/**
 * 检查资格响应 DTO
 */
export interface CheckEligibilityResponseDto {
  message: string;
  data: EligibilityResultDto;
}

/**
 * 提交申请响应 DTO
 */
export interface CreateApplicationResponseDto {
  message: string;
  data: {
    application: ApplicationRecordDto;
  };
}

/**
 * 获取申请列表响应 DTO
 */
export interface GetApplicationsResponseDto {
  message: string;
  data: {
    applications: ApplicationRecordDto[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * 获取申请详情响应 DTO
 */
export interface GetApplicationDetailResponseDto {
  message: string;
  data: {
    application: ApplicationRecordDto;
  };
}

/**
 * 申请状态中文名称映射
 */
export const APPLICATION_STATUS_NAMES: Record<
  MemberApplicationStatusEnum,
  string
> = {
  [MemberApplicationStatusEnum.PENDING]: '待审核',
  [MemberApplicationStatusEnum.APPROVED]: '已通过',
  [MemberApplicationStatusEnum.REJECTED]: '已拒绝',
};

// ==================== 管理员审核 DTO ====================

/**
 * 管理员审核申请分页查询 DTO
 *
 * 需求14验收标准5: WHEN 管理员审核通过申请 THEN System SHALL 升级用户为 Official_Member 并发放欢迎奖励
 * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
 */
export class AdminApplicationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 10;

  @IsOptional()
  @IsEnum(MemberApplicationStatusEnum)
  status?: MemberApplicationStatusEnum;

  @IsOptional()
  @IsEnum(MemberLevelEnum)
  targetLevel?: MemberLevelEnum;
}

/**
 * 拒绝申请请求 DTO
 *
 * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
 */
export class RejectApplicationDto {
  @IsString()
  @MinLength(5, { message: '拒绝原因至少5个字符' })
  @MaxLength(500, { message: '拒绝原因最多500个字符' })
  rejectReason!: string;
}

/**
 * 管理员申请记录 DTO（包含用户信息）
 */
export interface AdminApplicationRecordDto extends ApplicationRecordDto {
  user: {
    id: string;
    username: string;
    nickname: string | null;
    avatar: string | null;
    memberLevel: MemberLevelEnum;
    contributionScore: number;
    createdAt: Date;
  };
  reviewerId: string | null;
  reviewer?: {
    id: string;
    username: string;
    nickname: string | null;
  } | null;
}

/**
 * 获取待审核申请列表响应 DTO
 */
export interface GetPendingApplicationsResponseDto {
  message: string;
  data: {
    applications: AdminApplicationRecordDto[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  };
}

/**
 * 审核申请响应 DTO
 */
export interface ReviewApplicationResponseDto {
  message: string;
  data: {
    application: AdminApplicationRecordDto;
  };
}
