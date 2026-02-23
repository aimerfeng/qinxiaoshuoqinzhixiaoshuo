'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import OnboardingTour from './OnboardingTour';
import { createCreatorTourConfig, CREATOR_DATA_ATTRIBUTES } from './tours/creator-tour';
import { useOnboarding } from '@/hooks';
import { GuideType } from '@/types/onboarding';
import { cn } from '@/utils/cn';

/**
 * 创作者引导流程组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.5: 创作引导流程
 *
 * 功能：
 * - 创建新作品步骤 - 如何开始创建新作品
 * - 编辑器功能步骤 - 富文本编辑器、格式化工具
 * - 章节管理步骤 - 添加/组织章节
 * - 封面上传步骤 - 如何上传封面图片
 * - 标签分类步骤 - 设置类型和标签
 * - 发布设置步骤 - 草稿、定时发布、发布选项
 * - 数据分析步骤 - 在哪里查看读者统计
 *
 * 验收标准:
 * - 22.1: WHEN 新用户首次进入创作者控制台 THEN System SHALL 启动创作引导流程
 * - 22.2: WHEN 引导步骤显示 THEN System SHALL 高亮目标区域并显示说明气泡
 * - 22.3: WHEN 用户完成引导步骤 THEN System SHALL 自动进入下一步或结束引导
 * - 22.4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
 */

interface CreatorOnboardingProps {
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
  { id: '1', title: '第一章 序幕', status: 'published', wordCount: 3200 },
  { id: '2', title: '第二章 相遇', status: 'published', wordCount: 4100 },
  { id: '3', title: '第三章 冒险', status: 'draft', wordCount: 2800 },
];

/**
 * 示例标签
 */
const SAMPLE_TAGS = ['奇幻', '冒险', '热血', '成长'];

