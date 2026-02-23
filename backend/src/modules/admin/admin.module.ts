import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { AdminLogService } from './admin-log.service.js';
import { UserManagementService } from './user-management.service.js';
import { ContentModerationService } from './content-moderation.service.js';
import { MembershipReviewService } from './membership-review.service.js';
import { ActivityReviewService } from './activity-review.service.js';
import { StatisticsService } from './statistics.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ActivityModule } from '../activity/activity.module.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';

/**
 * 管理后台模块
 * 提供管理员认证、用户管理、内容审核等管理功能
 * 
 * 需求18: 管理后台
 * - 数据看板
 * - 用户管理
 * - 会员审核
 * - 内容管理
 * - 活动管理
 * - 代币管理
 * - 风控中心
 * - 系统配置
 */
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    ActivityModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: 24 * 60 * 60, // 24 hours in seconds
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminLogService, UserManagementService, ContentModerationService, MembershipReviewService, ActivityReviewService, StatisticsService, AdminGuard],
  exports: [AdminService, AdminLogService, UserManagementService, ContentModerationService, MembershipReviewService, ActivityReviewService, StatisticsService, AdminGuard],
})
export class AdminModule {}
