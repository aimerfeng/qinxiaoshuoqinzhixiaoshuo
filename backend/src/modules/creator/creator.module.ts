import { Module } from '@nestjs/common';
import { CreatorController } from './creator.controller.js';
import { CreatorService } from './creator.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 创作者控制台模块
 *
 * 需求6: 创作者控制台
 * 提供仪表板数据、作品统计、草稿管理等功能
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CreatorController],
  providers: [CreatorService],
  exports: [CreatorService],
})
export class CreatorModule {}
