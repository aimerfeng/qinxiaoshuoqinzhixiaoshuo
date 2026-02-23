import {
  IsOptional,
  IsString,
  IsEnum,
  IsInt,
  IsArray,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * 举报目标类型
 */
export enum ReportTargetTypeDto {
  WORK = 'WORK',
  CHAPTER = 'CHAPTER',
  CARD = 'CARD',
  COMMENT = 'COMMENT',
  DANMAKU = 'DANMAKU',
  USER = 'USER',
}

/**
 * 举报原因
 */
export enum ReportReasonDto {
  SPAM = 'SPAM',
  HARASSMENT = 'HARASSMENT',
  INAPPROPRIATE = 'INAPPROPRIATE',
  COPYRIGHT = 'COPYRIGHT',
  MISINFORMATION = 'MISINFORMATION',
  VIOLENCE = 'VIOLENCE',
  HATE_SPEECH = 'HATE_SPEECH',
  OTHER = 'OTHER',
}

/**
 * 举报状态
 */
export enum ReportStatusDto {
  PENDING = 'PENDING',
  REVIEWING = 'REVIEWING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * 审核处理动作
 */
export enum ModerationActionDto {
  DELETE_CONTENT = 'DELETE_CONTENT',
  WARN_USER = 'WARN_USER',
  BAN_USER = 'BAN_USER',
  DISMISS = 'DISMISS',
}

/**
 * 排序字段
 */
export enum ReportSortField {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

/**
 * 排序方向
 */
export enum ReportSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

// ==================== 请求 DTOs ====================

/**
 * 创建举报 DTO（用户提交举报）
 *
 * 需求18验收标准7: WHEN 审核员审核内容举报 THEN System SHALL 显示举报内容、举报原因、证据
 */
export class CreateReportDto {
  @IsEnum(ReportTargetTypeDto, { message: '无效的举报目标类型' })
  targetType!: ReportTargetTypeDto;

  @IsUUID('4', { message: '目标ID必须是有效的UUID' })
  targetId!: string;

  @IsEnum(ReportReasonDto, { message: '无效的举报原因' })
  reason!: ReportReasonDto;

  @IsOptional()
  @IsString({ message: '描述必须是字符串' })
  @MaxLength(500, { message: '描述不能超过500字符' })
  description?: string;

  @IsOptional()
  @IsArray({ message: '证据必须是数组' })
  @IsString({ each: true, message: '证据项必须是字符串' })
  evidence?: string[];
}

/**
 * 举报列表查询 DTO（管理员查询）
 */
export class ReportListQueryDto {
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
  @IsEnum(ReportStatusDto, { message: '无效的举报状态' })
  status?: ReportStatusDto;

  @IsOptional()
  @IsEnum(ReportTargetTypeDto, { message: '无效的目标类型' })
  targetType?: ReportTargetTypeDto;

  @IsOptional()
  @IsEnum(ReportReasonDto, { message: '无效的举报原因' })
  reason?: ReportReasonDto;

  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @IsEnum(ReportSortField, { message: '无效的排序字段' })
  sortBy?: ReportSortField = ReportSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(ReportSortOrder, { message: '无效的排序方向' })
  sortOrder?: ReportSortOrder = ReportSortOrder.DESC;
}

/**
 * 处理举报 DTO（管理员审核处理）
 *
 * 需求18验收标准8: WHEN 审核员处理违规内容 THEN System SHALL 支持删除、警告、封禁等操作
 */
export class ProcessReportDto {
  @IsEnum(ReportStatusDto, {
    message: '状态必须是 APPROVED、REJECTED 或 ARCHIVED',
  })
  status!: ReportStatusDto;

  @IsOptional()
  @IsEnum(ModerationActionDto, { message: '无效的处理动作' })
  action?: ModerationActionDto;

  @IsOptional()
  @IsString({ message: '审核备注必须是字符串' })
  @MaxLength(500, { message: '审核备注不能超过500字符' })
  reviewNote?: string;
}

// ==================== 响应 DTOs ====================

/**
 * 举报列表项
 */
export interface ReportListItemDto {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  reviewerId: string | null;
  reviewerName: string | null;
  action: string | null;
  createdAt: Date;
  reviewedAt: Date | null;
}

/**
 * 举报详情
 */
export interface ReportDetailDto extends ReportListItemDto {
  evidence: string[];
  reviewNote: string | null;
  targetContent: unknown | null;
  updatedAt: Date;
}

/**
 * 举报列表响应
 */
export interface ReportListResponseDto {
  reports: ReportListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 举报操作结果
 */
export interface ReportOperationResultDto {
  success: boolean;
  message: string;
  report?: ReportListItemDto;
}
