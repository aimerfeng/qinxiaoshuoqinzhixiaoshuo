'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import OnboardingTour from './OnboardingTour';
import { createReaderTourConfig, READER_DATA_ATTRIBUTES } from './tours/reader-tour';
import { useOnboarding } from '@/hooks';
import { GuideType } from '@/types/onboarding';
import { cn } from '@/utils/cn';

/**
 * 阅读器引导流程组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.4: 阅读器引导流程
 *
 * 功能：
 * - 阅读控制步骤 - 页面导航、滚动模式
 * - 设置面板步骤 - 字体大小、主题、行距
 * - 书签功能步骤 - 如何添加书签
 * - 高亮引用步骤 - 如何高亮文本和创建引用
 * - 章节导航步骤 - 跳转章节
 * - 阅读进度步骤 - 进度条和自动保存
 *
 * 验收标准:
 * - 22.1: WHEN 新用户首次进入阅读器 THEN System SHALL 启动阅读器引导流程
 * - 22.2: WHEN 引导步骤显示 THEN System SHALL 高亮目标区域并显示说明气泡
 * - 22.3: WHEN 用户完成引导步骤 THEN System SHALL 自动进入下一步或结束引导
 * - 22.4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
 */

interface ReaderOnboardingProps {
  /** 是否自动启动引导 */
  autoStart?: boolean;
  /** 完成回调 */
  onComplete?: () => void;
  /** 跳过回调 */
  onSkip?: () => void;
  /** 是否显示演示目标元素（用于独立测试） */
  showDemoTargets?: boolean;
}

/**
 * 示例章节列表
 */
const SAMPLE_CHAPTERS = [
  { id: '1', title: '第一章 初遇', wordCount: 3200 },
  { id: '2', title: '第二章 觉醒', wordCount: 4100 },
  { id: '3', title: '第三章 修炼', wordCount: 3800 },
  { id: '4', title: '第四章 试炼', wordCount: 4500 },
  { id: '5', title: '第五章 突破', wordCount: 3900 },
];

