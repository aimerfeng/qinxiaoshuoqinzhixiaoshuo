'use client';

import { motion } from 'motion/react';
import { cn } from '@/utils/cn';

/**
 * 引导奖励展示组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.6: 引导进度管理
 *
 * 功能：
 * - 显示已获得的引导奖励
 * - 显示待获得的奖励预览
 * - 新手毕业成就展示
 *
 * 设计规范：
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

/**
 * 奖励配置
 */
const REWARD_CONFIG = {
  /** 每个引导完成奖励 */
  perGuide: 10,
  /** 全部完成额外奖励 */
  allGuidesBonus: 50,
  /** 成就名称 */
  achievementName: '新手毕业',
};

/**
 * 引导类型名称映射
 */
const GUIDE_TYPE_NAMES: Record<string, string> = {
  REGISTRATION: '注册引导',
  HOMEPAGE: '首页引导',
  READER: '阅读引导',
  CREATION: '创作引导',
};

interface RewardItem {
  id: string;
  type: 'guide' | 'achievement';
  name: string;
  tokens: number;
  earned: boolean;
  icon: React.ReactNode;
}

interface OnboardingRewardsSectionProps {
  /** 已完成的引导类型列表 */
  completedGuides: string[];
  /** 是否所有引导都已完成 */
  allGuidesCompleted: boolean;
  /** 是否正在加载 */
  loading?: boolean;
  /** 自定义类名 */
  className?: string;
}

export default function OnboardingRewardsSection({
  completedGuides,
  allGuidesCompleted,
  loading = false,
  className,
}: OnboardingRewardsSectionProps) {
  // 构建奖励列表
  const rewards: RewardItem[] = [
    // 各引导完成奖励
    ...Object.entries(GUIDE_TYPE_NAMES).map(([type, name]) => ({
      id: `guide-${type}`,
      type: 'guide' as const,
      name: `完成${name}`,
      tokens: REWARD_CONFIG.perGuide,
      earned: completedGuides.includes(type),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    })),
    // 新手毕业成就
    {
      id: 'achievement-graduation',
      type: 'achievement',
      name: REWARD_CONFIG.achievementName,
      tokens: REWARD_CONFIG.allGuidesBonus,
      earned: allGuidesCompleted,
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
    },
  ];

  // 计算总奖励
  const totalEarned = rewards
    .filter((r) => r.earned)
    .reduce((sum, r) => sum + r.tokens, 0);
  const totalPossible = rewards.reduce((sum, r) => sum + r.tokens, 0);

  if (loading) {
    return (
      <div className={cn('rounded-2xl p-5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 animate-pulse', className)}>
        <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
      className={cn(
        'relative rounded-2xl p-5',
        'bg-white/80 dark:bg-gray-800/80',
        'backdrop-blur-xl',
        'shadow-[0_8px_32px_rgba(99,102,241,0.1)]',
        'border border-white/20 dark:border-gray-700/50',
        className
      )}
    >
      {/* 标题和总计 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          引导奖励
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-400 dark:text-gray-500">已获得</span>
          <span className="text-sm font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
            {totalEarned}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">/ {totalPossible}</span>
          <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z" />
            <path d="M10 5a1 1 0 011 1v3.586l2.707 2.707a1 1 0 01-1.414 1.414l-3-3A1 1 0 019 10V6a1 1 0 011-1z" />
          </svg>
        </div>
      </div>

      {/* 奖励列表 */}
      <div className="space-y-2">
        {rewards.map((reward, index) => (
          <motion.div
            key={reward.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className={cn(
              'flex items-center gap-3 p-2.5 rounded-xl',
              'transition-all duration-200',
              reward.earned
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20'
                : 'bg-gray-50 dark:bg-gray-800/50',
              reward.type === 'achievement' && 'border border-amber-200/50 dark:border-amber-700/30'
            )}
          >
            {/* 图标 */}
            <div
              className={cn(
                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                reward.earned
                  ? reward.type === 'achievement'
                    ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                    : 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
              )}
            >
              {reward.icon}
            </div>

            {/* 名称 */}
            <div className="flex-1 min-w-0">
              <span
                className={cn(
                  'text-sm font-medium',
                  reward.earned
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {reward.name}
              </span>
              {reward.type === 'achievement' && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                  成就
                </span>
              )}
            </div>

            {/* 奖励数量 */}
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  'text-sm font-semibold',
                  reward.earned
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-300 dark:text-gray-600'
                )}
              >
                +{reward.tokens}
              </span>
              <svg
                className={cn(
                  'w-4 h-4',
                  reward.earned
                    ? 'text-amber-500'
                    : 'text-gray-300 dark:text-gray-600'
                )}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </div>

            {/* 状态标记 */}
            {reward.earned && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* 全部完成提示 */}
      {allGuidesCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="mt-4 p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200/30 dark:border-indigo-700/30"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🎉</span>
            <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
              恭喜你完成了所有新手引导！
            </span>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
