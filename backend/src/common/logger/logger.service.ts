import {
  Injectable,
  LoggerService as NestLoggerService,
  Scope,
} from '@nestjs/common';

/**
 * 日志级别
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

/**
 * 结构化日志条目
 */
export interface LogEntry {
  /** 时间戳 */
  timestamp: string;
  /** 日志级别 */
  level: LogLevel;
  /** 日志消息 */
  message: string;
  /** 上下文（模块/服务名） */
  context?: string;
  /** 请求 ID（用于追踪） */
  requestId?: string;
  /** 用户 ID */
  userId?: string;
  /** 额外数据 */
  data?: Record<string, unknown>;
  /** 错误堆栈 */
  stack?: string;
  /** 持续时间（毫秒） */
  duration?: number;
}

/**
 * 日志配置
 */
interface LoggerConfig {
  /** 最小日志级别 */
  level: LogLevel;
  /** 是否启用 JSON 格式 */
  json: boolean;
  /** 是否包含时间戳 */
  timestamp: boolean;
  /** 是否包含颜色（仅非 JSON 模式） */
  colorize: boolean;
}

/**
 * 结构化日志服务
 *
 * 根据需求10验收标准6：记录详细日志并支持问题追溯
 *
 * 功能：
 * 1. 结构化 JSON 日志输出
 * 2. 支持请求追踪（requestId）
 * 3. 支持用户上下文
 * 4. 支持性能计时
 * 5. 兼容 NestJS LoggerService 接口
 */
