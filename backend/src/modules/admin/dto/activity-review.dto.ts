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
import { Transform, Type } from 'class-transformer';

/**
 * 活动状态筛选枚举
 */
export enum ActivityStatusFilterDto {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  ENDED = 'ENDED',
  CANCELLED = 'CANCELLED',
  DRAFT = 'DRAFT',
}

/**
 * 活动类型筛选枚举
 */
export enum ActivityTypeFilterDto {
  READING_CHALLENGE = 'READING_CHALLENGE',
  WRITING_CONTEST = 'WRITING_CONTEST',
  COMMUNITY_EVENT = 'COMMUNITY_EVENT',
  SPECIAL_EVENT = 'SPECIAL_EVENT',
}

/**
 * 排序字段
 */
export enum ActivityReviewSortField {
  CREATED_AT = 'createdAt',
  START_TIME = 'startTime',
  END_TIME = 'endTime',
  TOTAL_POOL = 'totalPool',
}

/**
 * 排序方向
 */
export enum ActivityReviewSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// ==================== 请求 DTOs ====================

/**
 * 活动列表查询 DTO（管理员查询）
 *
 * 需求18验收标准9: WHEN 运营人员审核用户活动 THEN System SHALL 显示活动详情和合规性检查结果
 */
export class ActivityListQueryDto {
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
  @IsEnum(ActivityStatusFilterDto, { message: '无效的活动状态' })
  status?: ActivityStatusFilterDto;

  @IsOptional()
  @IsEnum(ActivityTypeFilterDto, { message: '无效的活动类型' })
  type?: ActivityTypeFilterDto;

  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @IsEnum(ActivityReviewSortField, { message: '无效的排序字段' })
  sortBy?: ActivityReviewSortField = ActivityReviewSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(ActivityReviewSortOrder, { message: '无效的排序方向' })
  sortOrder?: ActivityReviewSortOrder = ActivityReviewSortOrder.DESC;
}

/**
 * 审核通过活动 DTO
 *
 * 需求16验收标准5: WHEN 管理员审核通过 THEN System SHALL 发布活动并在广场/作品页展示
 */
export class ApproveActivityDto {
  @IsOptional()
  @IsString({ message: '审核备注必须是字符串' })
  @MaxLength(500, { message: '审核备注不能超过500字符' })
  reviewNote?: string;
}

/**
 * 拒绝活动 DTO
 *
 * 需求16验收标准6: WHEN 管理员拒绝活动 THEN System SHALL 解锁奖池并通知发起者修改建议
 */
export class RejectActivityDto {
  @IsString({ message: '拒绝原因必须是字符串' })
  @MinLength(5, { message: '拒绝原因至少5个字符' })
  @MaxLength(500, { message: '拒绝原因不能超过500字符' })
  rejectReason!: string;

  @IsOptional()
  @IsString({ message: '修改建议必须是字符串' })
  @MaxLength(500, { message: '修改建议不能超过500字符' })
  suggestions?: string;
}

// ==================== 响应 DTOs ====================

/**
 * 活动类型中文名称映射
 */
export const ACTIVITY_TYPE_NAMES: Record<string, string> = {
  READING_CHALLENGE: '阅读打卡',
  WRITING_CONTEST: '评论征集/创作接力',
  COMMUNITY_EVENT: '社区活动',
  SPECIAL_EVENT: '官方特殊活动',
};

/**
 * 活动状态中文名称映射
 */
export const ACTIVITY_STATUS_NAMES: Record<string, string> = {
  DRAFT: '草稿',
  PENDING: '待审核',
  ACTIVE: '进行中',
  ENDED: '已结束',
  CANCELLED: '已取消',
};

/**
 * 活动列表项（管理员视图）
 */
export interface ActivityListItemDto {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  type: string;
  typeName: string;
  status: string;
  statusName: string;
  startTime: Date;
  endTime: Date;
  maxParticipants: number | null;
  rewardPerPerson: number;
  totalPool: number;
  lockedPool: number;
  participantCount: number;
  creator: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  reviewerId: string | null;
  reviewerName: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

/**
 * 合规性检查结果
 *
 * 需求18验收标准9: 显示活动详情和合规性检查结果
 */
export interface ComplianceCheckResult {
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    message: string;
  }[];
}

/**
 * 活动审核详情（管理员视图）
 */
export interface ActivityReviewDetailDto extends ActivityListItemDto {
  rules: unknown | null;
  rewards: unknown | null;
  rejectReason: string | null;
  updatedAt: Date;
  creatorDetail: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    memberLevel: string;
    contributionScore: number;
    isActive: boolean;
    createdAt: Date;
  };
  complianceCheck: ComplianceCheckResult;
  participationStats: {
    totalParticipants: number;
    completedCount: number;
    joinedCount: number;
  };
}

/**
 * 活动列表响应
 */
export interface ActivityListResponseDto {
  activities: ActivityListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 活动审核操作结果
 */
export interface ActivityOperationResultDto {
  success: boolean;
  message: string;
  activity?: ActivityListItemDto;
}
