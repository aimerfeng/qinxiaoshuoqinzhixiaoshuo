/**
 * 会员系统类型定义
 *
 * 需求14: 会员等级体系
 * 任务14.2.1: 会员等级展示组件
 */

/**
 * 会员等级枚举
 */
export enum MemberLevel {
  LEVEL_0 = 'REGULAR',    // Lv.0 普通用户
  LEVEL_1 = 'OFFICIAL',   // Lv.1 初级会员
  LEVEL_2 = 'SENIOR',     // Lv.2 中级会员
  LEVEL_3 = 'HONORARY',   // Lv.3 高级会员
}

/**
 * 会员等级配置
 */
export interface MemberLevelConfig {
  level: MemberLevel;
  value: number;           // 等级数值 (0-3)
  name: string;            // 中文名称
  requiredScore: number;   // 所需贡献度
  color: string;           // 主题色
  bgColor: string;         // 背景色
  borderColor: string;     // 边框色
  icon: string;            // 图标 emoji
}

/**
 * 会员等级配置映射
 */
export const MEMBER_LEVEL_CONFIGS: Record<MemberLevel, MemberLevelConfig> = {
  [MemberLevel.LEVEL_0]: {
    level: MemberLevel.LEVEL_0,
    value: 0,
    name: '普通用户',
    requiredScore: 0,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-200',
    icon: '👤',
  },
  [MemberLevel.LEVEL_1]: {
    level: MemberLevel.LEVEL_1,
    value: 1,
    name: '初级会员',
    requiredScore: 500,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    icon: '🌱',
  },
  [MemberLevel.LEVEL_2]: {
    level: MemberLevel.LEVEL_2,
    value: 2,
    name: '中级会员',
    requiredScore: 2000,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: '⭐',
  },
  [MemberLevel.LEVEL_3]: {
    level: MemberLevel.LEVEL_3,
    value: 3,
    name: '高级会员',
    requiredScore: 10000,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: '👑',
  },
};

/**
 * 获取等级配置
 */
export function getMemberLevelConfig(level: MemberLevel | string): MemberLevelConfig {
  const levelKey = level as MemberLevel;
  return MEMBER_LEVEL_CONFIGS[levelKey] || MEMBER_LEVEL_CONFIGS[MemberLevel.LEVEL_0];
}

/**
 * 根据贡献度获取等级
 */
export function getLevelByScore(score: number): MemberLevel {
  if (score >= 10000) return MemberLevel.LEVEL_3;
  if (score >= 2000) return MemberLevel.LEVEL_2;
  if (score >= 500) return MemberLevel.LEVEL_1;
  return MemberLevel.LEVEL_0;
}

/**
 * 贡献度分类汇总
 */
export interface ContributionBreakdown {
  reading: number;
  interaction: number;
  creation: number;
  community: number;
}

/**
 * 等级信息
 */
export interface LevelInfo {
  current: number;
  name: string;
  nextLevelScore: number | null;
  progress: number;
}

/**
 * 用户贡献度信息
 */
export interface UserContribution {
  totalScore: number;
  breakdown: ContributionBreakdown;
  level: LevelInfo;
}

/**
 * 获取贡献度响应
 */
export interface GetContributionResponse {
  message: string;
  data: UserContribution;
}

/**
 * 每日贡献度项
 */
export interface DailyContributionItem {
  type: string;
  typeName: string;
  currentPoints: number;
  dailyLimit: number | null;
  remaining: number | null;
  isLimitReached: boolean;
}

/**
 * 每日贡献度响应
 */
export interface GetDailyContributionResponse {
  message: string;
  data: {
    date: string;
    contributions: DailyContributionItem[];
    totalEarnedToday: number;
  };
}

/**
 * 贡献度记录
 */
export interface ContributionRecord {
  id: string;
  type: string;
  points: number;
  referenceId: string | null;
  referenceType: string | null;
  description: string | null;
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
 * 贡献度历史响应
 */
export interface GetContributionHistoryResponse {
  message: string;
  data: {
    records: ContributionRecord[];
    pagination: Pagination;
  };
}

/**
 * 贡献度配置项
 */
export interface ContributionConfigItem {
  type: string;
  typeName: string;
  points: number;
  dailyLimit: number | null;
  description: string;
  category: 'reading' | 'interaction' | 'creation' | 'community';
}

/**
 * 贡献度配置响应
 */
export interface GetContributionConfigResponse {
  message: string;
  data: {
    configs: ContributionConfigItem[];
  };
}


// ==================== 会员申请相关类型 ====================

/**
 * 会员申请状态枚举
 */
export enum MemberApplicationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

/**
 * 申请状态中文名称映射
 */
export const APPLICATION_STATUS_NAMES: Record<MemberApplicationStatus, string> = {
  [MemberApplicationStatus.PENDING]: '待审核',
  [MemberApplicationStatus.APPROVED]: '已通过',
  [MemberApplicationStatus.REJECTED]: '已拒绝',
};

/**
 * 申请状态颜色配置
 */
export const APPLICATION_STATUS_COLORS: Record<MemberApplicationStatus, { text: string; bg: string; border: string }> = {
  [MemberApplicationStatus.PENDING]: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  [MemberApplicationStatus.APPROVED]: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
  },
  [MemberApplicationStatus.REJECTED]: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
};

/**
 * 可申请等级信息
 */
export interface EligibleLevel {
  level: MemberLevel;
  levelName: string;
  requiredScore: number;
  isEligible: boolean;
  hasPendingApplication: boolean;
  canApply: boolean;
  reason: string;
}

/**
 * 资格检查结果
 */
export interface EligibilityResult {
  currentLevel: MemberLevel;
  currentLevelName: string;
  currentScore: number;
  eligibleLevels: EligibleLevel[];
}

/**
 * 检查资格响应
 */
export interface CheckEligibilityResponse {
  message: string;
  data: EligibilityResult;
}

/**
 * 会员申请记录
 */
export interface ApplicationRecord {
  id: string;
  targetLevel: MemberLevel;
  targetLevelName: string;
  currentScore: number;
  status: MemberApplicationStatus;
  statusName: string;
  reason: string | null;
  rejectReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 提交申请请求
 */
export interface CreateApplicationRequest {
  targetLevel: MemberLevel;
  reason?: string;
}

/**
 * 提交申请响应
 */
export interface CreateApplicationResponse {
  message: string;
  data: {
    application: ApplicationRecord;
  };
}

/**
 * 获取申请列表响应
 */
export interface GetApplicationsResponse {
  message: string;
  data: {
    applications: ApplicationRecord[];
    pagination: Pagination;
  };
}

/**
 * 获取申请详情响应
 */
export interface GetApplicationDetailResponse {
  message: string;
  data: {
    application: ApplicationRecord;
  };
}
