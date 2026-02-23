'use client';

import { motion } from 'motion/react';
import {
  Trophy,
  Calendar,
  Medal,
  Gift,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Pen,
  MessageCircle,
  Star,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  UserSeasonHistoryEntry,
  LeaderboardCategory,
  SeasonTier,
} from '@/types/season';
import {
  SEASON_TIER_NAMES,
  SEASON_TIER_COLORS,
  LEADERBOARD_CATEGORY_NAMES,
  formatRank,
  formatScore,
} from '@/types/season';
import { useState, useCallback } from 'react';

/**
 * 赛季历史卡片组件
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.9: 赛季历史记录页面
 *
 * 功能：
 * - 显示单个历史赛季记录
 * - 展示最终段位和积分
 * - 显示各类别最终排名
 * - 展示获得的奖励
 * - 支持展开/收起详情
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

// ==================== 类型定义 ====================

export interface SeasonHistoryCardProps {
  /** 历史记录条目 */
  entry: UserSeasonHistoryEntry;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 点击查看详情回调 */
  onViewDetails?: (seasonId: string) => void;
  /** 自定义类名 */
  className?: string;
}

// ==================== 辅助函数 ====================

/**
 * 获取类别图标
 */
function getCategoryIcon(category: LeaderboardCategory) {
  switch (category) {
    case 'READING':
      return BookOpen;
    case 'CREATION':
      return Pen;
    case 'SOCIAL':
      return MessageCircle;
    case 'OVERALL':
      return Star;
    default:
      return Star;
  }
}

/**
 * 格式化日期范围
 */
