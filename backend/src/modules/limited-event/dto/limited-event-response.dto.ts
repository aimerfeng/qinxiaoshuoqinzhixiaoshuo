import {
  LimitedEventType,
  LimitedEventStatus,
  LimitedEventTaskType,
  LimitedEventRewardType,
} from '@prisma/client';

/**
 * 活动类型配置响应 DTO
 */
export interface EventTypeConfigResponseDto {
  /** 活动类型 */
  type: LimitedEventType;
  /** 显示名称 */
  displayName: string;
  /** 中文名称 */
  displayNameCn: string;
  /** 描述 */
  description: string;
  /** 中文描述 */
  descriptionCn: string;
  /** 最小持续时间（天） */
  minDurationDays: number;
  /** 最大持续时间（天） */
  maxDurationDays: number;
  /** 推荐持续时间（天） */
  recommendedDurationDays: number;
  /** 主题色 */
  themeColor: string;
  /** 渐变色 */
  gradientColors: [string, string];
  /** 图标名称 */
  iconName: string;
  /** 是否支持主题装饰 */
  hasThemeDecorations: boolean;
  /** 是否支持特殊视觉效果 */
  hasSpecialEffects: boolean;
  /** 推荐任务类型 */
  recommendedTaskTypes: LimitedEventTaskType[];
  /** 推荐奖励类型 */
  recommendedRewardTypes: LimitedEventRewardType[];
  /** 任务数量范围 */
  taskCountRange: { min: number; max: number };
  /** 里程碑数量范围 */
  milestoneCountRange: { min: number; max: number };
  /** 紧迫感等级 */
  urgencyLevel: number;
}

/**
 * 活动任务响应 DTO
 */
