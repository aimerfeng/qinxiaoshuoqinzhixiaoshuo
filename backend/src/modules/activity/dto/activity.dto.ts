/**
 * 活动模块 DTO
 *
 * 需求16: 社区活动系统
 * 任务16.1.2: 创建活动 API
 */

import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsDateString,
  Min,
  Max,
  MinLength,
  MaxLength,
  IsObject,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== 枚举类型 ====================

/**
 * 活动类型
 */
export enum ActivityType {
  READING_CHALLENGE = 'READING_CHALLENGE', // 阅读打卡
  WRITING_CONTEST = 'WRITING_CONTEST', // 评论征集/创作接力
  COMMUNITY_EVENT = 'COMMUNITY_EVENT', // 社区活动（引用挑战等）
  SPECIAL_EVENT = 'SPECIAL_EVENT', // 官方特殊活动
}

/**
 * 活动状态
 */
export enum ActivityStatus {
  DRAFT = 'DRAFT', // 草稿
  PENDING = 'PENDING', // 待审核
  ACTIVE = 'ACTIVE', // 进行中
  ENDED = 'ENDED', // 已结束
  CANCELLED = 'CANCELLED', // 已取消
}

/**
 * 参与状态
 */
export enum ParticipationStatus {
  JOINED = 'JOINED', // 已参与
  COMPLETED = 'COMPLETED', // 已完成
  FAILED = 'FAILED', // 未完成
  WITHDRAWN = 'WITHDRAWN', // 已退出
}

/**
 * 活动类型中文名称
 */
export const ACTIVITY_TYPE_NAMES: Record<string, string> = {
  READING_CHALLENGE: '阅读打卡',
  WRITING_CONTEST: '评论征集',
  COMMUNITY_EVENT: '引用挑战',
  SPECIAL_EVENT: '官方活动',
};

/**
 * 活动状态中文名称
 */
export const ACTIVITY_STATUS_NAMES: Record<string, string> = {
  DRAFT: '草稿',
  PENDING: '待审核',
  ACTIVE: '进行中',
  ENDED: '已结束',
  CANCELLED: '已取消',
};

// ==================== 活动配置限制 ====================

/**
 * 活动配置限制
 *
 * 需求16 活动配置参数:
 * - 活动名称: 4-30字符
 * - 活动描述: 10-500字符
 * - 活动时长: 1-30天
 * - 参与人数上限: 10-1000人
 * - 单人奖励: 1-100零芥子
 * - 总奖池: ≥ 单人奖励 × 人数上限
 */
export const ACTIVITY_LIMITS = {
  /** 活动名称最小长度 */
  TITLE_MIN_LENGTH: 4,
  /** 活动名称最大长度 */
  TITLE_MAX_LENGTH: 30,
  /** 活动描述最小长度 */
  DESCRIPTION_MIN_LENGTH: 10,
  /** 活动描述最大长度 */
  DESCRIPTION_MAX_LENGTH: 500,
  /** 最小活动时长（天） */
  MIN_DURATION_DAYS: 1,
  /** 最大活动时长（天） */
  MAX_DURATION_DAYS: 30,
  /** 最小参与人数 */
  MIN_PARTICIPANTS: 10,
  /** 最大参与人数 */
  MAX_PARTICIPANTS: 1000,
  /** 最小单人奖励 */
  MIN_REWARD_PER_PERSON: 1,
  /** 最大单人奖励 */
  MAX_REWARD_PER_PERSON: 100,
};

// ==================== 创建活动相关 DTO ====================

/**
 * 活动规则配置 DTO
 */
export interface ActivityRulesDto {
  /** 目标作品ID（阅读打卡/引用挑战） */
  targetWorkId?: string;
  /** 目标章节数（阅读打卡） */
  targetChapterCount?: number;
  /** 最小评论字数（评论征集） */
  minCommentLength?: number;
  /** 目标段落ID（引用挑战） */
  targetParagraphId?: string;
  /** 其他自定义规则 */
  customRules?: string;
}

