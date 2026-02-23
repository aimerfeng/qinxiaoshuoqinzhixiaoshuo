import { IsString, IsNumber, IsNotEmpty, Min, Max } from 'class-validator';

/**
 * 频率限制配置 DTO
 *
 * 需求19: 风控与反作弊系统 - 频率限制服务
 *
 * 支持的限制类型:
 * - API endpoint rate limiting (per user, per IP)
 * - Action-specific rate limiting (login attempts, registration, tipping, commenting)
 * - Sliding window rate limiting
 * - Token bucket algorithm support
 */

/**
 * 预定义的操作类型
 */
export enum RateLimitAction {
  // 认证相关
  LOGIN = 'login',
  REGISTER = 'register',
  PASSWORD_RESET = 'password_reset',
  EMAIL_VERIFY = 'email_verify',

  // 内容相关
  CREATE_WORK = 'create_work',
  CREATE_CHAPTER = 'create_chapter',
  CREATE_CARD = 'create_card',
  CREATE_COMMENT = 'create_comment',
  CREATE_DANMAKU = 'create_danmaku',

  // 社交相关
  FOLLOW = 'follow',
  LIKE = 'like',
  TIP = 'tip',
  SEND_MESSAGE = 'send_message',

  // 搜索相关
  SEARCH = 'search',

  // 通用 API
  API_REQUEST = 'api_request',
}

/**
 * 时间窗口类型
 */
export enum TimeWindow {
  SECOND = 1,
  MINUTE = 60,
  HOUR = 3600,
  DAY = 86400,
}

/**
 * 频率限制检查请求 DTO
 */
export class CheckRateLimitDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsNumber()
  @Min(1)
  limit!: number;

  @IsNumber()
  @Min(1)
  @Max(86400)
  windowSeconds!: number;
}

/**
 * 频率限制配置
 */
export interface RateLimitConfig {
  /** 操作类型 */
  action: RateLimitAction | string;
  /** 限制次数 */
  limit: number;
  /** 时间窗口（秒） */
  windowSeconds: number;
  /** 超限后的封禁时间（秒），可选 */
  blockDurationSeconds?: number;
  /** 是否按用户限制 */
  perUser?: boolean;
  /** 是否按IP限制 */
  perIp?: boolean;
  /** 自定义错误消息 */
  errorMessage?: string;
}

/**
 * 默认频率限制配置
 */
