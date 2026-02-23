import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * 通知模块
 *
 * 需求9: 通知系统
 * - 10.1.1 通知创建服务
 * - 10.1.2 通知列表 API
 * - 10.1.3 标记已读 API
 * - 10.1.4 WebSocket 实时推送
 * - 10.1.5 未读计数服务
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationGateway],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