/**
 * 活动奖励配置 DTO
 */
export interface ActivityRewardsConfigDto {
  /** 奖励类型 */
  type: 'MUSTARD_SEED' | 'BADGE' | 'TITLE' | 'EXPERIENCE';
  /** 奖励数量 */
  amount: number;
  /** 徽章ID（如果是徽章奖励） */
  badgeId?: string;
  /** 称号ID（如果是称号奖励） */
  titleId?: string;
}

/**
 * 创建活动请求 DTO
 *
 * 需求16验收标准2: WHEN 正式会员创建活动 THEN System SHALL 提供活动模板和条件配置界面
 */
export class CreateActivityDto {
  /** 活动名称 (4-30字符) */
  @IsString()
  @MinLength(ACTIVITY_LIMITS.TITLE_MIN_LENGTH, {
    message: `活动名称至少需要 ${ACTIVITY_LIMITS.TITLE_MIN_LENGTH} 个字符`,
  })
  @MaxLength(ACTIVITY_LIMITS.TITLE_MAX_LENGTH, {
    message: `活动名称不能超过 ${ACTIVITY_LIMITS.TITLE_MAX_LENGTH} 个字符`,
  })
  title!: string;

  /** 活动描述 (10-500字符) */
  @IsString()
  @MinLength(ACTIVITY_LIMITS.DESCRIPTION_MIN_LENGTH, {
    message: `活动描述至少需要 ${ACTIVITY_LIMITS.DESCRIPTION_MIN_LENGTH} 个字符`,
  })
  @MaxLength(ACTIVITY_LIMITS.DESCRIPTION_MAX_LENGTH, {
    message: `活动描述不能超过 ${ACTIVITY_LIMITS.DESCRIPTION_MAX_LENGTH} 个字符`,
  })
  description!: string;

  /** 活动类型 */
  @IsEnum(ActivityType, {
    message: '无效的活动类型',
  })
  type!: ActivityType;

  /** 开始时间 */
  @IsDateString(
    {},
    {
      message: '开始时间格式无效',
    },
  )
  startTime!: string;

  /** 结束时间 */
  @IsDateString(
    {},
    {
      message: '结束时间格式无效',
    },
  )
  endTime!: string;

  /** 活动规则（JSON格式） */
  @IsOptional()
  @IsObject()
  rules?: ActivityRulesDto;

  /** 奖励配置（JSON格式） */
  @IsOptional()
  @IsObject()
  rewards?: ActivityRewardsConfigDto[];

  /** 封面图片URL */
  @IsOptional()
  @IsString()
  coverImage?: string;

  /** 最大参与人数 (10-1000) */
  @IsOptional()
  @IsInt()
  @Min(ACTIVITY_LIMITS.MIN_PARTICIPANTS, {
    message: `参与人数不能少于 ${ACTIVITY_LIMITS.MIN_PARTICIPANTS} 人`,
  })
  @Max(ACTIVITY_LIMITS.MAX_PARTICIPANTS, {
    message: `参与人数不能超过 ${ACTIVITY_LIMITS.MAX_PARTICIPANTS} 人`,
  })
  @Type(() => Number)
  maxParticipants?: number;

  /** 单人奖励金额 (1-100零芥子) */
  @IsInt()
  @Min(ACTIVITY_LIMITS.MIN_REWARD_PER_PERSON, {
    message: `单人奖励不能少于 ${ACTIVITY_LIMITS.MIN_REWARD_PER_PERSON} 零芥子`,
  })
  @Max(ACTIVITY_LIMITS.MAX_REWARD_PER_PERSON, {
    message: `单人奖励不能超过 ${ACTIVITY_LIMITS.MAX_REWARD_PER_PERSON} 零芥子`,
  })
  @Type(() => Number)
  rewardPerPerson!: number;
}

/**
 * 创建活动结果 DTO
 */
