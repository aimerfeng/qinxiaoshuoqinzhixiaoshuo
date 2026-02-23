'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { OnboardingTourProps } from '@/types/onboarding';
import OnboardingStep from './OnboardingStep';
import { useOnboarding } from '@/hooks';

/**
 * 引导流程管理组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.1: 引导组件（高亮遮罩、气泡）
 *
 * 功能：
 * - 接受步骤配置数组
 * - 追踪当前步骤
 * - 处理 next/previous/skip 操作
 * - 调用 API 更新进度
 * - 完成回调
 *
 * 验收标准:
 * - 22.1: WHEN 新用户首次进入特定页面 THEN System SHALL 自动触发对应引导流程
 * - 22.2: WHEN 引导开始 THEN System SHALL 高亮目标元素并显示说明气泡
 * - 22.3: WHEN 用户完成引导步骤 THEN System SHALL 自动进入下一步或结束引导
 * - 22.4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
 */
export default function OnboardingTour({
  config,
  active,
  initialStep = 0,
}: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStep);
  const [mounted, setMounted] = useState(false);
  const { updateProgress, completeGuide } = useOnboarding();

  // 确保在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  // 重置步骤当 active 变化时
  useEffect(() => {
    if (active) {
      setCurrentStepIndex(initialStep);
    }
  }, [active, initialStep]);

  /**
   * 处理下一步
   */
  const handleNext = useCallback(async () => {
    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= config.steps.length) {
      // 完成引导
      try {
        await completeGuide(config.guideType);
      } catch (error) {
        console.error('[OnboardingTour] Failed to complete guide:', error);
      }
      config.onComplete?.();
    } else {
      // 进入下一步
      setCurrentStepIndex(nextIndex);
      config.onStepChange?.(nextIndex + 1);

      // 更新进度到服务器
      try {
        await updateProgress(config.guideType, nextIndex + 1);
      } catch (error) {
        console.error('[OnboardingTour] Failed to update progress:', error);
      }
    }
  }, [currentStepIndex, config, updateProgress, completeGuide]);

  /**
   * 处理跳过
   */
  const handleSkip = useCallback(async () => {
    // 记录当前进度并跳过
    try {
      await updateProgress(config.guideType, currentStepIndex + 1);
    } catch (error) {
      console.error('[OnboardingTour] Failed to update progress on skip:', error);
    }
    config.onSkip?.();
  }, [config, currentStepIndex, updateProgress]);

  // 不在客户端或未激活时不渲染
  if (!mounted || !active || config.steps.length === 0) {
    return null;
  }

  const currentStep = config.steps[currentStepIndex];
  const isLastStep = currentStepIndex === config.steps.length - 1;

  // 使用 Portal 渲染到 body
  return createPortal(
    <OnboardingStep
      config={currentStep}
      currentStep={currentStepIndex + 1}
      totalSteps={config.steps.length}
      visible={active}
      onNext={handleNext}
      onSkip={handleSkip}
      isLastStep={isLastStep}
    />,
    document.body
  );
}
