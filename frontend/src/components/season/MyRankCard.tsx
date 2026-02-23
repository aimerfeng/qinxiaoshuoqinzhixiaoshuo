'use client';

import { motion } from 'motion/react';
import {
  Trophy,
  BookOpen,
  PenTool,
  MessageCircle,
  Star,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  UserLeaderboardSummary,
  LeaderboardCategory,
  SeasonTier,
} from '@/types/season';
import {
  LEADERBOARD_CATEGORY_NAMES,
  SEASON_TIER_NAMES,
  SEASON_TIER_COLORS,
  getTierProgress,
  formatScore,
} from '@/types/season';
import { RankChangeSmall as RankChangeSmallAnimated } from './RankChangeAnimation';

/**
 * 我的排名卡片组件
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.5: 我的排名卡片（当前排名/段位/进度）
 *
 * 功能：
 * - 显示当前用户在各类别的排名（阅读/创作/社交/综合）
 * - 显示当前段位及对应样式（使用 SEASON_TIER_COLORS）
 * - 显示升级进度条（使用 getTierProgress 函数）
 * - 显示积分明细（阅读/创作/社交积分）
 * - 显示排名变化指示器
 * - 支持加载骨架屏状态
 * - 支持空/未上榜状态
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */

// ==================== 类型定义 ====================

export interface MyRankCardProps {
  /** 用户排行榜汇总数据 */
  summary?: UserLeaderboardSummary | null;
  /** 是否加载中 */
  isLoading?: boolean;
  /** 点击查看详情回调 */
  onViewDetails?: () => void;
  /** 点击类别回调 */
  onCategoryClick?: (category: LeaderboardCategory) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否显示积分明细 */
  showPointsBreakdown?: boolean;
  /** 是否显示所有类别排名 */
  showAllCategories?: boolean;
  /** 是否紧凑模式 */
  compact?: boolean;
}

// ==================== 子组件 ====================

/**
 * 类别图标映射
 */
const CATEGORY_ICONS: Record<LeaderboardCategory, typeof BookOpen> = {
  READING: BookOpen,
  CREATION: PenTool,
  SOCIAL: MessageCircle,
  OVERALL: Star,
};

/**
 * 段位徽章组件（大尺寸）
 */
function TierBadgeLarge({ tier }: { tier: SeasonTier }) {
  const colors = SEASON_TIER_COLORS[tier];
  const name = SEASON_TIER_NAMES[tier];

  return (
    <div className="relative">
      <div
        className={cn(
          'w-16 h-16 sm:w-20 sm:h-20 rounded-2xl',
          'flex items-center justify-center',
          'bg-gradient-to-br',
          colors.gradient,
          'shadow-lg',
          tier === 'KING' && 'animate-pulse'
        )}
      >
        <Trophy className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
      </div>
      {/* 段位名称标签 */}
      <div
        className={cn(
          'absolute -bottom-2 left-1/2 transform -translate-x-1/2',
          'px-3 py-0.5 rounded-full text-xs font-bold',
          'bg-white dark:bg-gray-900',
          'border-2',
          colors.border,
          colors.text,
          'whitespace-nowrap shadow-sm'
        )}
      >
        {name}
      </div>
    </div>
  );
}

/**
 * 进度条组件
 */
function TierProgressBar({
  currentPoints,
  currentTier,
}: {
  currentPoints: number;
  currentTier: SeasonTier;
}) {
  const { percent, nextTier, pointsToNext } = getTierProgress(currentPoints, currentTier);
  const colors = SEASON_TIER_COLORS[currentTier];
  const nextColors = nextTier ? SEASON_TIER_COLORS[nextTier] : null;

  return (
    <div className="w-full">
      {/* 进度信息 */}
      <div className="flex items-center justify-between mb-2 text-xs">
        <span className={cn('font-medium', colors.text)}>
          {SEASON_TIER_NAMES[currentTier]}
        </span>
        {nextTier ? (
          <span className="text-gray-500 dark:text-gray-400">
            距离 <span className={cn('font-medium', nextColors?.text)}>{SEASON_TIER_NAMES[nextTier]}</span> 还需 {pointsToNext} 积分
          </span>
        ) : (
          <span className="text-amber-500 font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            已达最高段位
          </span>
        )}
      </div>

      {/* 进度条 */}
      <div className="relative h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn(
            'absolute inset-y-0 left-0 rounded-full',
            'bg-gradient-to-r',
            colors.gradient
          )}
        />
        {/* 光效 */}
        <div
          className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* 当前积分 */}
      <div className="flex items-center justify-between mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span>{currentPoints} 积分</span>
        <span>{Math.round(percent)}%</span>
      </div>
    </div>
  );
}

