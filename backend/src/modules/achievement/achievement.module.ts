import { Module, forwardRef } from '@nestjs/common';
import { AchievementController } from './achievement.controller.js';
import { AchievementService } from './achievement.service.js';
import { AchievementProgressService } from './achievement-progress.service.js';
import { AchievementUnlockService } from './achievement-unlock.service.js';
import { AchievementRewardService } from './achievement-reward.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

/**
 * 成就模块
 *
 * 需求24: 成就系统
 *
 * 提供以下功能：
 * - 24.1.3 成就类别管理 API（阅读/创作/社交/收藏/特殊/赛季/活动）
 * - 24.1.4 成就等级配置（青铜→白银→黄金→铂金→钻石→传说）
 * - 24.1.5 成就进度追踪服务
 * - 24.1.6 成就解锁检测服务（事件驱动）
 * - 24.1.7 成就奖励发放服务（零芥子/徽章/称号/头像框）
 * - 24.1.8 成就列表 API（分类/筛选/排序）
 * - 24.1.9 用户成就详情 API
 * - 24.1.10 成就领取 API
 *
 * 成就类别：
 * - READING: 阅读成就（初窥门径→阅尽天下）
 * - CREATION: 创作成就（新人作者→千万传奇）
 * - SOCIAL: 社交成就（初有粉丝→互动之王）
 * - COLLECTION: 收藏成就
 * - SPECIAL: 特殊成就（元老用户/深夜书虫/彩蛋猎人）
 * - SEASONAL: 赛季成就
 * - EVENT: 活动成就
 *
 * 成就等级：
 * - BRONZE: 青铜
 * - SILVER: 白银
 * - GOLD: 黄金
 * - PLATINUM: 铂金
 * - DIAMOND: 钻石
 * - LEGENDARY: 传说
 *
 * 奖励类型：
 * - TOKENS: 零芥子代币
 * - BADGE: 徽章
 * - TITLE: 称号
 * - AVATAR_FRAME: 头像框
 * - THEME: 主题皮肤
 *
 * 事件驱动解锁：
 * 通过 EventEmitter2 监听各种用户行为事件，自动更新成就进度并检测解锁。
 * 支持的事件类型包括：阅读、创作、社交、收藏、特殊等。
 *
 * 注意：EventEmitterModule 已在 AppModule 中全局导入
 * 注意：使用 forwardRef 解决与 AuthModule 的循环依赖
 */
@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule)],
  controllers: [AchievementController],
  providers: [
    AchievementService,
    AchievementProgressService,
    AchievementUnlockService,
    AchievementRewardService,
  ],
  exports: [
    AchievementService,
    AchievementProgressService,
    AchievementUnlockService,
    AchievementRewardService,
  ],
})
export class AchievementModule {}
