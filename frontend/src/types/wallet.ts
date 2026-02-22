/**
 * 钱包系统类型定义
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.1: 钱包页面
 */

/**
 * 交易类型枚举
 */
export type TransactionType =
  | 'DAILY_CLAIM'
  | 'TIP_SENT'
  | 'TIP_RECEIVED'
  | 'REWARD'
  | 'REFUND';

/**
 * 交易类型中文名称映射
 */
export const TRANSACTION_TYPE_NAMES: Record<TransactionType, string> = {
  DAILY_CLAIM: '每日领取',
  TIP_SENT: '打赏支出',
  TIP_RECEIVED: '打赏收入',
  REWARD: '活动奖励',
  REFUND: '退款',
};

/**
 * 交易类型图标映射
 */
export const TRANSACTION_TYPE_ICONS: Record<TransactionType, string> = {
  DAILY_CLAIM: '🎁',
  TIP_SENT: '💸',
  TIP_RECEIVED: '💰',
  REWARD: '🏆',
  REFUND: '↩️',
};

/**
 * 交易类型颜色配置
 */
export const TRANSACTION_TYPE_COLORS: Record<
  TransactionType,
  { text: string; bg: string }
> = {
  DAILY_CLAIM: {
    text: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
  },
  TIP_SENT: {
    text: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
  TIP_RECEIVED: {
    text: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  REWARD: {
    text: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  REFUND: {
    text: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
};

// ==================== 钱包信息相关 ====================

/**
 * 钱包信息
 */
export interface WalletInfo {
  id: string;
  balance: number;
  totalReceived: number;
  totalSent: number;
  balanceLimit: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取钱包信息响应
 */
export interface GetWalletInfoResponse {
  message: string;
  data: {
    wallet: WalletInfo;
    memberLevel: string;
    memberLevelName: string;
  };
}

// ==================== 余额查询相关 ====================

/**
 * 来源统计项
 */
export interface SourceStatItem {
  type: TransactionType;
  typeName: string;
  totalAmount: number;
  count: number;
}

/**
 * 简单余额信息
 */
export interface SimpleBalance {
  balance: number;
  totalReceived: number;
  totalSent: number;
  balanceLimit: number;
}

/**
 * 详细余额信息（含来源统计）
 */
export interface DetailedBalance extends SimpleBalance {
  sourceStats: SourceStatItem[];
}

/**
 * 获取简单余额响应
 */
export interface GetSimpleBalanceResponse {
  message: string;
  data: SimpleBalance;
}

/**
 * 获取详细余额响应
 */
export interface GetDetailedBalanceResponse {
  message: string;
  data: DetailedBalance;
}

// ==================== 每日领取相关 ====================

/**
 * 每日领取状态
 */
export interface DailyClaimStatus {
  canClaim: boolean;
  hasClaimed: boolean;
  claimAmount: number;
  reason?: string;
  memberLevel: string;
  memberLevelName: string;
  currentBalance: number;
  balanceLimit: number;
  isBalanceLimitReached: boolean;
}

/**
 * 每日领取结果
 */
export interface DailyClaimResult {
  success: boolean;
  amount: number;
  newBalance: number;
  claimDate: string;
  message: string;
}

/**
 * 获取领取状态响应
 */
export interface GetClaimStatusResponse {
  message: string;
  data: DailyClaimStatus;
}

/**
 * 领取响应
 */
export interface ClaimDailyResponse {
  message: string;
  data: DailyClaimResult;
}

// ==================== 交易记录相关 ====================

/**
 * 交易记录项
 */
export interface TransactionItem {
  id: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  referenceId: string | null;
  referenceType: string | null;
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
 * 交易记录查询参数
 */
export interface TransactionQueryParams {
  page?: number;
  pageSize?: number;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

/**
 * 获取交易记录响应
 */
export interface GetTransactionsResponse {
  message: string;
  data: {
    transactions: TransactionItem[];
    pagination: Pagination;
  };
}

// ==================== 打赏相关 ====================

/**
 * 打赏请求
 */
export interface TipRequest {
  toUserId: string;
  amount: number;
  workId?: string;
  chapterId?: string;
  message?: string;
}

/**
 * 打赏结果
 */
export interface TipResult {
  success: boolean;
  amount: number;
  newBalance: number;
  tipRecordId?: string;
  message: string;
}

/**
 * 打赏响应
 */
export interface TipResponse {
  message: string;
  data: TipResult;
}
