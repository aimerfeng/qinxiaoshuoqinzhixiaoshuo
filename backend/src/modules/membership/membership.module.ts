import { Module } from '@nestjs/common';
import { ContributionService } from './contribution.service.js';
import { MembershipApplicationService } from './application.service.js';
import { MembershipController } from './membership.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 会员系统模块
 * 需求14: 会员等级体系
 *
 * 包含功能：
 * - 贡献度计算服务
 * - 贡献度记录 API
 * - 会员申请服务
 * - 会员审核（后续任务）
 */
@Module({
  imports: [PrismaModule, RedisModule, AuthModule],
  controllers: [MembershipController],
  providers: [ContributionService, MembershipApplicationService],
  exports: [ContributionService, MembershipApplicationService],
})
export class MembershipModule {}