export interface CreateActivityResultDto {
  /** 是否成功 */
  success: boolean;
  /** 活动ID */
  activityId?: string;
  /** 锁定的奖池金额 */
  lockedPool?: number;
  /** 消息 */
  message: string;
}

/**
 * 创建活动响应 DTO
 */
export interface CreateActivityResponseDto {
  message: string;
  data: CreateActivityResultDto;
}

// ==================== 活动详情相关 DTO ====================

/**
 * 创建者信息 DTO
 */
export interface CreatorInfoDto {
  /** 用户ID */
  id: string;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string | null;
  /** 头像 */
  avatar: string | null;
}

/**
 * 活动详情 DTO
 *
 * 需求16验收标准10: WHEN 用户查看活动详情 THEN System SHALL 显示规则、进度、参与者、奖励记录
 */
export interface ActivityDetailDto {
  /** 活动ID */
  id: string;
  /** 活动名称 */
  title: string;
  /** 活动描述 */
  description: string;
  /** 封面图片 */
  coverImage: string | null;
  /** 活动类型 */
  type: ActivityType;
  /** 活动类型名称 */
  typeName: string;
  /** 活动状态 */
  status: ActivityStatus;
  /** 活动状态名称 */
  statusName: string;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 活动规则 */
  rules: ActivityRulesDto | null;
  /** 奖励配置 */
  rewards: ActivityRewardsConfigDto[] | null;
  /** 最大参与人数 */
  maxParticipants: number | null;
  /** 单人奖励金额 */
  rewardPerPerson: number;
  /** 总奖池金额 */
  totalPool: number;
  /** 已锁定奖池金额 */
  lockedPool: number;
  /** 当前参与人数 */
  participantCount: number;
  /** 创建者信息 */
  creator: CreatorInfoDto;
  /** 当前用户的参与状态（如果已登录） */
  currentUserParticipation?: UserParticipationDto | null;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 用户参与状态 DTO
 */
export interface UserParticipationDto {
  /** 参与ID */
  id: string;
  /** 参与状态 */
  status: ParticipationStatus;
  /** 进度数据 */
  progress: Record<string, unknown> | null;
  /** 是否已领取奖励 */
  rewardClaimed: boolean;
  /** 完成时间 */
  completedAt: Date | null;
  /** 参与时间 */
  createdAt: Date;
}

/**
 * 获取活动详情响应 DTO
 */
export interface GetActivityDetailResponseDto {
  message: string;
  data: ActivityDetailDto;
}

// ==================== 活动列表相关 DTO ====================

/**
 * 活动列表项 DTO
 */
export interface ActivityListItemDto {
  /** 活动ID */
  id: string;
  /** 活动名称 */
  title: string;
  /** 活动描述（截断） */
  description: string;
  /** 封面图片 */
  coverImage: string | null;
  /** 活动类型 */
  type: ActivityType;
  /** 活动类型名称 */
  typeName: string;
  /** 活动状态 */
  status: ActivityStatus;
  /** 活动状态名称 */
  statusName: string;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 最大参与人数 */
  maxParticipants: number | null;
  /** 单人奖励金额 */
  rewardPerPerson: number;
  /** 当前参与人数 */
  participantCount: number;
  /** 创建者信息 */
  creator: CreatorInfoDto;
  /** 创建时间 */
  createdAt: Date;
}

/**
 * 活动列表查询参数 DTO
 */
export class ActivityQueryDto {
  /** 页码（默认: 1） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  /** 每页数量（默认: 20，最大: 50） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  pageSize?: number;

  /** 活动状态过滤 */
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  /** 活动类型过滤 */
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  /** 排序字段 */
  @IsOptional()
  @IsString()
  sortBy?: 'startTime' | 'createdAt' | 'participantCount';