/**
 * 排名变化指示器（小型）
 * 使用 RankChangeAnimation 组件实现动画效果
 * 任务25.2.7: 排名变化动画（上升/下降箭头）
 */
function RankChangeSmall({ rankChange }: { rankChange: number | null }) {
  return (
    <RankChangeSmallAnimated
      rankChange={rankChange}
      animated={true}
    />
  );
}

/**
 * 类别排名卡片
 */
function CategoryRankItem({
  category,
  score,
  rank,
  rankChange,
  onClick,
}: {
  category: LeaderboardCategory;
  score: number;
  rank: number | null;
  rankChange: number | null;
  onClick?: () => void;
}) {
  const Icon = CATEGORY_ICONS[category];
  const name = LEADERBOARD_CATEGORY_NAMES[category];

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl w-full',
        'bg-white/50 dark:bg-gray-800/50',
        'border border-white/30 dark:border-gray-700/30',
        'hover:bg-white/80 dark:hover:bg-gray-800/80',
        'transition-all duration-200',
        onClick && 'cursor-pointer'
      )}
    >
      {/* 图标 */}
      <div
        className={cn(
          'w-9 h-9 rounded-lg flex items-center justify-center',
          'bg-gradient-to-br from-indigo-500/10 to-purple-500/10',
          'text-indigo-500 dark:text-indigo-400'
        )}
      >
        <Icon className="w-4 h-4" />
      </div>

      {/* 类别名称和分数 */}
      <div className="flex-1 text-left">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatScore(score)} 积分
        </p>
      </div>

      {/* 排名 */}
      <div className="text-right">
        <p className="text-base font-bold text-gray-900 dark:text-white">
          {rank ? `#${rank}` : '-'}
        </p>
        <RankChangeSmall rankChange={rankChange} />
      </div>

      {/* 箭头 */}
      {onClick && (
        <ChevronRight className="w-4 h-4 text-gray-400" />
      )}
    </motion.button>
  );
}

/**
 * 积分明细组件
 */