export default function CreatorOnboarding({
  autoStart = true,
  onComplete,
  onSkip,
  showDemoTargets = false,
}: CreatorOnboardingProps) {
  const { shouldShowGuide, completeGuide } = useOnboarding();
  const [isActive, setIsActive] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // 检查是否应该显示引导
  useEffect(() => {
    if (autoStart) {
      const checkGuide = async () => {
        const shouldShow = await shouldShowGuide(GuideType.CREATION);
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
      await completeGuide(GuideType.CREATION);
    } catch (error) {
      console.error('[CreatorOnboarding] Failed to complete guide:', error);
    }

    onComplete?.();
  }, [completeGuide, onComplete]);

  /**
   * 步骤变化回调
   */
  const handleStepChange = useCallback((step: number) => {
    console.log('[CreatorOnboarding] Step changed to:', step);
  }, []);

  // 创建引导配置
  const tourConfig = createCreatorTourConfig({
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
                {/* 装饰元素 - 创作笔触效果 */}
                <div className="absolute inset-0">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute bg-white/10 rounded-full"
                      style={{
                        left: `${15 + i * 15}%`,
                        top: `${30 + Math.sin(i * 0.8) * 25}%`,
                        width: `${20 + i * 5}px`,
                        height: '3px',
                        transform: `rotate(${-20 + i * 8}deg)`,
                      }}
                      animate={{
                        opacity: [0.2, 0.5, 0.2],
                        scaleX: [1, 1.2, 1],
                      }}
                      transition={{
                        duration: 2 + Math.random(),
                        repeat: Infinity,
                        delay: i * 0.3,
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
                    ✍️
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
                  开启创作之旅 🚀
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center text-gray-600 dark:text-gray-300 mb-5 text-sm"
                >
                  让我们快速了解创作者控制台的核心功能，
                  <br />
                  帮助你高效创作精彩内容！
                </motion.p>

                {/* 功能预览 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-7 gap-1.5 mb-5"
                >
                  {[
                    { icon: '✨', label: '新建' },
                    { icon: '📝', label: '编辑' },
                    { icon: '📚', label: '章节' },
                    { icon: '🎨', label: '封面' },
                    { icon: '🏷️', label: '标签' },
                    { icon: '🚀', label: '发布' },
                    { icon: '📊', label: '数据' },
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
                    开始了解 🎯
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
      {(isActive || showDemoTargets) && <CreatorOnboardingTargets />}
    </>
  );
}


/**
 * 创作者引导目标元素组件
 * 提供引导流程中需要高亮的目标元素（演示用）
 *
 * 注意：在实际使用中，这些 data-onboarding 属性应该添加到
 * 真实的创作者控制台元素上（如 WorkEditor、ChapterList 等组件）
 */
function CreatorOnboardingTargets() {
  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      {/* 模拟创作者控制台背景 */}
      <div className="absolute inset-0 bg-gray-50/95 dark:bg-gray-900/95" />

      {/* 顶部导航栏 */}
      <div
        className={cn(
          'absolute top-0 left-0 right-0 h-14',
          'bg-white/90 dark:bg-gray-800/90',
          'backdrop-blur-md',
          'border-b border-gray-200/50 dark:border-gray-700/50',
          'flex items-center justify-between px-4'
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">✍️</span>
          <span className="font-medium text-gray-900 dark:text-white">创作者控制台</span>
        </div>

        {/* 数据分析入口 - 右上角 */}
        <div
          data-onboarding={CREATOR_DATA_ATTRIBUTES.ANALYTICS}
          className="pointer-events-auto"
        >
          <button
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-xl',
              'bg-indigo-100 dark:bg-indigo-900/30',
              'text-indigo-600 dark:text-indigo-400',
              'text-sm font-medium',
              'hover:bg-indigo-200 dark:hover:bg-indigo-900/50',
              'transition-colors'
            )}
          >
            <span>📊</span>
            <span>数据分析</span>
          </button>
        </div>
      </div>

      {/* 左侧边栏 - 章节管理 */}
      <div
        data-onboarding={CREATOR_DATA_ATTRIBUTES.CHAPTERS}
        className={cn(
          'absolute top-20 left-4 w-64',
          'rounded-2xl',
          'bg-white/90 dark:bg-gray-800/90',
          'backdrop-blur-md',
          'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
          'border border-gray-200/50 dark:border-gray-700/50',
          'pointer-events-auto'
        )}
      >
        {/* 章节列表头部 */}
        <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">📚</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                章节管理
              </span>
            </div>
            <button
              className={cn(
                'w-6 h-6 rounded-lg',
                'bg-indigo-100 dark:bg-indigo-900/30',
                'text-indigo-600 dark:text-indigo-400',
                'flex items-center justify-center',
                'text-xs'
              )}
            >
              +
            </button>
          </div>
        </div>

        {/* 章节列表 */}
        <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
          {SAMPLE_CHAPTERS.map((chapter, index) => (
            <div
              key={chapter.id}
              className={cn(
                'flex items-center justify-between px-2 py-2 rounded-xl',
                'text-sm',
                index === 2
                  ? 'bg-indigo-100/50 dark:bg-indigo-900/20'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
              )}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-gray-400 text-xs">⋮⋮</span>
                <span className="truncate text-gray-700 dark:text-gray-300">
                  {chapter.title}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">
                  {(chapter.wordCount / 1000).toFixed(1)}k
                </span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    chapter.status === 'published'
                      ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  )}
                >
                  {chapter.status === 'published' ? '已发布' : '草稿'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 创建新作品按钮 - 左上角 */}
      <div
        data-onboarding={CREATOR_DATA_ATTRIBUTES.NEW_WORK}
        className={cn(
          'absolute top-20 left-72',
          'pointer-events-auto'
        )}
      >
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl',
            'bg-gradient-to-r from-indigo-500 to-purple-500',
            'text-white font-medium',
            'shadow-lg shadow-indigo-500/25',
            'hover:opacity-90',
            'transition-all'
          )}
        >
          <span>✨</span>
          <span>创建新作品</span>
        </button>
      </div>

      {/* 编辑器区域 - 中央 */}
      <div
        data-onboarding={CREATOR_DATA_ATTRIBUTES.EDITOR}
        className={cn(
          'absolute top-36 left-72 right-72',
          'rounded-2xl',
          'bg-white/90 dark:bg-gray-800/90',
          'backdrop-blur-md',
          'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
          'border border-gray-200/50 dark:border-gray-700/50',
          'pointer-events-auto'
        )}
      >
        {/* 编辑器工具栏 */}
        <div className="p-3 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center gap-2">
            {/* 模式切换 */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-700/50">
              <button className="px-2 py-1 rounded text-xs bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm">
                所见即所得
              </button>
              <button className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400">
                即时渲染
              </button>
              <button className="px-2 py-1 rounded text-xs text-gray-500 dark:text-gray-400">
                分屏预览
              </button>
            </div>

            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

            {/* 格式化工具 */}
            <div className="flex items-center gap-1">
              {['B', 'I', 'U', 'H1', '📷', '—'].map((tool, i) => (
                <button
                  key={i}
                  className={cn(
                    'w-8 h-8 rounded-lg',
                    'flex items-center justify-center',
                    'text-gray-600 dark:text-gray-400',
                    'hover:bg-gray-100 dark:hover:bg-gray-700/50',
                    'text-xs font-medium'
                  )}
                >
                  {tool}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 编辑器内容区 */}
        <div className="p-4 min-h-[200px]">
          <div className="text-gray-400 dark:text-gray-500 text-sm">
            <p className="mb-2">第三章 冒险</p>
            <p className="text-gray-600 dark:text-gray-400">
              少年踏上了未知的旅途，前方等待他的将是无尽的挑战与机遇...
            </p>
            <p className="mt-4 text-gray-300 dark:text-gray-600">
              | 在这里继续你的创作...
            </p>
          </div>
        </div>

        {/* 字数统计 */}
        <div className="px-4 py-2 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
            <span>字数: 2,847</span>
            <span className="flex items-center gap-1">
              <span className="text-green-500">✓</span>
              自动保存于 12:34
            </span>
          </div>
        </div>
      </div>

      {/* 右侧边栏 - 作品设置 */}
      <div
        className={cn(
          'absolute top-20 right-4 w-64',
          'space-y-4',
          'pointer-events-auto'
        )}
      >
        {/* 封面上传 */}
        <div
          data-onboarding={CREATOR_DATA_ATTRIBUTES.COVER}
          className={cn(
            'rounded-2xl',
            'bg-white/90 dark:bg-gray-800/90',
            'backdrop-blur-md',
            'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
            'border border-gray-200/50 dark:border-gray-700/50',
            'p-3'
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🎨</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              封面
            </span>
          </div>

          <div
            className={cn(
              'aspect-[3/4] rounded-xl',
              'bg-gradient-to-br from-indigo-100 to-purple-100',
              'dark:from-indigo-900/30 dark:to-purple-900/30',
              'border-2 border-dashed border-indigo-300 dark:border-indigo-700',
              'flex flex-col items-center justify-center gap-2',
              'cursor-pointer',
              'hover:border-indigo-400 dark:hover:border-indigo-600',
              'transition-colors'
            )}
          >
            <span className="text-2xl">📷</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              点击上传封面
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              建议 600×800
            </span>
          </div>
        </div>

        {/* 标签与分类 */}
        <div
          data-onboarding={CREATOR_DATA_ATTRIBUTES.TAGS}
          className={cn(
            'rounded-2xl',
            'bg-white/90 dark:bg-gray-800/90',
            'backdrop-blur-md',
            'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
            'border border-gray-200/50 dark:border-gray-700/50',
            'p-3'
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🏷️</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              标签与分类
            </span>
          </div>

          {/* 分类选择 */}
          <div className="mb-3">
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              作品类型
            </label>
            <select
              className={cn(
                'w-full px-3 py-2 rounded-xl',
                'bg-gray-100 dark:bg-gray-700/50',
                'border border-gray-200 dark:border-gray-600',
                'text-sm text-gray-700 dark:text-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
              )}
            >
              <option>奇幻</option>
              <option>都市</option>
              <option>科幻</option>
              <option>历史</option>
            </select>
          </div>

          {/* 标签 */}
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
              标签
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_TAGS.map((tag, i) => (
                <span
                  key={i}
                  className={cn(
                    'px-2 py-1 rounded-lg',
                    'bg-indigo-100 dark:bg-indigo-900/30',
                    'text-indigo-600 dark:text-indigo-400',
                    'text-xs'
                  )}
                >
                  {tag}
                </span>
              ))}
              <button
                className={cn(
                  'px-2 py-1 rounded-lg',
                  'bg-gray-100 dark:bg-gray-700/50',
                  'text-gray-500 dark:text-gray-400',
                  'text-xs',
                  'hover:bg-gray-200 dark:hover:bg-gray-600/50'
                )}
              >
                + 添加
              </button>
            </div>
          </div>
        </div>

        {/* 发布设置 */}
        <div
          data-onboarding={CREATOR_DATA_ATTRIBUTES.PUBLISH}
          className={cn(
            'rounded-2xl',
            'bg-white/90 dark:bg-gray-800/90',
            'backdrop-blur-md',
            'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
            'border border-gray-200/50 dark:border-gray-700/50',
            'p-3'
          )}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">🚀</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              发布设置
            </span>
          </div>

          <div className="space-y-2">
            <button
              className={cn(
                'w-full py-2.5 rounded-xl',
                'bg-gradient-to-r from-indigo-500 to-purple-500',
                'text-white text-sm font-medium',
                'shadow-lg shadow-indigo-500/25',
                'hover:opacity-90',
                'transition-all'
              )}
            >
              立即发布
            </button>

            <div className="flex gap-2">
              <button
                className={cn(
                  'flex-1 py-2 rounded-xl',
                  'bg-gray-100 dark:bg-gray-700/50',
                  'text-gray-600 dark:text-gray-400',
                  'text-xs',
                  'hover:bg-gray-200 dark:hover:bg-gray-600/50'
                )}
              >
                保存草稿
              </button>
              <button
                className={cn(
                  'flex-1 py-2 rounded-xl',
                  'bg-gray-100 dark:bg-gray-700/50',
                  'text-gray-600 dark:text-gray-400',
                  'text-xs',
                  'hover:bg-gray-200 dark:hover:bg-gray-600/50'
                )}
              >
                定时发布
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 导出数据属性常量，供其他组件使用
 */
export { CREATOR_DATA_ATTRIBUTES };
