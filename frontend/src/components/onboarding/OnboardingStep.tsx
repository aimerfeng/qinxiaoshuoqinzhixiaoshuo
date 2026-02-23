'use client';

import { useEffect, useState, useCallback } from 'react';
import type { OnboardingStepProps, TargetRect } from '@/types/onboarding';
import OnboardingOverlay from './OnboardingOverlay';
import OnboardingTooltip from './OnboardingTooltip';

/**
 * 引导步骤组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.1: 引导组件（高亮遮罩、气泡）
 *
 * 功能：
 * - 组合 Overlay 和 Tooltip 组件
 * - 自动获取目标元素位置
 * - 处理窗口大小变化和滚动
 * - 支持点击目标元素进入下一步
 *
 * 验收标准:
 * - 22.2: WHEN 引导开始 THEN System SHALL 高亮目标元素并显示说明气泡
 */
export default function OnboardingStep({
  config,
  currentStep,
  totalSteps,
  visible,
  onNext,
  onSkip,
  isLastStep = false,
}: OnboardingStepProps) {
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  /**
   * 获取目标元素位置
   */
  const updateTargetRect = useCallback(() => {
    if (!visible || !config.targetSelector) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(config.targetSelector);
    if (!element) {
      console.warn(`[OnboardingStep] Target element not found: ${config.targetSelector}`);
      setTargetRect(null);
      return;
    }

    const rect = element.getBoundingClientRect();
    setTargetRect({
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      bottom: rect.bottom,
      right: rect.right,
    });

    // 确保目标元素在视口内
    const isInViewport =
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth;

    if (!isInViewport) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });

      // 滚动后重新获取位置
      setTimeout(() => {
        const newRect = element.getBoundingClientRect();
        setTargetRect({
          top: newRect.top,
          left: newRect.left,
          width: newRect.width,
          height: newRect.height,
          bottom: newRect.bottom,
          right: newRect.right,
        });
      }, 500);
    }
  }, [visible, config.targetSelector]);

  /**
   * 处理目标元素点击
   */
  const handleTargetClick = useCallback(
    (event: MouseEvent) => {
      if (!visible || !config.allowTargetClick || !config.targetSelector) {
        return;
      }

      const element = document.querySelector(config.targetSelector);
      if (element && element.contains(event.target as Node)) {
        event.preventDefault();
        event.stopPropagation();
        onNext?.();
      }
    },
    [visible, config.allowTargetClick, config.targetSelector, onNext]
  );

  // 初始化和更新目标位置
  useEffect(() => {
    updateTargetRect();

    // 监听窗口变化
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [updateTargetRect]);

  // 监听目标元素点击
  useEffect(() => {
    if (config.allowTargetClick) {
      document.addEventListener('click', handleTargetClick, true);
      return () => {
        document.removeEventListener('click', handleTargetClick, true);
      };
    }
    return undefined;
  }, [config.allowTargetClick, handleTargetClick]);

  // 禁止页面滚动
  useEffect(() => {
    if (visible) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
    return undefined;
  }, [visible]);

  return (
    <>
      <OnboardingOverlay
        targetRect={targetRect}
        visible={visible}
        onOverlayClick={onSkip}
        padding={config.highlightPadding ?? 8}
        allowClickToSkip={config.showSkipButton !== false}
      />
      <OnboardingTooltip
        targetRect={targetRect}
        visible={visible}
        title={config.title}
        description={config.description}
        currentStep={currentStep}
        totalSteps={totalSteps}
        position={config.position}
        nextButtonText={config.nextButtonText}
        showSkipButton={config.showSkipButton !== false}
        onNext={onNext}
        onSkip={onSkip}
        isLastStep={isLastStep}
      />
    </>
  );
}