  /** 排序方向 */
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  /** 创建者ID过滤 */
  @IsOptional()
  @IsUUID()
  creatorId?: string;
}

/**
 * 分页信息 DTO
 */
export interface PaginationDto {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总记录数 */
  total: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 活动列表 DTO
 */
export interface ActivityListDto {
  /** 活动列表 */
  activities: ActivityListItemDto[];
  /** 分页信息 */
  pagination: PaginationDto;
}

/**
 * 获取活动列表响应 DTO
 */
export interface GetActivityListResponseDto {
  message: string;
  data: ActivityListDto;
}

// ==================== 参与活动相关 DTO ====================

/**
 * 参与活动结果 DTO
 *
 * 需求16验收标准7: WHEN 用户参与活动 THEN System SHALL 记录参与进度并实时显示
 */
export interface JoinActivityResultDto {
  /** 是否成功 */
  success: boolean;
  /** 参与记录ID */
  participationId?: string;
  /** 活动ID */
  activityId?: string;
  /** 参与状态 */
  status?: ParticipationStatus;
  /** 消息 */
  message: string;
}

/**
 * 参与活动响应 DTO
 */
export interface JoinActivityResponseDto {
  message: string;
  data: JoinActivityResultDto;
}

/**
 * 退出活动结果 DTO
 */
export interface LeaveActivityResultDto {
  /** 是否成功 */
  success: boolean;
  /** 参与记录ID */
  participationId?: string;
  /** 更新后的状态 */
  status?: ParticipationStatus;
  /** 消息 */
  message: string;
}

/**
 * 退出活动响应 DTO
 */
export interface LeaveActivityResponseDto {
  message: string;
  data: LeaveActivityResultDto;
}

/**
 * 我的参与记录项 DTO
 */
export interface MyParticipationItemDto {
  /** 参与记录ID */
  id: string;
  /** 参与状态 */
  status: ParticipationStatus;
  /** 参与状态名称 */
  statusName: string;
  /** 进度数据 */
  progress: Record<string, unknown> | null;
  /** 是否已领取奖励 */
  rewardClaimed: boolean;
  /** 完成时间 */
  completedAt: Date | null;
  /** 参与时间 */
  createdAt: Date;
  /** 活动信息 */
  activity: {
    id: string;
    title: string;
    description: string;
    coverImage: string | null;
    type: ActivityType;
    typeName: string;
    status: ActivityStatus;
    statusName: string;
    startTime: Date;
    endTime: Date;
    rewardPerPerson: number;
    participantCount: number;
    creator: CreatorInfoDto;
  };
}

/**
 * 参与状态中文名称
 */
export const PARTICIPATION_STATUS_NAMES: Record<string, string> = {
  JOINED: '已参与',
  COMPLETED: '已完成',
  FAILED: '未完成',
  WITHDRAWN: '已退出',
};

/**
 * 我的参与记录查询参数 DTO
 */
export class MyParticipationsQueryDto {
  /** 页码（默认: 1） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  /** 每页数量（默认: 20，最大: 50） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  pageSize?: number;

  /** 参与状态过滤 */
  @IsOptional()
  @IsEnum(ParticipationStatus)
  status?: ParticipationStatus;
}

/**
 * 我的参与记录列表 DTO
 */
export interface MyParticipationsListDto {
  /** 参与记录列表 */
  participations: MyParticipationItemDto[];
  /** 分页信息 */
  pagination: PaginationDto;
}

/**
 * 获取我的参与记录响应 DTO
 */
export interface GetMyParticipationsResponseDto {
  message: string;
  data: MyParticipationsListDto;
}

// ==================== 活动进度追踪相关 DTO ====================

/**
 * 更新进度请求 DTO
 *
 * 任务16.1.4: 活动进度追踪
 */
export class UpdateProgressDto {
  /** 进度数据（JSON格式） */
  @IsObject()
  progressData!: Record<string, unknown>;
}

/**
 * 更新进度结果 DTO
 */
export interface UpdateProgressResultDto {
  /** 是否成功 */
  success: boolean;
  /** 参与记录ID */
  participationId?: string;
  /** 更新后的进度数据 */
  progress?: Record<string, unknown> | null;
  /** 是否已完成活动 */
  completed?: boolean;
  /** 消息 */
  message: string;
}

/**
 * 更新进度响应 DTO
 */
export interface UpdateProgressResponseDto {
  message: string;
  data: UpdateProgressResultDto;
}

/**
 * 获取进度结果 DTO
 */
export interface GetProgressResultDto {
  /** 参与记录ID */
  participationId: string;
  /** 活动ID */
  activityId: string;
  /** 参与状态 */
  status: ParticipationStatus;
  /** 参与状态名称 */
  statusName: string;
  /** 进度数据 */
  progress: Record<string, unknown> | null;
  /** 是否已领取奖励 */
  rewardClaimed: boolean;
  /** 完成时间 */
  completedAt: Date | null;
  /** 参与时间 */
  createdAt: Date;
  /** 活动规则（用于前端展示进度） */
  activityRules: ActivityRulesDto | null;
}

/**
 * 获取进度响应 DTO
 */
export interface GetProgressResponseDto {
  message: string;
  data: GetProgressResultDto | null;
}

// ==================== 奖励发放相关 DTO (任务16.1.5) ====================

/**
 * 领取奖励结果 DTO
 *
 * 任务16.1.5: 奖励发放服务
 * 需求16验收标准8: WHEN 用户完成活动条件 THEN System SHALL 根据验证方式处理奖励发放
 */
export interface ClaimRewardResultDto {
  /** 是否成功 */
  success: boolean;
  /** 奖励记录ID */
  rewardId?: string;
  /** 奖励金额 */
  amount?: number;
  /** 奖励类型 */
  rewardType?: string;
  /** 消息 */
  message: string;
}

/**
 * 领取奖励响应 DTO
 */
export interface ClaimRewardResponseDto {
  message: string;
  data: ClaimRewardResultDto;
}

/**
 * 批量发放奖励结果 DTO
 *
 * 任务16.1.5: 奖励发放服务 - 批量发放
 */
export interface DistributeRewardsResultDto {
  /** 是否成功 */
  success: boolean;
  /** 活动ID */
  activityId?: string;
  /** 成功发放数量 */
  distributedCount?: number;
  /** 失败数量 */
  failedCount?: number;
  /** 发放的总金额 */
  totalAmount?: number;
  /** 退还给创建者的金额 */
  refundedAmount?: number;
  /** 消息 */
  message: string;
}

/**
 * 批量发放奖励响应 DTO
 */
export interface DistributeRewardsResponseDto {
  message: string;
  data: DistributeRewardsResultDto;
}

/**
 * 活动结算结果 DTO
 *
 * 任务16.1.5: 活动结束处理
 * 需求16验收标准9: WHEN 活动到期 THEN System SHALL 结算活动并退还未发放的奖池余额
 */
export interface EndActivityResultDto {
  /** 是否成功 */
  success: boolean;
  /** 活动ID */
  activityId?: string;
  /** 标记为失败的参与数量 */
  failedCount?: number;
  /** 已完成的参与数量 */
  completedCount?: number;
  /** 退还给创建者的金额 */
  refundedAmount?: number;
  /** 消息 */
  message: string;
}

/**
 * 活动结算响应 DTO
 */
export interface EndActivityResponseDto {
  message: string;
  data: EndActivityResultDto;
}

// ==================== 活动审核相关 DTO (任务16.1.6) ====================

/**
 * 提交审核请求 DTO
 *
 * 任务16.1.6: 活动审核 API
 * 需求16验收标准4: WHEN 活动创建完成 THEN System SHALL 提交审核并通知管理员
 */
export class SubmitForReviewDto {
  /** 活动ID（从路径参数获取） */
  activityId?: string;
}

/**
 * 提交审核结果 DTO
 */
export interface SubmitForReviewResultDto {
  /** 是否成功 */
  success: boolean;
  /** 活动ID */
  activityId?: string;
  /** 新状态 */
  status?: ActivityStatus;
  /** 消息 */
  message: string;
}

/**
 * 提交审核响应 DTO
 */
export interface SubmitForReviewResponseDto {
  message: string;
  data: SubmitForReviewResultDto;
}

/**
 * 审核活动请求 DTO（通过）
 *
 * 任务16.1.6: 活动审核 API - 审核通过
 * 需求16验收标准5: WHEN 管理员审核活动 THEN System SHALL 支持通过/拒绝操作
 */
export class ApproveActivityDto {
  /** 审核备注（可选） */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/**
 * 审核通过结果 DTO
 */
export interface ApproveActivityResultDto {
  /** 是否成功 */
  success: boolean;
  /** 活动ID */
  activityId?: string;
  /** 新状态 */
  status?: ActivityStatus;
  /** 审核人ID */
  reviewerId?: string;
  /** 审核时间 */
  reviewedAt?: Date;
  /** 消息 */
  message: string;
}

/**
 * 审核通过响应 DTO
 */
export interface ApproveActivityResponseDto {
  message: string;
  data: ApproveActivityResultDto;
}

/**
 * 拒绝活动请求 DTO
 *
 * 任务16.1.6: 活动审核 API - 审核拒绝
 * 需求16验收标准5: WHEN 管理员审核活动 THEN System SHALL 支持通过/拒绝操作
 * 需求16验收标准6: IF 活动被拒绝 THEN System SHALL 退还锁定的零芥子并通知创建者
 */
export class RejectActivityDto {
  /** 拒绝原因（必填） */
  @IsString()
  @MinLength(5, {
    message: '拒绝原因至少需要 5 个字符',
  })
  @MaxLength(500, {
    message: '拒绝原因不能超过 500 个字符',
  })
  reason!: string;
}

/**
 * 拒绝活动结果 DTO
 */
export interface RejectActivityResultDto {
  /** 是否成功 */
  success: boolean;
  /** 活动ID */
  activityId?: string;
  /** 新状态 */
  status?: ActivityStatus;
  /** 审核人ID */
  reviewerId?: string;
  /** 拒绝原因 */
  rejectReason?: string;
  /** 退还金额 */
  refundedAmount?: number;
  /** 审核时间 */
  reviewedAt?: Date;
  /** 消息 */
  message: string;
}

/**
 * 拒绝活动响应 DTO
 */
export interface RejectActivityResponseDto {
  message: string;
  data: RejectActivityResultDto;
}

/**
 * 待审核活动查询参数 DTO
 *
 * 任务16.1.6: 活动审核 API - 获取待审核列表
 */
export class PendingActivitiesQueryDto {
  /** 页码（默认: 1） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  /** 每页数量（默认: 20，最大: 50） */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  pageSize?: number;

