import { Module } from '@nestjs/common';
import { BranchController } from './branch.controller.js';
import { BranchService } from './branch.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 分支模块
 * 提供分支创建、管理和查询功能
 *
 * 需求2: 正文分支管理
 * - 创建和浏览正文分支
 * - 记录分支点和分支创作者
 * - 按热度排序展示
 *
 * 需求3: 改写分支管理
 * - 创建改写分支（同人/IF线/改编）
 * - 计算和收取上传费用
 *
 * 需求4: 漫画分支管理
 * - 创建漫画分支
 * - 同步创建漫画作品
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}