function PointsBreakdown({
  breakdown,
}: {
  breakdown?: {
    readingPoints?: number;
    creationPoints?: number;
    socialPoints?: number;
  } | null;
}) {
  if (!breakdown) return null;

  const items = [
    { label: '阅读', value: breakdown.readingPoints || 0, icon: BookOpen, color: 'text-blue-500' },
    { label: '创作', value: breakdown.creationPoints || 0, icon: PenTool, color: 'text-purple-500' },
    { label: '社交', value: breakdown.socialPoints || 0, icon: MessageCircle, color: 'text-pink-500' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className={cn(
            'flex flex-col items-center p-2 rounded-lg',
            'bg-white/30 dark:bg-gray-800/30'
          )}
        >
          <item.icon className={cn('w-4 h-4 mb-1', item.color)} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {item.label}
          </span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">
            {formatScore(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 骨架屏组件
 */
function MyRankCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-2xl p-4 sm:p-6',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'animate-pulse'
      )}
    >
      {/* 头部 */}
      <div className="flex items-start gap-4 mb-6">
        {/* 段位徽章骨架 */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        
        {/* 信息骨架 */}
        <div className="flex-1">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>
      </div>

      {!compact && (
        <>
          {/* 类别排名骨架 */}
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-gray-100 dark:bg-gray-800"
              >
                <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1" />
                  <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
                <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 空状态/未上榜组件
 */
function EmptyState({ onViewDetails }: { onViewDetails?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-2xl p-6 sm:p-8 text-center',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30'
      )}
    >
      <div className="relative inline-block mb-4">
        <div
          className={cn(
            'w-16 h-16 rounded-2xl',
            'bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600',
            'flex items-center justify-center'
          )}
        >
          <Trophy className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="absolute -top-1 -right-1">
          <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        暂未上榜
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 max-w-xs mx-auto">
        参与阅读、创作和社交活动，积累积分即可上榜！
      </p>

      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl',
            'bg-gradient-to-r from-indigo-500 to-purple-500',
            'text-white text-sm font-medium',
            'hover:from-indigo-600 hover:to-purple-600',
            'transition-all duration-200'
          )}
        >
          <span>查看排行榜</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </motion.div>
  );
}

// ==================== 主组件 ====================

/**
 * 我的排名卡片组件
 */
export function MyRankCard({
  summary,
  isLoading = false,
  onViewDetails,
  onCategoryClick,
  className,
  showPointsBreakdown = true,
  showAllCategories = true,
  compact = false,
}: MyRankCardProps) {
  // 加载状态
  if (isLoading) {
    return <MyRankCardSkeleton compact={compact} />;
  }

  // 空状态/未上榜
  if (!summary || !summary.seasonRank) {
    return <EmptyState onViewDetails={onViewDetails} />;
  }

  const { seasonRank, rankings } = summary;
  const { tier, points, pointsBreakdown } = seasonRank;
  const colors = SEASON_TIER_COLORS[tier];

  // 获取综合排名
  const overallRanking = rankings.find((r) => r.category === 'OVERALL');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'shadow-lg',
        className
      )}
    >
      {/* 头部渐变背景 */}
      <div
        className={cn(
          'relative p-4 sm:p-6',
          'bg-gradient-to-br',
          colors.gradient,
          'bg-opacity-10'
        )}
        style={{
          background: `linear-gradient(135deg, ${colors.gradient.includes('rose') ? 'rgba(244, 63, 94, 0.1)' : 'rgba(99, 102, 241, 0.1)'}, ${colors.gradient.includes('amber') ? 'rgba(245, 158, 11, 0.1)' : 'rgba(139, 92, 246, 0.1)'})`,
        }}
      >
        {/* 装饰元素 */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-2xl transform translate-x-10 -translate-y-10" />

        <div className="relative flex items-start gap-4">
          {/* 段位徽章 */}
          <TierBadgeLarge tier={tier} />

          {/* 排名信息 */}
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                我的排名
              </h3>
              {overallRanking && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-bold',
                    'bg-white/80 dark:bg-gray-800/80',
                    colors.text
                  )}
                >
                  #{overallRanking.rank || '-'}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              当前积分: <span className="font-bold text-gray-900 dark:text-white">{formatScore(points)}</span>
            </p>

            {/* 进度条 */}
            <TierProgressBar currentPoints={points} currentTier={tier} />
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="p-4 sm:p-6 space-y-4">
        {/* 积分明细 */}
        {showPointsBreakdown && pointsBreakdown && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              积分构成
            </h4>
            <PointsBreakdown breakdown={pointsBreakdown} />
          </div>
        )}

        {/* 各类别排名 */}
        {showAllCategories && !compact && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              分类排名
            </h4>
            <div className="space-y-2">
              {rankings.map((ranking) => (
                <CategoryRankItem
                  key={ranking.category}
                  category={ranking.category}
                  score={ranking.score}
                  rank={ranking.rank}
                  rankChange={ranking.rankChange}
                  onClick={onCategoryClick ? () => onCategoryClick(ranking.category) : undefined}
                />
              ))}
            </div>
          </div>
        )}

        {/* 查看详情按钮 */}
        {onViewDetails && (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={onViewDetails}
            className={cn(
              'w-full py-3 rounded-xl',
              'bg-gradient-to-r from-indigo-500/10 to-purple-500/10',
              'border border-indigo-500/20 dark:border-purple-500/20',
              'text-sm font-medium text-indigo-600 dark:text-indigo-400',
              'hover:from-indigo-500/20 hover:to-purple-500/20',
              'transition-all duration-200',
              'flex items-center justify-center gap-2'
            )}
          >
            <span>查看完整排行榜</span>
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// 导出子组件供外部使用
export { TierBadgeLarge, TierProgressBar, CategoryRankItem, PointsBreakdown, MyRankCardSkeleton };