export default function ReaderOnboarding({
  autoStart = true,
  onComplete,
  onSkip,
  showDemoTargets = false,
}: ReaderOnboardingProps) {
  const { shouldShowGuide, completeGuide } = useOnboarding();
  const [isActive, setIsActive] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // 检查是否应该显示引导
  useEffect(() => {
    if (autoStart) {
      const checkGuide = async () => {
        const shouldShow = await shouldShowGuide(GuideType.READER);
        if (shouldShow) {
          setShowWelcomeModal(true);
        }
      };
      checkGuide();
    }
  }, [autoStart, shouldShowGuide]);

  /**
   * 开始引导流程
   */
  const handleStartTour = useCallback(() => {
    setShowWelcomeModal(false);
    setIsActive(true);
  }, []);

  /**
   * 跳过引导
   */
  const handleSkipTour = useCallback(() => {
    setShowWelcomeModal(false);
    setIsActive(false);
    onSkip?.();
  }, [onSkip]);

  /**
   * 完成引导
   */
  const handleCompleteTour = useCallback(async () => {
    setIsActive(false);

    // 调用完成引导 API
    try {
      await completeGuide(GuideType.READER);
    } catch (error) {
      console.error('[ReaderOnboarding] Failed to complete guide:', error);
    }

    onComplete?.();
  }, [completeGuide, onComplete]);

  /**
   * 步骤变化回调
   */
  const handleStepChange = useCallback((step: number) => {
    console.log('[ReaderOnboarding] Step changed to:', step);
  }, []);

  // 创建引导配置
  const tourConfig = createReaderTourConfig({
    onComplete: handleCompleteTour,
    onSkip: handleSkipTour,
    onStepChange: handleStepChange,
  });

  return (
    <>
      {/* 欢迎弹窗 */}
      <AnimatePresence>
        {showWelcomeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center"
          >
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={handleSkipTour}
            />

            {/* 欢迎卡片 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
              className={cn(
                'relative z-10 w-full max-w-md mx-4',
                'rounded-2xl overflow-hidden',
                'bg-white dark:bg-gray-800',
                'shadow-[0_20px_60px_rgba(99,102,241,0.3)]'
              )}
            >
              {/* 渐变头部 */}
              <div
                className={cn(
                  'relative h-28 overflow-hidden',
                  'bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-500'
                )}
              >
                {/* 装饰元素 - 书页效果 */}
                <div className="absolute inset-0">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute bg-white/10 rounded"
                      style={{
                        left: `${10 + i * 10}%`,
                        top: `${20 + Math.sin(i) * 20}%`,
                        width: '2px',
                        height: '40px',
                        transform: `rotate(${-15 + i * 3}deg)`,
                      }}
                      animate={{
                        opacity: [0.3, 0.6, 0.3],
                        y: [0, -5, 0],
                      }}
                      transition={{
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>

                {/* 图标 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className={cn(
                      'w-16 h-16 rounded-2xl',
                      'bg-white/20 backdrop-blur-sm',
                      'flex items-center justify-center',
                      'text-3xl'
                    )}
                  >
                    📖
                  </motion.div>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="p-6">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2"
                >
                  探索阅读器功能 📚
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center text-gray-600 dark:text-gray-300 mb-5 text-sm"
                >
                  让我们快速了解阅读器的核心功能，
                  <br />
                  打造你的专属沉浸式阅读体验！
                </motion.p>

                {/* 功能预览 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-6 gap-2 mb-5"
                >
                  {[
                    { icon: '📖', label: '控制' },
                    { icon: '⚙️', label: '设置' },
                    { icon: '🔖', label: '书签' },
                    { icon: '✨', label: '高亮' },
                    { icon: '📑', label: '目录' },
                    { icon: '📊', label: '进度' },
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.5 + index * 0.05 }}
                      className={cn(
                        'flex flex-col items-center gap-1 py-2',
                        'rounded-xl',
                        'bg-gray-50 dark:bg-gray-700/50'
                      )}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {item.label}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>

                {/* 操作按钮 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col gap-3"
                >
                  <button
                    onClick={handleStartTour}
                    className={cn(
                      'w-full py-3 px-4 rounded-xl',
                      'bg-gradient-to-r from-indigo-500 to-purple-500',
                      'text-white font-medium',
                      'hover:opacity-90',
                      'shadow-lg shadow-indigo-500/25',
                      'transition-all duration-200',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:ring-offset-2'
                    )}
                  >
                    开始了解 🚀
                  </button>

                  <button
                    onClick={handleSkipTour}
                    className={cn(
                      'w-full py-2 px-4',
                      'text-gray-500 dark:text-gray-400 text-sm',
                      'hover:text-gray-700 dark:hover:text-gray-200',
                      'transition-colors duration-200'
                    )}
                  >
                    我已经很熟悉了
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 引导流程 */}
      <OnboardingTour config={tourConfig} active={isActive} />

      {/* 演示目标元素（用于独立测试） */}
      {(isActive || showDemoTargets) && <ReaderOnboardingTargets />}
    </>
  );
}


/**
 * 阅读器引导目标元素组件
 * 提供引导流程中需要高亮的目标元素（演示用）
 *
 * 注意：在实际使用中，这些 data-onboarding 属性应该添加到
 * 真实的阅读器元素上（如 ReaderControls、SettingsPanel 等组件）
 */
function ReaderOnboardingTargets() {
  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      {/* 模拟阅读器背景 */}
      <div className="absolute inset-0 bg-amber-50/95 dark:bg-gray-900/95" />

      {/* 阅读控制区域 - 顶部中央 */}
      <div
        data-onboarding={READER_DATA_ATTRIBUTES.CONTROLS}
        className={cn(
          'absolute top-4 left-1/2 -translate-x-1/2',
          'flex items-center gap-2 px-4 py-2',
          'rounded-2xl',
          'bg-white/90 dark:bg-gray-800/90',
          'backdrop-blur-md',
          'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
          'border border-gray-200/50 dark:border-gray-700/50',
          'pointer-events-auto'
        )}
      >
        {/* 翻页模式 */}
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl',
            'bg-indigo-100 dark:bg-indigo-900/30',
            'text-indigo-600 dark:text-indigo-400',
            'text-sm font-medium'
          )}
        >
          <span>📄</span>
          <span>翻页</span>
        </button>

        {/* 分隔线 */}
        <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

        {/* 滚动模式 */}
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-700/50',
            'text-sm'
          )}
        >
          <span>📜</span>
          <span>滚动</span>
        </button>
      </div>

      {/* 设置按钮 - 右上角 */}
      <div
        data-onboarding={READER_DATA_ATTRIBUTES.SETTINGS}
        className={cn(
          'absolute top-4 right-4',
          'pointer-events-auto'
        )}
      >
        <button
          className={cn(
            'w-10 h-10 rounded-xl',
            'bg-white/90 dark:bg-gray-800/90',
            'backdrop-blur-md',
            'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
            'border border-gray-200/50 dark:border-gray-700/50',
            'flex items-center justify-center',
            'text-gray-600 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-700',
            'transition-colors'
          )}
        >
          <span className="text-lg">⚙️</span>
        </button>
      </div>

      {/* 书签按钮 - 右侧 */}
      <div
        data-onboarding={READER_DATA_ATTRIBUTES.BOOKMARK}
        className={cn(
          'absolute top-20 right-4',
          'pointer-events-auto'
        )}
      >
        <button
          className={cn(
            'w-10 h-10 rounded-xl',
            'bg-white/90 dark:bg-gray-800/90',
            'backdrop-blur-md',
            'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
            'border border-gray-200/50 dark:border-gray-700/50',
            'flex items-center justify-center',
            'text-amber-500',
            'hover:bg-amber-50 dark:hover:bg-amber-900/20',
            'transition-colors'
          )}
        >
          <span className="text-lg">🔖</span>
        </button>
      </div>

      {/* 章节导航 - 左侧 */}
      <div
        data-onboarding={READER_DATA_ATTRIBUTES.CHAPTERS}
        className={cn(
          'absolute top-4 left-4',
          'w-56 p-3',
          'rounded-2xl',
          'bg-white/90 dark:bg-gray-800/90',
          'backdrop-blur-md',
          'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
          'border border-gray-200/50 dark:border-gray-700/50',
          'pointer-events-auto'
        )}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">📑</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            目录
          </span>
        </div>

        <div className="space-y-1 max-h-40 overflow-y-auto">
          {SAMPLE_CHAPTERS.map((chapter, index) => (
            <button
              key={chapter.id}
              className={cn(
                'w-full flex items-center justify-between px-2 py-1.5 rounded-lg',
                'text-left text-xs',
                index === 2
                  ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              )}
            >
              <span className="truncate">{chapter.title}</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-2">
                {(chapter.wordCount / 1000).toFixed(1)}k
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 高亮/引用区域 - 内容区域 */}
      <div
        data-onboarding={READER_DATA_ATTRIBUTES.HIGHLIGHT}
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[90%] max-w-2xl p-6',
          'rounded-2xl',
          'bg-white/80 dark:bg-gray-800/80',
          'backdrop-blur-sm',
          'shadow-lg',
          'pointer-events-auto'
        )}
      >
        {/* 模拟文本内容 */}
        <div className="space-y-4 text-gray-800 dark:text-gray-200 leading-relaxed">
          <p className="text-sm">
            少年站在山巅，望着远方连绵的云海，心中涌起无限豪情。
            这一刻，他终于明白了师父的话——
          </p>

          {/* 高亮的段落 */}
          <div className="relative">
            <p
              className={cn(
                'text-sm px-2 py-1 -mx-2',
                'bg-gradient-to-r from-yellow-200/60 to-amber-200/60',
                'dark:from-yellow-500/20 dark:to-amber-500/20',
                'rounded-lg'
              )}
            >
              "修行之路，不在于追求力量的巅峰，而在于找到内心的平静。
              当你能够在风暴中保持宁静，在混乱中看清本质，
              你便已经踏上了真正的大道。"
            </p>

            {/* 高亮工具栏 */}
            <div
              className={cn(
                'absolute -top-10 left-1/2 -translate-x-1/2',
                'flex items-center gap-1 px-2 py-1',
                'rounded-xl',
                'bg-gray-900 dark:bg-gray-700',
                'shadow-lg'
              )}
            >
              <button className="p-1.5 rounded-lg hover:bg-white/10 text-white text-xs">
                🎨
              </button>
              <button className="p-1.5 rounded-lg hover:bg-white/10 text-white text-xs">
                💬
              </button>
              <button className="p-1.5 rounded-lg hover:bg-white/10 text-white text-xs">
                📤
              </button>
              <div className="w-px h-4 bg-white/20 mx-1" />
              <button className="p-1.5 rounded-lg hover:bg-white/10 text-white text-xs">
                ✨
              </button>
            </div>
          </div>

          <p className="text-sm">
            少年深吸一口气，闭上双眼，感受着天地间流动的灵气。
            他知道，自己的修行之路，才刚刚开始...
          </p>
        </div>
      </div>

      {/* 阅读进度条 - 底部 */}
      <div
        data-onboarding={READER_DATA_ATTRIBUTES.PROGRESS}
        className={cn(
          'absolute bottom-4 left-1/2 -translate-x-1/2',
          'w-[90%] max-w-xl',
          'pointer-events-auto'
        )}
      >
        <div
          className={cn(
            'px-4 py-3 rounded-2xl',
            'bg-white/90 dark:bg-gray-800/90',
            'backdrop-blur-md',
            'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
            'border border-gray-200/50 dark:border-gray-700/50'
          )}
        >
          {/* 进度信息 */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              第三章 修炼
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              42% · 已读 1,596 字
            </span>
          </div>

          {/* 进度条 */}
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={cn(
                'absolute inset-y-0 left-0 w-[42%]',
                'bg-gradient-to-r from-indigo-500 to-purple-500',
                'rounded-full'
              )}
            />
            {/* 书签标记 */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2',
                'w-3 h-3 rounded-full',
                'bg-amber-400 border-2 border-white dark:border-gray-800',
                'shadow-sm'
              )}
              style={{ left: '25%' }}
            />
          </div>

          {/* 自动保存提示 */}
          <div className="flex items-center justify-center gap-1 mt-2">
            <span className="text-[10px] text-green-500">✓</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              进度已自动保存
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 导出数据属性常量，供其他组件使用
 */
export { READER_DATA_ATTRIBUTES };