function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('zh-CN', options)} - ${end.toLocaleDateString('zh-CN', options)}`;
}

// ==================== 子组件 ====================

/**
 * 段位徽章组件
 */
function TierBadge({ tier, size = 'default' }: { tier: SeasonTier; size?: 'small' | 'default' | 'large' }) {
  const colors = SEASON_TIER_COLORS[tier];
  const sizeClasses = {
    small: 'px-2 py-0.5 text-xs',
    default: 'px-3 py-1 text-sm',
    large: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClasses[size],
        colors.bg,
        colors.text,
        `border ${colors.border}`
      )}
    >
      <Trophy className={cn(size === 'small' ? 'w-3 h-3' : size === 'large' ? 'w-5 h-5' : 'w-4 h-4')} />
      {SEASON_TIER_NAMES[tier]}
    </span>
  );
}

/**
 * 排名项组件
 */
function RankingItem({
  category,
  rank,
  score,
}: {
  category: LeaderboardCategory;
  rank: number | null;
  score: number;
}) {
  const Icon = getCategoryIcon(category);

  return (
    <div
      className={cn(
        'flex items-center justify-between p-3 rounded-xl',
        'bg-white/40 dark:bg-gray-800/40',
        'border border-white/20 dark:border-gray-700/20'
      )}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'p-1.5 rounded-lg',
            'bg-gradient-to-br from-indigo-500/10 to-purple-500/10'
          )}
        >
          <Icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
        </div>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {LEADERBOARD_CATEGORY_NAMES[category]}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatScore(score)} 分
        </span>
        <span
          className={cn(
            'text-sm font-bold',
            rank && rank <= 3
              ? 'text-amber-500'
              : rank && rank <= 10
              ? 'text-indigo-500'
              : 'text-gray-600 dark:text-gray-400'
          )}
        >
          {formatRank(rank)}
        </span>
      </div>
    </div>
  );
}

/**
 * 奖励项组件
 */
function RewardItem({
  reward,
}: {
  reward: UserSeasonHistoryEntry['rewards'][0];
}) {
  const statusColors = {
    CLAIMED: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
    PENDING: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    EXPIRED: 'text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/50',
  };

  const statusText = {
    CLAIMED: '已领取',
    PENDING: '待领取',
    EXPIRED: '已过期',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between p-2 rounded-lg',
        'bg-white/30 dark:bg-gray-800/30'
      )}
    >
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-purple-500" />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {reward.description || reward.rewardType}
        </span>
      </div>
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium',
          statusColors[reward.status as keyof typeof statusColors] || statusColors.PENDING
        )}
      >
        {statusText[reward.status as keyof typeof statusText] || reward.status}
      </span>
    </div>
  );
}

// ==================== 主组件 ====================

export function SeasonHistoryCard({
  entry,
  defaultExpanded = false,
  onViewDetails,
  className,
}: SeasonHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const tierColors = SEASON_TIER_COLORS[entry.rank.tier];

  const handleToggle = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.(entry.season.id);
  }, [entry.season.id, onViewDetails]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'shadow-lg shadow-indigo-500/5',
        className
      )}
    >
      {/* 卡片头部 */}
      <div
        className={cn(
          'p-4 cursor-pointer',
          'hover:bg-white/40 dark:hover:bg-gray-800/40',
          'transition-colors duration-200'
        )}
        onClick={handleToggle}
      >
        <div className="flex items-center justify-between">
          {/* 左侧：赛季信息 */}
          <div className="flex items-center gap-4">
            {/* 段位图标 */}
            <div
              className={cn(
                'w-14 h-14 rounded-xl flex items-center justify-center',
                'bg-gradient-to-br',
                tierColors.gradient
              )}
            >
              <Trophy className="w-7 h-7 text-white" />
            </div>

            {/* 赛季名称和时间 */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {entry.season.name}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDateRange(entry.season.startDate, entry.season.endDate)}
                </span>
              </div>
            </div>
          </div>

          {/* 右侧：段位和展开按钮 */}
          <div className="flex items-center gap-3">
            <TierBadge tier={entry.rank.tier} />
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </motion.div>
          </div>
        </div>

        {/* 积分和综合排名预览 */}
        <div className="flex items-center gap-4 mt-3 ml-[72px]">
          <div className="flex items-center gap-1.5">
            <Medal className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {formatScore(entry.rank.points)} 积分
            </span>
          </div>
          {entry.rankings.find((r) => r.category === 'OVERALL') && (
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-indigo-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                综合排名 {formatRank(entry.rankings.find((r) => r.category === 'OVERALL')?.finalRank ?? null)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 展开内容 */}
      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="px-4 pb-4 space-y-4">
          {/* 分隔线 */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

          {/* 各类别排名 */}
          <div>
            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
              各类别最终排名
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {entry.rankings.map((ranking) => (
                <RankingItem
                  key={ranking.category}
                  category={ranking.category}
                  rank={ranking.finalRank}
                  score={ranking.finalScore}
                />
              ))}
            </div>
          </div>

          {/* 获得的奖励 */}
          {entry.rewards.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                获得的奖励 ({entry.rewards.length})
              </h4>
              <div className="space-y-2">
                {entry.rewards.map((reward) => (
                  <RewardItem key={reward.id} reward={reward} />
                ))}
              </div>
            </div>
          )}

          {/* 查看详情按钮 */}
          {onViewDetails && (
            <button
              onClick={handleViewDetails}
              className={cn(
                'w-full py-2.5 rounded-xl',
                'bg-gradient-to-r from-indigo-500 to-purple-500',
                'text-white text-sm font-medium',
                'hover:from-indigo-600 hover:to-purple-600',
                'transition-all duration-200',
                'flex items-center justify-center gap-2'
              )}
            >
              <span>查看赛季详情</span>
              <ChevronUp className="w-4 h-4 rotate-90" />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * 赛季历史卡片骨架屏
 */
export function SeasonHistoryCardSkeleton() {
  return (
    <div
      className={cn(
        'rounded-2xl p-4',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'animate-pulse'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700" />
          <div>
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mt-2" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-7 w-20 bg-gray-200 dark:bg-gray-700 rounded-full" />
          <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
      <div className="flex items-center gap-4 mt-3 ml-[72px]">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    </div>
  );
}

export default SeasonHistoryCard;
