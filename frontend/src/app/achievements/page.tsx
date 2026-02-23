'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Loader2,
  Trophy,
  Award,
  Gift,
  TrendingUp,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import {
  useUserAchievements,
  useUserAchievementStats,
} from '@/hooks/useAchievements';
import {
  AchievementCard,
  AchievementClaimProvider,
  useAchievementClaim,
} from '@/components/achievement';
import { cn } from '@/utils/cn';
import type {
  AchievementCategory,
  AchievementTier,
  AchievementStats,
} from '@/types/achievement';
import {
  ACHIEVEMENT_CATEGORY_NAMES,
  ACHIEVEMENT_TIER_NAMES,
} from '@/types/achievement';

/**
 * 成就中心页面
 *
 * 需求24: 成就系统
 * 任务24.2.1: 成就中心页面布局
 *
 * 功能：
 * - Header with title "成就中心" and user's achievement stats summary
 * - Category navigation tabs/sidebar
 * - Main content area for achievement grid/list
 * - Responsive design (mobile-first)
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */

/**
 * 成就统计卡片组件
 */
function AchievementStatsCard({ stats }: { stats: AchievementStats }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
        'p-6 text-white'
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl transform translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl transform -translate-x-10 translate-y-10" />
      </div>

      <div className="relative z-10">
        {/* 标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold">成就统计</h2>
            <p className="text-sm text-white/80">你的成就进度概览</p>
          </div>
        </div>

        {/* 统计数据 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* 已解锁 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-yellow-300" />
              <span className="text-xs text-white/80">已解锁</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.unlockedCount}
              <span className="text-sm font-normal text-white/60">
                /{stats.totalAchievements}
              </span>
            </p>
          </div>

          {/* 完成率 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-300" />
              <span className="text-xs text-white/80">完成率</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.unlockPercent.toFixed(1)}
              <span className="text-sm font-normal text-white/60">%</span>
            </p>
          </div>

          {/* 待领取 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gift className="w-4 h-4 text-pink-300" />
              <span className="text-xs text-white/80">待领取</span>
            </div>
            <p className="text-2xl font-bold">
              {stats.unlockedCount - stats.claimedCount}
            </p>
          </div>

          {/* 已领取 */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-amber-300" />
              <span className="text-xs text-white/80">已领取</span>
            </div>
            <p className="text-2xl font-bold">{stats.claimedCount}</p>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mt-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-white/80">总体进度</span>
            <span className="font-medium">{stats.unlockPercent.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.unlockPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-yellow-300 to-amber-400 rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 筛选器组件
 */
function AchievementFilters({
  selectedTier,
  onTierChange,
  showUnlockedOnly,
  onUnlockedOnlyChange,
  showUnclaimedOnly,
  onUnclaimedOnlyChange,
}: {
  selectedTier: AchievementTier | 'ALL';
  onTierChange: (tier: AchievementTier | 'ALL') => void;
  showUnlockedOnly: boolean;
  onUnlockedOnlyChange: (value: boolean) => void;
  showUnclaimedOnly: boolean;
  onUnclaimedOnlyChange: (value: boolean) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-xl',
          'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
          'border border-white/20 dark:border-gray-700/30',
          'text-sm font-medium text-gray-700 dark:text-gray-300',
          'hover:bg-white/80 dark:hover:bg-gray-900/80',
          'transition-all duration-200'
        )}
      >
        <Filter className="w-4 h-4" />
        <span>筛选</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'absolute right-0 top-full mt-2 w-64 z-50',
            'bg-white dark:bg-gray-900 rounded-xl shadow-xl',
            'border border-gray-200 dark:border-gray-700',
            'p-4 space-y-4'
          )}
        >
          {/* 等级筛选 */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
              成就等级
            </label>
            <select
              value={selectedTier}
              onChange={(e) => onTierChange(e.target.value as AchievementTier | 'ALL')}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-gray-50 dark:bg-gray-800',
                'border border-gray-200 dark:border-gray-700',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500'
              )}
            >
              <option value="ALL">全部等级</option>
              {Object.entries(ACHIEVEMENT_TIER_NAMES).map(([key, name]) => (
                <option key={key} value={key}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* 状态筛选 */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnlockedOnly}
                onChange={(e) => onUnlockedOnlyChange(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                仅显示已解锁
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showUnclaimedOnly}
                onChange={(e) => onUnclaimedOnlyChange(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-indigo-500 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                仅显示待领取
              </span>
            </label>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * 成就列表骨架屏
 */
function AchievementsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'rounded-2xl p-5',
            'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
            'border border-white/20 dark:border-gray-700/30',
            'animate-pulse'
          )}
        >
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1">
              <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-4" />
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 成就页面内容组件
 */
function AchievementsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 从 URL 获取筛选参数
  const categoryParam = searchParams.get('category') as AchievementCategory | null;

  // 筛选状态
  const [selectedTier, setSelectedTier] = useState<AchievementTier | 'ALL'>('ALL');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);
  const [showUnclaimedOnly, setShowUnclaimedOnly] = useState(false);

  // 使用领取上下文
  const { claimReward, isClaimingAchievement } = useAchievementClaim();

  // 数据获取
  const {
    data: achievementsData,
    isLoading: isLoadingAchievements,
    refetch: refetchAchievements,
  } = useUserAchievements({
    category: categoryParam || undefined,
    tier: selectedTier !== 'ALL' ? selectedTier : undefined,
    unlockedOnly: showUnlockedOnly || undefined,
    unclaimedOnly: showUnclaimedOnly || undefined,
    limit: 50,
  });

  const { data: stats, isLoading: isLoadingStats } = useUserAchievementStats();

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/achievements');
    }
  }, [authLoading, isAuthenticated, router]);

  // 处理领取奖励
  const handleClaim = useCallback(
    async (achievementId: string) => {
      const achievement = achievementsData?.achievements.find(
        (a) => a.id === achievementId
      );
      if (achievement) {
        await claimReward(achievement);
        refetchAchievements();
      }
    },
    [achievementsData?.achievements, claimReward, refetchAchievements]
  );

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 统计卡片 */}
      {isLoadingStats ? (
        <div className="h-48 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse" />
      ) : stats ? (
        <AchievementStatsCard stats={stats} />
      ) : null}

      {/* 标题和筛选 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {categoryParam
              ? ACHIEVEMENT_CATEGORY_NAMES[categoryParam]
              : '全部成就'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {achievementsData?.total || 0} 个成就
          </p>
        </div>

        <AchievementFilters
          selectedTier={selectedTier}
          onTierChange={setSelectedTier}
          showUnlockedOnly={showUnlockedOnly}
          onUnlockedOnlyChange={setShowUnlockedOnly}
          showUnclaimedOnly={showUnclaimedOnly}
          onUnclaimedOnlyChange={setShowUnclaimedOnly}
        />
      </div>

      {/* 成就列表 */}
      {isLoadingAchievements ? (
        <AchievementsSkeleton />
      ) : achievementsData?.achievements.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            'text-center py-16 rounded-2xl',
            'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
            'border border-white/20 dark:border-gray-700/30'
          )}
        >
          <Trophy className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            暂无成就
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            继续探索，解锁更多成就吧！
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievementsData?.achievements.map((achievement) => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              onClaim={handleClaim}
              isClaiming={isClaimingAchievement(achievement.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 成就中心页面
 */
export default function AchievementsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <AchievementClaimProvider>
        <AchievementsContent />
      </AchievementClaimProvider>
    </Suspense>
  );
}
