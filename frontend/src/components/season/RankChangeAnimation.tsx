'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Transition, Easing } from 'motion/react';
import { TrendingUp, TrendingDown, Minus, Sparkles, Star } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 排名变化动画组件
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.7: 排名变化动画（上升/下降箭头）
 *
 * 功能：
 * - 上升动画：弹跳+脉冲效果
 * - 下降动画：抖动+下落效果
 * - 不变动画：微妙呼吸效果
 * - 新上榜动画：闪烁+星星效果
 * - 数字动画：计数滚动效果
 * - 支持多种尺寸（small/default/large）
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */

// ==================== 类型定义 ====================

export type RankChangeSize = 'small' | 'default' | 'large';

export type RankChangeType = 'up' | 'down' | 'unchanged' | 'new';

export interface RankChangeAnimationProps {
  /** 排名变化值（正数上升，负数下降，0不变，null新上榜） */
  rankChange: number | null;
  /** 尺寸 */
  size?: RankChangeSize;
  /** 是否显示数字 */
  showNumber?: boolean;
  /** 是否启用动画 */
  animated?: boolean;
  /** 是否显示背景 */
  showBackground?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 动画完成回调 */
  onAnimationComplete?: () => void;
}

export interface AnimatedNumberProps {
  /** 目标数值 */
  value: number;
  /** 尺寸 */
  size?: RankChangeSize;
  /** 动画时长（毫秒） */
  duration?: number;
  /** 是否显示正负号 */
  showSign?: boolean;
  /** 自定义类名 */
  className?: string;
}

// ==================== 尺寸配置 ====================

const SIZE_CONFIG: Record<
  RankChangeSize,
  {
    container: string;
    icon: string;
    text: string;
    padding: string;
    gap: string;
  }
> = {
  small: {
    container: 'min-w-[40px] h-6',
    icon: 'w-3 h-3',
    text: 'text-xs',
    padding: 'px-1.5 py-0.5',
    gap: 'gap-0.5',
  },
  default: {
    container: 'min-w-[52px] h-8',
    icon: 'w-4 h-4',
    text: 'text-sm',
    padding: 'px-2 py-1',
    gap: 'gap-1',
  },
  large: {
    container: 'min-w-[64px] h-10',
    icon: 'w-5 h-5',
    text: 'text-base',
    padding: 'px-3 py-1.5',
    gap: 'gap-1.5',
  },
};

// ==================== 颜色配置 ====================

const COLOR_CONFIG: Record<
  RankChangeType,
  {
    text: string;
    bg: string;
    border: string;
    glow: string;
  }
> = {
  up: {
    text: 'text-green-500 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800/50',
    glow: 'shadow-green-500/20',
  },
  down: {
    text: 'text-red-500 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800/50',
    glow: 'shadow-red-500/20',
  },
  unchanged: {
    text: 'text-gray-400 dark:text-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-800/50',
    border: 'border-gray-200 dark:border-gray-700/50',
    glow: 'shadow-gray-500/10',
  },
  new: {
    text: 'text-blue-500 dark:text-blue-400',
    bg: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
    border: 'border-blue-200 dark:border-blue-800/50',
    glow: 'shadow-blue-500/30',
  },
};

// ==================== 动画配置 ====================

const easeOut: Easing = [0.33, 1, 0.68, 1];
const easeInOut: Easing = [0.65, 0, 0.35, 1];
const backOut: Easing = [0.34, 1.56, 0.64, 1];

/** 上升动画 - 弹跳+脉冲 */
const upAnimationVariants = {
  initial: { y: 10, opacity: 0, scale: 0.8 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
  },
  exit: { y: -10, opacity: 0, scale: 0.8 },
};

const upTransition: Transition = {
  duration: 0.5,
  ease: easeOut,
};

/** 下降动画 - 抖动+下落 */
const downAnimationVariants = {
  initial: { y: -10, opacity: 0, scale: 0.8 },
  animate: {
    y: 0,
    opacity: 1,
    scale: 1,
  },
  exit: { y: 10, opacity: 0, scale: 0.8 },
};

