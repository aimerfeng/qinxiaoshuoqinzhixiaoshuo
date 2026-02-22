import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CacheService } from '../../redis/cache.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';

/**
 * 请求指标
 */
export interface RequestMetrics {
  /** 总请求数 */
  totalRequests: number;
  /** 成功请求数 */
  successRequests: number;
  /** 错误请求数 */
  errorRequests: number;
  /** 平均响应时间（毫秒） */
  avgResponseTime: number;
  /** P95 响应时间（毫秒） */
  p95ResponseTime: number;
  /** P99 响应时间（毫秒） */
  p99ResponseTime: number;
  /** 每秒请求数 */
  requestsPerSecond: number;
}

/**
 * 系统指标
 */
export interface SystemMetrics {
  /** 内存使用（MB） */
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  /** CPU 使用率 */
  cpuUsage: {
    user: number;
    system: number;
  };
  /** 运行时间（秒） */
  uptime: number;
  /** Node.js 版本 */
  nodeVersion: string;
}

/**
 * 数据库指标
 */
export interface DatabaseMetrics {
  /** 连接池状态 */
  pool: {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } | null;
  /** 是否健康 */
  isHealthy: boolean;
}

/**
 * Redis 指标
 */
export interface RedisMetrics {
  /** 是否健康 */
  isHealthy: boolean;
  /** 连接信息 */
  info?: {
    connectedClients: number;
    usedMemory: string;
    totalKeys: number;
  };
}

