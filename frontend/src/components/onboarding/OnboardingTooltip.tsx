'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { OnboardingTooltipProps, TooltipPosition, TargetRect } from '@/types/onboarding';
import { cn } from '@/utils/cn';

/**
 * 引导气泡组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.1: 引导组件（高亮遮罩、气泡）
 *
 * 功能：
 * - 标题和描述文本
 * - 步骤指示器（如 "1/4"）
 * - "下一步" 和 "跳过" 按钮
 * - 箭头指向目标元素
 * - 自动定位（根据可用空间选择 top/bottom/left/right）
 *
 * 验收标准:
 * - 22.2: WHEN 引导开始 THEN System SHALL 高亮目标元素并显示说明气泡
 */

const TOOLTIP_WIDTH = 320;
const TOOLTIP_MARGIN = 16;
const ARROW_SIZE = 12;

/**
 * 计算最佳气泡位置
 */
function calculateBestPosition(
  targetRect: TargetRect,
  preferredPosition?: TooltipPosition
): TooltipPosition {
  if (preferredPosition) {
    return preferredPosition;
  }

  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  const spaceTop = targetRect.top;
  const spaceBottom = windowHeight - targetRect.bottom;
  const spaceLeft = targetRect.left;
  const spaceRight = windowWidth - targetRect.right;

  // 优先选择下方，其次上方，再左右
  const spaces = [
    { position: 'bottom' as TooltipPosition, space: spaceBottom },
    { position: 'top' as TooltipPosition, space: spaceTop },
    { position: 'right' as TooltipPosition, space: spaceRight },
    { position: 'left' as TooltipPosition, space: spaceLeft },
  ];

  // 需要至少 200px 的空间来显示气泡
  const minSpace = 200;
  const validSpaces = spaces.filter((s) => s.space >= minSpace);

  if (validSpaces.length > 0) {
    return validSpaces[0].position;
  }

  // 如果都不够，选择空间最大的
  return spaces.sort((a, b) => b.space - a.space)[0].position;
}

/**
 * 计算气泡位置样式
 */
function calculateTooltipStyle(
  targetRect: TargetRect,
  position: TooltipPosition
): React.CSSProperties {
  const centerX = targetRect.left + targetRect.width / 2;
  const centerY = targetRect.top + targetRect.height / 2;

  switch (position) {
    case 'top':
      return {
        bottom: `calc(100vh - ${targetRect.top - TOOLTIP_MARGIN}px)`,
        left: Math.max(TOOLTIP_MARGIN, Math.min(centerX - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN)),
      };
    case 'bottom':
      return {
        top: targetRect.bottom + TOOLTIP_MARGIN,
        left: Math.max(TOOLTIP_MARGIN, Math.min(centerX - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - TOOLTIP_MARGIN)),
      };
    case 'left':
      return {
        top: Math.max(TOOLTIP_MARGIN, centerY - 80),
        right: `calc(100vw - ${targetRect.left - TOOLTIP_MARGIN}px)`,
      };
    case 'right':
      return {
        top: Math.max(TOOLTIP_MARGIN, centerY - 80),
        left: targetRect.right + TOOLTIP_MARGIN,
      };
    default:
      return {};
  }
}

/**
 * 箭头样式
 */
const arrowStyles: Record<TooltipPosition, string> = {
  top: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-t-white/95 border-l-transparent border-r-transparent border-b-transparent',
  bottom: 'top-0 left-1/2 -translate-x-1/2 -translate-y-full border-b-white/95 border-l-transparent border-r-transparent border-t-transparent',
  left: 'right-0 top-1/2 translate-x-full -translate-y-1/2 border-l-white/95 border-t-transparent border-b-transparent border-r-transparent',
  right: 'left-0 top-1/2 -translate-x-full -translate-y-1/2 border-r-white/95 border-t-transparent border-b-transparent border-l-transparent',
};

export default function OnboardingTooltip({
  targetRect,
  visible,
  title,
  description,
  currentStep,
  totalSteps,
  position: preferredPosition,
  nextButtonText = '下一步',
  showSkipButton = true,
  onNext,
  onSkip,
  isLastStep = false,
}: OnboardingTooltipProps) {
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const position = useMemo(() => {
    if (!targetRect) return 'bottom';
    return calculateBestPosition(targetRect, preferredPosition);
  }, [targetRect, preferredPosition]);

  const tooltipStyle = useMemo(() => {
    if (!targetRect || windowSize.width === 0) return {};
    return calculateTooltipStyle(targetRect, position);
  }, [targetRect, position, windowSize]);

  // 动画变体
  const variants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: position === 'top' ? 10 : position === 'bottom' ? -10 : 0,
      x: position === 'left' ? 10 : position === 'right' ? -10 : 0,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
    },
  };

  return (
    <AnimatePresence>
      {visible && targetRect && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={variants}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed z-[9999] w-80"
          style={tooltipStyle}
        >
          {/* 气泡卡片 */}
          <div
            className={cn(
              'relative rounded-2xl p-5',
              'bg-white/95 dark:bg-gray-800/95',
              'backdrop-blur-xl',
              'shadow-[0_8px_32px_rgba(99,102,241,0.2)]',
              'border border-white/20 dark:border-gray-700/50'
            )}
          >
            {/* 箭头 */}
            <div
              className={cn(
                'absolute w-0 h-0',
                'border-solid',
                arrowStyles[position]
              )}
              style={{
                borderWidth: ARROW_SIZE,
              }}
            />

            {/* 步骤指示器 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {/* 步骤点 */}
                <div className="flex gap-1.5">
                  {Array.from({ length: totalSteps }).map((_, index) => (
                    <div
                      key={index}
                      className={cn(
                        'w-2 h-2 rounded-full transition-all duration-300',
                        index + 1 === currentStep
                          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 w-6'
                          : index + 1 < currentStep
                            ? 'bg-indigo-400'
                            : 'bg-gray-200 dark:bg-gray-600'
                      )}
                    />
                  ))}
                </div>
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                {currentStep}/{totalSteps}
              </span>
            </div>

            {/* 标题 */}
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {title}
            </h3>

            {/* 描述 */}
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
              {description}
            </p>

            {/* 操作按钮 */}
            <div className="flex items-center justify-between">
              {showSkipButton ? (
                <button
                  onClick={onSkip}
                  className={cn(
                    'text-sm text-gray-400 dark:text-gray-500',
                    'hover:text-gray-600 dark:hover:text-gray-300',
                    'transition-colors duration-200'
                  )}
                >
                  跳过
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={onNext}
                className={cn(
                  'px-5 py-2 rounded-lg text-sm font-medium',
                  'bg-gradient-to-r from-indigo-500 to-purple-500',
                  'text-white',
                  'hover:opacity-90',
                  'shadow-md hover:shadow-lg',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2'
                )}
              >
                {isLastStep ? '完成' : nextButtonText}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
