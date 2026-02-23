'use client';

import { motion } from 'motion/react';
import { HelpCircle, Lock, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AchievementWithProgress, AchievementCategory } from '@/types/achievement';
import { ACHIEVEMENT_CATEGORY_NAMES, ACHIEVEMENT_CATEGORY_ICONS } from '@/types/achievement';

/**
 * 隐藏成就卡片组件属性
 */
export interface HiddenAchievementCardProps {
  /** 成就数据（包含用户进度） */
  achievement: AchievementWithProgress;
  /** 点击卡片回调 */
  onClick?: (achievement: AchievementWithProgress) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否显示紧凑模式 */
  compact?: boolean;
  /** 是否显示类别提示 */
  showCategoryHint?: boolean;
}

/**
 * 脉冲问号图标组件
 */
function PulsingQuestionMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative">
      {/* 外层脉冲光环 */}
      <motion.div
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={cn(
          'absolute inset-0 rounded-xl',
          'bg-gradient-to-br from-gray-400/30 to-gray-600/30'
        )}
      />
      
      {/* 问号图标容器 */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={cn(
          'relative flex items-center justify-center rounded-xl',
          'bg-gradient-to-br from-gray-500/80 to-gray-700/80',
          'shadow-lg shadow-gray-500/20',
          compact ? 'w-12 h-12' : 'w-14 h-14'
        )}
      >
        <HelpCircle
          className={cn(
            'text-white/90',
            compact ? 'w-6 h-6' : 'w-8 h-8'
          )}
        />
      </motion.div>
    </div>
  );
}

/**
 * 闪烁效果组件
 */
function ShimmerEffect() {
  return (
    <motion.div
      animate={{
        x: ['-100%', '200%'],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'linear',
        repeatDelay: 2,
      }}
      className="absolute inset-0 pointer-events-none"
    >
      <div
        className={cn(
          'h-full w-1/3',
          'bg-gradient-to-r from-transparent via-white/10 to-transparent',
          'skew-x-12'
        )}
      />
    </motion.div>
  );
}

/**
 * 隐藏成就卡片组件
 *
 * 需求24: 成就系统
 * 任务24.2.8: 隐藏成就展示（问号占位）
 *
 * 功能：
 * - 问号图标（❓ 或 HelpCircle）替代奖杯图标
 * - 神秘/阴影视觉风格
 * - "隐藏成就" 标签
 * - 提示文本 "完成特定条件后解锁"
 * - 可选：显示类别但隐藏具体细节
 * - 灰度/去饱和配色方案
 * - 微妙动画（脉冲问号、闪烁效果）
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 神秘灰色主题
 */
export function HiddenAchievementCard({
  achievement,
  onClick,
  className,
  compact = false,
  showCategoryHint = true,
}: HiddenAchievementCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(achievement);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-gray-100/60 to-gray-200/60',
        'dark:from-gray-800/60 dark:to-gray-900/60',
        'backdrop-blur-md',
        'border border-gray-300/30 dark:border-gray-600/30',
        'shadow-sm hover:shadow-md',
        compact ? 'p-4' : 'p-5',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* 闪烁效果 */}
      <ShimmerEffect />

      {/* 背景装饰 - 神秘光效 */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className={cn(
            'absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-10',
            'bg-gradient-to-br from-gray-400 to-gray-600'
          )}
        />
        <div
          className={cn(
            'absolute -bottom-10 -left-10 w-24 h-24 rounded-full blur-3xl opacity-10',
            'bg-gradient-to-br from-purple-400 to-indigo-600'
          )}
        />
      </div>

      {/* 隐藏成就标签 - 右上角 */}
      <div className="absolute top-3 right-3">
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-lg',
            'bg-gray-500/20 dark:bg-gray-600/30',
            'border border-gray-400/20 dark:border-gray-500/20'
          )}
        >
          <Lock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            隐藏成就
          </span>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="relative z-10">
        {/* 图标和标题区域 */}
        <div className={cn('flex items-start gap-4', compact ? 'mb-3' : 'mb-4')}>
          {/* 脉冲问号图标 */}
          <PulsingQuestionMark compact={compact} />

          {/* 标题和描述 */}
          <div className="flex-1 min-w-0 pr-20">
            <h3
              className={cn(
                'font-bold text-gray-600 dark:text-gray-300',
                compact ? 'text-sm' : 'text-base'
              )}
            >
              ???
            </h3>
            <p
              className={cn(
                'text-gray-500 dark:text-gray-400 mt-1',
                compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
              )}
            >
              完成特定条件后解锁
            </p>
          </div>
        </div>

        {/* 神秘进度条 */}
        <div className={compact ? 'mb-3' : 'mb-4'}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-gray-400 dark:text-gray-500">
              进度: ???
            </span>
            <span className="font-semibold text-gray-400 dark:text-gray-500">
              ?%
            </span>
          </div>
          <div className="h-2.5 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
            <motion.div
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className={cn(
                'h-full rounded-full w-1/4',
                'bg-gradient-to-r from-gray-400/50 to-gray-500/50'
              )}
            />
          </div>
        </div>

        {/* 底部区域：类别提示和状态 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* 类别提示（可选） */}
          {showCategoryHint && (
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'p-1.5 rounded-lg',
                  'bg-gray-200/50 dark:bg-gray-700/50'
                )}
              >
                <Sparkles className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {ACHIEVEMENT_CATEGORY_ICONS[achievement.category as AchievementCategory]}{' '}
                {ACHIEVEMENT_CATEGORY_NAMES[achievement.category as AchievementCategory]}
              </span>
            </div>
          )}

          {/* 状态指示器 */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-200/50 dark:bg-gray-700/50">
            <Lock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
              待发现
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default HiddenAchievementCard;
