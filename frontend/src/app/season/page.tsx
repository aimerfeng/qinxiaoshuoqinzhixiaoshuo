'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Loader2,
  Crown,
  Users,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/utils/cn';
import { SeasonCountdown, LeaderboardCategoryTabs, LeaderboardList, MyRankCard } from '@/components/season';
import type {
  LeaderboardCategory,
  SeasonInfo,
  LeaderboardEntry,
  UserLeaderboardSummary,
  SeasonTier,
} from '@/types/season';
import {
  LEADERBOARD_CATEGORY_NAMES,
  LEADERBOARD_CATEGORY_DESCRIPTIONS,
} from '@/types/season';

/**
 * 赛季中心页面
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.1: 赛季中心页面布局
 *
 * 功能：
 * - 赛季头部信息和倒计时
 * - Tab 导航切换不同排行榜（排行榜/我的排名/奖励/历史）
 * - 主内容区域展示排行榜数据
 * - 响应式设计（移动端优先）
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */

/**
 * 赛季头部组件 - 显示当前赛季信息和倒计时
 * 使用 SeasonCountdown 组件（任务25.2.2）
 */
function SeasonHeader({ season }: { season: SeasonInfo | null }) {
  if (!season) {
    return (
      <div className="h-48 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 animate-pulse" />
    );
  }

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
        <div className="absolute top-1/2 left-1/2 w-24 h-24 bg-yellow-300 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative z-10">
        {/* 赛季标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{season.name}</h2>
              <p className="text-sm text-white/80">
                第 {season.seasonNumber} 赛季
              </p>
            </div>
          </div>

          {/* 赛季状态标签 */}
          <div
            className={cn(
              'px-3 py-1 rounded-full text-sm font-medium',
              'bg-white/20 backdrop-blur-sm',
              season.status === 'ACTIVE' && 'animate-pulse'
            )}
          >
            {season.status === 'ACTIVE' ? '进行中' : 
             season.status === 'UPCOMING' ? '即将开始' :
             season.status === 'ENDED' ? '已结束' : '已结算'}
          </div>
        </div>

        {/* 倒计时 - 使用 SeasonCountdown 组件 */}
        {season.status === 'ACTIVE' && (
          <SeasonCountdown
            endDate={season.endDate}
            size="default"
            variant="hero"
            label="赛季倒计时"
            showIcon={true}
            className="mb-6"
          />
        )}

        {/* 赛季描述 */}
        {season.description && (
          <p className="text-sm text-white/80 mb-4">{season.description}</p>
        )}

        {/* 赛季时间 */}
        <div className="flex items-center gap-4 text-sm text-white/60">
          <span>
            开始: {new Date(season.startDate).toLocaleDateString('zh-CN')}
          </span>
          <span>•</span>
          <span>
            结束: {new Date(season.endDate).toLocaleDateString('zh-CN')}
          </span>
          <span>•</span>
          <span>{season.durationDays} 天</span>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 赛季页面内容组件
 */
function SeasonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 从 URL 获取类别参数
  const categoryParam = searchParams.get('category') as LeaderboardCategory | null;
  const [selectedCategory, setSelectedCategory] = useState<LeaderboardCategory>(
    categoryParam || 'OVERALL'
  );

  // 模拟数据 - 实际应该从 API 获取
  const [season, setSeason] = useState<SeasonInfo | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userSummary, setUserSummary] = useState<UserLeaderboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUserRankLoading, setIsUserRankLoading] = useState(true);

  // 模拟加载数据
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setIsUserRankLoading(true);
      
      // 模拟 API 延迟
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 模拟赛季数据
      setSeason({
        id: 'season-1',
        name: '2024 冬季赛季',
        description: '在这个冬季，与其他读者和创作者一起竞争，赢取丰厚奖励！',
        seasonNumber: 1,
        status: 'ACTIVE',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-03-31T23:59:59Z',
        durationDays: 90,
        remainingDays: 45,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      // 模拟用户排名汇总数据（任务25.2.5）
      setUserSummary({
        userId: 'current-user',
        seasonId: 'season-1',
        rankings: [
          { category: 'READING', score: 1250, rank: 42, previousRank: 48, rankChange: 6 },
          { category: 'CREATION', score: 890, rank: 78, previousRank: 75, rankChange: -3 },
          { category: 'SOCIAL', score: 560, rank: 156, previousRank: 160, rankChange: 4 },
          { category: 'OVERALL', score: 2700, rank: 65, previousRank: 70, rankChange: 5 },
        ],
        seasonRank: {
          id: 'rank-1',
          userId: 'current-user',
          seasonId: 'season-1',
          tier: 'GOLD' as SeasonTier,
          points: 2700,
          previousTier: 'SILVER' as SeasonTier,
          peakTier: 'GOLD' as SeasonTier,
          peakPoints: 2850,
          pointsBreakdown: {
            readingPoints: 1250,
            creationPoints: 890,
            socialPoints: 560,
          },
          updatedAt: new Date().toISOString(),
        },
      });
      setIsUserRankLoading(false);

      // 模拟排行榜数据
      const mockEntries: LeaderboardEntry[] = Array.from({ length: 20 }, (_, i) => ({
        id: `entry-${i + 1}`,
        userId: `user-${i + 1}`,
        seasonId: 'season-1',
        category: selectedCategory,
        score: Math.floor(Math.random() * 5000) + 1000,
        rank: i + 1,
        previousRank: i === 0 ? null : Math.floor(Math.random() * 25) + 1,
        rankChange: i === 0 ? null : Math.floor(Math.random() * 10) - 5,
        peakRank: Math.max(1, i + 1 - Math.floor(Math.random() * 5)),
        peakScore: Math.floor(Math.random() * 6000) + 1000,
        updatedAt: new Date().toISOString(),
        user: {
          id: `user-${i + 1}`,
          nickname: `用户${i + 1}`,
          avatarUrl: null,
          memberLevel: i < 3 ? 'OFFICIAL' : 'REGULAR',
        },
      })).sort((a, b) => b.score - a.score).map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

      setEntries(mockEntries);
      setIsLoading(false);
    };

    loadData();
  }, [selectedCategory]);

  // 处理类别切换
  const handleCategoryChange = useCallback((category: LeaderboardCategory) => {
    setSelectedCategory(category);
    // 更新 URL 参数
    const params = new URLSearchParams(searchParams.toString());
    params.set('category', category);
    router.push(`/season?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/season');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 赛季头部 */}
      <SeasonHeader season={season} />

      {/* 我的排名卡片 - 使用 MyRankCard 组件（任务25.2.5） */}
      <MyRankCard
        summary={userSummary}
        isLoading={isUserRankLoading}
        onViewDetails={() => {
          // 滚动到排行榜区域
          document.getElementById('leaderboard-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onCategoryClick={(category) => handleCategoryChange(category)}
        showPointsBreakdown={true}
        showAllCategories={true}
      />

      {/* 类别 Tab - 使用 LeaderboardCategoryTabs 组件（任务25.2.3） */}
      <div id="leaderboard-section">
        <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
          排行榜类别
        </h3>
        <LeaderboardCategoryTabs
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          variant="pills"
          size="default"
          showIcon={true}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          {LEADERBOARD_CATEGORY_DESCRIPTIONS[selectedCategory]}
        </p>
      </div>

      {/* 排行榜列表 - 使用 LeaderboardList 组件（任务25.2.4） */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {LEADERBOARD_CATEGORY_NAMES[selectedCategory]}
          </h3>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span>{entries.length} 人参与</span>
          </div>
        </div>

        <LeaderboardList
          entries={entries}
          category={selectedCategory}
          isLoading={isLoading}
          showTierBadge={false}
          skeletonCount={10}
        />
      </div>

      {/* 查看更多按钮 */}
      {!isLoading && entries.length > 0 && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            'w-full py-3 rounded-xl',
            'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
            'border border-white/20 dark:border-gray-700/30',
            'text-sm font-medium text-gray-600 dark:text-gray-400',
            'hover:bg-white dark:hover:bg-gray-800',
            'transition-all duration-200',
            'flex items-center justify-center gap-2'
          )}
        >
          <span>查看完整排行榜</span>
          <ChevronRight className="w-4 h-4" />
        </motion.button>
      )}
    </div>
  );
}

/**
 * 赛季中心页面
 */
export default function SeasonPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <SeasonContent />
    </Suspense>
  );
}
