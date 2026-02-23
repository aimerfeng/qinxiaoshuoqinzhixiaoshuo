'use client';

import { motion } from 'motion/react';
import {
  Coins,
  Award,
  Tag,
  Frame,
  Check,
  Clock,
  Lock,
  Gift,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  SeasonReward,
  UserSeasonReward,
  SeasonRewardType,
  SeasonTier,
  UserSeasonRewardStatus,
  RewardValue,
  TokenRewardValue,
  BadgeRewardValue,
  TitleRewardValue,
  AvatarFrameRewardValue,
} from '@/types/season';
import {
  SEASON_REWARD_TYPE_NAMES,
  SEASON_REWARD_TYPE_ICONS,
  SEASON_TIER_NAMES,
  SEASON_TIER_COLORS,
  USER_SEASON_REWARD_STATUS_COLORS,
  getRewardDisplayText,
} from '@/types/season';

/**
 * 赛季奖励卡片组件
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.8: 赛季奖励预览页面 - 单个奖励卡片组件
 *
 * 功能：
 * - 显示奖励类型图标和名称
 * - 显示奖励详情（代币数量/徽章/称号/头像框）
 * - 显示奖励状态（待领取/已领取/已过期/锁定）
 * - 支持领取交互
 * - 支持加载骨架屏状态
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */

// ==================== 类型定义 ====================

export interface SeasonRewardCardProps {
  /** 奖励数据 */
  reward: SeasonReward;
  /** 用户奖励状态（可选，用于显示领取状态） */
  userReward?: UserSeasonReward | null;
  /** 用户当前段位（用于判断是否可领取） */
  userTier?: SeasonTier | null;
  /** 是否可领取 */
  canClaim?: boolean;
  /** 是否已选中（用于批量领取） */
  isSelected?: boolean;
  /** 点击领取回调 */
  onClaim?: (rewardId: string) => void;
  /** 点击选择回调（用于批量领取） */
  onSelect?: (rewardId: string, selected: boolean) => void;
  /** 点击查看详情回调 */
  onViewDetails?: (reward: SeasonReward) => void;
  /** 自定义类名 */
  className?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否显示段位标签 */
  showTierBadge?: boolean;
  /** 是否禁用交互 */
  disabled?: boolean;
}

// ==================== 工具函数 ====================

/**
 * 获取奖励类型图标组件
 */
function getRewardTypeIcon(type: SeasonRewardType) {
  switch (type) {
    case 'TOKENS':
      return Coins;
    case 'BADGE':
      return Award;
    case 'TITLE':
      return Tag;
    case 'AVATAR_FRAME':
      return Frame;
    default:
      return Gift;
  }
}

/**
 * 获取奖励类型颜色
 */
function getRewardTypeColor(type: SeasonRewardType): string {
  switch (type) {
    case 'TOKENS':
      return 'from-amber-400 to-yellow-500';
    case 'BADGE':
      return 'from-indigo-400 to-purple-500';
    case 'TITLE':
      return 'from-pink-400 to-rose-500';
    case 'AVATAR_FRAME':
      return 'from-cyan-400 to-blue-500';
    default:
      return 'from-gray-400 to-gray-500';
  }
}

/**
 * 获取奖励状态
 */
function getRewardStatus(
  userReward?: UserSeasonReward | null,
  userTier?: SeasonTier | null,
  rewardTier?: SeasonTier
): {
  status: 'locked' | 'pending' | 'claimed' | 'expired';
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Lock;
} {
  // 如果有用户奖励记录
  if (userReward) {
    switch (userReward.status) {
      case 'CLAIMED':
        return {
          status: 'claimed',
          label: '已领取',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          icon: Check,
        };
      case 'EXPIRED':
        return {
          status: 'expired',
          label: '已过期',
          color: 'text-gray-500 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-800/50',
          icon: Clock,
        };
      case 'PENDING':
        return {
          status: 'pending',
          label: '待领取',
          color: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          icon: Gift,
        };
    }
  }

  // 检查段位是否达标
  if (userTier && rewardTier) {
    const tiers: SeasonTier[] = [
      'NOVICE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
      'DIAMOND', 'MASTER', 'GRANDMASTER', 'KING',
    ];
    const userTierIndex = tiers.indexOf(userTier);
    const rewardTierIndex = tiers.indexOf(rewardTier);

    if (userTierIndex >= rewardTierIndex) {
      return {
        status: 'pending',
        label: '可领取',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        icon: Gift,
      };
    }
  }

  // 默认锁定状态
  return {
    status: 'locked',
    label: '未解锁',
    color: 'text-gray-500 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800/50',
    icon: Lock,
  };
}

// ==================== 子组件 ====================

/**
 * 奖励图标组件
 */
function RewardIcon({
  type,
  size = 'md',
  className,
}: {
  type: SeasonRewardType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const Icon = getRewardTypeIcon(type);
  const gradient = getRewardTypeColor(type);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div
      className={cn(
        'rounded-xl flex items-center justify-center',
        'bg-gradient-to-br',
        gradient,
        'shadow-md',
        sizeClasses[size],
        className
      )}
    >
      <Icon className={cn('text-white', iconSizes[size])} />
    </div>
  );
}

