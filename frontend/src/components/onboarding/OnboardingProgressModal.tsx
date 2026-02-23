'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/cn';
import { useOnboarding } from '@/hooks/useOnboarding';
import type { OnboardingProgress, GuideType } from '@/types/onboarding';
import OnboardingProgressCard from './OnboardingProgressCard';
import OnboardingGuideList from './OnboardingGuideList';
import OnboardingRewardsSection from './OnboardingRewardsSection';

/**
 * 引导进度管理弹窗
 *
 * 需求22: 新手引导系统
 * 任务22.2.6: 引导进度管理
 *
 * 功能：
 * - 查看整体引导进度
 * - 查看各引导完成状态
 * - 手动触发/重播引导
 * - 查看已获得奖励
 * - 重置进度（用于测试/重新学习）
 *
 * 验收标准:
 * - 22.6: WHEN 用户主动查看帮助 THEN System SHALL 提供重新观看引导的入口
 * - 22.7: WHEN 用户完成所有引导 THEN System SHALL 发放"新手毕业"成就徽章
 * - 22.8: THE System SHALL 记录引导完成率用于产品优化分析
 *
 * 设计规范：
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */

interface OnboardingProgressModalProps {
  /** 是否显示弹窗 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 开始引导回调 */
  onStartGuide?: (guideType: GuideType | string) => void;
}

export default function OnboardingProgressModal({
  isOpen,
  onClose,
  onStartGuide,
}: OnboardingProgressModalProps) {
  const {
    loading,
    getAllProgress,
    resetProgress,
  } = useOnboarding();

  const [progressList, setProgressList] = useState<OnboardingProgress[]>([]);
  const [isResetting, setIsResetting] = useState<string | null>(null);

  // 加载所有进度数据
  useEffect(() => {
    if (isOpen) {
      getAllProgress().then((data) => {
        setProgressList(data);
      });
    }
  }, [isOpen, getAllProgress]);

  // 计算完成状态
  const completedGuides = progressList
    .filter((p) => p.completedAt !== null)
    .map((p) => p.guideType);
  const totalGuides = 4; // REGISTRATION, HOMEPAGE, READER, CREATION
  const allGuidesCompleted = completedGuides.length === totalGuides;

  // 处理开始引导
  const handleStartGuide = useCallback((guideType: GuideType | string) => {
    onClose();
    onStartGuide?.(guideType);
  }, [onClose, onStartGuide]);

  // 处理重置引导
  const handleResetGuide = useCallback(async (guideType: GuideType | string) => {
    setIsResetting(guideType as string);
    try {
      await resetProgress(guideType);
      // 重新加载进度
      const data = await getAllProgress();
      setProgressList(data);
    } finally {
      setIsResetting(null);
    }
  }, [resetProgress, getAllProgress]);

  // 处理重置所有引导
  const handleResetAll = useCallback(async () => {
    const guideTypes = ['REGISTRATION', 'HOMEPAGE', 'READER', 'CREATION'];
    setIsResetting('all');
    try {
      for (const guideType of guideTypes) {
        await resetProgress(guideType);
      }
      // 重新加载进度
      const data = await getAllProgress();
      setProgressList(data);
    } finally {
      setIsResetting(null);
    }
  }, [resetProgress, getAllProgress]);

  // 动画变体
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0 },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 背景遮罩 */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={overlayVariants}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 弹窗内容 */}
          <motion.div
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={modalVariants}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className={cn(
              'relative w-full max-w-2xl max-h-[85vh] overflow-hidden',
              'rounded-3xl',
              'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800',
              'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]',
              'border border-white/20 dark:border-gray-700/50'
            )}
          >
            {/* 背景装饰 */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-3xl" />
            </div>

            {/* 头部 */}
            <div className="relative px-6 py-5 border-b border-gray-200/50 dark:border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    新手引导中心
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    查看引导进度、重播引导或领取奖励
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className={cn(
                    'p-2 rounded-xl',
                    'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300',
                    'hover:bg-gray-100 dark:hover:bg-gray-800',
                    'transition-all duration-200'
                  )}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* 内容区域 */}
            <div className="relative overflow-y-auto max-h-[calc(85vh-140px)] p-6 space-y-6">
              {/* 进度卡片 */}
              <OnboardingProgressCard
                completedCount={completedGuides.length}
                totalCount={totalGuides}
                loading={loading}
              />

              {/* 两列布局 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 引导列表 */}
                <OnboardingGuideList
                  progressList={progressList}
                  loading={loading}
                  onStartGuide={handleStartGuide}
                  onResetGuide={handleResetGuide}
                />

                {/* 奖励区域 */}
                <OnboardingRewardsSection
                  completedGuides={completedGuides}
                  allGuidesCompleted={allGuidesCompleted}
                  loading={loading}
                />
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="relative px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <button
                  onClick={handleResetAll}
                  disabled={isResetting !== null || completedGuides.length === 0}
                  className={cn(
                    'px-4 py-2 rounded-xl text-sm font-medium',
                    'text-gray-500 dark:text-gray-400',
                    'hover:text-red-500 dark:hover:text-red-400',
                    'hover:bg-red-50 dark:hover:bg-red-900/20',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'transition-all duration-200'
                  )}
                >
                  {isResetting === 'all' ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      重置中...
                    </span>
                  ) : (
                    '重置所有进度'
                  )}
                </button>

                <button
                  onClick={onClose}
                  className={cn(
                    'px-5 py-2 rounded-xl text-sm font-medium',
                    'bg-gradient-to-r from-indigo-500 to-purple-500',
                    'text-white',
                    'hover:opacity-90',
                    'shadow-md hover:shadow-lg',
                    'transition-all duration-200'
                  )}
                >
                  完成
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