const downTransition: Transition = {
  duration: 0.6,
  ease: easeInOut,
};

/** 不变动画 - 微妙呼吸 */
const unchangedAnimationVariants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
  },
  exit: { opacity: 0, scale: 0.9 },
};

const unchangedTransition: Transition = {
  duration: 0.3,
  ease: easeOut,
};

/** 新上榜动画 - 闪烁+星星 */
const newEntryAnimationVariants = {
  initial: { opacity: 0, scale: 0.5, rotate: -10 },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
  },
  exit: { opacity: 0, scale: 0.5 },
};

const newEntryTransition: Transition = {
  duration: 0.6,
  ease: backOut,
};

// ==================== 子组件 ====================

/**
 * 动画数字组件
 * 实现数字滚动计数效果
 */
export function AnimatedNumber({
  value,
  size = 'default',
  duration = 500,
  showSign = true,
  className,
}: AnimatedNumberProps) {
  const sizeConfig = SIZE_CONFIG[size];
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = Math.abs(value);
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用 easeOutQuart 缓动函数
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      const currentValue = Math.round(
        startValue + (endValue - startValue) * easeProgress
      );
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevValueRef.current = endValue;
  }, [value, duration]);

  const sign = value > 0 ? '+' : value < 0 ? '-' : '';

  return (
    <span className={cn(sizeConfig.text, 'font-bold tabular-nums', className)}>
      {showSign && sign}
      {displayValue}
    </span>
  );
}

/**
 * 上升箭头动画组件
 */
function UpArrowAnimation({
  size,
  animated,
}: {
  size: RankChangeSize;
  animated: boolean;
}) {
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <motion.div
      className="relative"
      animate={
        animated
          ? {
              y: [0, -2, 0],
            }
          : undefined
      }
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: easeInOut,
      }}
    >
      <TrendingUp className={cn(sizeConfig.icon)} />
      {/* 脉冲光效 */}
      {animated && (
        <motion.div
          className="absolute inset-0 rounded-full bg-green-400/30"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: easeInOut,
          }}
        />
      )}
    </motion.div>
  );
}

/**
 * 下降箭头动画组件
 */
function DownArrowAnimation({
  size,
  animated,
}: {
  size: RankChangeSize;
  animated: boolean;
}) {
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <motion.div
      animate={
        animated
          ? {
              y: [0, 2, 0],
              x: [0, -1, 1, 0],
            }
          : undefined
      }
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: easeInOut,
      }}
    >
      <TrendingDown className={cn(sizeConfig.icon)} />
    </motion.div>
  );
}

/**
 * 不变指示器动画组件
 */
function UnchangedAnimation({
  size,
  animated,
}: {
  size: RankChangeSize;
  animated: boolean;
}) {
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <motion.div
      animate={
        animated
          ? {
              opacity: [0.5, 1, 0.5],
            }
          : undefined
      }
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: easeInOut,
      }}
    >
      <Minus className={cn(sizeConfig.icon)} />
    </motion.div>
  );
}

/**
 * 新上榜动画组件
 */
function NewEntryAnimation({
  size,
  animated,
}: {
  size: RankChangeSize;
  animated: boolean;
}) {
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <motion.div className="relative flex items-center gap-0.5">
      {/* 星星装饰 */}
      {animated && (
        <>
          <motion.div
            className="absolute -top-1 -left-1"
            animate={{
              scale: [0, 1, 0],
              rotate: [0, 180, 360],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: 0,
            }}
          >
            <Sparkles className="w-2 h-2 text-blue-400" />
          </motion.div>
          <motion.div
            className="absolute -bottom-1 -right-1"
            animate={{
              scale: [0, 1, 0],
              rotate: [0, -180, -360],
              opacity: [0, 1, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: 0.5,
            }}
          >
            <Star className="w-2 h-2 text-indigo-400" />
          </motion.div>
        </>
      )}
      <motion.span
        className={cn(sizeConfig.text, 'font-bold')}
        animate={
          animated
            ? {
                scale: [1, 1.05, 1],
              }
            : undefined
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: easeInOut,
        }}
      >
        新
      </motion.span>
    </motion.div>
  );
}

