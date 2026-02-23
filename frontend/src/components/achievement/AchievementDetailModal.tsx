'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Trophy,
  Gift,
  Calendar,
  Check,
  Lock,
  Sparkles,
  Loader2,
  HelpCircle,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  AchievementWithProgress,
  AchievementTier,
  AchievementRewardType,
  AchievementRewardValue,
  AchievementCategory,
} from '@/types/achievement';
import {
  ACHIEVEMENT_TIER_NAMES,
  ACHIEVEMENT_TIER_COLORS,
  ACHIEVEMENT_REWARD_TYPE_NAMES,
  ACHIEVEMENT_CATEGORY_NAMES,
  ACHIEVEMENT_CATEGORY_ICONS,
} from '@/types/achievement';

/**
 * 成就详情弹窗组件属性
 */
export interface AchievementDetailModalProps {
  /** 成就数据（包含用户进度） */
  achievement: AchievementWithProgress | null;
  /** 是否显示弹窗 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 领取奖励回调 */
  onClaim?: (achievementId: string) => void;
  /** 是否正在领取中 */
  isClaiming?: boolean;
}

/**
 * 格式化日期
 */
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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
      return rewardValue.amount ? `${rewardValue.amount} ${typeName}` : typeName;
    case 'BADGE':
      return typeName;
    case 'TITLE':
      return rewardValue.title ? `"${rewardValue.title}" ${typeName}` : typeName;
    case 'AVATAR_FRAME':
      return typeName;
    case 'THEME':
      return typeName;
    default:
      return typeName;
  }
}

/**
 * 大型等级徽章组件
 */
function LargeTierBadge({ tier }: { tier: AchievementTier }) {
  const tierColors = ACHIEVEMENT_TIER_COLORS[tier];

  return (
    <div
      className={cn(
        'px-4 py-2 rounded-xl text-sm font-bold',
        'bg-gradient-to-r shadow-lg',
        tierColors.gradient,
        'text-white'
      )}
    >
      {ACHIEVEMENT_TIER_NAMES[tier]}
    </div>
  );
}

/**
 * 隐藏成就徽章组件
 */
function HiddenBadge() {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold',
        'bg-gradient-to-r from-gray-500 to-gray-600 shadow-lg',
        'text-white'
      )}
    >
      <Lock className="w-4 h-4" />
      <span>隐藏成就</span>
    </div>
  );
}

/**
 * 脉冲问号图标组件（大尺寸版本）
 */
function LargePulsingQuestionMark() {
  return (
    <div className="relative">
      {/* 外层脉冲光环 */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.1, 0.3],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={cn(
          'absolute inset-0 rounded-2xl',
          'bg-gradient-to-br from-gray-400/30 to-gray-600/30'
        )}
      />
      
      {/* 问号图标容器 */}
      <motion.div
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className={cn(
          'relative w-24 h-24 rounded-2xl flex items-center justify-center',
          'bg-gradient-to-br from-gray-500/80 to-gray-700/80',
          'shadow-xl shadow-gray-500/30'
        )}
      >
        <HelpCircle className="w-14 h-14 text-white/90" />
      </motion.div>
    </div>
  );
}

/**
 * 详细进度条组件
 */
function DetailedProgressBar({
  current,
  target,
  percent,
  tier,
}: {
  current: number;
  target: number;
  percent: number;
  tier: AchievementTier;
}) {
  const tierColors = ACHIEVEMENT_TIER_COLORS[tier];
  const clampedPercent = Math.min(percent, 100);

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600 dark:text-gray-300 font-medium">
          当前进度
        </span>
        <span className={cn('font-bold', tierColors.text)}>
          {current.toLocaleString()} / {target.toLocaleString()}
        </span>
      </div>
      <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${clampedPercent}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          className={cn(
            'h-full rounded-full bg-gradient-to-r relative',
            tierColors.gradient
          )}
        >
          {/* 进度条光效 */}
          <div 
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s linear infinite',
            }}
          />
        </motion.div>
      </div>
      <div className="flex justify-end mt-1.5">
        <span className={cn('text-lg font-bold', tierColors.text)}>
          {clampedPercent.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/**
 * 隐藏成就进度条组件
 */
function HiddenProgressBar() {
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-500 dark:text-gray-400 font-medium">
          当前进度
        </span>
        <span className="font-bold text-gray-400 dark:text-gray-500">
          ??? / ???
        </span>
      </div>
      <div className="h-4 bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden shadow-inner">
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={cn(
            'h-full rounded-full w-1/4',
            'bg-gradient-to-r from-gray-400/50 to-gray-500/50'
          )}
        />
      </div>
      <div className="flex justify-end mt-1.5">
        <span className="text-lg font-bold text-gray-400 dark:text-gray-500">
          ?%
        </span>
      </div>
    </div>
  );
}

/**
 * 奖励详情组件
 */
