/**
 * 赛季排行榜系统类型定义
 *
 * 需求25: 赛季排行榜系统
 * 任务25.1.2: 赛季排行榜数据模型
 *
 * 设计语言:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

// ==================== 枚举类型 ====================

/**
 * 排行榜类别枚举
 */
export type LeaderboardCategory = 'READING' | 'CREATION' | 'SOCIAL' | 'OVERALL';

/**
 * 赛季段位枚举（从低到高）
 */
export type SeasonTier =
  | 'NOVICE'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'MASTER'
  | 'GRANDMASTER'
  | 'KING';

/**
 * 赛季状态枚举
 */
export type SeasonStatus = 'UPCOMING' | 'ACTIVE' | 'ENDED' | 'SETTLED';

// ==================== 常量映射 ====================

/**
 * 排行榜类别中文名称映射
 */
export const LEADERBOARD_CATEGORY_NAMES: Record<LeaderboardCategory, string> = {
  READING: '阅读榜',
  CREATION: '创作榜',
  SOCIAL: '社交榜',
  OVERALL: '综合榜',
};

/**
 * 排行榜类别图标映射
 */
export const LEADERBOARD_CATEGORY_ICONS: Record<LeaderboardCategory, string> = {
  READING: '📚',
  CREATION: '✍️',
  SOCIAL: '💬',
  OVERALL: '🏆',
};

/**
 * 排行榜类别描述映射
 */
export const LEADERBOARD_CATEGORY_DESCRIPTIONS: Record<LeaderboardCategory, string> = {
  READING: '根据阅读章节数、阅读时长等计算',
  CREATION: '根据发布作品、更新章节、被阅读量等计算',
  SOCIAL: '根据互动次数、粉丝数、被引用数等计算',
  OVERALL: '综合阅读、创作、社交三项得分',
};

/**
 * 赛季段位中文名称映射
 */
export const SEASON_TIER_NAMES: Record<SeasonTier, string> = {
  NOVICE: '新秀',
  BRONZE: '青铜',
  SILVER: '白银',
  GOLD: '黄金',
  PLATINUM: '铂金',
  DIAMOND: '钻石',
  MASTER: '大师',
  GRANDMASTER: '宗师',
  KING: '王者',
};

/**
 * 赛季段位颜色配置
 * 使用渐变紫蓝主题色系
 */
export const SEASON_TIER_COLORS: Record<
  SeasonTier,
  { text: string; bg: string; border: string; gradient: string }
> = {
  NOVICE: {
    text: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    border: 'border-gray-300 dark:border-gray-600',
    gradient: 'from-gray-400 to-gray-500',
  },
  BRONZE: {
    text: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-300 dark:border-amber-700',
    gradient: 'from-amber-400 to-amber-600',
  },
  SILVER: {
    text: 'text-slate-500 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-800/50',
    border: 'border-slate-300 dark:border-slate-600',
    gradient: 'from-slate-300 to-slate-500',
  },
  GOLD: {
    text: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-400 dark:border-yellow-600',
    gradient: 'from-yellow-400 to-yellow-600',
  },
  PLATINUM: {
    text: 'text-cyan-600 dark:text-cyan-400',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
    border: 'border-cyan-300 dark:border-cyan-600',
    gradient: 'from-cyan-300 to-cyan-500',
  },
  DIAMOND: {
    text: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-400 dark:border-blue-500',
    gradient: 'from-blue-400 to-indigo-500',
  },
  MASTER: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-400 dark:border-purple-500',
    gradient: 'from-purple-500 to-violet-500',
  },
  GRANDMASTER: {
    text: 'text-fuchsia-600 dark:text-fuchsia-400',
    bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/20',
    border: 'border-fuchsia-400 dark:border-fuchsia-500',
    gradient: 'from-fuchsia-500 to-pink-500',
  },
  KING: {
    text: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-900/20 dark:to-amber-900/20',
    border: 'border-rose-400 dark:border-rose-500',
    gradient: 'from-rose-500 via-amber-500 to-yellow-400',
  },
};

/**
 * 赛季段位所需最低积分
 */
