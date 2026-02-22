'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import {
  MemberLevel,
  getLevelByScore,
  getMemberLevelConfig,
} from '@/types/membership';

/**
 * 贡献度进度条组件属性
 */
export interface ContributionProgressBarProps {
  /** 当前贡献度分数 */
  score: number;
  /** 是否显示分数详情 */
  showDetails?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 变体样式 */
  variant?: 'default' | 'glass' | 'minimal';
  /** 自定义类名 */
  className?: string;
  /** 是否启用动画 */
  animated?: boolean;
}

/**
 * 尺寸配置
 */
const sizeConfig = {
  sm: {
    container: 'p-3',
    barHeight: 'h-2',
    text: 'text-xs',
    scoreText: 'text-sm',
    iconSize: 'text-sm',
    gap: 'gap-2',
  },
  md: {
    container: 'p-4',
    barHeight: 'h-3',
    text: 'text-sm',
    scoreText: 'text-base',
    iconSize: 'text-base',
    gap: 'gap-3',
  },
  lg: {
    container: 'p-5',
    barHeight: 'h-4',
    text: 'text-base',
    scoreText: 'text-lg',
    iconSize: 'text-lg',
    gap: 'gap-4',
  },
};

/**
 * 等级阈值列表（升序）
 */
const LEVEL_THRESHOLDS = [
  { level: MemberLevel.LEVEL_0, score: 0 },
  { level: MemberLevel.LEVEL_1, score: 500 },
  { level: MemberLevel.LEVEL_2, score: 2000 },
  { level: MemberLevel.LEVEL_3, score: 10000 },
];

/**
 * 计算进度信息
 */
function calculateProgress(score: number) {
  const currentLevel = getLevelByScore(score);
  const currentConfig = getMemberLevelConfig(currentLevel);
  const currentLevelIndex = LEVEL_THRESHOLDS.findIndex(t => t.level === currentLevel);
  
  // 如果已达最高等级
  if (currentLevelIndex === LEVEL_THRESHOLDS.length - 1) {
    return {
      currentLevel,
      currentConfig,
      nextLevel: null,
      nextConfig: null,
      progress: 100,
      pointsToNext: 0,
      currentThreshold: LEVEL_THRESHOLDS[currentLevelIndex].score,
      nextThreshold: null,
    };
  }

  const currentThreshold = LEVEL_THRESHOLDS[currentLevelIndex].score;
  const nextThreshold = LEVEL_THRESHOLDS[currentLevelIndex + 1].score;
  const nextLevel = LEVEL_THRESHOLDS[currentLevelIndex + 1].level;
  const nextConfig = getMemberLevelConfig(nextLevel);

  const progressInLevel = score - currentThreshold;
  const levelRange = nextThreshold - currentThreshold;
  const progress = Math.min((progressInLevel / levelRange) * 100, 100);
  const pointsToNext = nextThreshold - score;

  return {
    currentLevel,
    currentConfig,
    nextLevel,
    nextConfig,
    progress,
    pointsToNext,
    currentThreshold,
    nextThreshold,
  };
}

