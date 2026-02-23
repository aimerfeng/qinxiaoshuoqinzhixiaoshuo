'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/cn';
import type { LeaderboardCategory } from '@/types/season';
import {
  LEADERBOARD_CATEGORY_NAMES,
  LEADERBOARD_CATEGORY_ICONS,
  LEADERBOARD_CATEGORY_DESCRIPTIONS,
} from '@/types/season';

/**
 * 排行榜类别 Tab 组件
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.3: 排行榜切换 Tab（阅读/创作/社交/综合）
 *
 * 功能：
 * - 显示所有4个排行榜类别（阅读/创作/社交/综合）
 * - 支持不同变体（pills/underline/cards）
 * - 支持不同尺寸（compact/default/large）
 * - 动画活动指示器
 * - 响应式设计
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */

// 排行榜类别列表
const CATEGORIES: LeaderboardCategory[] = ['READING', 'CREATION', 'SOCIAL', 'OVERALL'];

/**
 * 组件变体类型
 */
export type TabVariant = 'pills' | 'underline' | 'cards';

/**
 * 组件尺寸类型
 */
export type TabSize = 'compact' | 'default' | 'large';

/**
 * LeaderboardCategoryTabs 组件属性
 */
export interface LeaderboardCategoryTabsProps {
  /** 当前选中的类别 */
  selectedCategory: LeaderboardCategory;
  /** 类别变更回调 */
  onCategoryChange: (category: LeaderboardCategory) => void;
  /** 组件变体 */
  variant?: TabVariant;
  /** 组件尺寸 */
  size?: TabSize;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 是否显示描述 */
  showDescription?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 尺寸配置
 */
const SIZE_CONFIG: Record<TabSize, {
  padding: string;
  fontSize: string;
  iconSize: string;
  gap: string;
  borderRadius: string;
}> = {
  compact: {
    padding: 'px-3 py-1.5',
    fontSize: 'text-xs',
    iconSize: 'text-sm',
    gap: 'gap-1',
    borderRadius: 'rounded-lg',
  },
  default: {
    padding: 'px-4 py-2.5',
    fontSize: 'text-sm',
    iconSize: 'text-lg',
    gap: 'gap-2',
    borderRadius: 'rounded-xl',
  },
  large: {
    padding: 'px-6 py-3.5',
    fontSize: 'text-base',
    iconSize: 'text-xl',
    gap: 'gap-3',
    borderRadius: 'rounded-2xl',
  },
};

/**
 * Pills 变体 Tab 按钮
 */
function PillsTab({
  category,
  isSelected,
  onClick,
  size,
  showIcon,
  disabled,
}: {
  category: LeaderboardCategory;
  isSelected: boolean;
  onClick: () => void;
  size: TabSize;
  showIcon: boolean;
  disabled: boolean;
}) {
  const config = SIZE_CONFIG[size];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      className={cn(
        'relative flex items-center whitespace-nowrap',
        'transition-colors duration-200',
        config.padding,
        config.fontSize,
        config.gap,
        config.borderRadius,
        disabled && 'opacity-50 cursor-not-allowed',
        isSelected
          ? 'text-white'
          : 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800'
      )}
    >
      {/* 活动指示器背景 */}
      {isSelected && (
        <motion.div
          layoutId="pills-active-indicator"
          className={cn(
            'absolute inset-0',
            'bg-gradient-to-r from-indigo-500 to-purple-500',
            'shadow-lg shadow-indigo-500/25',
            config.borderRadius
          )}
          initial={false}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 35,
          }}
        />
      )}

      {/* 内容 */}
      <span className={cn('relative z-10', showIcon && config.iconSize)}>
        {showIcon && LEADERBOARD_CATEGORY_ICONS[category]}
      </span>
      <span className={cn('relative z-10 font-medium')}>
        {LEADERBOARD_CATEGORY_NAMES[category]}
      </span>
    </motion.button>
  );
}

/**
 * Underline 变体 Tab 按钮
 */
function UnderlineTab({
  category,
  isSelected,
  onClick,
  size,
  showIcon,
  disabled,
  onRef,
}: {
  category: LeaderboardCategory;
  isSelected: boolean;
  onClick: () => void;
  size: TabSize;
  showIcon: boolean;
  disabled: boolean;
  onRef: (el: HTMLButtonElement | null) => void;
}) {
  const config = SIZE_CONFIG[size];

  return (
    <button
      ref={onRef}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex items-center whitespace-nowrap',
        'transition-colors duration-200',
        config.padding,
        config.fontSize,
        config.gap,
        disabled && 'opacity-50 cursor-not-allowed',
        isSelected
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      )}
    >
      {showIcon && (
        <span className={config.iconSize}>
          {LEADERBOARD_CATEGORY_ICONS[category]}
        </span>
      )}
      <span className="font-medium">{LEADERBOARD_CATEGORY_NAMES[category]}</span>
    </button>
  );
}

