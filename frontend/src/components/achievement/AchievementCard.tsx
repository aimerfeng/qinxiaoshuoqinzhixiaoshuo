'use client';

import { motion } from 'motion/react';
import { Trophy, Gift, Loader2, Lock, Check, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  AchievementWithProgress,
  AchievementTier,
  AchievementRewardType,
  AchievementRewardValue,
} from '@/types/achievement';
import {
  ACHIEVEMENT_TIER_NAMES,
  ACHIEVEMENT_TIER_COLORS,
  ACHIEVEMENT_REWARD_TYPE_NAMES,
} from '@/types/achievement';
import { HiddenAchievementCard } from './HiddenAchievementCard';

/**
 * 成就卡片组件属性
 */
export interface AchievementCardProps {
  /** 成就数据（包含用户进度） */
  achievement: AchievementWithProgress;
  /** 领取奖励回调 */
  onClaim?: (achievementId: string) => void;
  /** 是否正在领取中 */
  isClaiming?: boolean;
  /** 点击卡片回调 */
  onClick?: (achievement: AchievementWithProgress) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否显示紧凑模式 */
  compact?: boolean;
  /** 是否显示类别提示（仅对隐藏成就有效） */
  showCategoryHint?: boolean;
}

/**
 * 获取奖励显示文本
 */
function getRewardDisplayText(
  rewardType: AchievementRewardType,
  rewardValue: AchievementRewardValue
): string {
  const typeName = ACHIEVEMENT_REWARD_TYPE_NAMES[rewardType];
  
  switch (rewardType) {
    case 'TOKENS':
      return rewardValue.amount ? `${typeName} x${rewardValue.amount}` : typeName;
    case 'BADGE':
      return typeName;
    case 'TITLE':
      return rewardValue.title ? `称号: ${rewardValue.title}` : typeName;
    case 'AVATAR_FRAME':
      return typeName;
    case 'THEME':
      return typeName;
    default:
      return typeName;
  }
}

/**
 * 等级徽章组件
 */
function TierBadge({ tier, className }: { tier: AchievementTier; className?: string }) {
  const tierColors = ACHIEVEMENT_TIER_COLORS[tier];
  
  return (
    <div
      className={cn(
        'px-2.5 py-1 rounded-lg text-xs font-semibold',
        'bg-gradient-to-r shadow-sm',
        tierColors.gradient,
        'text-white',
        className
      )}
    >
      {ACHIEVEMENT_TIER_NAMES[tier]}
    </div>
  );
}

/**
 * 进度条组件
 */
function ProgressBar({
  current,
  target,
  percent,
  tier,
  animated = true,
}: {
  current: number;
  target: number;
  percent: number;
  tier: AchievementTier;
  animated?: boolean;
}) {
  const tierColors = ACHIEVEMENT_TIER_COLORS[tier];
  const clampedPercent = Math.min(percent, 100);
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-500 dark:text-gray-400">
          进度: {current.toLocaleString()}/{target.toLocaleString()}
        </span>
        <span className={cn('font-semibold', tierColors.text)}>
          {clampedPercent.toFixed(0)}%
        </span>
      </div>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        {animated ? (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${clampedPercent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            className={cn(
              'h-full rounded-full bg-gradient-to-r',
              tierColors.gradient
            )}
          />
        ) : (
          <div
            style={{ width: `${clampedPercent}%` }}
            className={cn(
              'h-full rounded-full bg-gradient-to-r',
              tierColors.gradient
            )}
          />
        )}
      </div>
    </div>
  );
}

/**
 * 奖励预览组件
 */
function RewardPreview({
  rewardType,
  rewardValue,
  tier,
}: {
  rewardType: AchievementRewardType;
  rewardValue: AchievementRewardValue;
  tier: AchievementTier;
}) {
  const tierColors = ACHIEVEMENT_TIER_COLORS[tier];
  
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'p-1.5 rounded-lg',
          tierColors.bg
        )}
      >
        <Gift className={cn('w-4 h-4', tierColors.text)} />
      </div>
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {getRewardDisplayText(rewardType, rewardValue)}
      </span>
    </div>
  );
}

/**
 * 状态指示器组件
 */
function StatusIndicator({
  isUnlocked,
  isClaimed,
}: {
  isUnlocked: boolean;
  isClaimed: boolean;
}) {
  if (isClaimed) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
        <Check className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
        <span className="text-xs font-medium text-green-600 dark:text-green-400">
          已领取
        </span>
      </div>
    );
  }
  
  if (!isUnlocked) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800">
        <Lock className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          未解锁
        </span>
      </div>
    );
  }
  
  return null;
}

/**
 * 领取按钮组件
 */