/**
 * 贡献度进度条组件
 *
 * 需求14: 会员等级体系
 * 任务14.2.2: 贡献度进度条
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function ContributionProgressBar({
  score,
  showDetails = true,
  size = 'md',
  variant = 'glass',
  className,
  animated = true,
}: ContributionProgressBarProps) {
  const sizes = sizeConfig[size];
  const progressInfo = useMemo(() => calculateProgress(score), [score]);

  const {
    currentConfig,
    nextConfig,
    progress,
    pointsToNext,
    nextThreshold,
  } = progressInfo;

  // 容器样式
  const containerStyles = useMemo(() => {
    switch (variant) {
      case 'glass':
        return cn(
          'bg-white/60 dark:bg-gray-900/60',
          'backdrop-blur-xl',
          'border border-white/20 dark:border-gray-700/30',
          'shadow-lg shadow-purple-500/5'
        );
      case 'minimal':
        return 'bg-transparent';
      default:
        return cn(
          'bg-gradient-to-br from-indigo-50 to-purple-50',
          'dark:from-indigo-950/50 dark:to-purple-950/50',
          'border border-indigo-100 dark:border-indigo-800/30'
        );
    }
  }, [variant]);

  const isMaxLevel = nextConfig === null;

  return (
    <div
      className={cn(
        'rounded-2xl',
        sizes.container,
        containerStyles,
        className
      )}
    >
      {/* 顶部信息：当前分数和等级 */}
      {showDetails && (
        <div className={cn('flex items-center justify-between mb-3', sizes.gap)}>
          <div className="flex items-center gap-2">
            <span className={sizes.iconSize}>{currentConfig.icon}</span>
            <span className={cn(sizes.text, 'font-medium text-gray-700 dark:text-gray-200')}>
              Lv.{currentConfig.value} {currentConfig.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className={cn(
              sizes.scoreText,
              'font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent'
            )}>
              {score.toLocaleString()}
            </span>
            <span className={cn(sizes.text, 'text-gray-500 dark:text-gray-400')}>
              贡献度
            </span>
          </div>
        </div>
      )}

      {/* 进度条 */}
      <div className="relative">
        {/* 进度条背景 */}
        <div
          className={cn(
            sizes.barHeight,
            'w-full rounded-full',
            'bg-gray-200/80 dark:bg-gray-700/50',
            'overflow-hidden'
          )}
        >
          {/* 进度条填充 */}
          {animated ? (
            <motion.div
              className={cn(
                'h-full rounded-full',
                'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
                'shadow-sm shadow-purple-500/30'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{
                duration: 1,
                ease: [0.25, 0.1, 0.25, 1],
                delay: 0.2,
              }}
            />
          ) : (
            <div
              className={cn(
                'h-full rounded-full',
                'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500',
                'shadow-sm shadow-purple-500/30'
              )}
              style={{ width: `${progress}%` }}
            />
          )}
        </div>

        {/* 进度条光效 */}
        {animated && progress > 0 && (
          <motion.div
            className={cn(
              'absolute top-0 left-0',
              sizes.barHeight,
              'rounded-full',
              'bg-gradient-to-r from-transparent via-white/40 to-transparent',
              'pointer-events-none'
            )}
            initial={{ x: '-100%', opacity: 0 }}
            animate={{ x: '200%', opacity: [0, 1, 0] }}
            transition={{
              duration: 1.5,
              delay: 1,
              repeat: Infinity,
              repeatDelay: 3,
            }}
            style={{ width: '30%' }}
          />
        )}
      </div>

      {/* 底部信息：下一等级提示 */}
      {showDetails && (
        <div className={cn('flex items-center justify-between mt-3', sizes.text)}>
          {isMaxLevel ? (
            <span className="text-purple-600 dark:text-purple-400 font-medium">
              🎉 已达最高等级
            </span>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                <span>距离</span>
                <span className="flex items-center gap-1">
                  <span className={sizes.iconSize}>{nextConfig!.icon}</span>
                  <span className="font-medium text-gray-700 dark:text-gray-200">
                    Lv.{nextConfig!.value} {nextConfig!.name}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {pointsToNext.toLocaleString()}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  / {nextThreshold?.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 简化版进度条（仅显示进度条本身）
 */
export function ContributionProgressBarSimple({
  score,
  size = 'sm',
  animated = true,
  className,
}: {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}) {
  const sizes = sizeConfig[size];
  const { progress } = useMemo(() => calculateProgress(score), [score]);

  return (
    <div
      className={cn(
        sizes.barHeight,
        'w-full rounded-full',
        'bg-gray-200/80 dark:bg-gray-700/50',
        'overflow-hidden',
        className
      )}
    >
      {animated ? (
        <motion.div
          className={cn(
            'h-full rounded-full',
            'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{
            duration: 0.8,
            ease: [0.25, 0.1, 0.25, 1],
          }}
        />
      ) : (
        <div
          className={cn(
            'h-full rounded-full',
            'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'
          )}
          style={{ width: `${progress}%` }}
        />
      )}
    </div>
  );
}

export default ContributionProgressBar;
