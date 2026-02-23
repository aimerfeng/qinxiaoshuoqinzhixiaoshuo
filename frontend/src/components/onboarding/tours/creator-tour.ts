/**
 * 创作者引导流程配置
 *
 * 需求22: 新手引导系统
 * 任务22.2.5: 创作引导流程
 *
 * 引导步骤:
 * 1. Create new work - 如何开始创建新作品
 * 2. Editor features - 富文本编辑器、格式化工具
 * 3. Chapter management - 添加/组织章节
 * 4. Cover upload - 如何上传封面图片
 * 5. Tags and categories - 设置类型和标签
 * 6. Publish settings - 草稿、定时发布、发布选项
 * 7. Analytics preview - 在哪里查看读者统计
 *
 * 验收标准:
 * - 22.1: WHEN 新用户首次进入创作者控制台 THEN System SHALL 启动创作引导流程
 * - 22.2: WHEN 引导步骤显示 THEN System SHALL 高亮目标区域并显示说明气泡
 * - 22.3: WHEN 用户完成引导步骤 THEN System SHALL 自动进入下一步或结束引导
 * - 22.4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
 */

import type { OnboardingTourConfig, OnboardingStepConfig } from '@/types/onboarding';
import { GuideType } from '@/types/onboarding';

/**
 * 创作者引导步骤配置
 */
export const creatorSteps: OnboardingStepConfig[] = [
  {
    id: 'create-work',
    targetSelector: '[data-onboarding="creator-new-work"]',
    title: '创建新作品 ✨',
    description:
      '点击这里开始你的创作之旅！可以创建小说或漫画作品，让你的故事被更多人看到~',
    position: 'bottom',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'editor-features',
    targetSelector: '[data-onboarding="creator-editor"]',
    title: '编辑器功能 📝',
    description:
      '强大的 Markdown 编辑器，支持所见即所得、即时渲染和分屏预览三种模式。还有丰富的格式化工具帮你排版！',
    position: 'right',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 12,
  },
  {
    id: 'chapter-management',
    targetSelector: '[data-onboarding="creator-chapters"]',
    title: '章节管理 📚',
    description:
      '在这里管理你的章节，可以添加新章节、调整顺序、设置草稿或发布状态。拖拽即可排序哦！',
    position: 'left',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'cover-upload',
    targetSelector: '[data-onboarding="creator-cover"]',
    title: '封面上传 🎨',
    description:
      '一个好的封面能吸引更多读者！点击上传你的作品封面，支持 JPG、PNG 格式，建议尺寸 600x800。',
    position: 'bottom',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'tags-categories',
    targetSelector: '[data-onboarding="creator-tags"]',
    title: '标签与分类 🏷️',
    description:
      '为作品添加合适的标签和分类，帮助读者更容易发现你的作品。选择准确的标签很重要！',
    position: 'top',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'publish-settings',
    targetSelector: '[data-onboarding="creator-publish"]',
    title: '发布设置 🚀',
    description:
      '可以选择立即发布、保存草稿或定时发布。定时发布功能让你提前安排更新计划！',
    position: 'left',
    nextButtonText: '下一步',
    showSkipButton: true,
    highlightPadding: 8,
    allowTargetClick: true,
  },
  {
    id: 'analytics-preview',
    targetSelector: '[data-onboarding="creator-analytics"]',
    title: '数据分析 📊',
    description:
      '在这里查看作品的阅读量、点赞数、引用数等数据。了解读者喜好，优化创作策略！',
    position: 'bottom',
    nextButtonText: '开始创作',
    showSkipButton: false,
    highlightPadding: 8,
    allowTargetClick: true,
  },
];

/**
 * 创建创作者引导配置
 */
export function createCreatorTourConfig(
  callbacks?: {
    onComplete?: () => void;
    onSkip?: () => void;
    onStepChange?: (step: number) => void;
  }
): OnboardingTourConfig {
  return {
    guideType: GuideType.CREATION,
    steps: creatorSteps,
    onComplete: callbacks?.onComplete,
    onSkip: callbacks?.onSkip,
    onStepChange: callbacks?.onStepChange,
  };
}

/**
 * 创作者引导步骤 ID 常量
 */
export const CREATOR_STEP_IDS = {
  CREATE_WORK: 'create-work',
  EDITOR_FEATURES: 'editor-features',
  CHAPTER_MANAGEMENT: 'chapter-management',
  COVER_UPLOAD: 'cover-upload',
  TAGS_CATEGORIES: 'tags-categories',
  PUBLISH_SETTINGS: 'publish-settings',
  ANALYTICS_PREVIEW: 'analytics-preview',
} as const;

/**
 * 创作者引导数据属性常量
 * 用于在页面元素上添加 data-onboarding 属性
 */
export const CREATOR_DATA_ATTRIBUTES = {
  NEW_WORK: 'creator-new-work',
  EDITOR: 'creator-editor',
  CHAPTERS: 'creator-chapters',
  COVER: 'creator-cover',
  TAGS: 'creator-tags',
  PUBLISH: 'creator-publish',
  ANALYTICS: 'creator-analytics',
} as const;
