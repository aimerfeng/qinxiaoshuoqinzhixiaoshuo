import { SetMetadata } from '@nestjs/common';
import { RateLimitAction, TimeWindow } from '../dto/rate-limit.dto.js';

/**
 * 频率限制装饰器元数据 key
 */
export const RATE_LIMIT_KEY = 'rate_limit';

/**
 * 频率限制配置选项
 */
export interface RateLimitOptions {
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
 * 频率限制装饰器
 *
 * 需求19: 风控与反作弊系统 - 频率限制服务
 *
 * 用于装饰控制器方法或整个控制器，配置频率限制参数。
 * 需要配合 RateLimitGuard 使用。
 *
 * @example
 * // 基本用法 - 使用预定义配置
 * @RateLimit({ action: RateLimitAction.LOGIN })
 * @Post('login')
 * async login() { ... }
 *
 * @example
 * // 自定义配置
 * @RateLimit({
 *   action: 'custom_action',
 *   limit: 10,
 *   windowSeconds: 60,
 *   perUser: true,
 *   errorMessage: '操作过于频繁'
 * })
 * @Post('action')
 * async action() { ... }
 *
 * @example
 * // 使用预设时间窗口
 * @RateLimit({
 *   action: RateLimitAction.CREATE_COMMENT,
 *   limit: 30,
 *   windowSeconds: TimeWindow.MINUTE,
 *   perUser: true
 * })
 * @Post('comment')
 * async comment() { ... }
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * 登录频率限制装饰器
 *
 * 预配置的登录限制：15分钟内最多5次尝试
 */
export const LoginRateLimit = () =>
  RateLimit({
    action: RateLimitAction.LOGIN,
    limit: 5,
    windowSeconds: TimeWindow.MINUTE * 15,
    blockDurationSeconds: TimeWindow.MINUTE * 15,
    perIp: true,
    errorMessage: '登录尝试过于频繁，请15分钟后再试',
  });

/**
 * 注册频率限制装饰器
 *
 * 预配置的注册限制：1小时内最多3次
 */
export const RegisterRateLimit = () =>
  RateLimit({
    action: RateLimitAction.REGISTER,
    limit: 3,
    windowSeconds: TimeWindow.HOUR,
    blockDurationSeconds: TimeWindow.HOUR,
    perIp: true,
    errorMessage: '注册请求过于频繁，请稍后再试',
  });

/**
 * API 请求频率限制装饰器
 *
 * 预配置的通用 API 限制：每分钟100次
 */
export const ApiRateLimit = (limit = 100, windowSeconds = TimeWindow.MINUTE) =>
  RateLimit({
    action: RateLimitAction.API_REQUEST,
    limit,
    windowSeconds,
    perIp: true,
    errorMessage: '请求过于频繁，请稍后再试',
  });

/**
 * 评论频率限制装饰器
 *
 * 预配置的评论限制：每小时60条
 */
export const CommentRateLimit = () =>
  RateLimit({
    action: RateLimitAction.CREATE_COMMENT,
    limit: 60,
    windowSeconds: TimeWindow.HOUR,
    perUser: true,
    errorMessage: '评论过于频繁，请稍后再试',
  });

/**
 * 打赏频率限制装饰器
 *
 * 预配置的打赏限制：每小时50次
 */
export const TipRateLimit = () =>
  RateLimit({
    action: RateLimitAction.TIP,
    limit: 50,
    windowSeconds: TimeWindow.HOUR,
    perUser: true,
    errorMessage: '打赏过于频繁，请稍后再试',
  });

/**
 * 搜索频率限制装饰器
 *
 * 预配置的搜索限制：每分钟30次
 */
export const SearchRateLimit = () =>
  RateLimit({
    action: RateLimitAction.SEARCH,
    limit: 30,
    windowSeconds: TimeWindow.MINUTE,
    perUser: true,
    perIp: true,
    errorMessage: '搜索请求过于频繁',
  });

/**
 * 弹幕频率限制装饰器
 *
 * 预配置的弹幕限制：每分钟30条
 */
export const DanmakuRateLimit = () =>
  RateLimit({
    action: RateLimitAction.CREATE_DANMAKU,
    limit: 30,
    windowSeconds: TimeWindow.MINUTE,
    perUser: true,
    errorMessage: '弹幕发送过于频繁',
  });

/**
 * 消息发送频率限制装饰器
 *
 * 预配置的消息限制：每分钟60条
 */
export const MessageRateLimit = () =>
  RateLimit({
    action: RateLimitAction.SEND_MESSAGE,
    limit: 60,
    windowSeconds: TimeWindow.MINUTE,
    perUser: true,
    errorMessage: '消息发送过于频繁',
  });

/**
 * 关注频率限制装饰器
 *
 * 预配置的关注限制：每天100次
 */
export const FollowRateLimit = () =>
  RateLimit({
    action: RateLimitAction.FOLLOW,
    limit: 100,
    windowSeconds: TimeWindow.DAY,
    perUser: true,
    errorMessage: '今日关注数量已达上限',
  });

/**
 * 点赞频率限制装饰器
 *
 * 预配置的点赞限制：每小时300次
 */
export const LikeRateLimit = () =>
  RateLimit({
    action: RateLimitAction.LIKE,
    limit: 300,
    windowSeconds: TimeWindow.HOUR,
    perUser: true,
    errorMessage: '点赞过于频繁',
  });

/**
 * 严格频率限制装饰器
 *
 * 用于敏感操作，限制更严格
 */
export const StrictRateLimit = (
  action: string,
  limit = 3,
  windowSeconds = TimeWindow.HOUR,
) =>
  RateLimit({
    action,
    limit,
    windowSeconds,
    blockDurationSeconds: windowSeconds,
    perUser: true,
    perIp: true,
    errorMessage: '操作过于频繁，请稍后再试',
  });
