import { Module, forwardRef } from '@nestjs/common';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../../storage/storage.module.js';
import { AchievementModule } from '../achievement/achievement.module.js';

/**
 * 用户模块
 * 提供用户资料管理功能
 */
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    StorageModule,
    forwardRef(() => AchievementModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
