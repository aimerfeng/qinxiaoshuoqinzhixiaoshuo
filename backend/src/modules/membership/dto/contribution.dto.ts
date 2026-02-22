import { IsInt, IsOptional, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 贡献度 DTO
 *
 * 需求14: 会员等级体系
 * 任务14.1.3: 贡献度记录 API
 */

/**
 * 贡献类型枚举（与 Prisma 枚举保持一致）
 */
export enum ContributionTypeEnum {
  // 阅读贡献
  READ_CHAPTER = 'READ_CHAPTER',
  READ_DURATION = 'READ_DURATION',
  // 互动贡献
  COMMENT_VALID = 'COMMENT_VALID',
  COMMENT_LIKED = 'COMMENT_LIKED',
  QUOTE_INTERACTED = 'QUOTE_INTERACTED',
  // 创作贡献
  PUBLISH_CHAPTER = 'PUBLISH_CHAPTER',
  WORK_FAVORITED = 'WORK_FAVORITED',
  PARAGRAPH_QUOTED = 'PARAGRAPH_QUOTED',
  // 社区贡献
  REPORT_VALID = 'REPORT_VALID',
  ACTIVITY_PARTICIPATE = 'ACTIVITY_PARTICIPATE',
}

/**
 * 分页查询请求 DTO
 */
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}

/**
 * 贡献度历史查询请求 DTO
 */
export class ContributionHistoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ContributionTypeEnum)
  type?: ContributionTypeEnum;
}

/**
 * 贡献度记录响应 DTO
 */
export interface ContributionRecordDto {
  id: string;
  type: string;
  points: number;
  referenceId: string | null;
  referenceType: string | null;
  description: string | null;
  createdAt: Date;
}

/**
 * 贡献度分类汇总 DTO
 */
export interface ContributionBreakdownDto {
  reading: number;
  interaction: number;
  creation: number;
  community: number;
}

/**
 * 获取用户总贡献度响应 DTO
 *
 * 需求14验收标准7: WHEN 用户查看个人等级 THEN System SHALL 显示当前等级、贡献度、升级进度
 */
export interface GetTotalContributionResponseDto {
  message: string;
  data: {
    totalScore: number;
    breakdown: ContributionBreakdownDto;
    level: {
      current: number;
      name: string;
      nextLevelScore: number | null;
      progress: number;
    };
  };
}

/**
 * 每日贡献度统计项 DTO
 */
export interface DailyContributionItemDto {
  type: string;
  typeName: string;
  currentPoints: number;
  dailyLimit: number | null;
  remaining: number | null;
  isLimitReached: boolean;
}

/**
 * 获取今日贡献度统计响应 DTO
 */
export interface GetDailyContributionResponseDto {
  message: string;
  data: {
    date: string;
    contributions: DailyContributionItemDto[];
    totalEarnedToday: number;
  };
}

/**
 * 分页信息 DTO
 */
export interface PaginationDto {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 获取贡献度历史响应 DTO
 *
 * 需求14验收标准8: WHEN 用户查看贡献明细 THEN System SHALL 显示各维度贡献记录和积分变化
 */
export interface GetContributionHistoryResponseDto {
  message: string;
  data: {
    records: ContributionRecordDto[];
    pagination: PaginationDto;
  };
}

/**
 * 贡献度配置项 DTO
 */
export interface ContributionConfigItemDto {
  type: string;
  typeName: string;
  points: number;
  dailyLimit: number | null;
  description: string;
  category: 'reading' | 'interaction' | 'creation' | 'community';
}

/**
 * 获取贡献度配置响应 DTO
 */
export interface GetContributionConfigResponseDto {
  message: string;
  data: {
    configs: ContributionConfigItemDto[];
  };
}
