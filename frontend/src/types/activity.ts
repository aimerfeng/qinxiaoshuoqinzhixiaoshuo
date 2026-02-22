/**
 * 活动系统类型定义
 *
 * 需求16: 社区活动系统
 * 任务16.2.1: 活动中心页面
 */

/**
 * 活动类型枚举
 */
export type ActivityType =
  | 'READING_CHALLENGE'
  | 'WRITING_CONTEST'
  | 'COMMUNITY_EVENT'
  | 'SPECIAL_EVENT';

/**
 * 活动状态枚举
 */
export type ActivityStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'ACTIVE'
  | 'ENDED'
  | 'CANCELLED';

/**
 * 参与状态枚举
 */
export type ParticipationStatus =
  | 'JOINED'
  | 'COMPLETED'
  | 'FAILED'
  | 'WITHDRAWN';

/**
 * 活动类型中文名称映射
 */
export const ACTIVITY_TYPE_NAMES: Record<ActivityType, string> = {
  READING_CHALLENGE: '阅读打卡',
  WRITING_CONTEST: '评论征集',
  COMMUNITY_EVENT: '引用挑战',
  SPECIAL_EVENT: '官方活动',
};

/**
 * 活动状态中文名称映射
 */
export const ACTIVITY_STATUS_NAMES: Record<ActivityStatus, string> = {
  DRAFT: '草稿',
  PENDING: '待审核',
  ACTIVE: '进行中',
  ENDED: '已结束',
  CANCELLED: '已取消',
};

/**
 * 参与状态中文名称映射
 */
export const PARTICIPATION_STATUS_NAMES: Record<ParticipationStatus, string> = {
  JOINED: '已参与',
  COMPLETED: '已完成',
  FAILED: '未完成',
  WITHDRAWN: '已退出',
};

/**
 * 活动类型颜色配置
 */
export const ACTIVITY_TYPE_COLORS: Record<
  ActivityType,
  { text: string; bg: string; border: string }
> = {
  READING_CHALLENGE: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  WRITING_CONTEST: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
  },
  COMMUNITY_EVENT: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  SPECIAL_EVENT: {
    text: 'text-pink-600 dark:text-pink-400',
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-800',
  },
};

/**
 * 活动状态颜色配置
 */
export const ACTIVITY_STATUS_COLORS: Record<
  ActivityStatus,
  { text: string; bg: string }
> = {
  DRAFT: {
    text: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
  },
  PENDING: {
    text: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
  },
  ACTIVE: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  ENDED: {
    text: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800',
  },
  CANCELLED: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
};

// ==================== 创建者信息 ====================

/**
 * 创建者信息
 */
export interface CreatorInfo {
  id: string;
  username: string;
  nickname: string | null;
  avatar: string | null;
}

// ==================== 活动列表相关 ====================

/**
 * 活动列表项
 */
export interface ActivityListItem {
  id: string;
  title: string;
  description: string;
  coverImage: string | null;
  type: ActivityType;
  typeName: string;
  status: ActivityStatus;
  statusName: string;
  startTime: string;
  endTime: string;
  maxParticipants: number | null;
  rewardPerPerson: number;
  participantCount: number;
  creator: CreatorInfo;
  createdAt: string;
}

/**
 * 分页信息
 */
export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 活动列表查询参数
 */
export interface ActivityQueryParams {
  page?: number;
  pageSize?: number;
  status?: ActivityStatus;
  type?: ActivityType;
  sortBy?: 'startTime' | 'createdAt' | 'participantCount';
  sortOrder?: 'asc' | 'desc';
  creatorId?: string;
}

/**
 * 获取活动列表响应
 */
export interface GetActivityListResponse {
  message: string;
  data: {
    activities: ActivityListItem[];
    pagination: Pagination;
  };
}

// ==================== 我的参与记录相关 ====================

/**
 * 我的参与记录项
 */
export interface MyParticipationItem {
  id: string;
  status: ParticipationStatus;
  statusName: string;
  progress: Record<string, unknown> | null;
  rewardClaimed: boolean;
  completedAt: string | null;
  createdAt: string;
  activity: {
    id: string;
    title: string;
    description: string;
    coverImage: string | null;
    type: ActivityType;
    typeName: string;
    status: ActivityStatus;
    statusName: string;
    startTime: string;
    endTime: string;
    maxParticipants: number | null;
    rewardPerPerson: number;
    participantCount: number;
    creator: CreatorInfo;
  };
}

/**
 * 我的参与记录查询参数
 */
export interface MyParticipationsQueryParams {
  page?: number;
  pageSize?: number;
  status?: ParticipationStatus;
}

