/**
 * 注册引导流程配置
 *
 * 需求22: 新手引导系统
 * 任务22.2.2: 注册引导流程
 *
 * 引导步骤:
 * 1. Welcome step - 介绍平台
 * 2. Profile setup step - 引导完善资料
 * 3. Interest selection step - 选择阅读偏好/类型
 * 4. First action step - 鼓励首次互动（浏览、关注等）
 *
 * 验收标准:
 * - 22.1: WHEN 新用户完成注册 THEN System SHALL 启动注册引导流程
 * - 22.2: WHEN 引导步骤显示 THEN System SHALL 高亮目标区域并显示说明气泡
 * - 22.3: WHEN 用户完成引导步骤 THEN System SHALL 自动进入下一步或结束引导
 * - 22.4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
 */

import type { OnboardingTourConfig, OnboardingStepConfig } from '@/types/onboarding';
import { GuideType } from '@/types/onboarding';

/**
 * 注册引导步骤配置
 */
export const registrationSteps: OnboardingStepConfig[] = [
  {
    id: 'welcome',
    targetSelector: '[data-onboarding="welcome-banner"]',
    title: '欢迎来到 Project Anima! 🎉',
    description:
      '这里是二次元创作者和读者的精神家园。让我们花一分钟了解平台的核心功能，开启你的创作与阅读之旅吧！',
    position: 'bottom',
    nextButtonText: '开始探索',
    showSkipButton: true,
    highlightPadding: 12,
  },
  {
    id: 'profile-setup',
    targetSelector: '[data-onboarding="profile-avatar"]',
    title: '完善你的个人资料 ✨',
    description:
      '上传一个独特的头像，让其他用户更容易认识你。一个好的头像能让你在社区中更加亮眼！',
    position: 'right',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'interest-selection',
    targetSelector: '[data-onboarding="interest-tags"]',
    title: '选择你的阅读偏好 📚',
    description:
      '告诉我们你喜欢什么类型的作品，我们会为你推荐更精准的内容。玄幻、言情、科幻、悬疑...总有你的菜！',
    position: 'bottom',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 12,
    allowTargetClick: true,
  },
  {
    id: 'first-action',
    targetSelector: '[data-onboarding="explore-button"]',
    title: '开始你的第一次探索 🚀',
    description:
      '点击这里浏览热门作品，发现精彩内容。你也可以关注喜欢的创作者，第一时间获取更新通知！',
    position: 'bottom',
    nextButtonText: '完成引导',
    showSkipButton: false,
    highlightPadding: 8,
    allowTargetClick: true,
  },
];

/**
 * 创建注册引导配置
 */
export function createRegistrationTourConfig(
  callbacks?: {
    onComplete?: () => void;
    onSkip?: () => void;
    onStepChange?: (step: number) => void;
  }
): OnboardingTourConfig {
  return {
    guideType: GuideType.REGISTRATION,
    steps: registrationSteps,
    onComplete: callbacks?.onComplete,
    onSkip: callbacks?.onSkip,
    onStepChange: callbacks?.onStepChange,
  };
}

/**
 * 注册引导步骤 ID 常量
 */
export const REGISTRATION_STEP_IDS = {
  WELCOME: 'welcome',
  PROFILE_SETUP: 'profile-setup',
  INTEREST_SELECTION: 'interest-selection',
  FIRST_ACTION: 'first-action',
} as const;

/**
 * 注册引导数据属性常量
 * 用于在页面元素上添加 data-onboarding 属性
 */
export const REGISTRATION_DATA_ATTRIBUTES = {
  WELCOME_BANNER: 'welcome-banner',
  PROFILE_AVATAR: 'profile-avatar',
  INTEREST_TAGS: 'interest-tags',
  EXPLORE_BUTTON: 'explore-button',
} as const;