/**
 * Cards 变体 Tab 按钮
 */
function CardsTab({
  category,
  isSelected,
  onClick,
  size,
  showIcon,
  showDescription,
  disabled,
}: {
  category: LeaderboardCategory;
  isSelected: boolean;
  onClick: () => void;
  size: TabSize;
  showIcon: boolean;
  showDescription: boolean;
  disabled: boolean;
}) {
  const config = SIZE_CONFIG[size];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.02, y: -2 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      className={cn(
        'relative flex flex-col items-center text-center',
        'transition-all duration-200',
        'p-4 min-w-[100px]',
        config.borderRadius,
        disabled && 'opacity-50 cursor-not-allowed',
        isSelected
          ? 'bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border-2 border-indigo-500/50 dark:border-indigo-400/50'
          : 'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 hover:border-indigo-300 dark:hover:border-indigo-600'
      )}
    >
      {/* 选中指示器 */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center"
          >
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 图标 */}
      {showIcon && (
        <span
          className={cn(
            'text-2xl mb-2',
            isSelected ? 'scale-110' : 'scale-100',
            'transition-transform duration-200'
          )}
        >
          {LEADERBOARD_CATEGORY_ICONS[category]}
        </span>
      )}

      {/* 名称 */}
      <span
        className={cn(
          'font-medium',
          config.fontSize,
          isSelected
            ? 'text-indigo-600 dark:text-indigo-400'
            : 'text-gray-700 dark:text-gray-300'
        )}
      >
        {LEADERBOARD_CATEGORY_NAMES[category]}
      </span>

      {/* 描述 */}
      {showDescription && (
        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {LEADERBOARD_CATEGORY_DESCRIPTIONS[category]}
        </span>
      )}
    </motion.button>
  );
}

/**
 * LeaderboardCategoryTabs 组件
 *
 * 可复用的排行榜类别切换组件，支持多种变体和尺寸
 */
export function LeaderboardCategoryTabs({
  selectedCategory,
  onCategoryChange,
  variant = 'pills',
  size = 'default',
  showIcon = true,
  showDescription = false,
  className,
  disabled = false,
}: LeaderboardCategoryTabsProps) {
  // 用于 underline 变体的活动指示器位置计算
  const containerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<LeaderboardCategory, HTMLButtonElement | null>>(new Map());
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

  // 计算 underline 指示器位置
  useEffect(() => {
    if (variant !== 'underline') return;

    const selectedTab = tabRefs.current.get(selectedCategory);
    const container = containerRef.current;

    if (selectedTab && container) {
      const containerRect = container.getBoundingClientRect();
      const tabRect = selectedTab.getBoundingClientRect();

      setIndicatorStyle({
        left: tabRect.left - containerRect.left,
        width: tabRect.width,
      });
    }
  }, [selectedCategory, variant]);

  // 渲染 Pills 变体
  if (variant === 'pills') {
    return (
      <div
        className={cn(
          'flex gap-2 overflow-x-auto pb-2 scrollbar-hide',
          className
        )}
      >
        {CATEGORIES.map((category) => (
          <PillsTab
            key={category}
            category={category}
            isSelected={selectedCategory === category}
            onClick={() => onCategoryChange(category)}
            size={size}
            showIcon={showIcon}
            disabled={disabled}
          />
        ))}
      </div>
    );
  }

  // 渲染 Underline 变体
  if (variant === 'underline') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'relative flex gap-1 overflow-x-auto pb-2 scrollbar-hide',
          'border-b border-gray-200 dark:border-gray-700',
          className
        )}
      >
        {CATEGORIES.map((category) => (
          <UnderlineTab
            key={category}
            category={category}
            isSelected={selectedCategory === category}
            onClick={() => onCategoryChange(category)}
            size={size}
            showIcon={showIcon}
            disabled={disabled}
            onRef={(el) => tabRefs.current.set(category, el)}
          />
        ))}

        {/* 活动指示器 */}
        <motion.div
          className="absolute bottom-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
          initial={false}
          animate={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 35,
          }}
        />
      </div>
    );
  }

  // 渲染 Cards 变体
  return (
    <div
      className={cn(
        'grid grid-cols-2 sm:grid-cols-4 gap-3',
        className
      )}
    >
      {CATEGORIES.map((category) => (
        <CardsTab
          key={category}
          category={category}
          isSelected={selectedCategory === category}
          onClick={() => onCategoryChange(category)}
          size={size}
          showIcon={showIcon}
          showDescription={showDescription}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

export default LeaderboardCategoryTabs;
