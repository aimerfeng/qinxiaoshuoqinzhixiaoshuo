'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy,
  X,
  ChevronUp,
  ChevronDown,
  Gift,
  History,
  Sparkles,
  Star,
  Crown,
  Medal,
  BookOpen,
  Pen,
  MessageCircle,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type {
  SeasonInfo,
  SeasonTier,
  UserSeasonRank,
  LeaderboardCategory,
  UserSeasonReward,
} from '@/types/season';
import {
  SEASON_TIER_NAMES,
  SEASON_TIER_COLORS,
  LEADERBOARD_CATEGORY_NAMES,
  formatScore,
  formatRank,
} from '@/types/season';

/**
 * 赛季结算弹窗组件
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.10: 赛季结算弹窗
 *
 * 功能：
 * - 显示赛季结束摘要
 * - 显示最终段位
 * - 显示各类别最终排名
 * - 显示获得的奖励
 * - 段位变化动画（晋升/降级/保持）
 * - 晋升时的庆祝动画（彩带/粒子效果）
 * - 支持"领取奖励"操作
 * - 支持"查看历史"操作
 * - 支持加载状态
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */

// ==================== 类型定义 ====================

export interface SeasonSettlementModalProps {
  /** 是否显示弹窗 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 赛季信息 */
  season: SeasonInfo;
  /** 用户赛季段位信息 */
  userRank: UserSeasonRank;
  /** 各类别最终排名 */
  rankings: {
    category: LeaderboardCategory;
    finalScore: number;
    finalRank: number | null;
  }[];
  /** 获得的奖励列表 */
  rewards: UserSeasonReward[];
  /** 是否加载中 */
  isLoading?: boolean;
  /** 领取奖励回调 */
  onClaimRewards?: () => void;
  /** 查看历史回调 */
  onViewHistory?: () => void;
  /** 领取奖励加载中 */
  isClaimingRewards?: boolean;
  /** 自定义类名 */
  className?: string;
}

export type TierChangeType = 'promotion' | 'demotion' | 'same';

// ==================== 常量 ====================

const TIER_ORDER: SeasonTier[] = [
  'NOVICE',
  'BRONZE',
  'SILVER',
  'GOLD',
  'PLATINUM',
  'DIAMOND',
  'MASTER',
  'GRANDMASTER',
  'KING',
];

const CATEGORY_ICONS: Record<LeaderboardCategory, typeof BookOpen> = {
  READING: BookOpen,
  CREATION: Pen,
  SOCIAL: MessageCircle,
  OVERALL: Star,
};

// ==================== 工具函数 ====================

/**
 * 获取段位变化类型
 */
function getTierChangeType(
  currentTier: SeasonTier,
  previousTier?: SeasonTier | null
): TierChangeType {
  if (!previousTier) return 'same';

  const currentIndex = TIER_ORDER.indexOf(currentTier);
  const previousIndex = TIER_ORDER.indexOf(previousTier);

  if (currentIndex > previousIndex) return 'promotion';
  if (currentIndex < previousIndex) return 'demotion';
  return 'same';
}

/**
 * 获取段位变化文本
 */
function getTierChangeText(changeType: TierChangeType): string {
  switch (changeType) {
    case 'promotion':
      return '段位晋升！';
    case 'demotion':
      return '段位下降';
    case 'same':
      return '段位保持';
  }
}

// ==================== 子组件 ====================

/**
 * 彩带粒子组件 - 用于晋升庆祝动画
 */
function ConfettiParticle({
  delay,
  color,
  size,
  startX,
}: {
  delay: number;
  color: string;
  size: number;
  startX: number;
}) {
  return (
    <motion.div
      className="absolute pointer-events-none"
      initial={{
        x: startX,
        y: -20,
        rotate: 0,
        opacity: 1,
      }}
      animate={{
        x: startX + (Math.random() - 0.5) * 200,
        y: 400,
        rotate: Math.random() * 720 - 360,
        opacity: 0,
      }}
      transition={{
        duration: 2 + Math.random(),
        delay,
        ease: 'easeOut',
      }}
      style={{
        width: size,
        height: size * 2,
        backgroundColor: color,
        borderRadius: 2,
      }}
    />
  );
}