export const SEASON_TIER_MIN_POINTS: Record<SeasonTier, number> = {
  NOVICE: 0,
  BRONZE: 100,
  SILVER: 300,
  GOLD: 600,
  PLATINUM: 1000,
  DIAMOND: 1500,
  MASTER: 2200,
  GRANDMASTER: 3000,
  KING: 4000,
};

/**
 * 赛季状态中文名称映射
 */
export const SEASON_STATUS_NAMES: Record<SeasonStatus, string> = {
  UPCOMING: '即将开始',
  ACTIVE: '进行中',
  ENDED: '已结束',
  SETTLED: '已结算',
};

/**
 * 赛季状态颜色配置
 */
export const SEASON_STATUS_COLORS: Record<
  SeasonStatus,
  { text: string; bg: string; dot: string }
> = {
  UPCOMING: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    dot: 'bg-blue-500',
  },
  ACTIVE: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-900/30',
    dot: 'bg-green-500 animate-pulse',
  },
  ENDED: {
    text: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    dot: 'bg-gray-500',
  },
  SETTLED: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    dot: 'bg-purple-500',
  },
};

// ==================== 数据接口 ====================

/**
 * 排行榜用户简要信息
 */
export interface LeaderboardUser {
  /** 用户ID */
  id: string;
  /** 用户昵称 */
  nickname: string;
  /** 用户头像URL */
  avatarUrl?: string | null;
  /** 会员等级 */
  memberLevel: string;
}

/**
 * 排行榜条目
 * 单个用户在排行榜中的数据
 */
export interface LeaderboardEntry {
  /** 记录ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 赛季ID */
  seasonId: string;
  /** 排行榜类别 */
  category: LeaderboardCategory;
  /** 当前得分 */
  score: number;
  /** 当前排名 */
  rank: number | null;
  /** 上次排名 */
  previousRank: number | null;
  /** 排名变化（正数上升，负数下降，0不变，null无上次排名） */
  rankChange: number | null;
  /** 本赛季最高排名 */
  peakRank: number | null;
  /** 本赛季最高得分 */
  peakScore: number;
  /** 更新时间 */
  updatedAt: string;
  /** 用户信息 */
  user: LeaderboardUser;
}

/**
 * 赛季基本信息
 */
