import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ReaderController } from './reader.controller.js';
import { ReaderService } from './reader.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { AchievementModule } from '../achievement/achievement.module.js';
import { Wenku8ProxyModule } from '../wenku8-proxy/wenku8-proxy.module.js';

/**
 * 阅读器模块
 *
 * 需求4: 沉浸式阅读器
 * 需求24.3.1: 阅读量成就（初窥门径→阅尽天下）
 *
 * 提供以下功能：
 * - 章节内容获取 API (4.1.1)
 * - 阅读进度保存 API (4.1.2)
 * - 阅读设置保存 API (4.1.3)
 * - 相邻章节信息 API (4.1.4)
 * - 阅读量成就进度追踪 (24.3.1)
 */
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
    AchievementModule,
    Wenku8ProxyModule,
  ],
  controllers: [ReaderController],
  providers: [ReaderService, OptionalJwtAuthGuard],
  exports: [ReaderService],
})
export class ReaderModule {}
