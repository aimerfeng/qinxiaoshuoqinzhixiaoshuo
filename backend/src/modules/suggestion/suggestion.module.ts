import { Module } from '@nestjs/common';
import { SuggestionController } from './suggestion.controller.js';
import { SuggestionService } from './suggestion.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 修订建议模块
 * 提供段落级修订建议的创建、审核和奖励功能
 *
 * 需求5: 修订建议系统
 * - 创建修订建议（修改、插入、添加插图）
 * - 审核建议（采纳/拒绝）
 * - 奖励贡献积分
 * - 生成社区动态卡片
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SuggestionController],
  providers: [SuggestionService],
  exports: [SuggestionService],
})
export class SuggestionModule {}
