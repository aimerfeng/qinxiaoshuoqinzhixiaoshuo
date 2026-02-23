/**
 * 阅读器引导流程配置
 *
 * 需求22: 新手引导系统
 * 任务22.2.4: 阅读器引导流程
 *
 * 引导步骤:
 * 1. Reading controls - 页面导航、滚动模式
 * 2. Settings panel - 字体大小、主题、行距
 * 3. Bookmark feature - 如何添加书签
 * 4. Highlight/Quote - 如何高亮文本和创建引用
 * 5. Chapter navigation - 跳转章节
 * 6. Reading progress - 进度条和自动保存
 *
 * 验收标准:
 * - 22.1: WHEN 新用户首次进入阅读器 THEN System SHALL 启动阅读器引导流程
 * - 22.2: WHEN 引导步骤显示 THEN System SHALL 高亮目标区域并显示说明气泡
 * - 22.3: WHEN 用户完成引导步骤 THEN System SHALL 自动进入下一步或结束引导
 * - 22.4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
 */

import type { OnboardingTourConfig, OnboardingStepConfig } from '@/types/onboarding';
import { GuideType } from '@/types/onboarding';

/**
 * 阅读器引导步骤配置
 */
export const readerSteps: OnboardingStepConfig[] = [
  {
    id: 'reading-controls',
    targetSelector: '[data-onboarding="reader-controls"]',
    title: '阅读控制 📖',
    description:
      '这里是阅读控制区域，你可以切换翻页模式或滚动模式，调整阅读方式以获得最佳体验！',
    position: 'bottom',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
  },
  {
    id: 'settings-panel',
    targetSelector: '[data-onboarding="reader-settings"]',
    title: '阅读设置 ⚙️',
    description:
      '点击这里打开设置面板，可以调整字体大小、行距、背景主题等，打造专属阅读环境！',
    position: 'left',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'bookmark',
    targetSelector: '[data-onboarding="reader-bookmark"]',
    title: '书签功能 🔖',
    description:
      '点击书签按钮可以标记当前阅读位置，方便下次快速找到。支持添加多个书签哦！',
    position: 'left',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'highlight-quote',
    targetSelector: '[data-onboarding="reader-highlight"]',
    title: '高亮与引用 ✨',
    description:
      '选中文字后可以高亮标记或创建引用卡片分享到广场。发现精彩段落？快分享给大家！',
    position: 'top',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 12,
  },
  {
    id: 'chapter-navigation',
    targetSelector: '[data-onboarding="reader-chapters"]',
    title: '章节导航 📑',
    description:
      '点击这里可以查看完整目录，快速跳转到任意章节。追更党必备功能！',
    position: 'right',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'reading-progress',
    targetSelector: '[data-onboarding="reader-progress"]',
    title: '阅读进度 📊',
    description:
      '进度条显示当前阅读位置，系统会自动保存进度。下次打开自动回到上次阅读的地方~',
    position: 'top',
    nextButtonText: '开始阅读',
    showSkipButton: false,
    highlightPadding: 8,
  },
];

/**
 * 创建阅读器引导配置
 */
export function createReaderTourConfig(
  callbacks?: {
    onComplete?: () => void;
    onSkip?: () => void;
    onStepChange?: (step: number) => void;
  }
): OnboardingTourConfig {
  return {
    guideType: GuideType.READER,
    steps: readerSteps,
    onComplete: callbacks?.onComplete,
    onSkip: callbacks?.onSkip,
    onStepChange: callbacks?.onStepChange,
  };
}

/**
 * 阅读器引导步骤 ID 常量
 */
export const READER_STEP_IDS = {
  READING_CONTROLS: 'reading-controls',
  SETTINGS_PANEL: 'settings-panel',
  BOOKMARK: 'bookmark',
  HIGHLIGHT_QUOTE: 'highlight-quote',
  CHAPTER_NAVIGATION: 'chapter-navigation',
  READING_PROGRESS: 'reading-progress',
} as const;

/**
 * 阅读器引导数据属性常量
 * 用于在页面元素上添加 data-onboarding 属性
 */
export const READER_DATA_ATTRIBUTES = {
  CONTROLS: 'reader-controls',
  SETTINGS: 'reader-settings',
  BOOKMARK: 'reader-bookmark',
  HIGHLIGHT: 'reader-highlight',
  CHAPTERS: 'reader-chapters',
  PROGRESS: 'reader-progress',
} as const;
