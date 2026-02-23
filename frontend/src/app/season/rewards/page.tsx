'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  Gift,
  ArrowLeft,
  Sparkles,
  Check,
  AlertCircle,
  Trophy,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/utils/cn';
import { TierRewardsSection, TierRewardsSectionSkeleton } from '@/components/season/TierRewardsSection';
import type {
  SeasonInfo,
  SeasonReward,
  UserSeasonReward,
  SeasonTier,
  UserSeasonRank,
} from '@/types/season';
import {
  SEASON_TIER_NAMES,
  SEASON_TIER_COLORS,
} from '@/types/season';

/**
 * 赛季奖励预览页面
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.8: 赛季奖励预览页面
 */

// ==================== 类型定义 ====================

interface RewardsPageState {
  season: SeasonInfo | null;
  rewards: SeasonReward[];
  userRewards: UserSeasonReward[];
  userSeasonRank: UserSeasonRank | null;
  isLoading: boolean;
  isClaimingAll: boolean;
  selectedRewardIds: string[];
  error: string | null;
}

// ==================== 常量 ====================

const ALL_TIERS: SeasonTier[] = [
  'KING',
  'GRANDMASTER',
  'MASTER',
  'DIAMOND',
  'PLATINUM',
  'GOLD',
  'SILVER',
  'BRONZE',
  'NOVICE',
];

// ==================== 子组件 ====================

/**
 * 页面头部组件
 */
function PageHeader({
  season,
  userTier,
  pendingCount,
  onBack,
}: {
  season: SeasonInfo | null;
  userTier?: SeasonTier | null;
  pendingCount: number;
  onBack: () => void;
}) {
  const tierColors = userTier ? SEASON_TIER_COLORS[userTier] : null;

  return (
    <div className="mb-6">
      {/* 返回按钮 */}
      <button
        onClick={onBack}
        className={cn(
          'inline-flex items-center gap-2 mb-4',
          'text-sm text-gray-600 dark:text-gray-400',
          'hover:text-gray-900 dark:hover:text-white',
          'transition-colors duration-200'
        )}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>返回赛季中心</span>
      </button>

      {/* 标题区域 */}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">赛季奖励</h1>
                <p className="text-sm text-white/80">
                  {season?.name || '当前赛季'} · 查看并领取您的奖励
                </p>
              </div>
            </div>

            {/* 当前段位 */}
            {userTier && tierColors && (
              <div
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-xl',
                  'bg-white/20 backdrop-blur-sm'
                )}
              >
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {SEASON_TIER_NAMES[userTier]}
                </span>
              </div>
            )}
          </div>

          {/* 待领取提示 */}
          {pendingCount > 0 && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span className="text-sm">
                您有 <span className="font-bold text-amber-300">{pendingCount}</span> 个奖励待领取
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * 批量领取按钮组件
 */
function ClaimAllButton({
  pendingCount,
  selectedCount,
  isLoading,
  onClaimAll,
  onClaimSelected,
}: {
  pendingCount: number;
  selectedCount: number;
  isLoading: boolean;
  onClaimAll: () => void;
  onClaimSelected: () => void;
}) {
  if (pendingCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'fixed bottom-6 left-1/2 transform -translate-x-1/2',
        'flex items-center gap-3 p-3 rounded-2xl',
        'bg-white/90 dark:bg-gray-900/90 backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'shadow-xl'
      )}
    >
      {selectedCount > 0 ? (
        <button
          onClick={onClaimSelected}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl',
            'bg-gradient-to-r from-indigo-500 to-purple-500',
            'text-white text-sm font-medium',
            'hover:from-indigo-600 hover:to-purple-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200'
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          <span>领取选中 ({selectedCount})</span>
        </button>
      ) : (
        <button
          onClick={onClaimAll}
          disabled={isLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl',
            'bg-gradient-to-r from-indigo-500 to-purple-500',
            'text-white text-sm font-medium',
            'hover:from-indigo-600 hover:to-purple-600',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-all duration-200'
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          <span>一键领取全部 ({pendingCount})</span>
        </button>
      )}

      <span className="text-xs text-gray-500 dark:text-gray-400">
        {selectedCount > 0 ? `已选 ${selectedCount} 个` : `共 ${pendingCount} 个待领取`}
      </span>
    </motion.div>
  );
}

