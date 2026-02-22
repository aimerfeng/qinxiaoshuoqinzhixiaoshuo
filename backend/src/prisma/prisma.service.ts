import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { createSoftDeleteMiddleware } from './soft-delete.middleware.js';

/**
 * 连接池配置接口
 */
interface PoolConfig {
  /** 最大连接数 */
  max: number;
  /** 最小连接数 */
  min: number;
  /** 空闲连接超时时间（毫秒） */
  idleTimeoutMillis: number;
  /** 连接超时时间（毫秒） */
  connectionTimeoutMillis: number;
  /** 允许退出时的最大等待时间（毫秒） */
  allowExitOnIdle: boolean;
}

/**
 * 连接池统计信息
 */
export interface PoolStats {
  /** 总连接数 */
  totalCount: number;
  /** 空闲连接数 */
  idleCount: number;
  /** 等待中的请求数 */
  waitingCount: number;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private pgPool: pg.Pool | undefined;

  /**
   * 默认连接池配置
   * 根据需求10验收标准4：通过连接池优化响应时间
   */
  private static readonly DEFAULT_POOL_CONFIG: PoolConfig = {
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    min: parseInt(process.env.DB_POOL_MIN || '5', 10),
    idleTimeoutMillis: parseInt(
      process.env.DB_POOL_IDLE_TIMEOUT || '30000',
      10,
    ),
    connectionTimeoutMillis: parseInt(
      process.env.DB_POOL_CONNECTION_TIMEOUT || '5000',
      10,
    ),
    allowExitOnIdle: true,
  };

  constructor() {
    const connectionString = process.env.DATABASE_URL;

    if (connectionString) {
      const poolConfig = PrismaService.DEFAULT_POOL_CONFIG;

      const pool = new pg.Pool({
        connectionString,
        max: poolConfig.max,
        min: poolConfig.min,
        idleTimeoutMillis: poolConfig.idleTimeoutMillis,
        connectionTimeoutMillis: poolConfig.connectionTimeoutMillis,
        allowExitOnIdle: poolConfig.allowExitOnIdle,
      });

      // 连接池事件监听
      pool.on('connect', () => {
        // 新连接建立时的日志（仅在调试模式下）
        if (process.env.DB_POOL_DEBUG === 'true') {
          console.debug('[Pool] New client connected');
        }
      });

      pool.on('error', (err) => {
        console.error('[Pool] Unexpected error on idle client', err);
      });

      pool.on('remove', () => {
        // 连接移除时的日志（仅在调试模式下）
        if (process.env.DB_POOL_DEBUG === 'true') {
          console.debug('[Pool] Client removed from pool');
        }
      });

      const adapter = new PrismaPg(pool);
      super({ adapter });
      this.pgPool = pool;
    } else {
      // For development without database, create client without adapter
      super();
      this.pgPool = undefined;
    }

    // 注册软删除中间件
    this.$use(createSoftDeleteMiddleware());
  }

  async onModuleInit() {
    try {
      await this.$connect();
      const config = PrismaService.DEFAULT_POOL_CONFIG;
      this.logger.log(
        `Database connection established (Pool: min=${config.min}, max=${config.max}, idleTimeout=${config.idleTimeoutMillis}ms)`,
      );
    } catch (error) {
      this.logger.warn('Database connection failed - running without database');
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (this.pgPool) {
      await this.pgPool.end();
    }
    this.logger.log('Database connection closed');
  }

  /**
   * 获取连接池统计信息
   * 用于监控和性能分析
   */
  getPoolStats(): PoolStats | null {
    if (!this.pgPool) {
      return null;
    }

    return {
      totalCount: this.pgPool.totalCount,
      idleCount: this.pgPool.idleCount,
      waitingCount: this.pgPool.waitingCount,
    };
  }

  /**
   * 检查数据库连接健康状态
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取连接池配置信息
   */
  getPoolConfig(): PoolConfig {
    return { ...PrismaService.DEFAULT_POOL_CONFIG };
  }
}
