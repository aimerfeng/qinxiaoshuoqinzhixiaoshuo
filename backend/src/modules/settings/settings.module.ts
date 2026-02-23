import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SettingsController } from './settings.controller.js';
import { SettingsService } from './settings.service.js';
import { DeviceManagementController } from './device-management.controller.js';
import { DeviceManagementService } from './device-management.service.js';
import { BlacklistManagementController } from './blacklist-management.controller.js';
import { BlacklistManagementService } from './blacklist-management.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { RedisModule } from '../../redis/redis.module.js';

/**
 * 设置模块
 *
 * 需求21: 设置中心
 *
 * 提供以下功能：
 * - 获取用户设置 API (21.1.2)
 * - 更新用户设置 API (21.1.2)
 * - 重置用户设置 API (21.1.2)
 * - 登录设备管理 API (21.1.3)
 *   - GET /api/v1/settings/devices - 获取所有登录设备
 *   - GET /api/v1/settings/devices/:deviceId - 获取单个设备详情
 *   - DELETE /api/v1/settings/devices/:deviceId - 移除指定设备
 *   - POST /api/v1/settings/devices/logout-others - 登出所有其他设备
 * - 黑名单管理 API (21.1.4)
 *   - GET /api/v1/settings/blacklist - 获取用户的黑名单列表
 *   - POST /api/v1/settings/blacklist/:userId - 添加用户到黑名单
 *   - DELETE /api/v1/settings/blacklist/:userId - 从黑名单移除用户
 *   - GET /api/v1/settings/blacklist/check/:userId - 检查用户是否在黑名单中
 *
 * 设置分类：
 * - 账户安全设置（两步验证、登录通知、登录设备管理）
 * - 隐私设置（主页可见性、在线状态、私信权限、阅读动态）
 * - 通知设置（邮件、推送、评论、点赞、关注、@提及、更新通知）
 * - 阅读设置（字体大小、行高、主题、夜间模式）
 * - 主题设置（系统主题、强调色）
 * - 黑名单管理（拉黑用户列表、解除拉黑）
 */
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],
  controllers: [
    SettingsController,
    DeviceManagementController,
    BlacklistManagementController,
  ],
  providers: [
    SettingsService,
    DeviceManagementService,
    BlacklistManagementService,
  ],
  exports: [
    SettingsService,
    DeviceManagementService,
    BlacklistManagementService,
  ],
})
export class SettingsModule {}
