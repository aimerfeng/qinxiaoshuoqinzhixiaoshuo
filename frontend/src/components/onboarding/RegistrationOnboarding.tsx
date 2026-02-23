'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import OnboardingTour from './OnboardingTour';
import { createRegistrationTourConfig, REGISTRATION_DATA_ATTRIBUTES } from './tours/registration-tour';
import { useOnboarding } from '@/hooks';
import { GuideType } from '@/types/onboarding';
import { cn } from '@/utils/cn';

/**
 * 注册引导流程组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.2: 注册引导流程
 *
 * 功能：
 * - 欢迎步骤 - 介绍平台
 * - 资料设置步骤 - 引导完善资料
 * - 兴趣选择步骤 - 选择阅读偏好/类型
 * - 首次行动步骤 - 鼓励首次互动
 *
 * 验收标准:
 * - 22.1: WHEN 新用户完成注册 THEN System SHALL 启动注册引导流程
 * - 22.7: WHEN 用户完成所有引导 THEN System SHALL 发放"新手毕业"成就徽章
 */

interface RegistrationOnboardingProps {
  /** 是否自动启动引导 */
  autoStart?: boolean;
  /** 完成回调 */
  onComplete?: () => void;
  /** 跳过回调 */
  onSkip?: () => void;
}

/**
 * 兴趣标签选项
 */
const INTEREST_OPTIONS = [
  { id: 'fantasy', label: '玄幻', icon: '🐉' },
  { id: 'romance', label: '言情', icon: '💕' },
  { id: 'scifi', label: '科幻', icon: '🚀' },
  { id: 'mystery', label: '悬疑', icon: '🔍' },
  { id: 'urban', label: '都市', icon: '🏙️' },
  { id: 'history', label: '历史', icon: '📜' },
  { id: 'game', label: '游戏', icon: '🎮' },
  { id: 'sports', label: '竞技', icon: '⚽' },
  { id: 'comedy', label: '轻喜剧', icon: '😄' },
  { id: 'horror', label: '恐怖', icon: '👻' },
  { id: 'manga', label: '漫画', icon: '📖' },
  { id: 'lightnovel', label: '轻小说', icon: '✨' },
];

