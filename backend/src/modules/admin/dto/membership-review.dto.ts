import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 会员等级枚举（与 Prisma MemberLevel 保持一致）
 */
export enum MemberLevelDto {
  REGULAR = 'REGULAR',
  OFFICIAL = 'OFFICIAL',
  SENIOR = 'SENIOR',
  HONORARY = 'HONORARY',
}

/**
 * 会员申请状态枚举
 */
export enum ApplicationStatusDto {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * 排序字段
 */
export enum ApplicationSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  CURRENT_SCORE = 'currentScore',
}

/**
 * 排序方向
 */
export enum ApplicationSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// ==================== 请求 DTOs ====================

/**
 * 会员申请列表查询 DTO（管理员查询）
 *
 * 需求18验收标准6: WHEN 审核员处理会员申请 THEN System SHALL 显示申请信息、贡献度、历史行为
 */
export class ApplicationListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ApplicationStatusDto, { message: '无效的申请状态' })
  status?: ApplicationStatusDto;

  @IsOptional()
  @IsEnum(MemberLevelDto, { message: '无效的目标等级' })
  targetLevel?: MemberLevelDto;

  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  search?: string;

  @IsOptional()
  @IsEnum(ApplicationSortField, { message: '无效的排序字段' })
  sortBy?: ApplicationSortField = ApplicationSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(ApplicationSortOrder, { message: '无效的排序方向' })
  sortOrder?: ApplicationSortOrder = ApplicationSortOrder.DESC;
}

/**
 * 审核通过 DTO
 *
 * 需求14验收标准5: WHEN 管理员审核通过申请 THEN System SHALL 升级用户为 Official_Member 并发放欢迎奖励
 */
export class ApproveApplicationDto {
  @IsOptional()
  @IsString({ message: '审核备注必须是字符串' })
  @MaxLength(500, { message: '审核备注不能超过500字符' })
  reviewNote?: string;
}

/**
 * 审核拒绝 DTO
 *
 * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
 */
export class RejectApplicationDto {
  @IsString({ message: '拒绝原因必须是字符串' })
  @MinLength(5, { message: '拒绝原因至少5个字符' })
  @MaxLength(500, { message: '拒绝原因不能超过500字符' })
  rejectReason!: string;

  @IsOptional()
  @IsString({ message: '审核备注必须是字符串' })
  @MaxLength(500, { message: '审核备注不能超过500字符' })
  reviewNote?: string;
}


// ==================== 响应 DTOs ====================

/**
 * 等级中文名称映射
 */
export const LEVEL_NAMES: Record<string, string> = {
  REGULAR: '普通会员',
  OFFICIAL: '正式会员',
  SENIOR: '资深会员',
  HONORARY: '荣誉会员',
};

/**
 * 申请状态中文名称映射
 */
export const STATUS_NAMES: Record<string, string> = {
  PENDING: '待审核',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
};

/**
 * 申请列表项（管理员视图）
 */
export interface ApplicationListItemDto {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  targetLevel: string;
  targetLevelName: string;
  currentScore: number;
  status: string;
  statusName: string;
  reason: string | null;
  rejectReason: string | null;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

/**
 * 申请详情（管理员视图，含用户贡献度和历史行为）
 *
 * 需求18验收标准6: 显示申请信息、贡献度、历史行为
 */
export interface ApplicationDetailDto extends ApplicationListItemDto {
  updatedAt: Date;
  userDetail: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
    memberLevel: string;
    memberLevelName: string;
    contributionScore: number;
    isActive: boolean;
    createdAt: Date;
    lastLoginAt: Date | null;
  };
  contributionBreakdown: {
    reading: number;
    interaction: number;
    creation: number;
    community: number;
  };
  recentActivity: {
    worksCount: number;
    cardsCount: number;
    commentsCount: number;
  };
  applicationHistory: {
    totalApplications: number;
    approvedCount: number;
    rejectedCount: number;
  };
}

/**
 * 申请列表响应
 */
export interface ApplicationListResponseDto {
  applications: ApplicationListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 申请操作结果
 */
export interface ApplicationOperationResultDto {
  success: boolean;
  message: string;
  application?: ApplicationListItemDto;
}
