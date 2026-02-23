/**
 * 首页引导流程配置
 *
 * 需求22: 新手引导系统
 * 任务22.2.3: 首页引导流程
 *
 * 引导步骤:
 * 1. Navigation bar - 介绍主导航区域
 * 2. Search feature - 展示搜索功能
 * 3. Recommendations - 高亮个性化推荐
 * 4. Categories/Genres - 展示内容分类
 * 5. User menu - 个人资料、设置、通知
 *
 * 验收标准:
 * - 22.1: WHEN 新用户首次进入首页 THEN System SHALL 启动首页引导流程
 * - 22.2: WHEN 引导步骤显示 THEN System SHALL 高亮目标区域并显示说明气泡
 * - 22.3: WHEN 用户完成引导步骤 THEN System SHALL 自动进入下一步或结束引导
 * - 22.4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
 */

import type { OnboardingTourConfig, OnboardingStepConfig } from '@/types/onboarding';
import { GuideType } from '@/types/onboarding';

/**
 * 首页引导步骤配置
 */
export const homepageSteps: OnboardingStepConfig[] = [
  {
    id: 'navigation',
    targetSelector: '[data-onboarding="homepage-navigation"]',
    title: '导航栏 🧭',
    description:
      '这是主导航区域，你可以快速访问广场、发现、创作中心等核心功能。点击 Logo 随时返回首页！',
    position: 'bottom',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
  },
  {
    id: 'search',
    targetSelector: '[data-onboarding="homepage-search"]',
    title: '搜索功能 🔍',
    description:
      '想找特定的作品或作者？在这里输入关键词即可快速搜索。支持作品名、作者名、标签等多种搜索方式！',
    position: 'bottom',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'recommendations',
    targetSelector: '[data-onboarding="homepage-recommendations"]',
    title: '个性化推荐 ✨',
    description:
      '这里展示根据你的阅读偏好精选的作品推荐。阅读越多，推荐越精准！发现你的下一本心头好~',
    position: 'top',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 12,
  },
  {
    id: 'categories',
    targetSelector: '[data-onboarding="homepage-categories"]',
    title: '内容分类 📚',
    description:
      '按类型浏览作品：玄幻、言情、科幻、悬疑...点击感兴趣的分类，探索海量精彩内容！',
    position: 'bottom',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'user-menu',
    targetSelector: '[data-onboarding="homepage-user-menu"]',
    title: '个人中心 👤',
    description:
      '点击这里访问你的个人资料、设置、通知和消息。还可以查看阅读历史和收藏列表哦！',
    position: 'left',
    nextButtonText: '完成引导',
    showSkipButton: false,
    highlightPadding: 8,
    allowTargetClick: true,
  },
];

/**
 * 创建首页引导配置
 */
export function createHomepageTourConfig(
  callbacks?: {
    onComplete?: () => void;
    onSkip?: () => void;
    onStepChange?: (step: number) => void;
  }
): OnboardingTourConfig {
  return {
    guideType: GuideType.HOMEPAGE,
    steps: homepageSteps,
    onComplete: callbacks?.onComplete,
    onSkip: callbacks?.onSkip,
    onStepChange: callbacks?.onStepChange,
  };
}

/**
 * 首页引导步骤 ID 常量
 */
export const HOMEPAGE_STEP_IDS = {
  NAVIGATION: 'navigation',
  SEARCH: 'search',
  RECOMMENDATIONS: 'recommendations',
  CATEGORIES: 'categories',
  USER_MENU: 'user-menu',
} as const;

/**
 * 首页引导数据属性常量
 * 用于在页面元素上添加 data-onboarding 属性
 */
export const HOMEPAGE_DATA_ATTRIBUTES = {
  NAVIGATION: 'homepage-navigation',
  SEARCH: 'homepage-search',
  RECOMMENDATIONS: 'homepage-recommendations',
  CATEGORIES: 'homepage-categories',
  USER_MENU: 'homepage-user-menu',
} as const;