/**
 * 庆祝彩带效果组件
 */
function CelebrationConfetti({ isActive }: { isActive: boolean }) {
  const particles = useMemo(() => {
    if (!isActive) return [];

    const colors = [
      '#6366F1', // indigo
      '#8B5CF6', // purple
      '#F472B6', // pink
      '#FBBF24', // amber
      '#34D399', // emerald
      '#60A5FA', // blue
    ];

    return Array.from({ length: 50 }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 6 + Math.random() * 8,
      startX: Math.random() * 400 - 200,
    }));
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2">
        {particles.map((particle) => (
          <ConfettiParticle key={particle.id} {...particle} />
        ))}
      </div>
    </div>
  );
}

/**
 * 星星闪烁效果组件
 */
function SparkleEffect({ isActive }: { isActive: boolean }) {
  if (!isActive) return null;

  return (
    <>
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: [0, 1, 0],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${10 + Math.random() * 80}%`,
          }}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
        </motion.div>
      ))}
    </>
  );
}

/**
 * 段位变化动画组件
 */
function TierChangeAnimation({
  currentTier,
  previousTier,
  changeType,
}: {
  currentTier: SeasonTier;
  previousTier?: SeasonTier | null;
  changeType: TierChangeType;
}) {
  const currentColors = SEASON_TIER_COLORS[currentTier];
  const previousColors = previousTier ? SEASON_TIER_COLORS[previousTier] : null;

  const isPromotion = changeType === 'promotion';
  const isDemotion = changeType === 'demotion';

  return (
    <div className="relative flex flex-col items-center">
      {/* 上一段位（如果有变化） */}
      {previousTier && changeType !== 'same' && (
        <motion.div
          initial={{ opacity: 1, scale: 1 }}
          animate={{
            opacity: isDemotion ? 1 : 0.3,
            scale: isDemotion ? 1 : 0.8,
            y: isDemotion ? 0 : -20,
          }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center gap-2 mb-2"
        >
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              'bg-gradient-to-br',
              previousColors?.gradient
            )}
          >
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <span className={cn('text-sm font-medium', previousColors?.text)}>
            {SEASON_TIER_NAMES[previousTier]}
          </span>
        </motion.div>
      )}

      {/* 变化箭头 */}
      {previousTier && changeType !== 'same' && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className={cn(
            'my-2 p-2 rounded-full',
            isPromotion
              ? 'bg-green-100 dark:bg-green-900/30 text-green-500'
              : 'bg-red-100 dark:bg-red-900/30 text-red-500'
          )}
        >
          {isPromotion ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </motion.div>
      )}

      {/* 当前段位 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{
          duration: 0.6,
          delay: changeType === 'same' ? 0.3 : 0.8,
          type: 'spring',
          stiffness: 200,
        }}
        className="flex flex-col items-center"
      >
        <div
          className={cn(
            'w-20 h-20 rounded-2xl flex items-center justify-center',
            'bg-gradient-to-br shadow-lg',
            currentColors.gradient,
            isPromotion && 'animate-pulse'
          )}
        >
          {currentTier === 'KING' ? (
            <Crown className="w-10 h-10 text-white" />
          ) : (
            <Trophy className="w-10 h-10 text-white" />
          )}
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className={cn(
            'mt-3 text-xl font-bold',
            currentColors.text
          )}
        >
          {SEASON_TIER_NAMES[currentTier]}
        </motion.span>
      </motion.div>

      {/* 变化文本 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className={cn(
          'mt-3 px-4 py-1.5 rounded-full text-sm font-medium',
          isPromotion
            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
            : isDemotion
            ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            : 'bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400'
        )}
      >
        {isPromotion && <Sparkles className="w-4 h-4 inline mr-1" />}
        {getTierChangeText(changeType)}
      </motion.div>
    </div>
  );
}

/**
 * 排名项组件
 */
function RankingItem({
  category,
  rank,
  score,
  delay,
}: {
  category: LeaderboardCategory;
  rank: number | null;
  score: number;
  delay: number;
}) {
  const Icon = CATEGORY_ICONS[category];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
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
    </motion.div>
  );
}

/**
 * 奖励预览项组件
 */
function RewardPreviewItem({
  reward,
  delay,
}: {
  reward: UserSeasonReward;
  delay: number;
}) {
  const { rewardType, description } = reward.reward;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.3 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl',
        'bg-gradient-to-r from-amber-50/50 to-yellow-50/50',
        'dark:from-amber-900/20 dark:to-yellow-900/20',
        'border border-amber-200/50 dark:border-amber-700/30'
      )}
    >
      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
        <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {description || rewardType}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {reward.status === 'PENDING' ? '待领取' : '已领取'}
        </p>
      </div>
    </motion.div>
  );
}

/**
 * 加载状态组件
 */
function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      >
        <Loader2 className="w-10 h-10 text-indigo-500" />
      </motion.div>
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        正在加载赛季结算数据...
      </p>
    </div>
  );
}

// ==================== 主组件 ====================

/**
 * 赛季结算弹窗组件
 */
export function SeasonSettlementModal({
  isOpen,
  onClose,
  season,
  userRank,
  rankings,
  rewards,
  isLoading = false,
  onClaimRewards,
  onViewHistory,
  isClaimingRewards = false,
  className,
}: SeasonSettlementModalProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // 计算段位变化类型
  const tierChangeType = getTierChangeType(userRank.tier, userRank.previousTier);
  const isPromotion = tierChangeType === 'promotion';

  // 待领取奖励数量
  const pendingRewardsCount = rewards.filter((r) => r.status === 'PENDING').length;

  // 晋升时触发彩带效果
  useEffect(() => {
    if (isOpen && isPromotion) {
      const timer = setTimeout(() => {
        setShowConfetti(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    setShowConfetti(false);
    return undefined;
  }, [isOpen, isPromotion]);

  // 关闭弹窗时重置状态
  const handleClose = useCallback(() => {
    setShowConfetti(false);
    onClose();
  }, [onClose]);

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* 弹窗内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              'fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2',
              'sm:w-full sm:max-w-lg sm:max-h-[90vh]',
              'z-50 overflow-hidden',
              'rounded-2xl',
              'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl',
              'border border-white/20 dark:border-gray-700/30',
              'shadow-2xl shadow-indigo-500/10',
              className
            )}
          >
            {/* 庆祝效果 */}
            <CelebrationConfetti isActive={showConfetti} />
            <SparkleEffect isActive={isPromotion && isOpen} />

            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className={cn(
                'absolute top-4 right-4 z-10',
                'p-2 rounded-full',
                'bg-white/50 dark:bg-gray-800/50',
                'hover:bg-white/80 dark:hover:bg-gray-800/80',
                'transition-colors duration-200'
              )}
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>

            {/* 滚动容器 */}
            <div className="overflow-y-auto max-h-[calc(100vh-2rem)] sm:max-h-[90vh]">
              {isLoading ? (
                <LoadingState />
              ) : (
                <div className="p-6">
                  {/* 头部 - 赛季名称 */}
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-6"
                  >
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {season.name}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      赛季结算
                    </p>
                  </motion.div>

                  {/* 段位变化动画 */}
                  <div className="relative py-6">
                    <TierChangeAnimation
                      currentTier={userRank.tier}
                      previousTier={userRank.previousTier}
                      changeType={tierChangeType}
                    />
                  </div>

                  {/* 最终积分 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4 }}
                    className="text-center mb-6"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Medal className="w-5 h-5 text-amber-500" />
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatScore(userRank.points)} 积分
                      </span>
                    </div>
                    {userRank.peakPoints > userRank.points && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        本赛季最高: {formatScore(userRank.peakPoints)} 积分
                      </p>
                    )}
                  </motion.div>

                  {/* 分隔线 */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent mb-6" />

                  {/* 各类别排名 */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                      最终排名
                    </h3>
                    <div className="space-y-2">
                      {rankings.map((ranking, index) => (
                        <RankingItem
                          key={ranking.category}
                          category={ranking.category}
                          rank={ranking.finalRank}
                          score={ranking.finalScore}
                          delay={1.5 + index * 0.1}
                        />
                      ))}
                    </div>
                  </div>

                  {/* 获得的奖励 */}
                  {rewards.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 2 }}
                      className="mb-6"
                    >
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        获得的奖励 ({rewards.length})
                      </h3>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {rewards.slice(0, 5).map((reward, index) => (
                          <RewardPreviewItem
                            key={reward.id}
                            reward={reward}
                            delay={2.1 + index * 0.1}
                          />
                        ))}
                        {rewards.length > 5 && (
                          <p className="text-xs text-center text-gray-500 dark:text-gray-400 py-2">
                            还有 {rewards.length - 5} 个奖励...
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* 操作按钮 */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.3 }}
                    className="space-y-3"
                  >
                    {/* 领取奖励按钮 */}
                    {pendingRewardsCount > 0 && onClaimRewards && (
                      <button
                        onClick={onClaimRewards}
                        disabled={isClaimingRewards}
                        className={cn(
                          'w-full py-3 rounded-xl',
                          'bg-gradient-to-r from-indigo-500 to-purple-500',
                          'text-white font-medium',
                          'hover:from-indigo-600 hover:to-purple-600',
                          'disabled:opacity-50 disabled:cursor-not-allowed',
                          'transition-all duration-200',
                          'flex items-center justify-center gap-2',
                          'shadow-lg shadow-indigo-500/25'
                        )}
                      >
                        {isClaimingRewards ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>领取中...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-5 h-5" />
                            <span>领取奖励 ({pendingRewardsCount})</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* 查看历史按钮 */}
                    {onViewHistory && (
                      <button
                        onClick={onViewHistory}
                        className={cn(
                          'w-full py-3 rounded-xl',
                          'bg-white/50 dark:bg-gray-800/50',
                          'border border-gray-200 dark:border-gray-700',
                          'text-gray-700 dark:text-gray-300 font-medium',
                          'hover:bg-white/80 dark:hover:bg-gray-800/80',
                          'transition-all duration-200',
                          'flex items-center justify-center gap-2'
                        )}
                      >
                        <History className="w-5 h-5" />
                        <span>查看赛季历史</span>
                      </button>
                    )}

                    {/* 关闭按钮（如果没有其他操作） */}
                    {!onClaimRewards && !onViewHistory && (
                      <button
                        onClick={handleClose}
                        className={cn(
                          'w-full py-3 rounded-xl',
                          'bg-gradient-to-r from-indigo-500 to-purple-500',
                          'text-white font-medium',
                          'hover:from-indigo-600 hover:to-purple-600',
                          'transition-all duration-200'
                        )}
                      >
                        确定
                      </button>
                    )}
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * 赛季结算弹窗骨架屏
 */
export function SeasonSettlementModalSkeleton() {
  return (
    <div
      className={cn(
        'rounded-2xl p-6',
        'bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl',
        'border border-white/20 dark:border-gray-700/30',
        'animate-pulse'
      )}
    >
      {/* 标题骨架 */}
      <div className="text-center mb-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded mx-auto" />
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mx-auto mt-2" />
      </div>

      {/* 段位骨架 */}
      <div className="flex flex-col items-center py-6">
        <div className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded mt-3" />
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full mt-3" />
      </div>

      {/* 积分骨架 */}
      <div className="flex justify-center mb-6">
        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>

      {/* 排名骨架 */}
      <div className="space-y-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"
          />
        ))}
      </div>

      {/* 按钮骨架 */}
      <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl" />
    </div>
  );
}

export default SeasonSettlementModal;
