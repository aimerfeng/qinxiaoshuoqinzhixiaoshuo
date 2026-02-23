'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import OnboardingTour from './OnboardingTour';
import { createHomepageTourConfig, HOMEPAGE_DATA_ATTRIBUTES } from './tours/homepage-tour';
import { useOnboarding } from '@/hooks';
import { GuideType } from '@/types/onboarding';
import { cn } from '@/utils/cn';

/**
 * 首页引导流程组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.3: 首页引导流程
 *
 * 功能：
 * - 导航栏步骤 - 介绍主导航区域
 * - 搜索功能步骤 - 展示搜索功能
 * - 推荐内容步骤 - 高亮个性化推荐
 * - 分类浏览步骤 - 展示内容分类
 * - 用户菜单步骤 - 个人资料、设置、通知
 *
 * 验收标准:
 * - 22.1: WHEN 新用户首次进入首页 THEN System SHALL 启动首页引导流程
 * - 22.2: WHEN 引导步骤显示 THEN System SHALL 高亮目标区域并显示说明气泡
 * - 22.3: WHEN 用户完成引导步骤 THEN System SHALL 自动进入下一步或结束引导
 * - 22.4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
 */

interface HomepageOnboardingProps {
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
 * 分类选项
 */
const CATEGORY_OPTIONS = [
  { id: 'fantasy', label: '玄幻', icon: '🐉', color: 'from-purple-500 to-indigo-500' },
  { id: 'romance', label: '言情', icon: '💕', color: 'from-pink-500 to-rose-500' },
  { id: 'scifi', label: '科幻', icon: '🚀', color: 'from-cyan-500 to-blue-500' },
  { id: 'mystery', label: '悬疑', icon: '🔍', color: 'from-amber-500 to-orange-500' },
  { id: 'urban', label: '都市', icon: '🏙️', color: 'from-slate-500 to-gray-500' },
  { id: 'history', label: '历史', icon: '📜', color: 'from-yellow-600 to-amber-600' },
];

/**
 * 推荐作品示例
 */
const SAMPLE_RECOMMENDATIONS = [
  { id: '1', title: '星辰变', author: '我吃西红柿', cover: '🌟', rating: 4.8 },
  { id: '2', title: '斗破苍穹', author: '天蚕土豆', cover: '🔥', rating: 4.9 },
  { id: '3', title: '完美世界', author: '辰东', cover: '🌍', rating: 4.7 },
];

export default function HomepageOnboarding({
  autoStart = true,
  onComplete,
  onSkip,
  showDemoTargets = false,
}: HomepageOnboardingProps) {
  const { shouldShowGuide, completeGuide } = useOnboarding();
  const [isActive, setIsActive] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // 检查是否应该显示引导
  useEffect(() => {
    if (autoStart) {
      const checkGuide = async () => {
        const shouldShow = await shouldShowGuide(GuideType.HOMEPAGE);
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
      await completeGuide(GuideType.HOMEPAGE);
    } catch (error) {
      console.error('[HomepageOnboarding] Failed to complete guide:', error);
    }

    onComplete?.();
  }, [completeGuide, onComplete]);

  /**
   * 步骤变化回调
   */
  const handleStepChange = useCallback((step: number) => {
    console.log('[HomepageOnboarding] Step changed to:', step);
  }, []);

  // 创建引导配置
  const tourConfig = createHomepageTourConfig({
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
                  'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                )}
              >
                {/* 装饰元素 - 星星 */}
                <div className="absolute inset-0">
                  {[...Array(15)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 bg-white/60 rounded-full"
                      style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                      }}
                      animate={{
                        opacity: [0.3, 1, 0.3],
                        scale: [0.8, 1.2, 0.8],
                      }}
                      transition={{
                        duration: 2 + Math.random() * 2,
                        repeat: Infinity,
                        delay: Math.random() * 2,
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
                    🏠
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
                  探索首页功能 🎯
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center text-gray-600 dark:text-gray-300 mb-5 text-sm"
                >
                  让我们快速了解首页的核心功能，
                  <br />
                  帮助你更高效地发现精彩内容！
                </motion.p>

                {/* 功能预览 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-5 gap-2 mb-5"
                >
                  {[
                    { icon: '🧭', label: '导航' },
                    { icon: '🔍', label: '搜索' },
                    { icon: '✨', label: '推荐' },
                    { icon: '📚', label: '分类' },
                    { icon: '👤', label: '我的' },
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
                      <span className="text-xl">{item.icon}</span>
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
      {(isActive || showDemoTargets) && (
        <HomepageOnboardingTargets />
      )}
    </>
  );
}


/**
 * 首页引导目标元素组件
 * 提供引导流程中需要高亮的目标元素（演示用）
 * 
 * 注意：在实际使用中，这些 data-onboarding 属性应该添加到
 * 真实的页面元素上（如 Header、SearchBar 等组件）
 */
function HomepageOnboardingTargets() {
  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      {/* 导航栏 - 顶部 */}
      <div
        data-onboarding={HOMEPAGE_DATA_ATTRIBUTES.NAVIGATION}
        className={cn(
          'absolute top-0 left-0 right-0',
          'h-16 px-4',
          'bg-white/95 dark:bg-gray-900/95',
          'backdrop-blur-md',
          'border-b border-gray-200/50 dark:border-gray-700/50',
          'flex items-center justify-between',
          'pointer-events-auto'
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-8 h-8 rounded-lg',
              'bg-gradient-to-br from-indigo-500 to-purple-500',
              'flex items-center justify-center',
              'text-white text-sm font-bold'
            )}
          >
            PA
          </div>
          <span className="font-semibold text-gray-900 dark:text-white">
            Project Anima
          </span>
        </div>

        {/* 导航链接 */}
        <div className="hidden md:flex items-center gap-6">
          {['首页', '广场', '发现', '创作'].map((item) => (
            <button
              key={item}
              className={cn(
                'text-sm text-gray-600 dark:text-gray-300',
                'hover:text-indigo-500 dark:hover:text-indigo-400',
                'transition-colors'
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {/* 占位 */}
        <div className="w-8" />
      </div>

      {/* 搜索框 - 导航栏下方 */}
      <div
        data-onboarding={HOMEPAGE_DATA_ATTRIBUTES.SEARCH}
        className={cn(
          'absolute top-20 left-1/2 -translate-x-1/2',
          'w-[90%] max-w-xl',
          'pointer-events-auto'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3',
            'rounded-2xl',
            'bg-white dark:bg-gray-800',
            'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50',
            'border border-gray-200/50 dark:border-gray-700/50'
          )}
        >
          <span className="text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="搜索作品、作者、标签..."
            className={cn(
              'flex-1 bg-transparent',
              'text-sm text-gray-900 dark:text-white',
              'placeholder:text-gray-400',
              'outline-none'
            )}
            readOnly
          />
          <span
            className={cn(
              'px-2 py-1 rounded-lg',
              'bg-gray-100 dark:bg-gray-700',
              'text-xs text-gray-500 dark:text-gray-400'
            )}
          >
            ⌘K
          </span>
        </div>
      </div>

      {/* 推荐内容区域 - 中间 */}
      <div
        data-onboarding={HOMEPAGE_DATA_ATTRIBUTES.RECOMMENDATIONS}
        className={cn(
          'absolute top-40 left-1/2 -translate-x-1/2',
          'w-[90%] max-w-2xl p-4',
          'rounded-2xl',
          'bg-white dark:bg-gray-800',
          'shadow-lg',
          'pointer-events-auto'
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <span>✨</span>
            <span>为你推荐</span>
          </h3>
          <button className="text-xs text-indigo-500 hover:text-indigo-600">
            查看更多 →
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {SAMPLE_RECOMMENDATIONS.map((work) => (
            <div
              key={work.id}
              className={cn(
                'p-3 rounded-xl',
                'bg-gray-50 dark:bg-gray-700/50',
                'hover:bg-gray-100 dark:hover:bg-gray-700',
                'transition-colors cursor-pointer'
              )}
            >
              <div
                className={cn(
                  'w-full aspect-[3/4] rounded-lg mb-2',
                  'bg-gradient-to-br from-indigo-100 to-purple-100',
                  'dark:from-indigo-900/30 dark:to-purple-900/30',
                  'flex items-center justify-center',
                  'text-3xl'
                )}
              >
                {work.cover}
              </div>
              <h4 className="text-xs font-medium text-gray-900 dark:text-white truncate">
                {work.title}
              </h4>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                {work.author}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] text-yellow-500">⭐</span>
                <span className="text-[10px] text-gray-600 dark:text-gray-300">
                  {work.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分类区域 - 推荐下方 */}
      <div
        data-onboarding={HOMEPAGE_DATA_ATTRIBUTES.CATEGORIES}
        className={cn(
          'absolute bottom-32 left-1/2 -translate-x-1/2',
          'w-[90%] max-w-2xl p-4',
          'rounded-2xl',
          'bg-white dark:bg-gray-800',
          'shadow-lg',
          'pointer-events-auto'
        )}
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <span>📚</span>
          <span>热门分类</span>
        </h3>

        <div className="grid grid-cols-6 gap-2">
          {CATEGORY_OPTIONS.map((category) => (
            <button
              key={category.id}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2',
                'rounded-xl',
                'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                'transition-colors'
              )}
            >
              <div
                className={cn(
                  'w-10 h-10 rounded-xl',
                  `bg-gradient-to-br ${category.color}`,
                  'flex items-center justify-center',
                  'text-lg'
                )}
              >
                {category.icon}
              </div>
              <span className="text-[10px] text-gray-600 dark:text-gray-300">
                {category.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 用户菜单 - 右上角 */}
      <div
        data-onboarding={HOMEPAGE_DATA_ATTRIBUTES.USER_MENU}
        className={cn(
          'absolute top-3 right-4',
          'flex items-center gap-3',
          'pointer-events-auto'
        )}
      >
        {/* 通知图标 */}
        <button
          className={cn(
            'relative w-9 h-9 rounded-xl',
            'bg-gray-100 dark:bg-gray-700',
            'flex items-center justify-center',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            'transition-colors'
          )}
        >
          <span className="text-sm">🔔</span>
          <span
            className={cn(
              'absolute -top-1 -right-1',
              'w-4 h-4 rounded-full',
              'bg-red-500 text-white',
              'text-[10px] font-medium',
              'flex items-center justify-center'
            )}
          >
            3
          </span>
        </button>

        {/* 消息图标 */}
        <button
          className={cn(
            'w-9 h-9 rounded-xl',
            'bg-gray-100 dark:bg-gray-700',
            'flex items-center justify-center',
            'hover:bg-gray-200 dark:hover:bg-gray-600',
            'transition-colors'
          )}
        >
          <span className="text-sm">💬</span>
        </button>

        {/* 用户头像 */}
        <button
          className={cn(
            'w-9 h-9 rounded-xl overflow-hidden',
            'bg-gradient-to-br from-indigo-400 to-purple-400',
            'flex items-center justify-center',
            'text-white text-sm font-medium',
            'hover:opacity-90',
            'transition-opacity'
          )}
        >
          U
        </button>
      </div>
    </div>
  );
}

/**
 * 导出数据属性常量，供其他组件使用
 */
export { HOMEPAGE_DATA_ATTRIBUTES };
