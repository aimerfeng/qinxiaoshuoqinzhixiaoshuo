'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { OnboardingOverlayProps } from '@/types/onboarding';

/**
 * 引导遮罩组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.1: 引导组件（高亮遮罩、气泡）
 *
 * 功能：
 * - 全屏半透明黑色遮罩
 * - 目标区域镂空高亮效果
 * - 点击遮罩可选择跳过
 *
 * 验收标准:
 * - 22.2: WHEN 引导开始 THEN System SHALL 高亮目标元素并显示说明气泡
 */
export default function OnboardingOverlay({
  targetRect,
  visible,
  onOverlayClick,
  padding = 8,
  allowClickToSkip = true,
}: OnboardingOverlayProps) {
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

  const handleOverlayClick = () => {
    if (allowClickToSkip && onOverlayClick) {
      onOverlayClick();
    }
  };

  // 计算镂空区域
  const getClipPath = () => {
    if (!targetRect || windowSize.width === 0) {
      return 'none';
    }

    const { top, left, width, height } = targetRect;
    const paddedTop = Math.max(0, top - padding);
    const paddedLeft = Math.max(0, left - padding);
    const paddedWidth = width + padding * 2;
    const paddedHeight = height + padding * 2;
    const borderRadius = 12; // 大圆角设计

    // 使用 SVG path 创建圆角矩形镂空
    // 外框是整个屏幕，内框是圆角矩形镂空区域
    return `
      M 0 0
      L ${windowSize.width} 0
      L ${windowSize.width} ${windowSize.height}
      L 0 ${windowSize.height}
      Z
      M ${paddedLeft + borderRadius} ${paddedTop}
      L ${paddedLeft + paddedWidth - borderRadius} ${paddedTop}
      Q ${paddedLeft + paddedWidth} ${paddedTop} ${paddedLeft + paddedWidth} ${paddedTop + borderRadius}
      L ${paddedLeft + paddedWidth} ${paddedTop + paddedHeight - borderRadius}
      Q ${paddedLeft + paddedWidth} ${paddedTop + paddedHeight} ${paddedLeft + paddedWidth - borderRadius} ${paddedTop + paddedHeight}
      L ${paddedLeft + borderRadius} ${paddedTop + paddedHeight}
      Q ${paddedLeft} ${paddedTop + paddedHeight} ${paddedLeft} ${paddedTop + paddedHeight - borderRadius}
      L ${paddedLeft} ${paddedTop + borderRadius}
      Q ${paddedLeft} ${paddedTop} ${paddedLeft + borderRadius} ${paddedTop}
      Z
    `;
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed inset-0 z-[9998]"
          onClick={handleOverlayClick}
          style={{ cursor: allowClickToSkip ? 'pointer' : 'default' }}
        >
          {/* SVG 遮罩层 */}
          <svg
            className="absolute inset-0 w-full h-full"
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <filter id="onboarding-glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <motion.path
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              d={getClipPath()}
              fill="rgba(0, 0, 0, 0.75)"
              fillRule="evenodd"
              style={{ pointerEvents: 'auto' }}
            />
          </svg>

          {/* 高亮边框发光效果 */}
          {targetRect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="absolute pointer-events-none"
              style={{
                top: targetRect.top - padding,
                left: targetRect.left - padding,
                width: targetRect.width + padding * 2,
                height: targetRect.height + padding * 2,
                borderRadius: 12,
                boxShadow: `
                  0 0 0 2px rgba(99, 102, 241, 0.8),
                  0 0 20px rgba(99, 102, 241, 0.4),
                  0 0 40px rgba(139, 92, 246, 0.2)
                `,
              }}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
