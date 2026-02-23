/**
 * 新手引导类型定义
 *
 * 需求22: 新手引导系统
 * 任务22.2.1: 引导组件（高亮遮罩、气泡）
 *
 * 验收标准:
 * - 22.1: WHEN 新用户首次进入特定页面 THEN System SHALL 自动触发对应引导流程
 * - 22.2: WHEN 引导开始 THEN System SHALL 高亮目标元素并显示说明气泡
 */

/**
 * 引导类型枚举
 */
export enum GuideType {
  REGISTRATION = 'REGISTRATION',
  HOMEPAGE = 'HOMEPAGE',
  READER = 'READER',
  CREATION = 'CREATION',
}

/**
 * 气泡位置类型
 */
export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

/**
 * 引导步骤配置
 */
export interface OnboardingStepConfig {
  /** 步骤唯一标识 */
  id: string;
  /** 目标元素选择器 */
  targetSelector: string;
  /** 步骤标题 */
  title: string;
  /** 步骤描述 */
  description: string;
  /** 气泡位置，默认自动计算 */
  position?: TooltipPosition;
  /** 是否允许点击目标元素进入下一步 */
  allowTargetClick?: boolean;
  /** 自定义下一步按钮文本 */
  nextButtonText?: string;
  /** 是否显示跳过按钮 */
  showSkipButton?: boolean;
  /** 高亮区域内边距 */
  highlightPadding?: number;
}

/**
 * 引导流程配置
 */
export interface OnboardingTourConfig {
  /** 引导类型 */
  guideType: GuideType;
  /** 步骤列表 */
  steps: OnboardingStepConfig[];
  /** 完成回调 */
  onComplete?: () => void;
  /** 跳过回调 */
  onSkip?: () => void;
  /** 步骤变化回调 */
  onStepChange?: (step: number) => void;
}

/**
 * 目标元素位置信息
 */
export interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

/**
 * 引导进度数据
 */
export interface OnboardingProgress {
  id: string;
  userId: string;
  guideType: GuideType;
  currentStep: number;
  totalSteps: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 获取进度响应
 */
export interface GetProgressResponse {
  message: string;
  progress: OnboardingProgress;
}

/**
 * 获取所有进度响应
 */
export interface GetAllProgressResponse {
  message: string;
  progress: OnboardingProgress[];
}

/**
 * 更新进度响应
 */
export interface UpdateProgressResponse {
  message: string;
  progress: OnboardingProgress;
}

/**
 * 重置进度响应
 */
export interface ResetProgressResponse {
  message: string;
  progress: OnboardingProgress;
}

/**
 * 引导奖励信息
 */
export interface GuideReward {
  tokensAwarded: number;
  achievementName?: string;
}

/**
 * 完成引导响应（含奖励）
 */
export interface CompleteGuideResponse {
  message: string;
  progress: OnboardingProgress;
  guideReward?: GuideReward;
  allGuidesReward?: GuideReward;
  allGuidesCompleted: boolean;
}

/**
 * Overlay 组件属性
 */
export interface OnboardingOverlayProps {
  /** 目标元素位置 */
  targetRect: TargetRect | null;
  /** 是否可见 */
  visible: boolean;
  /** 点击遮罩回调 */
  onOverlayClick?: () => void;
  /** 高亮区域内边距 */
  padding?: number;
  /** 是否允许点击遮罩跳过 */
  allowClickToSkip?: boolean;
}

/**
 * Tooltip 组件属性
 */
export interface OnboardingTooltipProps {
  /** 目标元素位置 */
  targetRect: TargetRect | null;
  /** 是否可见 */
  visible: boolean;
  /** 标题 */
  title: string;
  /** 描述 */
  description: string;
  /** 当前步骤（从1开始） */
  currentStep: number;
  /** 总步骤数 */
  totalSteps: number;
  /** 气泡位置 */
  position?: TooltipPosition;
  /** 下一步按钮文本 */
  nextButtonText?: string;
  /** 是否显示跳过按钮 */
  showSkipButton?: boolean;
  /** 下一步回调 */
  onNext?: () => void;
  /** 跳过回调 */
  onSkip?: () => void;
  /** 是否是最后一步 */
  isLastStep?: boolean;
}

/**
 * Step 组件属性
 */
export interface OnboardingStepProps {
  /** 步骤配置 */
  config: OnboardingStepConfig;
  /** 当前步骤（从1开始） */
  currentStep: number;
  /** 总步骤数 */
  totalSteps: number;
  /** 是否可见 */
  visible: boolean;
  /** 下一步回调 */
  onNext?: () => void;
  /** 跳过回调 */
  onSkip?: () => void;
  /** 是否是最后一步 */
  isLastStep?: boolean;
}

/**
 * Tour 组件属性
 */
export interface OnboardingTourProps {
  /** 引导配置 */
  config: OnboardingTourConfig;
  /** 是否激活 */
  active: boolean;
  /** 初始步骤 */
  initialStep?: number;
}
