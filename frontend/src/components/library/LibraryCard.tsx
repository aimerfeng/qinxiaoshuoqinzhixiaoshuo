'use client';

import { motion } from 'motion/react';
import Image from 'next/image';
import { Flame, GitBranch, Crown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { UserAvatar } from '@/components/user/UserAvatar';
import type { LibraryCardProps } from '@/types/library';
import { LIBRARY_TYPE_NAMES } from '@/types/library';

/**
 * 格式化热度分数
 */
function formatHotScore(score: number): string {
  if (score >= 10000) {
    return (score / 10000).toFixed(1) + '万';
  }
  if (score >= 1000) {
    return (score / 1000).toFixed(1) + 'k';
  }
  return score.toFixed(0);
}

/**
 * 格式化分支数量
 */
function formatBranchCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}

/**
 * 获取排名样式
 */
function getRankStyle(rank: number): {
  bg: string;
  text: string;
  border: string;
  icon?: boolean;
} {
  switch (rank) {
    case 1:
      return {
        bg: 'bg-gradient-to-br from-amber-400 to-yellow-500',
        text: 'text-white',
        border: 'border-amber-300',
        icon: true,
      };
    case 2:
      return {
        bg: 'bg-gradient-to-br from-gray-300 to-gray-400',
        text: 'text-white',
        border: 'border-gray-200',
      };
    case 3:
      return {
        bg: 'bg-gradient-to-br from-amber-600 to-amber-700',
        text: 'text-white',
        border: 'border-amber-500',
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-600 dark:text-gray-300',
        border: 'border-gray-200 dark:border-gray-700',
      };
  }
}

/**
 * 小说库卡片组件
 *
 * 需求1.1: 显示小说库信息
 * 需求7.5: 热度排行榜展示
 *
 * 功能:
 * - 显示封面图片
 * - 显示标题和描述
 * - 显示热度分数徽章
 * - 显示分支数量
 * - 显示库拥有者信息
 * - 支持排行榜位置显示
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function LibraryCard({
  library,
  rank,
  onClick,
}: LibraryCardProps) {
  const rankStyle = rank ? getRankStyle(rank) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-white/70 dark:bg-gray-900/70',
        'backdrop-blur-xl',
        'border border-white/30 dark:border-gray-700/30',
        'shadow-lg shadow-indigo-500/5',
        'hover:shadow-xl hover:shadow-indigo-500/10',
        onClick && 'cursor-pointer',
        'transition-shadow duration-300'
      )}
    >
      {/* 排名徽章 */}
      {rank && rankStyle && (
        <div className="absolute top-3 left-3 z-10">
          <div
            className={cn(
              'flex items-center justify-center',
              'w-8 h-8 rounded-lg',
              'font-bold text-sm',
              'shadow-md',
              'border',
              rankStyle.bg,
              rankStyle.text,
              rankStyle.border
            )}
          >
            {rankStyle.icon ? (
              <Crown className="w-4 h-4" />
            ) : (
              rank
            )}
          </div>
        </div>
      )}

      {/* 封面图片 */}
      <div className="relative h-40 overflow-hidden">
        {library.coverImage ? (
          <Image
            src={library.coverImage}
            alt={library.title}
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <span className="text-4xl opacity-50">📚</span>
          </div>
        )}
        {/* 渐变遮罩 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* 库类型徽章 */}
        <div className="absolute top-3 right-3">
          <span
            className={cn(
              'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium',
              'backdrop-blur-sm',
              library.libraryType === 'ORIGINAL'
                ? 'bg-indigo-500/80 text-white'
                : 'bg-emerald-500/80 text-white'
            )}
          >
            {LIBRARY_TYPE_NAMES[library.libraryType]}
          </span>
        </div>

        {/* 热度分数 */}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/90 text-white text-xs font-medium backdrop-blur-sm">
            <Flame className="w-3.5 h-3.5" />
            <span>{formatHotScore(library.stats.hotScore)}</span>
          </div>
        </div>

        {/* 分支数量 */}
        <div className="absolute bottom-3 left-3">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/90 text-white text-xs font-medium backdrop-blur-sm">
            <GitBranch className="w-3.5 h-3.5" />
            <span>{formatBranchCount(library.stats.branchCount)} 分支</span>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4">
        {/* 标题 */}
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1.5 line-clamp-1">
          {library.title}
        </h3>

        {/* 描述 */}
        {library.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
            {library.description}
          </p>
        )}

        {/* 库拥有者信息 */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
          <UserAvatar
            avatar={library.owner.avatar}
            username={library.owner.username}
            displayName={library.owner.displayName}
            size="xs"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {library.owner.displayName || library.owner.username}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default LibraryCard;