function ClaimButton({
  onClick,
  isLoading,
  tier,
}: {
  onClick: () => void;
  isLoading: boolean;
  tier: AchievementTier;
}) {
  const tierColors = ACHIEVEMENT_TIER_COLORS[tier];
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={isLoading}
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold',
        'bg-gradient-to-r text-white shadow-md',
        tierColors.gradient,
        'hover:shadow-lg hover:brightness-110',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'transition-all duration-200'
      )}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          <span>领取奖励</span>
        </>
      )}
    </motion.button>
  );
}

/**
 * 成就卡片组件
 *
 * 需求24: 成就系统
 * 任务24.2.3: 成就卡片组件（进度条/等级标识/奖励预览）
 *
 * 功能：
 * - 显示成就图标/徽章，带等级渐变背景
 * - 显示成就名称和描述
 * - 进度条带动画填充（当前/目标）
 * - 等级徽章/标签（青铜/白银/黄金/铂金/钻石/传说）
 * - 奖励预览（类型 + 数量/名称）
 * - 已解锁但未领取的成就显示领取按钮
 * - 状态指示器（未解锁/已领取）
 * - 支持隐藏成就（显示 ??? 占位符）
 * - Motion 动画（进度条填充、悬停效果）
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function AchievementCard({
  achievement,
  onClaim,
  isClaiming = false,
  onClick,
  className,
  compact = false,
  showCategoryHint = true,
}: AchievementCardProps) {
  const tierColors = ACHIEVEMENT_TIER_COLORS[achievement.tier];
  const canClaim = achievement.isUnlocked && !achievement.isClaimed;
  const isHiddenAndLocked = achievement.isHidden && !achievement.isUnlocked;

  // 如果是隐藏且未解锁的成就，使用专门的隐藏成就卡片
  if (isHiddenAndLocked) {
    return (
      <HiddenAchievementCard
        achievement={achievement}
        onClick={onClick}
        className={className}
        compact={compact}
        showCategoryHint={showCategoryHint}
      />
    );
  }

  const handleClick = () => {
    if (onClick) {
      onClick(achievement);
    }
  };

  const handleClaim = () => {
    if (onClaim && canClaim) {
      onClaim(achievement.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'shadow-sm hover:shadow-lg',
        compact ? 'p-4' : 'p-5',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* 背景装饰 - 解锁后显示微光效果 */}
      {achievement.isUnlocked && (
        <div className="absolute inset-0 pointer-events-none">
          <div
            className={cn(
              'absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20',
              `bg-gradient-to-br ${tierColors.gradient}`
            )}
          />
        </div>
      )}

      {/* 等级标识 - 右上角 */}
      <div className="absolute top-3 right-3">
        <TierBadge tier={achievement.tier} />
      </div>

      {/* 主内容区域 */}
      <div className="relative z-10">
        {/* 图标和标题区域 */}
        <div className={cn('flex items-start gap-4', compact ? 'mb-3' : 'mb-4')}>
          {/* 成就图标 */}
          <div
            className={cn(
              'flex-shrink-0 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br shadow-md',
              tierColors.gradient,
              compact ? 'w-12 h-12' : 'w-14 h-14',
              !achievement.isUnlocked && 'opacity-40 grayscale'
            )}
          >
            {achievement.iconUrl ? (
              <img
                src={achievement.iconUrl}
                alt={achievement.displayName}
                className={cn(compact ? 'w-6 h-6' : 'w-8 h-8')}
              />
            ) : (
              <Trophy className={cn('text-white', compact ? 'w-6 h-6' : 'w-8 h-8')} />
            )}
          </div>

          {/* 标题和描述 */}
          <div className="flex-1 min-w-0 pr-16">
            <h3
              className={cn(
                'font-bold text-gray-900 dark:text-white truncate',
                compact ? 'text-sm' : 'text-base'
              )}
            >
              {achievement.displayName}
            </h3>
            <p
              className={cn(
                'text-gray-500 dark:text-gray-400 mt-1',
                compact ? 'text-xs line-clamp-1' : 'text-sm line-clamp-2'
              )}
            >
              {achievement.description}
            </p>
          </div>
        </div>

        {/* 进度条 */}
        <div className={compact ? 'mb-3' : 'mb-4'}>
          <ProgressBar
            current={achievement.currentProgress}
            target={achievement.targetValue}
            percent={achievement.progressPercent}
            tier={achievement.tier}
            animated={!compact}
          />
        </div>

        {/* 底部区域：奖励预览和操作按钮 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* 奖励预览 */}
          <RewardPreview
            rewardType={achievement.rewardType}
            rewardValue={achievement.rewardValue}
            tier={achievement.tier}
          />

          {/* 操作区域 */}
          <div className="flex items-center gap-2">
            {/* 领取按钮 */}
            {canClaim && onClaim && (
              <ClaimButton
                onClick={handleClaim}
                isLoading={isClaiming}
                tier={achievement.tier}
              />
            )}

            {/* 状态指示器 */}
            {!canClaim && (
              <StatusIndicator
                isUnlocked={achievement.isUnlocked}
                isClaimed={achievement.isClaimed}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default AchievementCard;
