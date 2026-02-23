import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MessageController } from './message.controller';
import { MessageService } from './message.service';
import { SensitiveWordService } from './sensitive-word.service';
import { BlacklistService } from './blacklist.service';
import { BlacklistController } from './blacklist.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * 私信模块
 *
 * 需求20: 私信系统
 * - 20.1.2 发送私信 API
 * - 20.1.5 敏感词过滤
 * - 20.1.6 黑名单检查
 *
 * 提供私信发送、会话创建、敏感词过滤、黑名单管理等功能
 */
@Module({
  imports: [PrismaModule, AuthModule, ConfigModule],
  controllers: [MessageController, BlacklistController],
  providers: [MessageService, SensitiveWordService, BlacklistService],
  exports: [MessageService, SensitiveWordService, BlacklistService],
})
export class MessageModule {}
