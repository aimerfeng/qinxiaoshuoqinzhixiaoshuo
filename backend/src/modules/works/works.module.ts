import { Module } from '@nestjs/common';
import { WorksController } from './works.controller.js';
import { WorksService } from './works.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 作品模块
 * 提供作品管理功能
 *
 * 需求2: 作品管理与版本控制（类Git共创系统）
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WorksController],
  providers: [WorksService],
  exports: [WorksService],
})
export class WorksModule {}