/**
 * 奖励值显示组件
 */
function RewardValueDisplay({
  type,
  value,
  size = 'md',
}: {
  type: SeasonRewardType;
  value: RewardValue;
  size?: 'sm' | 'md' | 'lg';
}) {
  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  switch (type) {
    case 'TOKENS':
      const tokenValue = value as TokenRewardValue;
      return (
        <div className="flex items-center gap-1">
          <span className={cn('font-bold text-amber-600 dark:text-amber-400', textSizes[size])}>
            {tokenValue.amount}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">零芥子</span>
        </div>
      );

    case 'BADGE':
      const badgeValue = value as BadgeRewardValue;
      return (
        <span className={cn('font-medium text-gray-900 dark:text-white', textSizes[size])}>
          {badgeValue.badgeName || '专属徽章'}
        </span>
      );

    case 'TITLE':
      const titleValue = value as TitleRewardValue;
      return (
        <span className={cn('font-medium text-gray-900 dark:text-white', textSizes[size])}>
          {titleValue.titleName || '专属称号'}
        </span>
      );

    case 'AVATAR_FRAME':
      const frameValue = value as AvatarFrameRewardValue;
      return (
        <span className={cn('font-medium text-gray-900 dark:text-white', textSizes[size])}>
          {frameValue.frameName || '专属头像框'}
        </span>
      );

    default:
      return <span className="text-gray-500">未知奖励</span>;
  }
}

/**
 * 状态徽章组件
 */
function StatusBadge({
  status,
  label,
  color,
  bgColor,
  icon: Icon,
}: {
  status: string;
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Lock;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        bgColor,
        color
      )}
    >
      <Icon className="w-3 h-3" />
      <span>{label}</span>
    </div>
  );
}

/**
 * 骨架屏组件
 */
export function SeasonRewardCardSkeleton({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg';
}) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  return (
    <div
      className={cn(
        'rounded-xl',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'animate-pulse',
        paddingClasses[size]
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

/**
 * 赛季奖励卡片组件
 */
export function SeasonRewardCard({
  reward,
  userReward,
  userTier,
  canClaim: canClaimProp,
  isSelected = false,
  onClaim,
  onSelect,
  onViewDetails,
  className,
  size = 'md',
  showTierBadge = false,
  disabled = false,
}: SeasonRewardCardProps) {
  const { rewardType, rewardValue, tier, description } = reward;
  const tierColors = SEASON_TIER_COLORS[tier];

  // 获取奖励状态
  const rewardStatus = getRewardStatus(userReward, userTier, tier);
  const canClaim = canClaimProp ?? (rewardStatus.status === 'pending');
  const isLocked = rewardStatus.status === 'locked';
  const isClaimed = rewardStatus.status === 'claimed';

  // 尺寸配置
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5',
  };

  const handleClick = () => {
    if (disabled) return;

    if (onSelect) {
      onSelect(reward.id, !isSelected);
    } else if (onViewDetails) {
      onViewDetails(reward);
    }
  };

  const handleClaim = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && canClaim && onClaim) {
      onClaim(reward.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
      onClick={handleClick}
      className={cn(
        'relative rounded-xl overflow-hidden',
        'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'transition-all duration-200',
        !disabled && (onSelect || onViewDetails) && 'cursor-pointer',
        isSelected && 'ring-2 ring-indigo-500 dark:ring-indigo-400',
        isLocked && 'opacity-60',
        isClaimed && 'opacity-80',
        paddingClasses[size],
        className
      )}
    >
      {/* 选中指示器 */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      <div className="flex items-start gap-3">
        {/* 奖励图标 */}
        <RewardIcon type={rewardType} size={size} />

        {/* 奖励信息 */}
        <div className="flex-1 min-w-0">
          {/* 奖励类型 */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {SEASON_REWARD_TYPE_NAMES[rewardType]}
            </span>
            {showTierBadge && (
              <span
                className={cn(
                  'px-1.5 py-0.5 rounded text-xs font-medium',
                  tierColors.bg,
                  tierColors.text
                )}
              >
                {SEASON_TIER_NAMES[tier]}
              </span>
            )}
          </div>

          {/* 奖励值 */}
          <RewardValueDisplay type={rewardType} value={rewardValue} size={size} />

          {/* 描述 */}
          {description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              {description}
            </p>
          )}
        </div>

        {/* 状态/操作 */}
        <div className="flex flex-col items-end gap-2">
          <StatusBadge {...rewardStatus} />

          {/* 领取按钮 */}
          {canClaim && onClaim && !disabled && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleClaim}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-medium',
                'bg-gradient-to-r from-indigo-500 to-purple-500',
                'text-white shadow-sm',
                'hover:from-indigo-600 hover:to-purple-600',
                'transition-all duration-200',
                'flex items-center gap-1'
              )}
            >
              <Sparkles className="w-3 h-3" />
              <span>领取</span>
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default SeasonRewardCard;