export const DEFAULT_RATE_LIMITS: Record<RateLimitAction, RateLimitConfig> = {
  // 认证相关 - 严格限制
  [RateLimitAction.LOGIN]: {
    action: RateLimitAction.LOGIN,
    limit: 5,
    windowSeconds: TimeWindow.MINUTE * 15, // 15分钟5次
    blockDurationSeconds: TimeWindow.MINUTE * 15,
    perIp: true,
    errorMessage: '登录尝试过于频繁，请15分钟后再试',
  },
  [RateLimitAction.REGISTER]: {
    action: RateLimitAction.REGISTER,
    limit: 3,
    windowSeconds: TimeWindow.HOUR, // 1小时3次
    blockDurationSeconds: TimeWindow.HOUR,
    perIp: true,
    errorMessage: '注册请求过于频繁，请稍后再试',
  },
  [RateLimitAction.PASSWORD_RESET]: {
    action: RateLimitAction.PASSWORD_RESET,
    limit: 3,
    windowSeconds: TimeWindow.HOUR,
    perIp: true,
    errorMessage: '密码重置请求过于频繁',
  },
  [RateLimitAction.EMAIL_VERIFY]: {
    action: RateLimitAction.EMAIL_VERIFY,
    limit: 5,
    windowSeconds: TimeWindow.HOUR,
    perUser: true,
    errorMessage: '验证邮件发送过于频繁',
  },

  // 内容相关 - 中等限制
  [RateLimitAction.CREATE_WORK]: {
    action: RateLimitAction.CREATE_WORK,
    limit: 10,
    windowSeconds: TimeWindow.DAY,
    perUser: true,
    errorMessage: '今日创建作品数量已达上限',
  },
  [RateLimitAction.CREATE_CHAPTER]: {
    action: RateLimitAction.CREATE_CHAPTER,
    limit: 50,
    windowSeconds: TimeWindow.DAY,
    perUser: true,
    errorMessage: '今日发布章节数量已达上限',
  },
  [RateLimitAction.CREATE_CARD]: {
    action: RateLimitAction.CREATE_CARD,
    limit: 30,
    windowSeconds: TimeWindow.HOUR,
    perUser: true,
    errorMessage: '发布动态过于频繁，请稍后再试',
  },
  [RateLimitAction.CREATE_COMMENT]: {
    action: RateLimitAction.CREATE_COMMENT,
    limit: 60,
    windowSeconds: TimeWindow.HOUR,
    perUser: true,
    errorMessage: '评论过于频繁，请稍后再试',
  },
  [RateLimitAction.CREATE_DANMAKU]: {
    action: RateLimitAction.CREATE_DANMAKU,
    limit: 30,
    windowSeconds: TimeWindow.MINUTE,
    perUser: true,
    errorMessage: '弹幕发送过于频繁',
  },

  // 社交相关 - 防刷限制
  [RateLimitAction.FOLLOW]: {
    action: RateLimitAction.FOLLOW,
    limit: 100,
    windowSeconds: TimeWindow.DAY,
    perUser: true,
    errorMessage: '今日关注数量已达上限',
  },
  [RateLimitAction.LIKE]: {
    action: RateLimitAction.LIKE,
    limit: 300,
    windowSeconds: TimeWindow.HOUR,
    perUser: true,
    errorMessage: '点赞过于频繁',
  },
  [RateLimitAction.TIP]: {
    action: RateLimitAction.TIP,
    limit: 50,
    windowSeconds: TimeWindow.HOUR,
    perUser: true,
    errorMessage: '打赏过于频繁，请稍后再试',
  },
  [RateLimitAction.SEND_MESSAGE]: {
    action: RateLimitAction.SEND_MESSAGE,
    limit: 60,
    windowSeconds: TimeWindow.MINUTE,
    perUser: true,
    errorMessage: '消息发送过于频繁',
  },

  // 搜索相关
  [RateLimitAction.SEARCH]: {
    action: RateLimitAction.SEARCH,
    limit: 30,
    windowSeconds: TimeWindow.MINUTE,
    perUser: true,
    perIp: true,
    errorMessage: '搜索请求过于频繁',
  },

  // 通用 API
  [RateLimitAction.API_REQUEST]: {
    action: RateLimitAction.API_REQUEST,
    limit: 100,
    windowSeconds: TimeWindow.MINUTE,
    perIp: true,
    errorMessage: '请求过于频繁，请稍后再试',
  },
};


/**
 * 频率限制检查结果
 */
export interface RateLimitCheckResult {
  /** 是否允许操作 */
  allowed: boolean;
  /** 当前计数 */
  currentCount: number;
  /** 限制次数 */
  limit: number;
  /** 剩余配额 */
  remaining: number;
  /** 重置时间（Unix时间戳，秒） */
  resetAt: number;
  /** 重置剩余秒数 */
  retryAfterSeconds: number;
  /** 是否被封禁 */
  blocked: boolean;
  /** 封禁解除时间（如果被封禁） */
  blockedUntil?: number;
}

/**
 * 频率限制状态响应
 */
export interface RateLimitStatusResponse {
  key: string;
  action: string;
  currentCount: number;
  limit: number;
  remaining: number;
  windowSeconds: number;
  resetAt: number;
  blocked: boolean;
  blockedUntil?: number;
}

/**
 * 批量频率限制检查结果
 */
export interface BatchRateLimitResult {
  results: Map<string, RateLimitCheckResult>;
  allAllowed: boolean;
  blockedKeys: string[];
}

/**
 * 频率限制统计
 */
export interface RateLimitStats {
  /** 总检查次数 */
  totalChecks: number;
  /** 被拒绝次数 */
  rejectedCount: number;
  /** 当前被封禁的key数量 */
  blockedKeysCount: number;
  /** 按操作类型统计 */
  byAction: Record<string, {
    checks: number;
    rejected: number;
  }>;
}

/**
 * 滑动窗口配置
 */
export interface SlidingWindowConfig {
  /** 窗口大小（秒） */
  windowSize: number;
  /** 精度（子窗口数量） */
  precision: number;
}

/**
 * 令牌桶配置
 */
export interface TokenBucketConfig {
  /** 桶容量 */
  capacity: number;
  /** 令牌填充速率（每秒） */
  refillRate: number;
  /** 每次请求消耗的令牌数 */
  tokensPerRequest: number;
}

/**
 * 令牌桶状态
 */
export interface TokenBucketState {
  /** 当前令牌数 */
  tokens: number;
  /** 上次填充时间 */
  lastRefillTime: number;
  /** 桶容量 */
  capacity: number;
  /** 填充速率 */
  refillRate: number;
}
