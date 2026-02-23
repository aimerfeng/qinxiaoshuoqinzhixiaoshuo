'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  Check,
  Lock,
  Gift,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  SeasonReward,
  UserSeasonReward,
  SeasonTier,
  TierRewardsSummary,
} from '@/types/season';
import {
  SEASON_TIER_NAMES,
  SEASON_TIER_COLORS,
  SEASON_TIER_MIN_POINTS,
} from '@/types/season';
import { SeasonRewardCard, SeasonRewardCardSkeleton } from './SeasonRewardCard';

/**
 * 段位奖励区块组件
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.8: 赛季奖励预览页面 - 段位奖励区块组件
 *
 * 功能：
 * - 显示特定段位的所有奖励
 * - 显示段位达成状态（已达成/未达成）
 * - 支持展开/收起奖励列表
 * - 支持批量选择奖励
 * - 支持加载骨架屏状态
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */

// ==================== 类型定义 ====================

export interface TierRewardsSectionProps {
  /** 段位 */
  tier: SeasonTier;
  /** 该段位的奖励列表 */
  rewards: SeasonReward[];
  /** 用户奖励状态映射（rewardId -> UserSeasonReward） */
  userRewardsMap?: Map<string, UserSeasonReward>;
  /** 用户当前段位 */
  userTier?: SeasonTier | null;
  /** 用户当前积分 */
  userPoints?: number;
  /** 是否已达成该段位 */
  isAchieved?: boolean;
  /** 是否可领取（有待领取的奖励） */
  canClaim?: boolean;
  /** 待领取奖励数量 */
  pendingCount?: number;
  /** 是否默认展开 */
  defaultExpanded?: boolean;
  /** 是否加载中 */
  isLoading?: boolean;
  /** 选中的奖励ID列表 */
  selectedRewardIds?: string[];
  /** 点击领取单个奖励回调 */
  onClaimReward?: (rewardId: string) => void;
  /** 点击选择奖励回调 */
  onSelectReward?: (rewardId: string, selected: boolean) => void;
  /** 点击全选/取消全选回调 */
  onSelectAll?: (tier: SeasonTier, selected: boolean) => void;
  /** 点击查看奖励详情回调 */
  onViewRewardDetails?: (reward: SeasonReward) => void;
  /** 自定义类名 */
  className?: string;
}

// ==================== 子组件 ====================

/**
 * 段位头部组件
 */
function TierHeader({
  tier,
  isAchieved,
  pendingCount,
  isExpanded,
  onToggle,
}: {
  tier: SeasonTier;
  isAchieved: boolean;
  pendingCount: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const colors = SEASON_TIER_COLORS[tier];
  const tierName = SEASON_TIER_NAMES[tier];
  const minPoints = SEASON_TIER_MIN_POINTS[tier];

  return (
    <motion.button
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.995 }}
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-4 p-4 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'hover:bg-white/80 dark:hover:bg-gray-800/80',
        'transition-all duration-200',
        'cursor-pointer'
      )}
    >
      {/* 段位图标 */}
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          'bg-gradient-to-br',
          colors.gradient,
          'shadow-md',
          !isAchieved && 'opacity-50 grayscale'
        )}
      >
        <Trophy className="w-6 h-6 text-white" />
      </div>

      {/* 段位信息 */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <h3 className={cn('text-lg font-bold', colors.text)}>
            {tierName}
          </h3>
          {isAchieved ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">
              <Check className="w-3 h-3" />
              已达成
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <Lock className="w-3 h-3" />
              未解锁
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          需要 {minPoints} 积分
        </p>
      </div>

      {/* 待领取数量 */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
          <Gift className="w-4 h-4" />
          <span className="text-sm font-medium">{pendingCount}</span>
        </div>
      )}

      {/* 展开/收起图标 */}
      <div className="text-gray-400">
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </div>
    </motion.button>
  );
}

/**
 * 奖励列表组件
 */