@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;
  private requestId?: string;
  private userId?: string;

  private static config: LoggerConfig = {
    level: (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO,
    json:
      process.env.LOG_FORMAT === 'json' ||
      process.env.NODE_ENV === 'production',
    timestamp: true,
    colorize: process.env.NODE_ENV !== 'production',
  };

  // 日志级别优先级
  private static readonly levelPriority: Record<LogLevel, number> = {
    [LogLevel.ERROR]: 0,
    [LogLevel.WARN]: 1,
    [LogLevel.INFO]: 2,
    [LogLevel.DEBUG]: 3,
    [LogLevel.VERBOSE]: 4,
  };

  // 控制台颜色代码
  private static readonly colors: Record<LogLevel, string> = {
    [LogLevel.ERROR]: '\x1b[31m', // 红色
    [LogLevel.WARN]: '\x1b[33m', // 黄色
    [LogLevel.INFO]: '\x1b[32m', // 绿色
    [LogLevel.DEBUG]: '\x1b[36m', // 青色
    [LogLevel.VERBOSE]: '\x1b[35m', // 紫色
  };

  private static readonly reset = '\x1b[0m';

  /**
   * 设置日志上下文
   */
  setContext(context: string): this {
    this.context = context;
    return this;
  }

  /**
   * 设置请求 ID（用于追踪）
   */
  setRequestId(requestId: string): this {
    this.requestId = requestId;
    return this;
  }

  /**
   * 设置用户 ID
   */
  setUserId(userId: string): this {
    this.userId = userId;
    return this;
  }

  /**
   * 创建子日志器（继承上下文）
   */
  child(context: string): LoggerService {
    const child = new LoggerService();
    child.context = context;
    child.requestId = this.requestId;
    child.userId = this.userId;
    return child;
  }

  // ==================== NestJS LoggerService 接口实现 ====================

  log(message: string, context?: string): void;
  log(message: string, ...optionalParams: unknown[]): void;
  log(message: string, ...args: unknown[]): void {
    this.writeLog(
      LogLevel.INFO,
      message,
      this.extractContext(args),
      this.extractData(args),
    );
  }

  error(message: string, stack?: string, context?: string): void;
  error(message: string, ...optionalParams: unknown[]): void;
  error(message: string, ...args: unknown[]): void {
    const stack = typeof args[0] === 'string' ? args[0] : undefined;
    const context = this.extractContext(args);
    const data = this.extractData(args);
    this.writeLog(LogLevel.ERROR, message, context, data, stack);
  }

  warn(message: string, context?: string): void;
  warn(message: string, ...optionalParams: unknown[]): void;
  warn(message: string, ...args: unknown[]): void {
    this.writeLog(
      LogLevel.WARN,
      message,
      this.extractContext(args),
      this.extractData(args),
    );
  }

  debug(message: string, context?: string): void;
  debug(message: string, ...optionalParams: unknown[]): void;
  debug(message: string, ...args: unknown[]): void {
    this.writeLog(
      LogLevel.DEBUG,
      message,
      this.extractContext(args),
      this.extractData(args),
    );
  }

  verbose(message: string, context?: string): void;
  verbose(message: string, ...optionalParams: unknown[]): void;
  verbose(message: string, ...args: unknown[]): void {
    this.writeLog(
      LogLevel.VERBOSE,
      message,
      this.extractContext(args),
      this.extractData(args),
    );
  }

  // ==================== 扩展日志方法 ====================

  /**
   * 记录带数据的信息日志
   */
  info(message: string, data?: Record<string, unknown>): void {
    this.writeLog(LogLevel.INFO, message, this.context, data);
  }

  /**
   * 记录带持续时间的日志（用于性能追踪）
   */
  logWithDuration(
    message: string,
    duration: number,
    data?: Record<string, unknown>,
  ): void {
    this.writeLog(LogLevel.INFO, message, this.context, { ...data, duration });
  }

  /**
   * 记录 HTTP 请求日志
   */
  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
    data?: Record<string, unknown>,
  ): void {
    const message = `${method} ${url} ${statusCode}`;
    this.writeLog(LogLevel.INFO, message, 'HTTP', {
      ...data,
      method,
      url,
      statusCode,
      duration,
    });
  }

  /**
   * 记录数据库查询日志
   */
  logQuery(query: string, duration: number, params?: unknown[]): void {
    this.writeLog(LogLevel.DEBUG, 'Database query', 'Prisma', {
      query: query.substring(0, 500), // 截断长查询
      duration,
      params: params?.slice(0, 10), // 限制参数数量
    });
  }

  /**
   * 开始计时
   */
  startTimer(): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const end = process.hrtime.bigint();
      return Number(end - start) / 1_000_000; // 转换为毫秒
    };
  }

  // ==================== 内部方法 ====================

  /**
   * 写入日志
   */
  private writeLog(
    level: LogLevel,
    message: string,
    context?: string,
    data?: Record<string, unknown>,
    stack?: string,
  ): void {
    // 检查日志级别
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context || this.context,
      requestId: this.requestId,
      userId: this.userId,
      data,
      stack,
    };

    // 移除 undefined 字段
    Object.keys(entry).forEach((key) => {
      if (entry[key as keyof LogEntry] === undefined) {
        delete entry[key as keyof LogEntry];
      }
    });

    if (LoggerService.config.json) {
      this.writeJson(entry);
    } else {
      this.writePretty(entry);
    }
  }

  /**
   * JSON 格式输出
   */
  private writeJson(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    if (entry.level === LogLevel.ERROR) {
      console.error(output);
    } else if (entry.level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  /**
   * 美化格式输出
   */
  private writePretty(entry: LogEntry): void {
    const {
      timestamp,
      level,
      message,
      context,
      requestId,
      data,
      stack,
      duration,
    } = entry;

    const color = LoggerService.config.colorize
      ? LoggerService.colors[level]
      : '';
    const reset = LoggerService.config.colorize ? LoggerService.reset : '';

    let output = '';

    // 时间戳
    if (LoggerService.config.timestamp) {
      output += `${timestamp} `;
    }

    // 级别
    output += `${color}[${level.toUpperCase().padEnd(5)}]${reset} `;

    // 上下文
    if (context) {
      output += `\x1b[33m[${context}]${reset} `;
    }

    // 请求 ID
    if (requestId) {
      output += `\x1b[90m(${requestId.substring(0, 8)})${reset} `;
    }

    // 消息
    output += message;

    // 持续时间
    if (duration !== undefined) {
      output += ` \x1b[90m+${duration.toFixed(2)}ms${reset}`;
    }

    // 数据
    if (data && Object.keys(data).length > 0) {
      output += ` ${JSON.stringify(data)}`;
    }

    // 输出
    if (level === LogLevel.ERROR) {
      console.error(output);
      if (stack) {
        console.error(stack);
      }
    } else if (level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  /**
   * 检查是否应该记录此级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    const configPriority =
      LoggerService.levelPriority[LoggerService.config.level];
    const logPriority = LoggerService.levelPriority[level];
    return logPriority <= configPriority;
  }

  /**
   * 从参数中提取上下文
   */
  private extractContext(args: unknown[]): string | undefined {
    const lastArg = args[args.length - 1];
    if (typeof lastArg === 'string' && !lastArg.includes('{')) {
      return lastArg;
    }
    return this.context;
  }

  /**
   * 从参数中提取数据
   */
  private extractData(args: unknown[]): Record<string, unknown> | undefined {
    for (const arg of args) {
      if (typeof arg === 'object' && arg !== null && !Array.isArray(arg)) {
        return arg as Record<string, unknown>;
      }
    }
    return undefined;
  }

  // ==================== 静态配置方法 ====================

  /**
   * 更新日志配置
   */
  static configure(config: Partial<LoggerConfig>): void {
    LoggerService.config = { ...LoggerService.config, ...config };
  }

  /**
   * 设置日志级别
   */
  static setLevel(level: LogLevel): void {
    LoggerService.config.level = level;
  }

  /**
   * 启用 JSON 格式
   */
  static enableJson(): void {
    LoggerService.config.json = true;
  }

  /**
   * 禁用 JSON 格式
   */
  static disableJson(): void {
    LoggerService.config.json = false;
  }
}
