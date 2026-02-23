import { Module } from '@nestjs/common';
import { Wenku8ProxyController } from './wenku8-proxy.controller.js';
import { Wenku8ProxyService } from './wenku8-proxy.service.js';
import { RedisModule } from '../../redis/redis.module.js';
import { RiskControlModule } from '../risk-control/risk-control.module.js';

@Module({
  imports: [RedisModule, RiskControlModule],
  controllers: [Wenku8ProxyController],
  providers: [Wenku8ProxyService],
  exports: [Wenku8ProxyService],
})
export class Wenku8ProxyModule {}
