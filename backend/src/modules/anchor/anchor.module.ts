import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AnchorController } from './anchor.controller.js';
import { AnchorService } from './anchor.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * 锚点模块
 * 提供锚点（段落）引用相关功能
 *
 * 需求3: 段落锚点精准引用体系（Anchor Network）
 */
@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [AnchorController],
  providers: [AnchorService, JwtAuthGuard],
  exports: [AnchorService],
})
export class AnchorModule {}
