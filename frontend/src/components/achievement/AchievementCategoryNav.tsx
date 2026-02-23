'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import {
  Trophy,
  BookOpen,
  Pen,
  MessageCircle,
  Star,
  Target,
  Calendar,
  PartyPopper,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AchievementCategory, AchievementStats } from '@/types/achievement';
import {
  ACHIEVEMENT_CATEGORY_NAMES,
  ACHIEVEMENT_CATEGORY_ICONS,
} from '@/types/achievement';

/**
 * 成就分类导航组件
 *
 * 需求24: 成就系统
 * 任务24.2.2: 成就分类导航组件
 *
 * 功能:
 * - 水平滚动标签（移动端）
 * - 垂直列表（桌面端/侧边栏）
 * - 显示类别图标/emoji和名称
 * - 显示已解锁/总数统计
 * - 激活状态指示器动画
 * - 支持受控和非受控模式
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

/**
 * 类别配置
 */
interface CategoryConfig {
  id: AchievementCategory | 'ALL';
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
}

/**
 * 所有类别配置列表
 */
const ALL_CATEGORIES: CategoryConfig[] = [
  {
    id: 'ALL',
    label: '全部成就',
    description: '查看所有成就',
    icon: Trophy,
    emoji: '🏆',
  },
  {
    id: 'READING',
    label: ACHIEVEMENT_CATEGORY_NAMES.READING,
    description: '阅读相关成就',
    icon: BookOpen,
    emoji: ACHIEVEMENT_CATEGORY_ICONS.READING,
  },
  {
    id: 'CREATION',
    label: ACHIEVEMENT_CATEGORY_NAMES.CREATION,
    description: '创作相关成就',
    icon: Pen,
    emoji: ACHIEVEMENT_CATEGORY_ICONS.CREATION,
  },
  {
    id: 'SOCIAL',
    label: ACHIEVEMENT_CATEGORY_NAMES.SOCIAL,
    description: '社交互动成就',
    icon: MessageCircle,
    emoji: ACHIEVEMENT_CATEGORY_ICONS.SOCIAL,
  },
  {
    id: 'COLLECTION',
    label: ACHIEVEMENT_CATEGORY_NAMES.COLLECTION,
    description: '收藏相关成就',
    icon: Star,
    emoji: ACHIEVEMENT_CATEGORY_ICONS.COLLECTION,
  },
  {
    id: 'SPECIAL',
    label: ACHIEVEMENT_CATEGORY_NAMES.SPECIAL,
    description: '特殊隐藏成就',
    icon: Target,
    emoji: ACHIEVEMENT_CATEGORY_ICONS.SPECIAL,
  },
  {
    id: 'SEASONAL',
    label: ACHIEVEMENT_CATEGORY_NAMES.SEASONAL,
    description: '赛季限定成就',
    icon: Calendar,
    emoji: ACHIEVEMENT_CATEGORY_ICONS.SEASONAL,
  },
  {
    id: 'EVENT',
    label: ACHIEVEMENT_CATEGORY_NAMES.EVENT,
    description: '活动限定成就',
    icon: PartyPopper,
    emoji: ACHIEVEMENT_CATEGORY_ICONS.EVENT,
  },
];

/**
 * 类别统计数据
 */
export interface CategoryStats {
  category: AchievementCategory;
  total: number;
  unlocked: number;
}

/**
 * 组件属性
 */
