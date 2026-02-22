import { Module } from '@nestjs/common';
import { ParagraphsService } from './paragraphs.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

/**
 * 段落模块
 * 提供段落解析和锚点管理功能
 *
 * 需求3: 段落锚点精准引用体系（Anchor Network）
 */
@Module({
  imports: [PrismaModule],
  providers: [ParagraphsService],
  exports: [ParagraphsService],
})
export class ParagraphsModule {}
