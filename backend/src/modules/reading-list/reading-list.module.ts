import { Module } from '@nestjs/common';
import { ReadingListController } from './reading-list.controller';
import { ReadingListService } from './reading-list.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 阅读列表模块
 *
 * 需求12: 阅读列表管理
 * - 12.1.1 阅读列表 CRUD API
 * - 12.1.2 阅读状态自动更新
 * - 12.1.3 更新提醒逻辑
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ReadingListController],
  providers: [ReadingListService],
  exports: [ReadingListService],
})
export class ReadingListModule {}