export interface AchievementCategoryNavProps {
  /** 布局方向 */
  orientation?: 'horizontal' | 'vertical';
  /** 当前选中的类别（受控模式） */
  selectedCategory?: AchievementCategory | 'ALL' | null;
  /** 默认选中的类别（非受控模式） */
  defaultCategory?: AchievementCategory | 'ALL';
  /** 类别变更回调 */
  onCategoryChange?: (category: AchievementCategory | 'ALL' | null) => void;
  /** 成就统计数据 */
  stats?: AchievementStats | null;
  /** 是否显示统计数字 */
  showCounts?: boolean;
  /** 是否显示描述 */
  showDescription?: boolean;
  /** 是否使用链接导航 */
  useLinks?: boolean;
  /** 基础链接路径 */
  basePath?: string;
  /** 是否包含"全部"选项 */
  includeAll?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 导航项自定义类名 */
  itemClassName?: string;
  /** 是否紧凑模式 */
  compact?: boolean;
  /** 是否显示emoji */
  showEmoji?: boolean;
  /** 是否显示图标 */
  showIcon?: boolean;
}

/**
 * 成就分类导航组件
 */
export function AchievementCategoryNav({
  orientation = 'horizontal',
  selectedCategory: controlledCategory,
  defaultCategory = 'ALL',
  onCategoryChange,
  stats,
  showCounts = true,
  showDescription = false,
  useLinks = false,
  basePath = '/achievements',
  includeAll = true,
  className,
  itemClassName,
  compact = false,
  showEmoji = true,
  showIcon = true,
}: AchievementCategoryNavProps) {
  // 内部状态（非受控模式）
  const [internalCategory, setInternalCategory] = useState<AchievementCategory | 'ALL'>(defaultCategory);
  
  // 判断是否为受控模式
  const isControlled = controlledCategory !== undefined;
  const activeCategory = isControlled ? controlledCategory : internalCategory;

  // 水平滚动相关
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 获取要显示的类别列表
  const categories = includeAll ? ALL_CATEGORIES : ALL_CATEGORIES.filter(c => c.id !== 'ALL');

  /**
   * 获取类别统计数据
   */
  const getCategoryStats = useCallback((categoryId: AchievementCategory | 'ALL'): { total: number; unlocked: number } | null => {
    if (!stats) return null;

    if (categoryId === 'ALL') {
      return {
        total: stats.totalAchievements,
        unlocked: stats.unlockedCount,
      };
    }

    const categoryStat = stats.categoryStats.find(s => s.category === categoryId);
    return categoryStat ? { total: categoryStat.total, unlocked: categoryStat.unlocked } : null;
  }, [stats]);

  /**
   * 处理类别选择
   */
  const handleCategorySelect = useCallback((categoryId: AchievementCategory | 'ALL') => {
    if (!isControlled) {
      setInternalCategory(categoryId);
    }
    onCategoryChange?.(categoryId === 'ALL' ? null : categoryId);
  }, [isControlled, onCategoryChange]);

  /**
   * 检查滚动状态
   */
  const checkScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  /**
   * 滚动到指定方向
   */
  const scroll = useCallback((direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.6;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }, []);

  // 监听滚动状态
  useEffect(() => {
    if (orientation !== 'horizontal') return;

    const container = scrollContainerRef.current;
    if (!container) return;

    checkScrollState();
    container.addEventListener('scroll', checkScrollState);
    window.addEventListener('resize', checkScrollState);

    return () => {
      container.removeEventListener('scroll', checkScrollState);
      window.removeEventListener('resize', checkScrollState);
    };
  }, [orientation, checkScrollState]);

  /**
   * 生成链接URL
   */
  const getCategoryUrl = (categoryId: AchievementCategory | 'ALL'): string => {
    if (categoryId === 'ALL') {
      return basePath;
    }
    return `${basePath}?category=${categoryId}`;
  };

  /**
   * 渲染单个导航项
   */
  const renderNavItem = (category: CategoryConfig) => {
    const Icon = category.icon;
    const isActive = activeCategory === category.id || (activeCategory === null && category.id === 'ALL');
    const categoryStats = showCounts ? getCategoryStats(category.id) : null;

    const content = (
      <motion.div
        className={cn(
          'relative flex items-center gap-2 transition-all duration-200',
          orientation === 'horizontal'
            ? cn(
                'px-4 py-2.5 rounded-xl whitespace-nowrap',
                compact ? 'px-3 py-2' : 'px-4 py-2.5'
              )
            : cn(
                'px-4 py-3 rounded-xl w-full',
                compact ? 'px-3 py-2' : 'px-4 py-3'
              ),
          isActive
            ? 'bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30'
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          itemClassName
        )}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* 激活指示器 */}
        {isActive && orientation === 'vertical' && (
          <motion.div
            layoutId="achievement-category-indicator-vertical"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}

        {/* 图标 */}
        {showIcon && (
          <div
            className={cn(
              'flex-shrink-0 p-1.5 rounded-lg transition-colors',
              compact ? 'p-1' : 'p-1.5',
              isActive
                ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            )}
          >
            <Icon className={cn('w-4 h-4', compact && 'w-3.5 h-3.5')} />
          </div>
        )}

        {/* 文字内容 */}
        <div className={cn('flex-1 min-w-0', orientation === 'horizontal' && 'flex items-center gap-2')}>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'font-medium transition-colors',
                compact ? 'text-xs' : 'text-sm',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-700 dark:text-gray-300'
              )}
            >
              {category.label}
            </span>
            {showEmoji && (
              <span className={cn('text-sm', compact && 'text-xs')}>{category.emoji}</span>
            )}
          </div>

          {/* 描述（仅垂直模式） */}
          {showDescription && orientation === 'vertical' && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {category.description}
            </p>
          )}
        </div>

        {/* 统计数字 */}
        {showCounts && categoryStats && (
          <div
            className={cn(
              'flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium',
              compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs',
              isActive
                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
            )}
          >
            {categoryStats.unlocked}/{categoryStats.total}
          </div>
        )}

        {/* 水平模式激活指示器 */}
        {isActive && orientation === 'horizontal' && (
          <motion.div
            layoutId="achievement-category-indicator-horizontal"
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        )}
      </motion.div>
    );

    // 使用链接或按钮
    if (useLinks) {
      return (
        <Link
          key={category.id}
          href={getCategoryUrl(category.id)}
          className="block"
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        key={category.id}
        onClick={() => handleCategorySelect(category.id)}
        className="block w-full text-left"
      >
        {content}
      </button>
    );
  };

  // 水平布局
  if (orientation === 'horizontal') {
    return (
      <div className={cn('relative', className)}>
        {/* 左滚动按钮 */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 z-10',
              'w-8 h-8 flex items-center justify-center',
              'bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm',
              'rounded-full shadow-lg border border-gray-200/50 dark:border-gray-700/50',
              'text-gray-600 dark:text-gray-400',
              'hover:bg-white dark:hover:bg-gray-900',
              'transition-all duration-200'
            )}
            aria-label="向左滚动"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* 滚动容器 */}
        <div
          ref={scrollContainerRef}
          className={cn(
            'flex gap-2 overflow-x-auto scrollbar-hide',
            'px-1 py-1',
            canScrollLeft && 'pl-10',
            canScrollRight && 'pr-10'
          )}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categories.map(renderNavItem)}
        </div>

        {/* 右滚动按钮 */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className={cn(
              'absolute right-0 top-1/2 -translate-y-1/2 z-10',
              'w-8 h-8 flex items-center justify-center',
              'bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm',
              'rounded-full shadow-lg border border-gray-200/50 dark:border-gray-700/50',
              'text-gray-600 dark:text-gray-400',
              'hover:bg-white dark:hover:bg-gray-900',
              'transition-all duration-200'
            )}
            aria-label="向右滚动"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* 渐变遮罩 */}
        {canScrollLeft && (
          <div className="absolute left-8 top-0 bottom-0 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none" />
        )}
        {canScrollRight && (
          <div className="absolute right-8 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none" />
        )}
      </div>
    );
  }

  // 垂直布局
  return (
    <nav className={cn('space-y-1', className)}>
      {categories.map(renderNavItem)}
    </nav>
  );
}

export default AchievementCategoryNav;