/**
 * 综合健康状态
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    redis: boolean;
    api: boolean;
  };
  metrics: {
    request: RequestMetrics;
    system: SystemMetrics;
    database: DatabaseMetrics;
    redis: RedisMetrics;
  };
}

/**
 * 性能监控服务
 *
 * 根据需求10验收标准4：通过缓存和连接池优化响应时间
 *
 * 功能：
 * 1. 收集请求性能指标
 * 2. 监控系统资源使用
 * 3. 监控数据库连接池状态
 * 4. 监控 Redis 连接状态
 * 5. 提供健康检查端点数据
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly logger = new Logger(MetricsService.name);

  // 缓存键
  private readonly METRICS_KEY = 'metrics';

  // 响应时间样本（用于计算百分位数）
  private responseTimes: number[] = [];
  private readonly maxSamples = 1000;

  // 请求计数
  private totalRequests = 0;
  private successRequests = 0;
  private errorRequests = 0;
  private lastResetTime = Date.now();

  // CPU 使用率追踪
  private lastCpuUsage = process.cpuUsage();
  private lastCpuTime = Date.now();

  constructor(
    private readonly cacheService: CacheService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    // 定期保存指标到 Redis（每分钟）
    setInterval(() => {
      void this.persistMetrics();
    }, 60000);
    this.logger.log('Metrics service initialized');
  }

  // ==================== 请求指标收集 ====================

  /**
   * 记录请求
   */
  recordRequest(responseTime: number, isSuccess: boolean): void {
    this.totalRequests++;
    if (isSuccess) {
      this.successRequests++;
    } else {
      this.errorRequests++;
    }

    // 记录响应时间
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > this.maxSamples) {
      this.responseTimes.shift();
    }
  }

  /**
   * 获取请求指标
   */
  getRequestMetrics(): RequestMetrics {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastResetTime) / 1000;

    // 计算响应时间统计
    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const avgResponseTime =
      sortedTimes.length > 0
        ? sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
        : 0;

    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    return {
      totalRequests: this.totalRequests,
      successRequests: this.successRequests,
      errorRequests: this.errorRequests,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      p95ResponseTime: sortedTimes[p95Index] || 0,
      p99ResponseTime: sortedTimes[p99Index] || 0,
      requestsPerSecond:
        elapsedSeconds > 0
          ? Math.round((this.totalRequests / elapsedSeconds) * 100) / 100
          : 0,
    };
  }

  /**
   * 重置请求指标
   */
  resetRequestMetrics(): void {
    this.totalRequests = 0;
    this.successRequests = 0;
    this.errorRequests = 0;
    this.responseTimes = [];
    this.lastResetTime = Date.now();
  }

  // ==================== 系统指标 ====================

  /**
   * 获取系统指标
   */
  getSystemMetrics(): SystemMetrics {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = this.getCpuUsage();

    return {
      memoryUsage: {
        heapUsed: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
        heapTotal:
          Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
        external: Math.round((memoryUsage.external / 1024 / 1024) * 100) / 100,
        rss: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      },
      cpuUsage,
      uptime: Math.round(process.uptime()),
      nodeVersion: process.version,
    };
  }

  /**
   * 获取 CPU 使用率
   */
  private getCpuUsage(): { user: number; system: number } {
    const currentCpuUsage = process.cpuUsage(this.lastCpuUsage);
    const currentTime = Date.now();
    const elapsedMs = currentTime - this.lastCpuTime;

    // 计算 CPU 使用率百分比
    const userPercent = (currentCpuUsage.user / 1000 / elapsedMs) * 100;
    const systemPercent = (currentCpuUsage.system / 1000 / elapsedMs) * 100;

    // 更新追踪值
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuTime = currentTime;

    return {
      user: Math.round(userPercent * 100) / 100,
      system: Math.round(systemPercent * 100) / 100,
    };
  }

  // ==================== 数据库指标 ====================

  /**
   * 获取数据库指标
   */
  async getDatabaseMetrics(): Promise<DatabaseMetrics> {
    const pool = this.prismaService.getPoolStats();
    const isHealthy = await this.prismaService.isHealthy();

    return {
      pool,
      isHealthy,
    };
  }

  // ==================== Redis 指标 ====================

  /**
   * 获取 Redis 指标
   */
  async getRedisMetrics(): Promise<RedisMetrics> {
    const isHealthy = await this.redisService.isHealthy();

    if (!isHealthy) {
      return { isHealthy };
    }

    try {
      const infoStr = await this.redisService.getInfo();
      const info = this.parseRedisInfo(infoStr);

      return {
        isHealthy,
        info: {
          connectedClients: parseInt(info.connected_clients || '0', 10),
          usedMemory: info.used_memory_human || '0',
          totalKeys: parseInt(
            info.db0?.split(',')[0]?.split('=')[1] || '0',
            10,
          ),
        },
      };
    } catch {
      return { isHealthy };
    }
  }

  /**
   * 解析 Redis INFO 输出
   */
  private parseRedisInfo(infoStr: string): Record<string, string> {
    const info: Record<string, string> = {};
    const lines = infoStr.split('\r\n');

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          info[key] = value;
        }
      }
    }

    return info;
  }

  // ==================== 健康检查 ====================

  /**
   * 获取综合健康状态
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const [databaseMetrics, redisMetrics] = await Promise.all([
      this.getDatabaseMetrics(),
      this.getRedisMetrics(),
    ]);

    const requestMetrics = this.getRequestMetrics();
    const systemMetrics = this.getSystemMetrics();

    // 判断整体状态
    const dbHealthy = databaseMetrics.isHealthy;
    const redisHealthy = redisMetrics.isHealthy;
    const errorRate =
      requestMetrics.errorRequests / Math.max(requestMetrics.totalRequests, 1);
    const apiHealthy = errorRate < 0.1;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (dbHealthy && redisHealthy && apiHealthy) {
      status = 'healthy';
    } else if (dbHealthy && redisHealthy) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy,
        redis: redisHealthy,
        api: apiHealthy,
      },
      metrics: {
        request: requestMetrics,
        system: systemMetrics,
        database: databaseMetrics,
        redis: redisMetrics,
      },
    };
  }

  // ==================== 持久化 ====================

  /**
   * 持久化指标到 Redis
   */
  private async persistMetrics(): Promise<void> {
    try {
      const metrics = {
        request: this.getRequestMetrics(),
        system: this.getSystemMetrics(),
        timestamp: new Date().toISOString(),
      };

      await this.cacheService.set(this.METRICS_KEY, metrics, 3600);
      this.logger.debug('Metrics persisted to Redis');
    } catch (error) {
      this.logger.error('Failed to persist metrics', error);
    }
  }

  /**
   * 获取持久化的指标
   */
  async getPersistedMetrics(): Promise<unknown> {
    return this.cacheService.get(this.METRICS_KEY);
  }
}
