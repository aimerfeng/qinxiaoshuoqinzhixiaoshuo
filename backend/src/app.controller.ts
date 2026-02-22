import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { RedisService } from './redis/redis.service.js';

interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    redis: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
    };
  };
}

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async healthCheck(): Promise<HealthCheckResponse> {
    const startTime = Date.now();
    const redisHealthy = await this.redisService.isHealthy();
    const redisLatency = Date.now() - startTime;

    const overallStatus = redisHealthy ? 'ok' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: {
        redis: {
          status: redisHealthy ? 'healthy' : 'unhealthy',
          latency: redisLatency,
        },
      },
    };
  }
}
