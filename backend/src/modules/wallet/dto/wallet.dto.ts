/**
 * 钱包模块 DTO
 *
 * 需求15: 零芥子代币系统
 * 任务15.1.2: 每日领取 API
 */

/**
 * 每日领取金额配置（按会员等级）
 *
 * 需求15 每日领取规则:
 * - Lv.0 普通会员 (REGULAR): 不能领取
 * - Lv.1 正式会员 (OFFICIAL): 10 零芥子/天
 * - Lv.2 资深会员 (SENIOR): 20 零芥子/天
 * - Lv.3 荣誉会员 (HONORARY): 50 零芥子/天
 */
export const DAILY_CLAIM_AMOUNTS: Record<string, number> = {
  REGULAR: 0, // 普通会员不能领取
  OFFICIAL: 10, // 正式会员
  SENIOR: 20, // 资深会员
  HONORARY: 50, // 荣誉会员
};

/**
 * 累计上限配置（按会员等级）
 */
export const BALANCE_LIMITS: Record<string, number> = {
  REGULAR: 0,
  OFFICIAL: 500,
  SENIOR: 1000,
  HONORARY: 2000,
};

/**
 * 会员等级中文名称
 */
export const MEMBER_LEVEL_NAMES: Record<string, string> = {
  REGULAR: '普通会员',
  OFFICIAL: '正式会员',
  SENIOR: '资深会员',
  HONORARY: '荣誉会员',
};

/**
 * 交易类型中文名称
 *
 * 任务15.1.5: 余额查询 API - 来源统计
 */
export const TRANSACTION_TYPE_NAMES: Record<string, string> = {
  DAILY_CLAIM: '每日领取',
  TIP_SENT: '打赏支出',
  TIP_RECEIVED: '打赏收入',
  REWARD: '活动奖励',
  REFUND: '退款',
};

// ==================== 每日领取相关 DTO ====================

/**
 * 每日领取结果 DTO
 *
 * 需求15验收标准2: WHEN 用户点击领取 THEN System SHALL 增加账户余额并记录领取日志
 */
export interface DailyClaimResultDto {
  /** 是否领取成功 */
  success: boolean;
  /** 领取金额 */
  amount: number;
  /** 领取后的新余额 */
  newBalance: number;
  /** 领取日期 */
  claimDate: string;
  /** 消息 */
  message: string;
}

/**
 * 每日领取状态 DTO
 *
 * 需求15验收标准1: WHEN 正式会员每日首次登录 THEN System SHALL 显示领取零芥子入口
 */
export interface DailyClaimStatusDto {
  /** 今日是否可以领取 */
  canClaim: boolean;
  /** 今日是否已领取 */
  hasClaimed: boolean;
  /** 可领取金额 */
  claimAmount: number;
  /** 不能领取的原因（如果不能领取） */
  reason?: string;
  /** 用户会员等级 */
  memberLevel: string;
  /** 会员等级名称 */
  memberLevelName: string;
  /** 当前余额 */
  currentBalance: number;
  /** 余额上限 */
  balanceLimit: number;
  /** 是否达到余额上限 */
  isBalanceLimitReached: boolean;
}

/**
 * 每日领取响应 DTO
 */
export interface ClaimDailyResponseDto {
  message: string;
  data: DailyClaimResultDto;
}

/**
 * 获取领取状态响应 DTO
 */
export interface GetClaimStatusResponseDto {
  message: string;
  data: DailyClaimStatusDto;
}

// ==================== 钱包信息相关 DTO ====================

/**
 * 钱包信息 DTO
 *
 * 需求15验收标准5: WHEN 用户查看零芥子钱包 THEN System SHALL 显示余额、收支明细、来源统计
 */