function RewardDetails({
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
    <div
      className={cn(
        'p-4 rounded-xl',
        'bg-gradient-to-br from-white/50 to-white/30 dark:from-gray-800/50 dark:to-gray-800/30',
        'border border-white/20 dark:border-gray-700/30'
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <div
          className={cn(
            'p-2.5 rounded-xl',
            'bg-gradient-to-br shadow-md',
            tierColors.gradient
          )}
        >
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            奖励内容
          </h4>
          <p className="text-base font-bold text-gray-900 dark:text-white">
            {getRewardDisplayText(rewardType, rewardValue)}
          </p>
        </div>
      </div>

      {/* 奖励预览 - 根据类型显示不同内容 */}
      <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-700/50">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          奖励类型: {ACHIEVEMENT_REWARD_TYPE_NAMES[rewardType]}
        </p>
        {rewardType === 'TOKENS' && rewardValue.amount && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            数量: {rewardValue.amount.toLocaleString()}
          </p>
        )}
        {rewardType === 'TITLE' && rewardValue.title && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            称号: {rewardValue.title}
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * 隐藏成就奖励详情组件
 */
function HiddenRewardDetails() {
  return (
    <div
      className={cn(
        'p-4 rounded-xl',
        'bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/50 dark:to-gray-700/30',
        'border border-gray-300/20 dark:border-gray-600/30'
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={cn(
            'p-2.5 rounded-xl',
            'bg-gradient-to-br from-gray-400/50 to-gray-500/50 shadow-md'
          )}
        >
          <Sparkles className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </motion.div>
        <div>
          <h4 className="text-sm font-semibold text-gray-500 dark:text-gray-400">
            奖励内容
          </h4>
          <p className="text-base font-bold text-gray-500 dark:text-gray-400">
            ??? 神秘奖励
          </p>
        </div>
      </div>

      {/* 神秘提示 */}
      <div className="mt-3 pt-3 border-t border-gray-300/30 dark:border-gray-600/30">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          解锁成就后即可查看奖励详情
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>可能包含稀有奖励哦~</span>
        </p>
      </div>
    </div>
  );
}

/**
 * 日期信息组件
 */
function DateInfo({
  label,
  date,
  icon: Icon,
}: {
  label: string;
  date: string | null | undefined;
  icon: typeof Calendar;
}) {
  if (!date) return null;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="w-4 h-4 text-gray-400" />
      <span className="text-gray-500 dark:text-gray-400">{label}:</span>
      <span className="text-gray-700 dark:text-gray-300 font-medium">
        {formatDate(date)}
      </span>
    </div>
  );
}

/**
 * 成就详情弹窗组件
 *
 * 需求24: 成就系统
 * 任务24.2.4: 成就详情弹窗
 *
 * 功能：
 * - Modal overlay with backdrop blur
 * - Large achievement icon with tier gradient
 * - Achievement name, description, category
 * - Detailed progress display (current/target with visual progress bar)
 * - Tier badge with full tier name
 * - Reward details (type, amount, preview)
 * - Unlock date (if unlocked)
 * - Claim date (if claimed)
 * - Claim button (if unlocked but not claimed)
 * - Close button (X) and click-outside-to-close
 * - AnimatePresence for enter/exit animations
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function AchievementDetailModal({
  achievement,
  isOpen,
  onClose,
  onClaim,
  isClaiming = false,
}: AchievementDetailModalProps) {
  // Handle escape key press
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle claim button click
  const handleClaim = () => {
    if (achievement && onClaim) {
      onClaim(achievement.id);
    }
  };

  if (!achievement) return null;

  const tierColors = ACHIEVEMENT_TIER_COLORS[achievement.tier];
  const canClaim = achievement.isUnlocked && !achievement.isClaimed;
  const isHiddenAndLocked = achievement.isHidden && !achievement.isUnlocked;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          className={cn(
            'fixed inset-0 z-50',
            'flex items-center justify-center p-4',
            'bg-black/50 backdrop-blur-sm'
          )}
        >
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={cn(
              'relative w-full max-w-lg',
              'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl',
              'rounded-3xl shadow-2xl',
              'border border-white/20 dark:border-gray-700/30',
              'overflow-hidden'
            )}
          >
            {/* Background decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {isHiddenAndLocked ? (
                <>
                  {/* 隐藏成就的神秘背景 */}
                  <div
                    className={cn(
                      'absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-20',
                      'bg-gradient-to-br from-gray-400 to-gray-600'
                    )}
                  />
                  <div
                    className={cn(
                      'absolute -bottom-20 -left-20 w-48 h-48 rounded-full blur-3xl opacity-15',
                      'bg-gradient-to-br from-purple-400 to-indigo-600'
                    )}
                  />
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      'absolute -top-20 -right-20 w-64 h-64 rounded-full blur-3xl opacity-30',
                      `bg-gradient-to-br ${tierColors.gradient}`
                    )}
                  />
                  <div
                    className={cn(
                      'absolute -bottom-20 -left-20 w-48 h-48 rounded-full blur-3xl opacity-20',
                      `bg-gradient-to-br ${tierColors.gradient}`
                    )}
                  />
                </>
              )}
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className={cn(
                'absolute top-4 right-4 z-10',
                'p-2 rounded-xl',
                'bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                'transition-colors duration-200'
              )}
              aria-label="关闭"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>

            {/* Content */}
            <div className="relative z-10 p-6">
              {/* Header: Icon + Title */}
              <div className="flex flex-col items-center text-center mb-6">
                {/* Large Achievement Icon */}
                {isHiddenAndLocked ? (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className="mb-4"
                  >
                    <LargePulsingQuestionMark />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                    className={cn(
                      'w-24 h-24 rounded-2xl flex items-center justify-center mb-4',
                      'bg-gradient-to-br shadow-xl',
                      tierColors.gradient,
                      !achievement.isUnlocked && 'opacity-50 grayscale'
                    )}
                  >
                    {achievement.iconUrl ? (
                      <img
                        src={achievement.iconUrl}
                        alt={achievement.displayName}
                        className="w-14 h-14"
                      />
                    ) : (
                      <Trophy className="w-14 h-14 text-white" />
                    )}
                  </motion.div>
                )}

                {/* Tier Badge or Hidden Badge */}
                <motion.div
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  className="mb-3"
                >
                  {isHiddenAndLocked ? (
                    <HiddenBadge />
                  ) : (
                    <LargeTierBadge tier={achievement.tier} />
                  )}
                </motion.div>

                {/* Title */}
                <motion.h2
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.25 }}
                  className={cn(
                    'text-2xl font-bold mb-2',
                    isHiddenAndLocked
                      ? 'text-gray-600 dark:text-gray-300'
                      : 'text-gray-900 dark:text-white'
                  )}
                >
                  {isHiddenAndLocked ? '???' : achievement.displayName}
                </motion.h2>

                {/* Category */}
                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3"
                >
                  <span>
                    {ACHIEVEMENT_CATEGORY_ICONS[achievement.category as AchievementCategory]}
                  </span>
                  <span>
                    {ACHIEVEMENT_CATEGORY_NAMES[achievement.category as AchievementCategory]}
                  </span>
                </motion.div>

                {/* Description */}
                <motion.p
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.35 }}
                  className={cn(
                    'max-w-sm',
                    isHiddenAndLocked
                      ? 'text-gray-500 dark:text-gray-400'
                      : 'text-gray-600 dark:text-gray-300'
                  )}
                >
                  {isHiddenAndLocked
                    ? '这是一个隐藏成就，完成特定条件后即可解锁查看详情。继续探索吧！'
                    : achievement.description}
                </motion.p>
              </div>

              {/* Progress Section */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.4 }}
                className="mb-6"
              >
                {isHiddenAndLocked ? (
                  <HiddenProgressBar />
                ) : (
                  <DetailedProgressBar
                    current={achievement.currentProgress}
                    target={achievement.targetValue}
                    percent={achievement.progressPercent}
                    tier={achievement.tier}
                  />
                )}
              </motion.div>

              {/* Reward Details */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.45 }}
                className="mb-6"
              >
                {isHiddenAndLocked ? (
                  <HiddenRewardDetails />
                ) : (
                  <RewardDetails
                    rewardType={achievement.rewardType}
                    rewardValue={achievement.rewardValue}
                    tier={achievement.tier}
                  />
                )}
              </motion.div>

              {/* Date Information */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
                className="space-y-2 mb-6"
              >
                {achievement.isUnlocked && (
                  <DateInfo
                    label="解锁时间"
                    date={achievement.unlockedAt}
                    icon={Calendar}
                  />
                )}
                {achievement.isClaimed && (
                  <DateInfo
                    label="领取时间"
                    date={achievement.claimedAt}
                    icon={Check}
                  />
                )}
              </motion.div>

              {/* Action Buttons */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.55 }}
                className="flex justify-center"
              >
                {canClaim && onClaim ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleClaim}
                    disabled={isClaiming}
                    className={cn(
                      'flex items-center gap-3 px-8 py-3 rounded-2xl',
                      'text-base font-bold text-white',
                      'bg-gradient-to-r shadow-lg',
                      tierColors.gradient,
                      'hover:shadow-xl hover:brightness-110',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      'transition-all duration-200'
                    )}
                  >
                    {isClaiming ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>领取中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>领取奖励</span>
                      </>
                    )}
                  </motion.button>
                ) : achievement.isClaimed ? (
                  <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-green-100 dark:bg-green-900/30">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <span className="text-base font-semibold text-green-600 dark:text-green-400">
                      奖励已领取
                    </span>
                  </div>
                ) : !achievement.isUnlocked ? (
                  <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800">
                    <Lock className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <span className="text-base font-semibold text-gray-500 dark:text-gray-400">
                      尚未解锁
                    </span>
                  </div>
                ) : null}
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AchievementDetailModal;