// ==================== 主组件 ====================

/**
 * 排名变化动画组件
 */
export function RankChangeAnimation({
  rankChange,
  size = 'default',
  showNumber = true,
  animated = true,
  showBackground = true,
  className,
  onAnimationComplete,
}: RankChangeAnimationProps) {
  // 确定变化类型
  const changeType: RankChangeType =
    rankChange === null
      ? 'new'
      : rankChange > 0
        ? 'up'
        : rankChange < 0
          ? 'down'
          : 'unchanged';

  const sizeConfig = SIZE_CONFIG[size];
  const colorConfig = COLOR_CONFIG[changeType];

  // 选择动画配置
  const getAnimationProps = () => {
    if (!animated) {
      return {};
    }

    switch (changeType) {
      case 'up':
        return {
          variants: upAnimationVariants,
          initial: 'initial',
          animate: 'animate',
          exit: 'exit',
          transition: upTransition,
        };
      case 'down':
        return {
          variants: downAnimationVariants,
          initial: 'initial',
          animate: 'animate',
          exit: 'exit',
          transition: downTransition,
        };
      case 'new':
        return {
          variants: newEntryAnimationVariants,
          initial: 'initial',
          animate: 'animate',
          exit: 'exit',
          transition: newEntryTransition,
        };
      default:
        return {
          variants: unchangedAnimationVariants,
          initial: 'initial',
          animate: 'animate',
          exit: 'exit',
          transition: unchangedTransition,
        };
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${changeType}-${rankChange}`}
        {...getAnimationProps()}
        onAnimationComplete={onAnimationComplete}
        className={cn(
          'inline-flex items-center justify-center rounded-lg',
          sizeConfig.container,
          sizeConfig.padding,
          sizeConfig.gap,
          colorConfig.text,
          showBackground && [
            colorConfig.bg,
            'border',
            colorConfig.border,
            'backdrop-blur-sm',
            animated && `shadow-md ${colorConfig.glow}`,
          ],
          className
        )}
      >
        {/* 图标/指示器 */}
        {changeType === 'up' && (
          <UpArrowAnimation size={size} animated={animated} />
        )}
        {changeType === 'down' && (
          <DownArrowAnimation size={size} animated={animated} />
        )}
        {changeType === 'unchanged' && (
          <UnchangedAnimation size={size} animated={animated} />
        )}
        {changeType === 'new' && (
          <NewEntryAnimation size={size} animated={animated} />
        )}

        {/* 数字显示 */}
        {showNumber && changeType !== 'new' && changeType !== 'unchanged' && (
          <AnimatedNumber
            value={rankChange || 0}
            size={size}
            showSign={false}
            className={colorConfig.text}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// ==================== 便捷组件 ====================

/**
 * 小型排名变化指示器
 * 用于列表项等紧凑场景
 */
export function RankChangeSmall({
  rankChange,
  animated = true,
  className,
}: {
  rankChange: number | null;
  animated?: boolean;
  className?: string;
}) {
  return (
    <RankChangeAnimation
      rankChange={rankChange}
      size="small"
      showNumber={true}
      animated={animated}
      showBackground={false}
      className={className}
    />
  );
}

/**
 * 大型排名变化指示器
 * 用于卡片头部等突出场景
 */
export function RankChangeLarge({
  rankChange,
  animated = true,
  className,
}: {
  rankChange: number | null;
  animated?: boolean;
  className?: string;
}) {
  return (
    <RankChangeAnimation
      rankChange={rankChange}
      size="large"
      showNumber={true}
      animated={animated}
      showBackground={true}
      className={className}
    />
  );
}

/**
 * 仅图标的排名变化指示器
 * 用于空间受限场景
 */
export function RankChangeIcon({
  rankChange,
  size = 'default',
  animated = true,
  className,
}: {
  rankChange: number | null;
  size?: RankChangeSize;
  animated?: boolean;
  className?: string;
}) {
  return (
    <RankChangeAnimation
      rankChange={rankChange}
      size={size}
      showNumber={false}
      animated={animated}
      showBackground={false}
      className={className}
    />
  );
}

export default RankChangeAnimation;