export interface LimitedEventTaskResponseDto {
  /** 任务ID */
  id: string;
  /** 活动ID */
  eventId: string;
  /** 任务名称 */
  name: string;
  /** 任务描述 */
  description: string | null;
  /** 任务类型 */
  taskType: LimitedEventTaskType;
  /** 目标值 */
  targetValue: number;
  /** 奖励类型 */
  rewardType: LimitedEventRewardType;
  /** 奖励详情 */
  rewardValue: Record<string, unknown>;
  /** 排序顺序 */
  sortOrder: number;
  /** 是否必须完成 */
  isRequired: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 活动里程碑响应 DTO
 */
export interface LimitedEventMilestoneResponseDto {
  /** 里程碑ID */
  id: string;
  /** 活动ID */
  eventId: string;
  /** 里程碑名称 */
  name: string;
  /** 里程碑描述 */
  description: string | null;
  /** 需要完成的任务数量 */
  requiredProgress: number;
  /** 奖励类型 */
  rewardType: LimitedEventRewardType;
  /** 奖励详情 */
  rewardValue: Record<string, unknown>;
  /** 排序顺序 */
  sortOrder: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 限时活动响应 DTO
 */
export interface LimitedEventResponseDto {
  /** 活动ID */
  id: string;
  /** 活动名称 */
  name: string;
  /** 活动描述 */
  description: string | null;
  /** 活动封面图URL */
  coverImageUrl: string | null;
  /** 活动类型 */
  eventType: LimitedEventType;
  /** 活动状态 */
  status: LimitedEventStatus;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 是否已发布 */
  isPublished: boolean;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 活动任务列表 */
  tasks?: LimitedEventTaskResponseDto[];
  /** 活动里程碑列表 */
  milestones?: LimitedEventMilestoneResponseDto[];
  /** 活动类型配置 */
  typeConfig?: EventTypeConfigResponseDto;
  /** 剩余时间（小时） */
  remainingHours?: number;
  /** 紧迫感文案 */
  urgencyText?: string;
}

/**
 * 用户任务进度响应 DTO
 */
export interface UserTaskProgressResponseDto {
  /** 进度ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 活动ID */
  eventId: string;
  /** 任务ID */
  taskId: string;
  /** 当前进度 */
  currentProgress: number;
  /** 是否已完成 */
  isCompleted: boolean;
  /** 完成时间 */
  completedAt: string | null;
  /** 是否已领取奖励 */
  isClaimed: boolean;
  /** 领取时间 */
  claimedAt: string | null;
  /** 任务详情 */
  task?: LimitedEventTaskResponseDto;
  /** 进度百分比 */
  progressPercent?: number;
}

/**
 * 用户里程碑进度响应 DTO
 */
export interface UserMilestoneProgressResponseDto {
  /** 进度ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 活动ID */
  eventId: string;
  /** 里程碑ID */
  milestoneId: string;
  /** 是否已解锁 */
  isUnlocked: boolean;
  /** 解锁时间 */
  unlockedAt: string | null;
  /** 是否已领取奖励 */
  isClaimed: boolean;
  /** 领取时间 */
  claimedAt: string | null;
  /** 里程碑详情 */
  milestone?: LimitedEventMilestoneResponseDto;
}

/**
 * 用户活动参与记录响应 DTO
 */
export interface UserEventParticipationResponseDto {
  /** 参与记录ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 活动ID */
  eventId: string;
  /** 参与时间 */
  joinedAt: string;
  /** 已完成任务数 */
  completedTaskCount: number;
  /** 最后活动时间 */
  lastActivityAt: string | null;
  /** 活动详情 */
  event?: LimitedEventResponseDto;
  /** 任务进度列表 */
  taskProgress?: UserTaskProgressResponseDto[];
  /** 里程碑进度列表 */
  milestoneProgress?: UserMilestoneProgressResponseDto[];
  /** 总任务数 */
  totalTasks?: number;
  /** 完成进度百分比 */
  completionPercent?: number;
}

/**
 * 分页信息 DTO
 */
export interface PaginationDto {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总数量 */
  total: number;
  /** 总页数 */
  totalPages: number;
  /** 是否有下一页 */
  hasNext: boolean;
  /** 是否有上一页 */
  hasPrev: boolean;
}

/**
 * 活动列表分页响应 DTO
 */
export interface LimitedEventListResponseDto {
  /** 响应消息 */
  message: string;
  /** 活动列表 */
  items: LimitedEventResponseDto[];
  /** 分页信息 */
  pagination: PaginationDto;
}

/**
 * 领取奖励响应 DTO
 */
export interface ClaimRewardResponseDto {
  /** 是否成功 */
  success: boolean;
  /** 消息 */
  message: string;
  /** 奖励类型 */
  rewardType: LimitedEventRewardType;
  /** 奖励详情 */
  rewardValue: Record<string, unknown>;
  /** 领取时间 */
  claimedAt: string;
}

/**
 * 活动统计响应 DTO
 */
export interface EventStatisticsResponseDto {
  /** 活动ID */
  eventId: string;
  /** 参与人数 */
  participantCount: number;
  /** 完成人数 */
  completedCount: number;
  /** 完成率 */
  completionRate: number;
  /** 任务完成统计 */
  taskCompletionStats: {
    taskId: string;
    taskName: string;
    completedCount: number;
    completionRate: number;
  }[];
  /** 里程碑解锁统计 */
  milestoneUnlockStats: {
    milestoneId: string;
    milestoneName: string;
    unlockedCount: number;
    unlockRate: number;
  }[];
}

/**
 * 获取活动详情响应 DTO
 */
export interface GetLimitedEventResponseDto {
  message: string;
  event: LimitedEventResponseDto;
}

/**
 * 获取活动类型配置列表响应 DTO
 */
export interface GetEventTypeConfigsResponseDto {
  message: string;
  configs: EventTypeConfigResponseDto[];
}

/**
 * 获取用户活动进度响应 DTO
 */
export interface GetUserEventProgressResponseDto {
  message: string;
  participation: UserEventParticipationResponseDto;
}

/**
 * 参与活动响应 DTO
 */
export interface JoinEventResponseDto {
  message: string;
  participation: UserEventParticipationResponseDto;
}