export interface WalletInfoDto {
  /** 钱包ID */
  id: string;
  /** 当前余额 */
  balance: number;
  /** 累计收到 */
  totalReceived: number;
  /** 累计发出 */
  totalSent: number;
  /** 余额上限 */
  balanceLimit: number;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 获取钱包信息响应 DTO
 */
export interface GetWalletInfoResponseDto {
  message: string;
  data: {
    wallet: WalletInfoDto;
    memberLevel: string;
    memberLevelName: string;
  };
}

// ==================== 余额查询相关 DTO ====================

/**
 * 来源统计项 DTO
 *
 * 任务15.1.5: 余额查询 API - 来源统计
 */
export interface SourceStatItemDto {
  /** 交易类型 */
  type: TransactionType;
  /** 类型名称 */
  typeName: string;
  /** 总金额 */
  totalAmount: number;
  /** 交易次数 */
  count: number;
}

/**
 * 简单余额信息 DTO
 *
 * 任务15.1.5: 余额查询 API - 简单余额查询
 */
export interface SimpleBalanceDto {
  /** 当前余额 */
  balance: number;
  /** 累计收到 */
  totalReceived: number;
  /** 累计发出 */
  totalSent: number;
  /** 余额上限 */
  balanceLimit: number;
}

/**
 * 详细余额信息 DTO（含来源统计）
 *
 * 任务15.1.5: 余额查询 API - 详细余额查询
 */
export interface DetailedBalanceDto extends SimpleBalanceDto {
  /** 来源统计 */
  sourceStats: SourceStatItemDto[];
}

/**
 * 获取简单余额响应 DTO
 */
export interface GetSimpleBalanceResponseDto {
  message: string;
  data: SimpleBalanceDto;
}

/**
 * 获取详细余额响应 DTO
 */
export interface GetDetailedBalanceResponseDto {
  message: string;
  data: DetailedBalanceDto;
}

// ==================== 打赏相关 DTO ====================

/**
 * 打赏限制配置
 *
 * 需求15 打赏限制规则:
 * - 单次打赏最小: 1 零芥子
 * - 单次打赏上限: 100 零芥子
 * - 每日打赏总额上限: 500 零芥子
 * - 不能给自己打赏
 * - 余额必须充足
 */
export const TIP_LIMITS = {
  /** 单次打赏最小金额 */
  MIN_TIP_AMOUNT: 1,
  /** 单次打赏最大金额 */
  MAX_TIP_AMOUNT: 100,
  /** 每日打赏总额上限 */
  DAILY_TIP_LIMIT: 500,
};

/**
 * 打赏请求 DTO
 *
 * 需求15验收标准3: WHEN 用户打赏作品/章节 THEN System SHALL 扣除零芥子并通知创作者
 */
export interface TipRequestDto {
  /** 被打赏用户ID */
  toUserId: string;
  /** 打赏金额 */
  amount: number;
  /** 关联作品ID（可选） */
  workId?: string;
  /** 关联章节ID（可选） */
  chapterId?: string;
  /** 打赏留言（可选） */
  message?: string;
}

/**
 * 打赏结果 DTO
 */
export interface TipResultDto {
  /** 是否成功 */
  success: boolean;
  /** 打赏金额 */
  amount: number;
  /** 打赏后的新余额 */
  newBalance: number;
  /** 打赏记录ID */
  tipRecordId?: string;
  /** 消息 */
  message: string;
}

/**
 * 打赏响应 DTO
 */
export interface TipResponseDto {
  message: string;
  data: TipResultDto;
}

/**
 * 打赏状态 DTO
 *
 * 用于检查用户是否可以进行打赏
 */
export interface TipStatusDto {
  /** 是否可以打赏 */
  canTip: boolean;
  /** 当前余额 */
  currentBalance: number;
  /** 今日已打赏金额 */
  todayTipped: number;
  /** 今日剩余可打赏金额 */
  remainingDailyLimit: number;
  /** 不能打赏的原因（如果不能打赏） */
  reason?: string;
}

// ==================== 交易记录相关 DTO ====================

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
 * 交易记录项 DTO
 *
 * 需求15验收标准5: WHEN 用户查看零芥子钱包 THEN System SHALL 显示余额、收支明细、来源统计
 */
export interface TransactionItemDto {
  /** 交易ID */
  id: string;
  /** 交易类型 */
  type: TransactionType;
  /** 交易金额（正数表示收入，负数表示支出） */
  amount: number;
  /** 交易描述 */
  description: string | null;
  /** 关联ID */
  referenceId: string | null;
  /** 关联类型 */
  referenceType: string | null;
  /** 创建时间 */
  createdAt: Date;
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
 * 交易记录查询参数 DTO
 *
 * 任务15.1.4: 交易记录 API
 */
export interface TransactionQueryDto {
  /** 页码（默认: 1） */
  page?: number;
  /** 每页数量（默认: 20，最大: 100） */
  pageSize?: number;
  /** 交易类型过滤 */
  type?: TransactionType;
  /** 开始日期过滤 */
  startDate?: string;
  /** 结束日期过滤 */
  endDate?: string;
}

/**
 * 交易记录列表 DTO
 */
export interface TransactionListDto {
  /** 交易记录列表 */
  transactions: TransactionItemDto[];
  /** 分页信息 */
  pagination: PaginationDto;
}

/**
 * 获取交易记录响应 DTO
 */
export interface GetTransactionsResponseDto {
  message: string;
  data: TransactionListDto;
}
