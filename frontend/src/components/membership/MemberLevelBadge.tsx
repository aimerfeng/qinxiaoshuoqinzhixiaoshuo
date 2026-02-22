'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import {
  MemberLevel,
  getMemberLevelConfig,
} from '@/types/membership';

/**
 * 会员等级徽章组件属性
 */
export interface MemberLevelBadgeProps {
  /** 会员等级 */
  level: MemberLevel | string;
  /** 贡献度分数（可选，用于显示分数） */
  score?: number;
  /** 是否显示分数 */
  showScore?: boolean;
  /** 尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** 变体样式 */
  variant?: 'default' | 'outline' | 'glass';
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 是否显示等级名称 */
  showName?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否启用动画 */
  animated?: boolean;
}

/**
 * 尺寸配置
 */
const sizeConfig = {
  xs: {
    container: 'px-1.5 py-0.5 text-2xs gap-0.5',
    icon: 'text-xs',
    text: 'text-2xs',
  },
  sm: {
    container: 'px-2 py-1 text-xs gap-1',
    icon: 'text-sm',
    text: 'text-xs',
  },
  md: {
    container: 'px-3 py-1.5 text-sm gap-1.5',
    icon: 'text-base',
    text: 'text-sm',
  },
  lg: {
    container: 'px-4 py-2 text-base gap-2',
    icon: 'text-lg',
    text: 'text-base',
  },
};

/**
 * 等级渐变色配置
 */
const levelGradients: Record<MemberLevel, string> = {
  [MemberLevel.LEVEL_0]: 'from-gray-400 to-gray-500',
  [MemberLevel.LEVEL_1]: 'from-emerald-400 to-emerald-600',
  [MemberLevel.LEVEL_2]: 'from-blue-400 to-indigo-600',
  [MemberLevel.LEVEL_3]: 'from-purple-500 to-pink-500',
};

/**
 * 等级发光色配置
 */
const levelGlowColors: Record<MemberLevel, string> = {
  [MemberLevel.LEVEL_0]: 'shadow-gray-200/50',
  [MemberLevel.LEVEL_1]: 'shadow-emerald-300/50',
  [MemberLevel.LEVEL_2]: 'shadow-blue-300/50',
  [MemberLevel.LEVEL_3]: 'shadow-purple-300/50',
};

/**
 * 会员等级徽章组件
 *
 * 需求14: 会员等级体系
 * 任务14.2.1: 会员等级展示组件
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function MemberLevelBadge({
  level,
  score,
  showScore = false,
  size = 'sm',
  variant = 'default',
  showIcon = true,
  showName = true,
  className,
  animated = true,
}: MemberLevelBadgeProps) {
  const config = useMemo(() => getMemberLevelConfig(level), [level]);
  const levelKey = level as MemberLevel;
  const sizes = sizeConfig[size];

  // 根据变体生成样式
  const variantStyles = useMemo(() => {
    switch (variant) {
      case 'outline':
        return cn(
          'bg-transparent border-2',
          config.borderColor,
          config.color
        );
      case 'glass':
        return cn(
          'bg-white/80 dark:bg-gray-900/80',
          'backdrop-blur-md',
          'border border-white/20',
          'shadow-lg',
          levelGlowColors[levelKey] || levelGlowColors[MemberLevel.LEVEL_0]
        );
      default:
        return cn(
          'bg-gradient-to-r text-white',
          levelGradients[levelKey] || levelGradients[MemberLevel.LEVEL_0],
          'shadow-md hover:shadow-lg'
        );
    }
  }, [variant, config, levelKey]);

  const content = (
    <>
      {showIcon && (
        <span className={cn(sizes.icon, 'flex-shrink-0')}>
          {config.icon}
        </span>
      )}
      {showName && (
        <span className={cn(sizes.text, 'font-medium whitespace-nowrap')}>
          Lv.{config.value} {config.name}
        </span>
      )}
      {showScore && score !== undefined && (
        <span className={cn(
          sizes.text,
          'font-normal opacity-80',
          variant === 'default' ? 'text-white/80' : 'text-gray-500'
        )}>
          ({score.toLocaleString()})
        </span>
      )}
    </>
  );

  const baseStyles = cn(
    'inline-flex items-center justify-center',
    'rounded-xl',
    'transition-all duration-200',
    sizes.container,
    variantStyles,
    className
  );

  if (animated) {
    return (
      <motion.div
        className={baseStyles}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {content}
      </motion.div>
    );
  }

  return <div className={baseStyles}>{content}</div>;
}

/**
 * 简化版等级图标组件
 */
export function MemberLevelIcon({
  level,
  size = 'sm',
  className,
}: {
  level: MemberLevel | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const config = getMemberLevelConfig(level);
  const iconSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <span
      className={cn(iconSizes[size], className)}
      title={`Lv.${config.value} ${config.name}`}
    >
      {config.icon}
    </span>
  );
}

export default MemberLevelBadge;