  /** 活动类型过滤 */
  @IsOptional()
  @IsEnum(ActivityType)
  type?: ActivityType;

  /** 排序字段 */
  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'startTime';

  /** 排序方向 */
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

/**
 * 待审核活动列表项 DTO
 */
export interface PendingActivityItemDto {
  /** 活动ID */
  id: string;
  /** 活动名称 */
  title: string;
  /** 活动描述 */
  description: string;
  /** 封面图片 */
  coverImage: string | null;
  /** 活动类型 */
  type: ActivityType;
  /** 活动类型名称 */
  typeName: string;
  /** 开始时间 */
  startTime: Date;
  /** 结束时间 */
  endTime: Date;
  /** 最大参与人数 */
  maxParticipants: number | null;
  /** 单人奖励金额 */
  rewardPerPerson: number;
  /** 总奖池金额 */
  totalPool: number;
  /** 创建者信息 */
  creator: CreatorInfoDto;
  /** 提交审核时间 */
  createdAt: Date;
}

/**
 * 待审核活动列表 DTO
 */
export interface PendingActivitiesListDto {
  /** 活动列表 */
  activities: PendingActivityItemDto[];
  /** 分页信息 */
  pagination: PaginationDto;
}

/**
 * 获取待审核活动列表响应 DTO
 */
export interface GetPendingActivitiesResponseDto {
  message: string;
  data: PendingActivitiesListDto;
}
