import { Module } from '@nestjs/common';
import { RevenueController } from './revenue.controller.js';
import { RevenueService } from './revenue.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 收益分配模块
 *
 * 需求6: 收益分配系统
 * - 打赏收益在平台、库拥有者、分支创作者之间的分配
 * - 平台固定 30%
 * - 库拥有者 0-30%（可配置 ownerCutPercent）
 * - 分支创作者 40-70%（剩余部分）
 *
 * 包含功能：
 * - 打赏分支 API (POST /api/v1/branches/:id/tip)
 * - 获取打赏记录 API (GET /api/v1/branches/:id/tips)
 * - 收益分配计算
 * - 交易记录创建
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [RevenueController],
  providers: [RevenueService],
  exports: [RevenueService],
})
export class RevenueModule {}
