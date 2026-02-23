import { Module } from '@nestjs/common';
import { DanmakuController } from './danmaku.controller';
import { DanmakuService } from './danmaku.service';
import { DanmakuGateway } from './danmaku.gateway';
import { SensitiveWordService } from './sensitive-word.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 弹幕模块
 *
 * 需求24: 段落弹幕系统
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DanmakuController],
  providers: [DanmakuService, DanmakuGateway, SensitiveWordService],
  exports: [DanmakuService, DanmakuGateway],
})
export class DanmakuModule {}
