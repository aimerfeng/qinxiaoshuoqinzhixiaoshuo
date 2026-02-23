'use client';

import { motion } from 'motion/react';
import {
  Trophy,
  Crown,
  Sparkles,
  Medal,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  LeaderboardEntry,
  LeaderboardCategory,
  SeasonTier,
} from '@/types/season';
import {
  LEADERBOARD_CATEGORY_NAMES,
  SEASON_TIER_NAMES,
  SEASON_TIER_COLORS,
  formatScore,
} from '@/types/season';
import { RankChangeAnimation } from './RankChangeAnimation';

/**
 * 排行榜列表组件
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.4: 排行榜列表组件（排名/头像/分数/段位）
 *
 * 功能：
 * - 显示排名（前三名特殊样式：金/银/铜）
 * - 用户头像（支持 fallback 到首字母）
 * - 分数显示（格式化数字）
 * - 段位徽章（使用 SEASON_TIER_COLORS）
 * - 排名变化指示器（上升/下降箭头）
 * - 加载骨架屏状态
 * - 空状态
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */

// ==================== 类型定义 ====================

export interface LeaderboardListProps {
  /** 排行榜条目列表 */
  entries: LeaderboardEntry[];
  /** 当前排行榜类别 */
  category: LeaderboardCategory;
  /** 是否加载中 */
  isLoading?: boolean;
  /** 是否显示段位徽章 */
  showTierBadge?: boolean;
  /** 用户段位映射（userId -> tier） */
  userTiers?: Record<string, SeasonTier>;
  /** 点击条目回调 */
  onEntryClick?: (entry: LeaderboardEntry) => void;
  /** 自定义类名 */
  className?: string;
  /** 骨架屏数量 */
  skeletonCount?: number;
  /** 空状态自定义文案 */
  emptyText?: string;
  /** 空状态自定义描述 */
  emptyDescription?: string;
}

export interface LeaderboardItemProps {
  /** 排行榜条目 */
  entry: LeaderboardEntry;
  /** 动画延迟索引 */
  index: number;
  /** 是否显示段位徽章 */
  showTierBadge?: boolean;
  /** 用户段位 */
  tier?: SeasonTier;
  /** 点击回调 */
  onClick?: () => void;
}

// ==================== 子组件 ====================

/**
 * 排名徽章组件
 * 前三名使用特殊样式（金/银/铜）
 */
function RankBadge({ rank }: { rank: number | null }) {
  if (rank === null) {
    return (
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400">
        -
      </div>
    );
  }

  // 前三名特殊样式
  if (rank === 1) {
    return (
      <div className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 text-white font-bold shadow-lg shadow-amber-500/30">
        <Crown className="w-5 h-5" />
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-3 h-3 text-yellow-300 animate-pulse" />
        </div>
      </div>
    );
  }

  if (rank === 2) {
    return (
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-gray-300 to-gray-400 text-white font-bold shadow-lg shadow-gray-400/30">
        <Medal className="w-5 h-5" />
      </div>
    );
  }

  if (rank === 3) {
    return (
      <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-600 to-amber-700 text-white font-bold shadow-lg shadow-amber-600/30">
        <Medal className="w-5 h-5" />
      </div>
    );
  }

  // 其他排名
  return (
    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold">
      {rank}
    </div>
  );
}

/**
 * 用户头像组件
 * 支持图片和首字母 fallback
 */
function UserAvatar({
  avatarUrl,
  nickname,
  memberLevel,
}: {
  avatarUrl?: string | null;
  nickname: string;
  memberLevel: string;
}) {
  const initial = nickname.charAt(0).toUpperCase();

  return (
    <div className="relative">
      <div
        className={cn(
          'w-10 h-10 rounded-full',
          'bg-gradient-to-br from-indigo-400 to-purple-500',
          'flex items-center justify-center text-white font-medium',
          'ring-2 ring-white/50 dark:ring-gray-800/50'
        )}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={nickname}
            className="w-full h-full rounded-full object-cover"
            onError={(e) => {
              // 图片加载失败时显示首字母
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="text-sm">{initial}</span>
        )}
      </div>
      {/* 会员等级标识 */}
      {memberLevel !== 'REGULAR' && (
        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
          <Crown className="w-2.5 h-2.5 text-white" />
        </div>
      )}
    </div>
  );
}

/**
 * 段位徽章组件
 */
function TierBadge({ tier }: { tier: SeasonTier }) {
  const colors = SEASON_TIER_COLORS[tier];
  const name = SEASON_TIER_NAMES[tier];

  return (
    <div
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium',
        'border',
        colors.bg,
        colors.text,
        colors.border
      )}
    >
      {name}
    </div>
  );
}