/**
 * 空状态组件
 */
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-2xl p-8 text-center',
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
          <Gift className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        暂无奖励
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
        当前赛季暂无可用奖励，请继续努力提升段位！
      </p>
    </motion.div>
  );
}

/**
 * 错误状态组件
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'rounded-2xl p-8 text-center',
        'bg-red-50 dark:bg-red-900/20',
        'border border-red-200 dark:border-red-800/30'
      )}
    >
      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
      <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-2">
        加载失败
      </h3>
      <p className="text-sm text-red-600 dark:text-red-300 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className={cn(
          'px-4 py-2 rounded-xl',
          'bg-red-500 text-white text-sm font-medium',
          'hover:bg-red-600',
          'transition-colors duration-200'
        )}
      >
        重试
      </button>
    </motion.div>
  );
}

/**
 * 加载骨架屏
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <TierRewardsSectionSkeleton key={i} />
      ))}
    </div>
  );
}

// ==================== 主页面内容组件 ====================

function RewardsPageContent() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 页面状态
  const [state, setState] = useState<RewardsPageState>({
    season: null,
    rewards: [],
    userRewards: [],
    userSeasonRank: null,
    isLoading: true,
    isClaimingAll: false,
    selectedRewardIds: [],
    error: null,
  });

  // 加载数据
  const loadData = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 模拟 API 延迟
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 模拟赛季数据
      const mockSeason: SeasonInfo = {
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
      };

      // 模拟用户段位数据
      const mockUserRank: UserSeasonRank = {
        id: 'rank-1',
        userId: 'current-user',
        seasonId: 'season-1',
        tier: 'GOLD',
        points: 2700,
        previousTier: 'SILVER',
        peakTier: 'GOLD',
        peakPoints: 2850,
        updatedAt: new Date().toISOString(),
      };

      // 模拟奖励数据
      const mockRewards: SeasonReward[] = [
        // 新秀奖励
        { id: 'r1', seasonId: 'season-1', tier: 'NOVICE', rewardType: 'TOKENS', rewardValue: { amount: 50 }, description: '新秀入门奖励', sortOrder: 1, createdAt: new Date().toISOString() },
        { id: 'r2', seasonId: 'season-1', tier: 'NOVICE', rewardType: 'BADGE', rewardValue: { badgeId: 'b1', badgeName: '新秀徽章' }, description: '新秀专属徽章', sortOrder: 2, createdAt: new Date().toISOString() },
        // 青铜奖励
        { id: 'r3', seasonId: 'season-1', tier: 'BRONZE', rewardType: 'TOKENS', rewardValue: { amount: 100 }, description: '青铜段位奖励', sortOrder: 1, createdAt: new Date().toISOString() },
        { id: 'r4', seasonId: 'season-1', tier: 'BRONZE', rewardType: 'TITLE', rewardValue: { titleId: 't1', titleName: '青铜战士' }, description: '青铜专属称号', sortOrder: 2, createdAt: new Date().toISOString() },
        // 白银奖励
        { id: 'r5', seasonId: 'season-1', tier: 'SILVER', rewardType: 'TOKENS', rewardValue: { amount: 200 }, description: '白银段位奖励', sortOrder: 1, createdAt: new Date().toISOString() },
        { id: 'r6', seasonId: 'season-1', tier: 'SILVER', rewardType: 'BADGE', rewardValue: { badgeId: 'b2', badgeName: '白银徽章' }, description: '白银专属徽章', sortOrder: 2, createdAt: new Date().toISOString() },
        { id: 'r7', seasonId: 'season-1', tier: 'SILVER', rewardType: 'AVATAR_FRAME', rewardValue: { frameId: 'f1', frameName: '白银边框' }, description: '白银专属头像框', sortOrder: 3, createdAt: new Date().toISOString() },
        // 黄金奖励
        { id: 'r8', seasonId: 'season-1', tier: 'GOLD', rewardType: 'TOKENS', rewardValue: { amount: 500 }, description: '黄金段位奖励', sortOrder: 1, createdAt: new Date().toISOString() },
        { id: 'r9', seasonId: 'season-1', tier: 'GOLD', rewardType: 'BADGE', rewardValue: { badgeId: 'b3', badgeName: '黄金徽章' }, description: '黄金专属徽章', sortOrder: 2, createdAt: new Date().toISOString() },
        { id: 'r10', seasonId: 'season-1', tier: 'GOLD', rewardType: 'TITLE', rewardValue: { titleId: 't2', titleName: '黄金精英' }, description: '黄金专属称号', sortOrder: 3, createdAt: new Date().toISOString() },
        // 铂金奖励
        { id: 'r11', seasonId: 'season-1', tier: 'PLATINUM', rewardType: 'TOKENS', rewardValue: { amount: 800 }, description: '铂金段位奖励', sortOrder: 1, createdAt: new Date().toISOString() },
        { id: 'r12', seasonId: 'season-1', tier: 'PLATINUM', rewardType: 'AVATAR_FRAME', rewardValue: { frameId: 'f2', frameName: '铂金边框' }, description: '铂金专属头像框', sortOrder: 2, createdAt: new Date().toISOString() },
        // 钻石奖励
        { id: 'r13', seasonId: 'season-1', tier: 'DIAMOND', rewardType: 'TOKENS', rewardValue: { amount: 1200 }, description: '钻石段位奖励', sortOrder: 1, createdAt: new Date().toISOString() },
        { id: 'r14', seasonId: 'season-1', tier: 'DIAMOND', rewardType: 'BADGE', rewardValue: { badgeId: 'b4', badgeName: '钻石徽章' }, description: '钻石专属徽章', sortOrder: 2, createdAt: new Date().toISOString() },
        // 大师奖励
        { id: 'r15', seasonId: 'season-1', tier: 'MASTER', rewardType: 'TOKENS', rewardValue: { amount: 2000 }, description: '大师段位奖励', sortOrder: 1, createdAt: new Date().toISOString() },
        // 宗师奖励
        { id: 'r16', seasonId: 'season-1', tier: 'GRANDMASTER', rewardType: 'TOKENS', rewardValue: { amount: 3000 }, description: '宗师段位奖励', sortOrder: 1, createdAt: new Date().toISOString() },
        // 王者奖励
        { id: 'r17', seasonId: 'season-1', tier: 'KING', rewardType: 'TOKENS', rewardValue: { amount: 5000 }, description: '王者段位奖励', sortOrder: 1, createdAt: new Date().toISOString() },
        { id: 'r18', seasonId: 'season-1', tier: 'KING', rewardType: 'BADGE', rewardValue: { badgeId: 'b5', badgeName: '王者徽章' }, description: '王者专属徽章', sortOrder: 2, createdAt: new Date().toISOString() },
        { id: 'r19', seasonId: 'season-1', tier: 'KING', rewardType: 'TITLE', rewardValue: { titleId: 't3', titleName: '王者之巅' }, description: '王者专属称号', sortOrder: 3, createdAt: new Date().toISOString() },
        { id: 'r20', seasonId: 'season-1', tier: 'KING', rewardType: 'AVATAR_FRAME', rewardValue: { frameId: 'f3', frameName: '王者边框' }, description: '王者专属头像框', sortOrder: 4, createdAt: new Date().toISOString() },
      ];

      // 模拟用户奖励状态（部分已领取）
      const mockUserRewards: UserSeasonReward[] = [
        { id: 'ur1', userId: 'current-user', seasonId: 'season-1', rewardId: 'r1', status: 'CLAIMED', claimedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), reward: mockRewards[0] },
        { id: 'ur2', userId: 'current-user', seasonId: 'season-1', rewardId: 'r2', status: 'CLAIMED', claimedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), reward: mockRewards[1] },
        { id: 'ur3', userId: 'current-user', seasonId: 'season-1', rewardId: 'r3', status: 'PENDING', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), reward: mockRewards[2] },
      ];

      setState((prev) => ({
        ...prev,
        season: mockSeason,
        rewards: mockRewards,
        userRewards: mockUserRewards,
        userSeasonRank: mockUserRank,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: '加载奖励数据失败，请稍后重试',
      }));
    }
  }, []);

  // 初始加载
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData();
    }
  }, [authLoading, isAuthenticated, loadData]);

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/season/rewards');
    }
  }, [authLoading, isAuthenticated, router]);

  // 用户奖励映射
  const userRewardsMap = useMemo(() => {
    const map = new Map<string, UserSeasonReward>();
    state.userRewards.forEach((ur) => map.set(ur.rewardId, ur));
    return map;
  }, [state.userRewards]);

  // 按段位分组的奖励
  const rewardsByTier = useMemo(() => {
    const grouped = new Map<SeasonTier, SeasonReward[]>();
    ALL_TIERS.forEach((tier) => grouped.set(tier, []));
    state.rewards.forEach((reward) => {
      const tierRewards = grouped.get(reward.tier) || [];
      tierRewards.push(reward);
      grouped.set(reward.tier, tierRewards);
    });
    return grouped;
  }, [state.rewards]);

  // 计算待领取数量
  const pendingCount = useMemo(() => {
    const userTier = state.userSeasonRank?.tier;
    if (!userTier) return 0;

    const tiers: SeasonTier[] = [
      'NOVICE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
      'DIAMOND', 'MASTER', 'GRANDMASTER', 'KING',
    ];
    const userTierIndex = tiers.indexOf(userTier);

    return state.rewards.filter((reward) => {
      const rewardTierIndex = tiers.indexOf(reward.tier);
      if (rewardTierIndex > userTierIndex) return false;
      const userReward = userRewardsMap.get(reward.id);
      return !userReward || userReward.status === 'PENDING';
    }).length;
  }, [state.rewards, state.userSeasonRank, userRewardsMap]);

  // 处理选择奖励
  const handleSelectReward = useCallback((rewardId: string, selected: boolean) => {
    setState((prev) => ({
      ...prev,
      selectedRewardIds: selected
        ? [...prev.selectedRewardIds, rewardId]
        : prev.selectedRewardIds.filter((id) => id !== rewardId),
    }));
  }, []);

  // 处理全选/取消全选
  const handleSelectAll = useCallback((tier: SeasonTier, selected: boolean) => {
    const tierRewards = rewardsByTier.get(tier) || [];
    const tierRewardIds = tierRewards.map((r) => r.id);

    setState((prev) => ({
      ...prev,
      selectedRewardIds: selected
        ? [...new Set([...prev.selectedRewardIds, ...tierRewardIds])]
        : prev.selectedRewardIds.filter((id) => !tierRewardIds.includes(id)),
    }));
  }, [rewardsByTier]);

  // 处理领取单个奖励
  const handleClaimReward = useCallback(async (rewardId: string) => {
    // 模拟领取 API
    await new Promise((resolve) => setTimeout(resolve, 500));

    setState((prev) => {
      const reward = prev.rewards.find((r) => r.id === rewardId);
      if (!reward) return prev;

      const newUserReward: UserSeasonReward = {
        id: `ur-${Date.now()}`,
        userId: 'current-user',
        seasonId: prev.season?.id || '',
        rewardId,
        status: 'CLAIMED',
        claimedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reward,
      };

      return {
        ...prev,
        userRewards: [...prev.userRewards.filter((ur) => ur.rewardId !== rewardId), newUserReward],
        selectedRewardIds: prev.selectedRewardIds.filter((id) => id !== rewardId),
      };
    });
  }, []);

  // 处理一键领取全部
  const handleClaimAll = useCallback(async () => {
    setState((prev) => ({ ...prev, isClaimingAll: true }));

    // 模拟批量领取 API
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const userTier = state.userSeasonRank?.tier;
    if (!userTier) {
      setState((prev) => ({ ...prev, isClaimingAll: false }));
      return;
    }

    const tiers: SeasonTier[] = [
      'NOVICE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
      'DIAMOND', 'MASTER', 'GRANDMASTER', 'KING',
    ];
    const userTierIndex = tiers.indexOf(userTier);

    setState((prev) => {
      const claimableRewards = prev.rewards.filter((reward) => {
        const rewardTierIndex = tiers.indexOf(reward.tier);
        if (rewardTierIndex > userTierIndex) return false;
        const userReward = userRewardsMap.get(reward.id);
        return !userReward || userReward.status === 'PENDING';
      });

      const newUserRewards = claimableRewards.map((reward) => ({
        id: `ur-${Date.now()}-${reward.id}`,
        userId: 'current-user',
        seasonId: prev.season?.id || '',
        rewardId: reward.id,
        status: 'CLAIMED' as const,
        claimedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reward,
      }));

      const existingRewardIds = new Set(newUserRewards.map((ur) => ur.rewardId));

      return {
        ...prev,
        userRewards: [
          ...prev.userRewards.filter((ur) => !existingRewardIds.has(ur.rewardId)),
          ...newUserRewards,
        ],
        selectedRewardIds: [],
        isClaimingAll: false,
      };
    });
  }, [state.userSeasonRank, userRewardsMap]);

  // 处理领取选中
  const handleClaimSelected = useCallback(async () => {
    setState((prev) => ({ ...prev, isClaimingAll: true }));

    // 模拟批量领取 API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setState((prev) => {
      const selectedRewards = prev.rewards.filter((r) =>
        prev.selectedRewardIds.includes(r.id)
      );

      const newUserRewards = selectedRewards.map((reward) => ({
        id: `ur-${Date.now()}-${reward.id}`,
        userId: 'current-user',
        seasonId: prev.season?.id || '',
        rewardId: reward.id,
        status: 'CLAIMED' as const,
        claimedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reward,
      }));

      const existingRewardIds = new Set(newUserRewards.map((ur) => ur.rewardId));

      return {
        ...prev,
        userRewards: [
          ...prev.userRewards.filter((ur) => !existingRewardIds.has(ur.rewardId)),
          ...newUserRewards,
        ],
        selectedRewardIds: [],
        isClaimingAll: false,
      };
    });
  }, []);

  // 返回赛季中心
  const handleBack = useCallback(() => {
    router.push('/season');
  }, [router]);

  // 认证加载中
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto pb-24">
      {/* 页面头部 */}
      <PageHeader
        season={state.season}
        userTier={state.userSeasonRank?.tier}
        pendingCount={pendingCount}
        onBack={handleBack}
      />

      {/* 错误状态 */}
      {state.error && (
        <ErrorState message={state.error} onRetry={loadData} />
      )}

      {/* 加载状态 */}
      {state.isLoading && <LoadingSkeleton />}

      {/* 空状态 */}
      {!state.isLoading && !state.error && state.rewards.length === 0 && (
        <EmptyState />
      )}

      {/* 奖励列表 */}
      {!state.isLoading && !state.error && state.rewards.length > 0 && (
        <div className="space-y-4">
          {ALL_TIERS.map((tier) => {
            const tierRewards = rewardsByTier.get(tier) || [];
            if (tierRewards.length === 0) return null;

            const userTier = state.userSeasonRank?.tier;
            const tiers: SeasonTier[] = [
              'NOVICE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM',
              'DIAMOND', 'MASTER', 'GRANDMASTER', 'KING',
            ];
            const isAchieved = userTier
              ? tiers.indexOf(userTier) >= tiers.indexOf(tier)
              : false;

            return (
              <TierRewardsSection
                key={tier}
                tier={tier}
                rewards={tierRewards}
                userRewardsMap={userRewardsMap}
                userTier={state.userSeasonRank?.tier}
                isAchieved={isAchieved}
                defaultExpanded={isAchieved}
                selectedRewardIds={state.selectedRewardIds}
                onClaimReward={handleClaimReward}
                onSelectReward={handleSelectReward}
                onSelectAll={handleSelectAll}
              />
            );
          })}
        </div>
      )}

      {/* 批量领取按钮 */}
      {!state.isLoading && !state.error && (
        <ClaimAllButton
          pendingCount={pendingCount}
          selectedCount={state.selectedRewardIds.length}
          isLoading={state.isClaimingAll}
          onClaimAll={handleClaimAll}
          onClaimSelected={handleClaimSelected}
        />
      )}
    </div>
  );
}

// ==================== 主页面组件 ====================

export default function SeasonRewardsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <RewardsPageContent />
    </Suspense>
  );
}
