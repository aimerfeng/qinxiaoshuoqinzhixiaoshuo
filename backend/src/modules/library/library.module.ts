import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller.js';
import { LibraryService } from './library.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 小说库模块
 * 提供小说库创建、管理和设置功能
 *
 * 需求1: 小说库创建与管理
 * - 创建和管理小说库
 * - 支持原创库和共享库两种类型
 * - 设置收益分配和上传费用
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
