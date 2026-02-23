import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsInt,
  IsBoolean,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LimitedEventType,
  LimitedEventStatus,
  LimitedEventTaskType,
  LimitedEventRewardType,
} from '@prisma/client';

/**
 * 创建限时活动 DTO
 * 需求26.1: 限时活动系统
 */
export class CreateLimitedEventDto {
  /** 活动名称 */
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name!: string;

  /** 活动描述 */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  /** 活动封面图URL */
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  /** 活动类型 */
  @IsEnum(LimitedEventType)
  eventType!: LimitedEventType;

  /** 开始日期 */
  @IsDateString()
  startDate!: string;

  /** 结束日期 */
  @IsDateString()
  endDate!: string;

  /** 是否立即发布 */
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

/**
 * 更新限时活动 DTO
 */
export class UpdateLimitedEventDto {
  /** 活动名称 */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  /** 活动描述 */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  /** 活动封面图URL */
  @IsOptional()
  @IsString()
  coverImageUrl?: string;

  /** 活动状态 */
  @IsOptional()
  @IsEnum(LimitedEventStatus)
  status?: LimitedEventStatus;

  /** 开始日期 */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /** 结束日期 */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /** 是否发布 */
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}

/**
 * 活动任务奖励值 DTO
 */
export class TaskRewardValueDto {
  /** 代币数量（当奖励类型为TOKENS时） */
  @IsOptional()
  @IsInt()
  @Min(1)
  amount?: number;

  /** 徽章ID（当奖励类型为BADGE时） */
  @IsOptional()
  @IsString()
  badgeId?: string;

  /** 称号ID（当奖励类型为TITLE时） */
  @IsOptional()
  @IsString()
  titleId?: string;

  /** 头像框ID（当奖励类型为AVATAR_FRAME时） */
  @IsOptional()
  @IsString()
  avatarFrameId?: string;

  /** 主题ID（当奖励类型为THEME时） */
  @IsOptional()
  @IsString()
  themeId?: string;

  /** 经验值（当奖励类型为EXPERIENCE时） */
  @IsOptional()
  @IsInt()
  @Min(1)
  experience?: number;

  /** 专属道具ID（当奖励类型为EXCLUSIVE_ITEM时） */
  @IsOptional()
  @IsString()
  exclusiveItemId?: string;
}

/**
 * 创建活动任务 DTO
 */
export class CreateLimitedEventTaskDto {
  /** 任务名称 */
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  /** 任务描述 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** 任务类型 */
  @IsEnum(LimitedEventTaskType)
  taskType!: LimitedEventTaskType;

  /** 目标值 */
  @IsInt()
  @Min(1)
  targetValue!: number;

  /** 奖励类型 */
  @IsEnum(LimitedEventRewardType)
  rewardType!: LimitedEventRewardType;

  /** 奖励详情 */
  @ValidateNested()
  @Type(() => TaskRewardValueDto)
  rewardValue!: TaskRewardValueDto;

  /** 排序顺序 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  /** 是否必须完成 */
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

/**
 * 更新活动任务 DTO
 */
export class UpdateLimitedEventTaskDto {
  /** 任务名称 */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  /** 任务描述 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** 任务类型 */
  @IsOptional()
  @IsEnum(LimitedEventTaskType)
  taskType?: LimitedEventTaskType;

  /** 目标值 */
  @IsOptional()
  @IsInt()
  @Min(1)
  targetValue?: number;

  /** 奖励类型 */
  @IsOptional()
  @IsEnum(LimitedEventRewardType)
  rewardType?: LimitedEventRewardType;

  /** 奖励详情 */
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskRewardValueDto)
  rewardValue?: TaskRewardValueDto;

  /** 排序顺序 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  /** 是否必须完成 */
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;
}

/**
 * 创建活动里程碑 DTO
 */
export class CreateLimitedEventMilestoneDto {
  /** 里程碑名称 */
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  /** 里程碑描述 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** 需要完成的任务数量 */
  @IsInt()
  @Min(1)
  requiredProgress!: number;

  /** 奖励类型 */
  @IsEnum(LimitedEventRewardType)
  rewardType!: LimitedEventRewardType;

  /** 奖励详情 */
  @ValidateNested()
  @Type(() => TaskRewardValueDto)
  rewardValue!: TaskRewardValueDto;

  /** 排序顺序 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * 更新活动里程碑 DTO
 */
export class UpdateLimitedEventMilestoneDto {
  /** 里程碑名称 */
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  /** 里程碑描述 */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** 需要完成的任务数量 */
  @IsOptional()
  @IsInt()
  @Min(1)
  requiredProgress?: number;

  /** 奖励类型 */
  @IsOptional()
  @IsEnum(LimitedEventRewardType)
  rewardType?: LimitedEventRewardType;

  /** 奖励详情 */
  @IsOptional()
  @ValidateNested()
  @Type(() => TaskRewardValueDto)
  rewardValue?: TaskRewardValueDto;

  /** 排序顺序 */
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

/**
 * 活动列表查询参数 DTO
 */
export class LimitedEventQueryDto {
  /** 活动类型筛选 */
  @IsOptional()
  @IsEnum(LimitedEventType)
  eventType?: LimitedEventType;

  /** 活动状态筛选 */
  @IsOptional()
  @IsEnum(LimitedEventStatus)
  status?: LimitedEventStatus;

  /** 是否只显示已发布的活动 */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  publishedOnly?: boolean;

  /** 页码 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  /** 每页数量 */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number;

  /** 排序字段 */
  @IsOptional()
  @IsString()
  sortBy?: 'startDate' | 'endDate' | 'createdAt' | 'name';

  /** 排序方向 */
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

/**
 * 用户活动进度查询参数 DTO
 */
export class UserEventProgressQueryDto {
  /** 活动ID */
  @IsUUID()
  eventId!: string;
}

/**
 * 领取任务奖励 DTO
 */
export class ClaimTaskRewardDto {
  /** 任务ID */
  @IsUUID()
  taskId!: string;
}

/**
 * 领取里程碑奖励 DTO
 */
export class ClaimMilestoneRewardDto {
  /** 里程碑ID */
  @IsUUID()
  milestoneId!: string;
}

/**
 * 批量创建活动任务 DTO
 */
export class BatchCreateTasksDto {
  /** 任务列表 */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLimitedEventTaskDto)
  tasks!: CreateLimitedEventTaskDto[];
}

/**
 * 批量创建活动里程碑 DTO
 */
export class BatchCreateMilestonesDto {
  /** 里程碑列表 */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateLimitedEventMilestoneDto)
  milestones!: CreateLimitedEventMilestoneDto[];
}


/**
 * 更新任务进度 DTO
 * 需求26.1.7: 活动进度追踪服务
 */
export class UpdateTaskProgressDto {
  /** 进度增量 */
  @IsInt()
  @Min(1)
  progressIncrement!: number;
}
