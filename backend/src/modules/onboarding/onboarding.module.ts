import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller.js';
import { OnboardingService } from './onboarding.service.js';
import { OnboardingRewardService } from './onboarding-reward.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { WalletModule } from '../wallet/wallet.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 新手引导模块
 *
 * 需求22: 新手引导系统
 *
 * 提供以下功能：
 * - 引导进度记录 API (22.1.1)
 *   - GET /api/v1/onboarding - 获取所有引导进度
 *   - GET /api/v1/onboarding/:guideType - 获取特定引导类型的进度
 *   - PATCH /api/v1/onboarding/:guideType - 更新引导进度
 *   - POST /api/v1/onboarding/:guideType/complete - 标记引导为完成
 *   - POST /api/v1/onboarding/:guideType/reset - 重置引导进度
 *
 * - 引导完成奖励发放 (22.1.2)
 *   - 单个引导完成奖励：10 零芥子
 *   - 所有引导完成奖励：50 零芥子 + "新手毕业"成就
 *
 * 引导类型：
 * - REGISTRATION: 注册引导 - 完善资料、选择兴趣标签
 * - HOMEPAGE: 首页引导 - 介绍广场、推荐流、搜索入口
 * - READER: 阅读引导 - 介绍段落引用、阅读设置、章节导航
 * - CREATION: 创作引导 - 介绍编辑功能、发布流程、数据查看
 */
@Module({
  imports: [PrismaModule, WalletModule, AuthModule],
  controllers: [OnboardingController],
  providers: [OnboardingService, OnboardingRewardService],
  exports: [OnboardingService, OnboardingRewardService],
})
export class OnboardingModule {}
