import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule as IoRedisModule } from '@nestjs-modules/ioredis';
import { RedisService } from './redis.service.js';
import { CacheService } from './cache.service.js';
import { SessionService } from './session.service.js';
import { HotContentCacheService } from './hot-content-cache.service.js';
import { UserCacheService } from './user-cache.service.js';
import { CounterCacheService } from './counter-cache.service.js';

/**
 * Redis 模块
 * 全局模块，提供 Redis 连接和服务
 */
@Global()
@Module({
  imports: [
    IoRedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');

        const host = configService.get<string>('redis.host', 'localhost');
        const port = configService.get<number>('redis.port', 6379);
        const password = configService.get<string>('redis.password');

        logger.log(`Configuring Redis connection to ${host}:${port}`);

        return {
          type: 'single',
          options: {
            host,
            port,
            password: password || undefined,
            // 连接池配置
            maxRetriesPerRequest: 3,
            // 重连策略
            retryStrategy: (times: number) => {
              if (times > 10) {
                logger.error('Redis connection failed after 10 retries');
                return null; // 停止重试
              }
              const delay = Math.min(times * 100, 3000);
              logger.warn(
                `Redis reconnecting in ${delay}ms (attempt ${times})`,
              );
              return delay;
            },
            // 连接超时
            connectTimeout: 10000,
            // 命令超时
            commandTimeout: 5000,
            // 启用离线队列
            enableOfflineQueue: true,
            // 启用只读模式（用于从节点）
            enableReadyCheck: true,
            // 懒连接（首次使用时连接）
            lazyConnect: false,
            // 键前缀
            keyPrefix: 'anima:',
          },
        };
      },
    }),
  ],
  providers: [
    RedisService,
    CacheService,
    SessionService,
    HotContentCacheService,
    UserCacheService,
    CounterCacheService,
  ],
  exports: [
    RedisService,
    CacheService,
    SessionService,
    HotContentCacheService,
    UserCacheService,
    CounterCacheService,
    IoRedisModule,
  ],
})
export class RedisModule {}