export default function RegistrationOnboarding({
  autoStart = true,
  onComplete,
  onSkip,
}: RegistrationOnboardingProps) {
  const { shouldShowGuide, completeGuide } = useOnboarding();
  const [isActive, setIsActive] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // 检查是否应该显示引导
  useEffect(() => {
    if (autoStart) {
      const checkGuide = async () => {
        const shouldShow = await shouldShowGuide(GuideType.REGISTRATION);
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
      await completeGuide(GuideType.REGISTRATION);
    } catch (error) {
      console.error('[RegistrationOnboarding] Failed to complete guide:', error);
    }
    
    onComplete?.();
  }, [completeGuide, onComplete]);

  /**
   * 切换兴趣选择
   */
  const toggleInterest = useCallback((interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    );
  }, []);

  /**
   * 步骤变化回调
   */
  const handleStepChange = useCallback((step: number) => {
    console.log('[RegistrationOnboarding] Step changed to:', step);
  }, []);

  // 创建引导配置
  const tourConfig = createRegistrationTourConfig({
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
                  'relative h-32 overflow-hidden',
                  'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
                )}
              >
                {/* 装饰元素 */}
                <div className="absolute inset-0">
                  {/* 星星装饰 */}
                  {[...Array(12)].map((_, i) => (
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

                {/* Logo/图标 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    className={cn(
                      'w-20 h-20 rounded-2xl',
                      'bg-white/20 backdrop-blur-sm',
                      'flex items-center justify-center',
                      'text-4xl'
                    )}
                  >
                    ✨
                  </motion.div>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="p-6">
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2"
                >
                  欢迎加入 Project Anima!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-center text-gray-600 dark:text-gray-300 mb-6"
                >
                  让我们花一分钟了解平台功能，
                  <br />
                  开启你的二次元创作之旅！
                </motion.p>

                {/* 功能亮点 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="grid grid-cols-3 gap-3 mb-6"
                >
                  {[
                    { icon: '📚', label: '沉浸阅读' },
                    { icon: '✍️', label: '创作发布' },
                    { icon: '💬', label: '社区互动' },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className={cn(
                        'flex flex-col items-center gap-1 p-3',
                        'rounded-xl',
                        'bg-gray-50 dark:bg-gray-700/50'
                      )}
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span className="text-xs text-gray-600 dark:text-gray-300">
                        {item.label}
                      </span>
                    </div>
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
                    开始引导 ✨
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
                    稍后再说
                  </button>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 引导流程 */}
      <OnboardingTour config={tourConfig} active={isActive} />

      {/* 示例目标元素（用于演示，实际使用时这些元素应该在页面中） */}
      {isActive && (
        <RegistrationOnboardingTargets
          selectedInterests={selectedInterests}
          onToggleInterest={toggleInterest}
        />
      )}
    </>
  );
}

/**
 * 注册引导目标元素组件
 * 提供引导流程中需要高亮的目标元素
 */
interface RegistrationOnboardingTargetsProps {
  selectedInterests: string[];
  onToggleInterest: (id: string) => void;
}

function RegistrationOnboardingTargets({
  selectedInterests,
  onToggleInterest,
}: RegistrationOnboardingTargetsProps) {
  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none">
      {/* 欢迎横幅 - 顶部 */}
      <div
        data-onboarding={REGISTRATION_DATA_ATTRIBUTES.WELCOME_BANNER}
        className={cn(
          'absolute top-20 left-1/2 -translate-x-1/2',
          'w-[90%] max-w-2xl p-6',
          'rounded-2xl',
          'bg-gradient-to-r from-indigo-500/10 to-purple-500/10',
          'backdrop-blur-sm',
          'border border-indigo-500/20',
          'pointer-events-auto'
        )}
      >
        <div className="flex items-center gap-4">
          <div className="text-4xl">🎊</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              欢迎来到 Project Anima
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              二次元创作者和读者的精神家园
            </p>
          </div>
        </div>
      </div>

      {/* 头像设置区域 - 左侧 */}
      <div
        data-onboarding={REGISTRATION_DATA_ATTRIBUTES.PROFILE_AVATAR}
        className={cn(
          'absolute top-1/3 left-8',
          'w-32 h-32',
          'rounded-2xl',
          'bg-white dark:bg-gray-800',
          'shadow-lg',
          'flex flex-col items-center justify-center gap-2',
          'pointer-events-auto',
          'cursor-pointer',
          'hover:shadow-xl transition-shadow'
        )}
      >
        <div
          className={cn(
            'w-16 h-16 rounded-full',
            'bg-gradient-to-br from-indigo-400 to-purple-400',
            'flex items-center justify-center',
            'text-2xl text-white'
          )}
        >
          👤
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">点击上传头像</span>
      </div>

      {/* 兴趣标签区域 - 中间 */}
      <div
        data-onboarding={REGISTRATION_DATA_ATTRIBUTES.INTEREST_TAGS}
        className={cn(
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
          'w-[90%] max-w-lg p-6',
          'rounded-2xl',
          'bg-white dark:bg-gray-800',
          'shadow-lg',
          'pointer-events-auto'
        )}
      >
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          选择你感兴趣的类型
        </h4>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((interest) => (
            <button
              key={interest.id}
              onClick={() => onToggleInterest(interest.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm',
                'transition-all duration-200',
                selectedInterests.includes(interest.id)
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
            >
              {interest.icon} {interest.label}
            </button>
          ))}
        </div>
      </div>

      {/* 探索按钮 - 底部 */}
      <div
        data-onboarding={REGISTRATION_DATA_ATTRIBUTES.EXPLORE_BUTTON}
        className={cn(
          'absolute bottom-20 left-1/2 -translate-x-1/2',
          'pointer-events-auto'
        )}
      >
        <button
          className={cn(
            'px-8 py-3 rounded-xl',
            'bg-gradient-to-r from-indigo-500 to-purple-500',
            'text-white font-medium',
            'shadow-lg shadow-indigo-500/25',
            'hover:opacity-90',
            'transition-all duration-200',
            'flex items-center gap-2'
          )}
        >
          <span>开始探索</span>
          <span>🚀</span>
        </button>
      </div>
    </div>
  );
}

/**
 * 导出数据属性常量，供其他组件使用
 */
export { REGISTRATION_DATA_ATTRIBUTES };
