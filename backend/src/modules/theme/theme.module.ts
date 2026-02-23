import { Module } from '@nestjs/common';
import { ThemeController } from './theme.controller.js';
import { ThemeService } from './theme.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 主题模块
 *
 * 需求23: 主题皮肤系统
 *
 * 提供以下功能：
 * - 主题配置数据模型 (23.1.1)
 * - 主题列表 API (23.1.2)
 * - 主题解锁检查 (23.1.3)
 * - 用户主题偏好 API (23.1.4)
 *
 * 主题体系设计：
 * - 默认主题（重二次元风格）：星空幻想、樱花物语、深夜模式、极简白
 * - 会员专属主题：赛博朋克、古风水墨
 * - 节日限定主题：春节/圣诞等节日主题
 * - 创作者定制主题：特定作品粉丝专属
 *
 * 解锁条件类型：
 * - DEFAULT: 默认可用
 * - MEMBERSHIP: 会员等级解锁
 * - ACHIEVEMENT: 成就解锁
 * - PURCHASE: 购买解锁
 * - EVENT: 活动限定
 * - CREATOR: 创作者定制
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ThemeController],
  providers: [ThemeService],
  exports: [ThemeService],
})
export class ThemeModule {}
