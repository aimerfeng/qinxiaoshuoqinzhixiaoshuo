'use client';

import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import type { OnboardingProgress, GuideType } from '@/types/onboarding';

/**
 * 引导列表组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.6: 引导进度管理
 *
 * 功能：
 * - 显示所有引导的完成状态
 * - 支持手动触发/重播引导
 * - 显示每个引导的步骤进度
 *
 * 设计规范：
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

/**
 * 引导类型配置
 */
const GUIDE_CONFIG: Record<string, {
  title: string;
  description: string;
  icon: React.ReactNode;
  totalSteps: number;
}> = {
  REGISTRATION: {
    title: '注册引导',
    description: '了解如何完善个人资料和选择兴趣标签',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    totalSteps: 4,
  },
  HOMEPAGE: {
    title: '首页引导',
    description: '探索广场、推荐流和搜索功能',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    totalSteps: 5,
  },
  READER: {
    title: '阅读器引导',
    description: '学习段落引用、阅读设置和章节导航',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    totalSteps: 6,
  },
  CREATION: {
    title: '创作引导',
    description: '掌握编辑器功能、发布流程和数据查看',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    totalSteps: 5,
  },
};

interface OnboardingGuideListProps {
  /** 所有引导进度数据 */
  progressList: OnboardingProgress[];
  /** 是否正在加载 */
  loading?: boolean;
  /** 点击开始/重播引导 */
  onStartGuide?: (guideType: GuideType | string) => void;
  /** 点击重置引导 */
  onResetGuide?: (guideType: GuideType | string) => void;
  /** 自定义类名 */
  className?: string;
}

interface GuideItemProps {
  progress: OnboardingProgress | null;
  config: typeof GUIDE_CONFIG[string];
  onStart?: () => void;
  onReset?: () => void;
  index: number;
}

function GuideItem({ progress, config, onStart, onReset, index }: GuideItemProps) {
  const isCompleted = progress?.completedAt !== null;
  const currentStep = progress?.currentStep ?? 0;
  const totalSteps = config.totalSteps;
  const stepProgress = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className={cn(
        'relative rounded-xl p-4',
        'bg-white/60 dark:bg-gray-800/60',
        'backdrop-blur-lg',
        'border border-white/30 dark:border-gray-700/50',
        'hover:bg-white/80 dark:hover:bg-gray-800/80',
        'transition-all duration-200',
        'group'
      )}
    >
      <div className="flex items-start gap-4">
        {/* 图标 */}
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center',
            'transition-all duration-300',
            isCompleted
              ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white'
              : 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 text-indigo-500 dark:text-indigo-400'
          )}
        >
          {isCompleted ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            config.icon
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              {config.title}
            </h4>
            {isCompleted && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                已完成
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            {config.description}
          </p>

          {/* 进度条 */}
          {!isCompleted && currentStep > 0 && (
            <div className="mb-2">
              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 mb-1">
                <span>进度</span>
                <span>{currentStep}/{totalSteps}</span>
              </div>
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stepProgress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                />
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={onStart}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium',
                'transition-all duration-200',
                isCompleted
                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 shadow-md hover:shadow-lg'
              )}
            >
              {isCompleted ? '重新观看' : currentStep > 0 ? '继续' : '开始'}
            </button>
            {isCompleted && onReset && (
              <button
                onClick={onReset}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                重置
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function OnboardingGuideList({
  progressList,
  loading = false,
  onStartGuide,
  onResetGuide,
  className,
}: OnboardingGuideListProps) {
  // 将进度列表转换为 Map 方便查找
  const progressMap = new Map(
    progressList.map((p) => [p.guideType, p])
  );

  // 所有引导类型
  const guideTypes = Object.keys(GUIDE_CONFIG);

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl p-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/30 dark:border-gray-700/50 animate-pulse"
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                <div className="h-3 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn('space-y-3', className)}
    >
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        引导列表
      </h3>
      {guideTypes.map((guideType, index) => (
        <GuideItem
          key={guideType}
          progress={progressMap.get(guideType) ?? null}
          config={GUIDE_CONFIG[guideType]}
          onStart={() => onStartGuide?.(guideType)}
          onReset={() => onResetGuide?.(guideType)}
          index={index}
        />
      ))}
    </motion.div>
  );
}
