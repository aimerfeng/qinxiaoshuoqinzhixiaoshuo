import { Module } from '@nestjs/common';
import { ChaptersController } from './chapters.controller.js';
import { ChaptersService } from './chapters.service.js';
import { ScheduledPublishService } from './scheduled-publish.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ParagraphsModule } from '../paragraphs/paragraphs.module.js';
import { UploadModule } from '../upload/upload.module.js';
import { AchievementModule } from '../achievement/achievement.module.js';

/**
 * 章节模块
 * 提供章节管理功能
 *
 * 需求2: 作品管理与版本控制
 * 需求6验收标准14: 定时发布功能
 * 需求24.4.2: 字数成就追踪
 */
@Module({
  imports: [PrismaModule, AuthModule, ParagraphsModule, UploadModule, AchievementModule],
  controllers: [ChaptersController],
  providers: [ChaptersService, ScheduledPublishService],
  exports: [ChaptersService, ScheduledPublishService],
})
export class ChaptersModule {}