export interface SeasonInfo {
  /** 赛季ID */
  id: string;
  /** 赛季名称 */
  name: string;
  /** 赛季描述 */
  description?: string | null;
  /** 赛季编号 */
  seasonNumber: number;
  /** 赛季状态 */
  status: SeasonStatus;
  /** 开始日期 */
  startDate: string;
  /** 结束日期 */
  endDate: string;
  /** 赛季时长（天） */
  durationDays: number;
  /** 剩余天数（仅进行中赛季） */
  remainingDays?: number;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 用户赛季段位信息
 */
export interface UserSeasonRank {
  /** 记录ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 赛季ID */
  seasonId: string;
  /** 当前段位 */
  tier: SeasonTier;
  /** 赛季总积分 */
  points: number;
  /** 上赛季段位 */
  previousTier?: SeasonTier | null;
  /** 本赛季最高段位 */
  peakTier: SeasonTier;
  /** 本赛季最高积分 */
  peakPoints: number;
  /** 积分明细 */
  pointsBreakdown?: {
    readingPoints?: number;
    creationPoints?: number;
    socialPoints?: number;
  } | null;
  /** 更新时间 */
  updatedAt: string;
}

/**
 * 用户各类别排名汇总
 */
export interface UserLeaderboardSummary {
  /** 用户ID */
  userId: string;
  /** 赛季ID */
  seasonId: string;
  /** 各类别排名 */
  rankings: {
    category: LeaderboardCategory;
    score: number;
    rank: number | null;
    previousRank: number | null;
    rankChange: number | null;
  }[];
  /** 段位信息 */
  seasonRank?: UserSeasonRank | null;
}

// ==================== 分页相关 ====================

/**
 * 分页信息
 */
export interface Pagination {
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  limit: number;
  /** 总数量 */
  total: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 排行榜查询参数
 */
export interface LeaderboardQueryParams {
  /** 赛季ID（可选，默认当前赛季） */
  seasonId?: string;
  /** 排行榜类别 */
  category?: LeaderboardCategory;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 排序字段 */
  sortBy?: 'score' | 'rank';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 用户排名查询参数
 */
export interface UserRankQueryParams {
  /** 赛季ID（可选，默认当前赛季） */
  seasonId?: string;
  /** 排行榜类别（可选，默认返回所有类别） */
  category?: LeaderboardCategory;
}

/**
 * 赛季历史查询参数
 */
export interface SeasonHistoryQueryParams {
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 赛季状态筛选 */
  status?: SeasonStatus;
}

// ==================== 排行榜类别信息 ====================

/**
 * 排行榜类别信息
 */
export interface LeaderboardCategoryInfo {
  /** 类别标识 */
  category: LeaderboardCategory;
  /** 类别显示名称 */
  displayName: string;
  /** 类别描述 */
  description: string;
  /** 类别图标 */
  icon: string;
}

/**
 * 段位信息
 */
export interface SeasonTierInfo {
  /** 段位标识 */
  tier: SeasonTier;
  /** 段位显示名称 */
  displayName: string;
  /** 段位描述 */
  description: string;
  /** 段位图标URL */
  iconUrl?: string;
  /** 段位颜色 */
  color: string;
  /** 所需最低积分 */
  minPoints: number;
  /** 段位排序值 */
  sortValue: number;
}

// ==================== API 响应类型 ====================

/**
 * 获取当前赛季信息响应
 */
export interface GetCurrentSeasonResponse {
  message: string;
  season: SeasonInfo;
}

/**
 * 获取赛季列表响应
 */
export interface GetSeasonsResponse {
  message: string;
  seasons: SeasonInfo[];
  pagination: Pagination;
}

/**
 * 获取排行榜响应
 */
export interface GetLeaderboardResponse {
  message: string;
  season: SeasonInfo;
  category: LeaderboardCategory;
  entries: LeaderboardEntry[];
  pagination: Pagination;
}

/**
 * 获取用户排名响应
 */
export interface GetUserRankResponse {
  message: string;
  season: SeasonInfo;
  summary: UserLeaderboardSummary;
}

/**
 * 获取用户赛季历史响应
 * 需求25.1.11: 赛季历史记录 API
 */
export interface GetUserSeasonHistoryResponse {
  message: string;
  history: UserSeasonHistoryEntry[];
  pagination: Pagination;
}

/**
 * 用户赛季历史条目
 * 需求25.1.11: 赛季历史记录 API
 */
export interface UserSeasonHistoryEntry {
  /** 赛季信息 */
  season: SeasonInfo;
  /** 用户段位信息 */
  rank: UserSeasonRank;
  /** 各类别最终排名 */
  rankings: {
    category: LeaderboardCategory;
    finalScore: number;
    finalRank: number | null;
  }[];
  /** 获得的奖励列表 */
  rewards: UserSeasonHistoryReward[];
}

/**
 * 用户赛季历史奖励
 * 需求25.1.11: 赛季历史记录 API
 */
export interface UserSeasonHistoryReward {
  /** 奖励ID */
  id: string;
  /** 奖励类型 */
  rewardType: string;
  /** 奖励描述 */
  description?: string | null;
  /** 奖励状态 */
  status: string;
  /** 领取时间 */
  claimedAt?: string | null;
}

/**
 * 用户赛季历史查询参数
 * 需求25.1.11: 赛季历史记录 API
 */
export interface UserSeasonHistoryQueryParams {
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
  /** 开始日期筛选（ISO 8601格式） */
  startDate?: string;
  /** 结束日期筛选（ISO 8601格式） */
  endDate?: string;
  /** 最低段位筛选 */
  minTier?: SeasonTier;
  /** 排序字段 */
  sortBy?: 'seasonNumber' | 'points' | 'rank';
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 获取排行榜类别列表响应
 */
export interface GetLeaderboardCategoriesResponse {
  message: string;
  categories: LeaderboardCategoryInfo[];
}

/**
 * 获取段位列表响应
 */
export interface GetSeasonTiersResponse {
  message: string;
  tiers: SeasonTierInfo[];
}

// ==================== 工具函数类型 ====================

/**
 * 获取排名变化显示信息
 */
export function getRankChangeDisplay(rankChange: number | null): {
  text: string;
  color: string;
  icon: '↑' | '↓' | '-' | '';
} {
  if (rankChange === null) {
    return { text: '新上榜', color: 'text-blue-500', icon: '' };
  }
  if (rankChange > 0) {
    return { text: `↑${rankChange}`, color: 'text-green-500', icon: '↑' };
  }
  if (rankChange < 0) {
    return { text: `↓${Math.abs(rankChange)}`, color: 'text-red-500', icon: '↓' };
  }
  return { text: '-', color: 'text-gray-400', icon: '-' };
}

/**
 * 获取段位进度百分比
 */
export function getTierProgress(
  currentPoints: number,
  currentTier: SeasonTier
): { percent: number; nextTier: SeasonTier | null; pointsToNext: number } {
  const tiers: SeasonTier[] = [
    'NOVICE',
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'DIAMOND',
    'MASTER',
    'GRANDMASTER',
    'KING',
  ];

  const currentIndex = tiers.indexOf(currentTier);
  if (currentIndex === tiers.length - 1) {
    // 已是最高段位
    return { percent: 100, nextTier: null, pointsToNext: 0 };
  }

  const nextTier = tiers[currentIndex + 1];
  const currentMin = SEASON_TIER_MIN_POINTS[currentTier];
  const nextMin = SEASON_TIER_MIN_POINTS[nextTier];
  const range = nextMin - currentMin;
  const progress = currentPoints - currentMin;
  const percent = Math.min(100, Math.max(0, (progress / range) * 100));
  const pointsToNext = Math.max(0, nextMin - currentPoints);

  return { percent, nextTier, pointsToNext };
}

/**
 * 格式化排名显示
 */
export function formatRank(rank: number | null): string {
  if (rank === null) return '-';
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

/**
 * 格式化分数显示
 */
export function formatScore(score: number): string {
  if (score >= 10000) {
    return `${(score / 10000).toFixed(1)}万`;
  }
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  return score.toString();
}


// ==================== 赛季奖励系统类型 ====================
// 需求25.1.3: 赛季奖励数据模型

/**
 * 赛季奖励类型枚举
 */
export type SeasonRewardType = 'TOKENS' | 'BADGE' | 'TITLE' | 'AVATAR_FRAME';

/**
 * 用户赛季奖励状态枚举
 */
export type UserSeasonRewardStatus = 'PENDING' | 'CLAIMED' | 'EXPIRED';

/**
 * 赛季奖励类型中文名称映射
 */
export const SEASON_REWARD_TYPE_NAMES: Record<SeasonRewardType, string> = {
  TOKENS: '零芥子代币',
  BADGE: '徽章',
  TITLE: '称号',
  AVATAR_FRAME: '头像框',
};

/**
 * 赛季奖励类型图标映射
 */
export const SEASON_REWARD_TYPE_ICONS: Record<SeasonRewardType, string> = {
  TOKENS: '🪙',
  BADGE: '🏅',
  TITLE: '📛',
  AVATAR_FRAME: '🖼️',
};

/**
 * 赛季奖励类型描述映射
 */
export const SEASON_REWARD_TYPE_DESCRIPTIONS: Record<SeasonRewardType, string> = {
  TOKENS: '可用于打赏和社区活动的虚拟代币',
  BADGE: '展示在个人主页的专属徽章',
  TITLE: '显示在昵称旁的专属称号',
  AVATAR_FRAME: '装饰头像的专属边框',
};

/**
 * 用户赛季奖励状态中文名称映射
 */
export const USER_SEASON_REWARD_STATUS_NAMES: Record<UserSeasonRewardStatus, string> = {
  PENDING: '待领取',
  CLAIMED: '已领取',
  EXPIRED: '已过期',
};

/**
 * 用户赛季奖励状态颜色配置
 */
export const USER_SEASON_REWARD_STATUS_COLORS: Record<
  UserSeasonRewardStatus,
  { text: string; bg: string; border: string }
> = {
  PENDING: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-300 dark:border-amber-600',
  },
  CLAIMED: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-300 dark:border-green-600',
  },
  EXPIRED: {
    text: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-800/50',
    border: 'border-gray-300 dark:border-gray-600',
  },
};

// ==================== 奖励值类型 ====================

/**
 * 代币奖励值
 */
export interface TokenRewardValue {
  amount: number;
}

/**
 * 徽章奖励值
 */
export interface BadgeRewardValue {
  badgeId: string;
  badgeName?: string;
  badgeIconUrl?: string;
}

/**
 * 称号奖励值
 */
export interface TitleRewardValue {
  titleId: string;
  titleName?: string;
}

/**
 * 头像框奖励值
 */
export interface AvatarFrameRewardValue {
  frameId: string;
  frameName?: string;
  frameImageUrl?: string;
}

/**
 * 奖励值联合类型
 */
export type RewardValue =
  | TokenRewardValue
  | BadgeRewardValue
  | TitleRewardValue
  | AvatarFrameRewardValue;

// ==================== 赛季奖励数据接口 ====================

/**
 * 赛季奖励定义
 */
export interface SeasonReward {
  /** 奖励ID */
  id: string;
  /** 赛季ID */
  seasonId: string;
  /** 对应的段位 */
  tier: SeasonTier;
  /** 奖励类型 */
  rewardType: SeasonRewardType;
  /** 奖励详情 */
  rewardValue: RewardValue;
  /** 奖励描述 */
  description?: string | null;
  /** 排序顺序 */
  sortOrder: number;
  /** 创建时间 */
  createdAt: string;
}

/**
 * 用户赛季奖励记录
 */
export interface UserSeasonReward {
  /** 记录ID */
  id: string;
  /** 用户ID */
  userId: string;
  /** 赛季ID */
  seasonId: string;
  /** 奖励ID */
  rewardId: string;
  /** 奖励状态 */
  status: UserSeasonRewardStatus;
  /** 领取时间 */
  claimedAt?: string | null;
  /** 过期时间 */
  expiresAt?: string | null;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
  /** 奖励详情 */
  reward: SeasonReward;
}

/**
 * 段位奖励汇总
 * 按段位分组的奖励列表
 */
export interface TierRewardsSummary {
  /** 段位 */
  tier: SeasonTier;
  /** 段位显示名称 */
  tierDisplayName: string;
  /** 该段位的所有奖励 */
  rewards: SeasonReward[];
  /** 是否已达成该段位 */
  isAchieved: boolean;
  /** 是否可领取 */
  canClaim: boolean;
}

/**
 * 用户赛季奖励汇总
 */
export interface UserSeasonRewardsSummary {
  /** 用户ID */
  userId: string;
  /** 赛季ID */
  seasonId: string;
  /** 用户当前段位 */
  currentTier: SeasonTier;
  /** 待领取奖励数量 */
  pendingCount: number;
  /** 已领取奖励数量 */
  claimedCount: number;
  /** 已过期奖励数量 */
  expiredCount: number;
  /** 各段位奖励汇总 */
  tierRewards: TierRewardsSummary[];
}

// ==================== 奖励查询参数 ====================

/**
 * 赛季奖励查询参数
 */
export interface SeasonRewardQueryParams {
  /** 赛季ID（可选，默认当前赛季） */
  seasonId?: string;
  /** 段位筛选 */
  tier?: SeasonTier;
  /** 奖励类型筛选 */
  rewardType?: SeasonRewardType;
}

/**
 * 用户赛季奖励查询参数
 */
export interface UserSeasonRewardQueryParams {
  /** 赛季ID（可选，默认当前赛季） */
  seasonId?: string;
  /** 奖励状态筛选 */
  status?: UserSeasonRewardStatus;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  limit?: number;
}

// ==================== 奖励 API 响应类型 ====================

/**
 * 获取赛季奖励列表响应
 */
export interface GetSeasonRewardsResponse {
  message: string;
  season: SeasonInfo;
  rewards: SeasonReward[];
}

/**
 * 获取赛季奖励详情响应
 */
export interface GetSeasonRewardResponse {
  message: string;
  reward: SeasonReward;
}

/**
 * 获取用户赛季奖励列表响应
 */
export interface GetUserSeasonRewardsResponse {
  message: string;
  season: SeasonInfo;
  rewards: UserSeasonReward[];
  pagination: Pagination;
}

/**
 * 获取用户赛季奖励汇总响应
 */
export interface GetUserSeasonRewardsSummaryResponse {
  message: string;
  season: SeasonInfo;
  summary: UserSeasonRewardsSummary;
}

/**
 * 领取赛季奖励响应
 */
export interface ClaimSeasonRewardResponse {
  message: string;
  reward: UserSeasonReward;
  /** 领取的奖励详情（用于前端展示） */
  claimedReward: {
    type: SeasonRewardType;
    value: RewardValue;
    description?: string;
  };
}

/**
 * 批量领取赛季奖励响应
 */
export interface BatchClaimSeasonRewardsResponse {
  message: string;
  /** 成功领取的奖励 */
  claimedRewards: UserSeasonReward[];
  /** 领取失败的奖励ID及原因 */
  failedRewards: {
    rewardId: string;
    reason: string;
  }[];
  /** 领取汇总 */
  summary: {
    totalRequested: number;
    successCount: number;
    failedCount: number;
    /** 获得的代币总数 */
    totalTokens: number;
  };
}

/**
 * 奖励类型信息
 */
export interface SeasonRewardTypeInfo {
  /** 奖励类型标识 */
  type: SeasonRewardType;
  /** 奖励类型显示名称 */
  displayName: string;
  /** 奖励类型描述 */
  description: string;
  /** 奖励类型图标 */
  icon: string;
}

/**
 * 获取奖励类型列表响应
 */
export interface GetSeasonRewardTypesResponse {
  message: string;
  types: SeasonRewardTypeInfo[];
}

// ==================== 奖励工具函数 ====================

/**
 * 获取奖励显示文本
 */
export function getRewardDisplayText(
  rewardType: SeasonRewardType,
  rewardValue: RewardValue
): string {
  switch (rewardType) {
    case 'TOKENS':
      return `${(rewardValue as TokenRewardValue).amount} 零芥子`;
    case 'BADGE':
      return (rewardValue as BadgeRewardValue).badgeName || '专属徽章';
    case 'TITLE':
      return (rewardValue as TitleRewardValue).titleName || '专属称号';
    case 'AVATAR_FRAME':
      return (rewardValue as AvatarFrameRewardValue).frameName || '专属头像框';
    default:
      return '未知奖励';
  }
}

/**
 * 获取段位对应的奖励颜色
 * 使用渐变紫蓝主题色系
 */
export function getTierRewardGradient(tier: SeasonTier): string {
  const colors = SEASON_TIER_COLORS[tier];
  return `bg-gradient-to-r ${colors.gradient}`;
}

/**
 * 检查奖励是否可领取
 */
export function canClaimReward(
  userTier: SeasonTier,
  rewardTier: SeasonTier,
  status: UserSeasonRewardStatus
): boolean {
  if (status !== 'PENDING') return false;

  const tiers: SeasonTier[] = [
    'NOVICE',
    'BRONZE',
    'SILVER',
    'GOLD',
    'PLATINUM',
    'DIAMOND',
    'MASTER',
    'GRANDMASTER',
    'KING',
  ];

  const userTierIndex = tiers.indexOf(userTier);
  const rewardTierIndex = tiers.indexOf(rewardTier);

  return userTierIndex >= rewardTierIndex;
}

/**
 * 计算用户可领取的奖励数量
 */
export function countClaimableRewards(
  userTier: SeasonTier,
  rewards: UserSeasonReward[]
): number {
  return rewards.filter(
    (r) => canClaimReward(userTier, r.reward.tier, r.status)
  ).length;
}
