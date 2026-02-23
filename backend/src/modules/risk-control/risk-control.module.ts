import { Module } from '@nestjs/common';
import { RiskDeviceFingerprintService } from './device-fingerprint.service.js';
import { RelatedAccountService } from './related-account.service.js';
import { TransactionAnomalyService } from './transaction-anomaly.service.js';
import { RateLimitService } from './rate-limit.service.js';
import { RiskAlertService } from './risk-alert.service.js';
import { PunishmentService } from './punishment.service.js';
import { RateLimitGuard } from './guards/rate-limit.guard.js';
import { RiskControlController } from './risk-control.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 风控与反作弊模块
 *
 * 需求19: 风控与反作弊系统
 *
 * 包含功能：
 * - 设备指纹采集（增强版） (任务19.1.1)
 * - 关联账户检测 (任务19.1.2)
 * - 交易异常检测 (任务19.1.3)
 * - 频率限制服务 (任务19.1.4)
 * - 风控告警服务 (任务19.1.5)
 * - 惩罚执行服务 (任务19.1.6)
 */
@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [RiskControlController],
  providers: [
    RiskDeviceFingerprintService,
    RelatedAccountService,
    TransactionAnomalyService,
    RateLimitService,
    RiskAlertService,
    PunishmentService,
    RateLimitGuard,
  ],
  exports: [
    RiskDeviceFingerprintService,
    RelatedAccountService,
    TransactionAnomalyService,
    RateLimitService,
    RiskAlertService,
    PunishmentService,
    RateLimitGuard,
  ],
})
export class RiskControlModule {}