function RewardsList({
  rewards,
  userRewardsMap,
  userTier,
  isAchieved,
  selectedRewardIds,
  onClaimReward,
  onSelectReward,
  onViewRewardDetails,
}: {
  rewards: SeasonReward[];
  userRewardsMap?: Map<string, UserSeasonReward>;
  userTier?: SeasonTier | null;
  isAchieved: boolean;
  selectedRewardIds?: string[];
  onClaimReward?: (rewardId: string) => void;
  onSelectReward?: (rewardId: string, selected: boolean) => void;
  onViewRewardDetails?: (reward: SeasonReward) => void;
}) {
  if (rewards.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">该段位暂无奖励</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rewards.map((reward) => {
        const userReward = userRewardsMap?.get(reward.id);
        const isSelected = selectedRewardIds?.includes(reward.id) ?? false;

        return (
          <SeasonRewardCard
            key={reward.id}
            reward={reward}
            userReward={userReward}
            userTier={userTier}
            canClaim={isAchieved && (!userReward || userReward.status === 'PENDING')}
            isSelected={isSelected}
            onClaim={onClaimReward}
            onSelect={onSelectReward}
            onViewDetails={onViewRewardDetails}
            size="md"
            showTierBadge={false}
            disabled={!isAchieved}
          />
        );
      })}
    </div>
  );
}

/**
 * 骨架屏组件
 */
export function TierRewardsSectionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {/* 头部骨架 */}
      <div
        className={cn(
          'flex items-center gap-4 p-4 rounded-xl',
          'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
          'border border-white/20 dark:border-gray-700/30'
        )}
      >
        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1">
          <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* 奖励列表骨架 */}
      <div className="grid gap-3 sm:grid-cols-2 pl-4">
        {[1, 2].map((i) => (
          <SeasonRewardCardSkeleton key={i} size="md" />
        ))}
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

/**
 * 段位奖励区块组件
 */
export function TierRewardsSection({
  tier,
  rewards,
  userRewardsMap,
  userTier,
  userPoints = 0,
  isAchieved: isAchievedProp,
  canClaim: canClaimProp,
  pendingCount: pendingCountProp,
  defaultExpanded = false,
  isLoading = false,
  selectedRewardIds = [],
  onClaimReward,
  onSelectReward,
  onSelectAll,
  onViewRewardDetails,
  className,
}: TierRewardsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // 计算是否达成该段位
  const isAchieved = isAchievedProp ?? (userTier ? (() => {
    const tiers: SeasonTier[] = [
      'NOVICE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
      'DIAMOND', 'MASTER', 'GRANDMASTER', 'KING',
    ];
    return tiers.indexOf(userTier) >= tiers.indexOf(tier);
  })() : false);

  // 计算待领取数量
  const pendingCount = pendingCountProp ?? rewards.filter((r) => {
    const userReward = userRewardsMap?.get(r.id);
    return isAchieved && (!userReward || userReward.status === 'PENDING');
  }).length;

  // 计算是否可领取
  const canClaim = canClaimProp ?? pendingCount > 0;

  // 计算该段位选中的奖励数量
  const selectedInTier = rewards.filter((r) => selectedRewardIds.includes(r.id)).length;
  const allSelectedInTier = selectedInTier === rewards.length && rewards.length > 0;

  // 加载状态
  if (isLoading) {
    return <TierRewardsSectionSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-3', className)}
    >
      {/* 段位头部 */}
      <TierHeader
        tier={tier}
        isAchieved={isAchieved}
        pendingCount={pendingCount}
        isExpanded={isExpanded}
        onToggle={() => setIsExpanded(!isExpanded)}
      />

      {/* 奖励列表（可展开/收起） */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-6">
              {/* 全选/取消全选按钮 */}
              {onSelectAll && rewards.length > 0 && isAchieved && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {rewards.length} 个奖励
                  </span>
                  <button
                    onClick={() => onSelectAll(tier, !allSelectedInTier)}
                    className={cn(
                      'text-sm font-medium',
                      'text-indigo-600 dark:text-indigo-400',
                      'hover:text-indigo-700 dark:hover:text-indigo-300',
                      'transition-colors duration-200'
                    )}
                  >
                    {allSelectedInTier ? '取消全选' : '全选'}
                  </button>
                </div>
              )}

              {/* 奖励列表 */}
              <RewardsList
                rewards={rewards}
                userRewardsMap={userRewardsMap}
                userTier={userTier}
                isAchieved={isAchieved}
                selectedRewardIds={selectedRewardIds}
                onClaimReward={onClaimReward}
                onSelectReward={onSelectReward}
                onViewRewardDetails={onViewRewardDetails}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default TierRewardsSection;