/**
 * 获取我的参与记录响应
 */
export interface GetMyParticipationsResponse {
  message: string;
  data: {
    participations: MyParticipationItem[];
    pagination: Pagination;
  };
}

// ==================== 参与活动相关 ====================

/**
 * 参与活动结果
 */
export interface JoinActivityResult {
  success: boolean;
  participationId?: string;
  activityId?: string;
  status?: ParticipationStatus;
  message: string;
}

/**
 * 参与活动响应
 */
export interface JoinActivityResponse {
  message: string;
  data: JoinActivityResult;
}

/**
 * 退出活动结果
 */
export interface LeaveActivityResult {
  success: boolean;
  participationId?: string;
  status?: ParticipationStatus;
  message: string;
}

/**
 * 退出活动响应
 */
export interface LeaveActivityResponse {
  message: string;
  data: LeaveActivityResult;
}

// ==================== 活动详情相关 ====================

/**
 * 活动规则配置
 */
export interface ActivityRules {
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
 * 活动奖励配置
 */
export interface ActivityRewardsConfig {
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
 * 用户参与状态
 */
export interface UserParticipation {
  /** 参与ID */
  id: string;
  /** 参与状态 */
  status: ParticipationStatus;
  /** 进度数据 */
  progress: Record<string, unknown> | null;
  /** 是否已领取奖励 */
  rewardClaimed: boolean;
  /** 完成时间 */
  completedAt: string | null;
  /** 参与时间 */
  createdAt: string;
}

/**
 * 活动详情
 */
export interface ActivityDetail {
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
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 活动规则 */
  rules: ActivityRules | null;
  /** 奖励配置 */
  rewards: ActivityRewardsConfig[] | null;
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
  creator: CreatorInfo;
  /** 当前用户的参与状态（如果已登录） */
  currentUserParticipation?: UserParticipation | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 获取活动详情响应
 */
export interface GetActivityDetailResponse {
  message: string;
  data: ActivityDetail;
}

// ==================== 活动进度相关 ====================

/**
 * 活动进度信息
 */
export interface ActivityProgress {
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
  completedAt: string | null;
  /** 参与时间 */
  createdAt: string;
  /** 活动规则（用于前端展示进度） */
  activityRules: ActivityRules | null;
}

/**
 * 获取活动进度响应
 */
export interface GetActivityProgressResponse {
  message: string;
  data: ActivityProgress | null;
}

// ==================== 领取奖励相关 ====================

/**
 * 领取奖励结果
 */
export interface ClaimRewardResult {
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
 * 领取奖励响应
 */
export interface ClaimRewardResponse {
  message: string;
  data: ClaimRewardResult;
}


// ==================== 创建活动相关 ====================

/**
 * 活动配置限制
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

/**
 * 创建活动请求
 */
export interface CreateActivityRequest {
  /** 活动名称 (4-30字符) */
  title: string;
  /** 活动描述 (10-500字符) */
  description: string;
  /** 活动类型 */
  type: ActivityType;
  /** 开始时间 (ISO 8601) */
  startTime: string;
  /** 结束时间 (ISO 8601) */
  endTime: string;
  /** 活动规则 */
  rules?: ActivityRules;
  /** 奖励配置 */
  rewards?: ActivityRewardsConfig[];
  /** 封面图片URL */
  coverImage?: string;
  /** 最大参与人数 (10-1000) */
  maxParticipants?: number;
  /** 单人奖励金额 (1-100零芥子) */
  rewardPerPerson: number;
}

/**
 * 创建活动结果
 */
export interface CreateActivityResult {
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
 * 创建活动响应
 */
export interface CreateActivityResponse {
  message: string;
  data: CreateActivityResult;
}

/**
 * 活动类型描述
 */
export const ACTIVITY_TYPE_DESCRIPTIONS: Record<ActivityType, string> = {
  READING_CHALLENGE: '设置阅读目标，参与者完成指定章节阅读即可获得奖励',
  WRITING_CONTEST: '征集优质评论，参与者发布符合要求的评论即可获得奖励',
  COMMUNITY_EVENT: '引用指定段落到广场，参与者完成引用即可获得奖励',
  SPECIAL_EVENT: '官方特殊活动，由平台运营发起',
};

/**
 * 活动类型图标
 */
export const ACTIVITY_TYPE_ICONS: Record<ActivityType, string> = {
  READING_CHALLENGE: '📖',
  WRITING_CONTEST: '✍️',
  COMMUNITY_EVENT: '💬',
  SPECIAL_EVENT: '🎉',
};