/**
 * 排名变化指示器组件
 * 使用 RankChangeAnimation 组件实现动画效果
 * 任务25.2.7: 排名变化动画（上升/下降箭头）
 */
function RankChangeIndicator({ rankChange }: { rankChange: number | null }) {
  // 使用新的动画组件
  return (
    <RankChangeAnimation
      rankChange={rankChange}
      size="small"
      showNumber={true}
      animated={true}
      showBackground={true}
    />
  );
}

/**
 * 排行榜单条目组件
 */
function LeaderboardItem({
  entry,
  index,
  showTierBadge = false,
  tier,
  onClick,
}: LeaderboardItemProps) {
  const isTopThree = entry.rank !== null && entry.rank <= 3;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:bg-white/80 dark:hover:bg-gray-800/80',
        isTopThree && 'ring-2 ring-amber-400/30 dark:ring-amber-500/20'
      )}
    >
      {/* 排名 */}
      <RankBadge rank={entry.rank} />

      {/* 用户信息 */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* 头像 */}
        <UserAvatar
          avatarUrl={entry.user.avatarUrl}
          nickname={entry.user.nickname}
          memberLevel={entry.user.memberLevel}
        />

        {/* 昵称和段位 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {entry.user.nickname}
            </p>
            {showTierBadge && tier && (
              <TierBadge tier={tier} />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            最高排名: {entry.peakRank ? `#${entry.peakRank}` : '-'}
          </p>
        </div>
      </div>

      {/* 分数 */}
      <div className="text-right shrink-0">
        <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
          {formatScore(entry.score)}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">积分</p>
      </div>

      {/* 排名变化 */}
      <div className="shrink-0 hidden sm:block">
        <RankChangeIndicator rankChange={entry.rankChange} />
      </div>
    </motion.div>
  );
}

/**
 * 排行榜骨架屏组件
 */
function LeaderboardSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl',
            'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
            'border border-white/20 dark:border-gray-700/30',
            'animate-pulse'
          )}
        >
          {/* 排名骨架 */}
          <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
          
          {/* 头像骨架 */}
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
          
          {/* 用户信息骨架 */}
          <div className="flex-1 min-w-0">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          
          {/* 分数骨架 */}
          <div className="text-right shrink-0">
            <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
            <div className="h-3 w-8 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          
          {/* 排名变化骨架 */}
          <div className="h-6 w-14 bg-gray-200 dark:bg-gray-700 rounded-lg hidden sm:block" />
        </div>
      ))}
    </div>
  );
}

/**
 * 空状态组件
 */
function EmptyState({
  category,
  emptyText,
  emptyDescription,
}: {
  category: LeaderboardCategory;
  emptyText?: string;
  emptyDescription?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'text-center py-12 sm:py-16 rounded-2xl',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30'
      )}
    >
      <div className="relative inline-block mb-4">
        <Trophy className="w-14 h-14 sm:w-16 sm:h-16 text-gray-300 dark:text-gray-600" />
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
        </div>
      </div>
      <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-2">
        {emptyText || '暂无排行数据'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
        {emptyDescription ||
          `${LEADERBOARD_CATEGORY_NAMES[category]}暂时没有数据，快来成为第一名吧！`}
      </p>
    </motion.div>
  );
}

// ==================== 主组件 ====================

/**
 * 排行榜列表组件
 */
export function LeaderboardList({
  entries,
  category,
  isLoading = false,
  showTierBadge = false,
  userTiers = {},
  onEntryClick,
  className,
  skeletonCount = 10,
  emptyText,
  emptyDescription,
}: LeaderboardListProps) {
  // 加载状态
  if (isLoading) {
    return (
      <div className={className}>
        <LeaderboardSkeleton count={skeletonCount} />
      </div>
    );
  }

  // 空状态
  if (entries.length === 0) {
    return (
      <div className={className}>
        <EmptyState
          category={category}
          emptyText={emptyText}
          emptyDescription={emptyDescription}
        />
      </div>
    );
  }

  // 排行榜列表
  return (
    <div className={cn('space-y-3', className)}>
      {entries.map((entry, index) => (
        <LeaderboardItem
          key={entry.id}
          entry={entry}
          index={index}
          showTierBadge={showTierBadge}
          tier={userTiers[entry.userId]}
          onClick={onEntryClick ? () => onEntryClick(entry) : undefined}
        />
      ))}
    </div>
  );
}

// 导出子组件供外部使用
export { RankBadge, UserAvatar, TierBadge, RankChangeIndicator, LeaderboardSkeleton };
