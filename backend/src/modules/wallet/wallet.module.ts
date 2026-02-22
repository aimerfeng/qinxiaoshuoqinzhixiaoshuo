import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service.js';
import { WalletController } from './wallet.controller.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

/**
 * 钱包模块
 *
 * 需求15: 零芥子代币系统
 *
 * 包含功能：
 * - 每日领取零芥子 (任务15.1.2)
 * - 获取钱包信息
 * - 获取领取状态
 *
 * 后续任务：
 * - 打赏 API (任务15.1.3)
 * - 交易记录 API (任务15.1.4)
 * - 余额查询 API (任务15.1.5)
 */
@Module({
  imports: [PrismaModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
