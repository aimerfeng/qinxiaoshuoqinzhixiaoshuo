'use client';

import { useEffect, useState, Suspense, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import {
  Loader2,
  History,
  ArrowLeft,
  Filter,
  Calendar,
  Trophy,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/utils/cn';
import { SeasonHistoryCard, SeasonHistoryCardSkeleton } from '@/components/season/SeasonHistoryCard';
import type {
  UserSeasonHistoryEntry,
  SeasonTier,
  SeasonInfo,
  LeaderboardCategory,
  Pagination,
} from '@/types/season';
import {
  SEASON_TIER_NAMES,
  SEASON_TIER_COLORS,
} from '@/types/season';

/**
 * 赛季历史记录页面
 *
 * 需求25: 赛季排行榜系统
 * 任务25.2.9: 赛季历史记录页面
 *
 * 功能：
 * - 显示用户过去的赛季记录
 * - 历史段位成就
 * - 各类别最终排名
 * - 获得的奖励
 * - 支持日期范围/段位筛选
 * - 支持分页
 * - 加载骨架屏
 * - 空状态
 */

// ==================== 类型定义 ====================

interface HistoryPageState {
  entries: UserSeasonHistoryEntry[];
  pagination: Pagination;
  isLoading: boolean;
  error: string | null;
}

interface FilterState {
  minTier: SeasonTier | null;
  startDate: string;
  endDate: string;
}

// ==================== 常量 ====================

const ALL_TIERS: SeasonTier[] = [
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

const PAGE_SIZE = 10;

// ==================== 子组件 ====================

/**
 * 页面头部组件
 */
function PageHeader({
  totalSeasons,
  onBack,
}: {
  totalSeasons: number;
  onBack: () => void;
}) {
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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">赛季历史</h1>
              <p className="text-sm text-white/80">
                查看您过去的赛季记录和成就
              </p>
            </div>
          </div>

          {totalSeasons > 0 && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <Trophy className="w-4 h-4 text-amber-300" />
              <span className="text-sm">
                共参与 <span className="font-bold text-amber-300">{totalSeasons}</span> 个赛季
              </span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * 筛选面板组件
 */
function FilterPanel({
  filters,
  isOpen,
  onClose,
  onApply,
  onReset,
}: {
  filters: FilterState;
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  onReset: () => void;
}) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  // 同步外部筛选状态
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleApply = useCallback(() => {
    onApply(localFilters);
    onClose();
  }, [localFilters, onApply, onClose]);

  const handleReset = useCallback(() => {
    const resetFilters: FilterState = {
      minTier: null,
      startDate: '',
      endDate: '',
    };
    setLocalFilters(resetFilters);
    onReset();
    onClose();
  }, [onReset, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* 筛选面板 */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-white dark:bg-gray-900',
              'rounded-t-3xl shadow-2xl',
              'p-6 pb-8'
            )}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                筛选条件
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* 段位筛选 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                最低段位
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setLocalFilters((prev) => ({ ...prev, minTier: null }))}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium',
                    'border transition-all duration-200',
                    localFilters.minTier === null
                      ? 'bg-indigo-500 text-white border-indigo-500'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700'
                  )}
                >
                  全部
                </button>
                {ALL_TIERS.map((tier) => {
                  const colors = SEASON_TIER_COLORS[tier];
                  const isSelected = localFilters.minTier === tier;
                  return (
                    <button
                      key={tier}
                      onClick={() => setLocalFilters((prev) => ({ ...prev, minTier: tier }))}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium',
                        'border transition-all duration-200',
                        isSelected
                          ? `bg-gradient-to-r ${colors.gradient} text-white border-transparent`
                          : `${colors.bg} ${colors.text} ${colors.border}`
                      )}
                    >
                      {SEASON_TIER_NAMES[tier]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 日期范围筛选 */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                日期范围
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">开始日期</label>
                  <input
                    type="date"
                    value={localFilters.startDate}
                    onChange={(e) => setLocalFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                    className={cn(
                      'w-full px-3 py-2 rounded-xl',
                      'bg-gray-50 dark:bg-gray-800',
                      'border border-gray-200 dark:border-gray-700',
                      'text-sm text-gray-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    )}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">结束日期</label>
                  <input
                    type="date"
                    value={localFilters.endDate}
                    onChange={(e) => setLocalFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                    className={cn(
                      'w-full px-3 py-2 rounded-xl',
                      'bg-gray-50 dark:bg-gray-800',
                      'border border-gray-200 dark:border-gray-700',
                      'text-sm text-gray-900 dark:text-white',
                      'focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    )}
                  />
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className={cn(
                  'flex-1 py-3 rounded-xl',
                  'bg-gray-100 dark:bg-gray-800',
                  'text-gray-700 dark:text-gray-300 text-sm font-medium',
                  'hover:bg-gray-200 dark:hover:bg-gray-700',
                  'transition-colors duration-200'
                )}
              >
                重置
              </button>
              <button
                onClick={handleApply}
                className={cn(
                  'flex-1 py-3 rounded-xl',
                  'bg-gradient-to-r from-indigo-500 to-purple-500',
                  'text-white text-sm font-medium',
                  'hover:from-indigo-600 hover:to-purple-600',
                  'transition-all duration-200'
                )}
              >
                应用筛选
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/**
 * 分页组件
 */
function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) {
  const { page, totalPages } = pagination;

  if (totalPages <= 1) return null;

  // 生成页码数组
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const showPages = 5;
    const halfShow = Math.floor(showPages / 2);

    let start = Math.max(1, page - halfShow);
    let end = Math.min(totalPages, page + halfShow);

    if (page <= halfShow) {
      end = Math.min(totalPages, showPages);
    }
    if (page > totalPages - halfShow) {
      start = Math.max(1, totalPages - showPages + 1);
    }

    if (start > 1) {
      pages.push(1);
      if (start > 2) pages.push('ellipsis');
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages) {
      if (end < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      {/* 上一页 */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          'p-2 rounded-xl',
          'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
          'border border-white/20 dark:border-gray-700/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'hover:bg-white dark:hover:bg-gray-800',
          'transition-all duration-200'
        )}
      >
        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>

      {/* 页码 */}
      <div className="flex items-center gap-1">
        {getPageNumbers().map((pageNum, index) =>
          pageNum === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                'w-10 h-10 rounded-xl text-sm font-medium',
                'transition-all duration-200',
                pageNum === page
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'
                  : cn(
                      'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
                      'border border-white/20 dark:border-gray-700/30',
                      'text-gray-600 dark:text-gray-400',
                      'hover:bg-white dark:hover:bg-gray-800'
                    )
              )}
            >
              {pageNum}
            </button>
          )
        )}
      </div>

      {/* 下一页 */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={cn(
          'p-2 rounded-xl',
          'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
          'border border-white/20 dark:border-gray-700/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'hover:bg-white dark:hover:bg-gray-800',
          'transition-all duration-200'
        )}
      >
        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
    </div>
  );
}

/**
 * 空状态组件
 */
function EmptyState({ hasFilters, onResetFilters }: { hasFilters: boolean; onResetFilters: () => void }) {
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
          <History className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {hasFilters ? '没有找到匹配的记录' : '暂无赛季历史'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto mb-4">
        {hasFilters
          ? '尝试调整筛选条件查看更多记录'
          : '参与赛季活动后，您的历史记录将显示在这里'}
      </p>

      {hasFilters && (
        <button
          onClick={onResetFilters}
          className={cn(
            'px-4 py-2 rounded-xl',
            'bg-gradient-to-r from-indigo-500 to-purple-500',
            'text-white text-sm font-medium',
            'hover:from-indigo-600 hover:to-purple-600',
            'transition-all duration-200'
          )}
        >
          清除筛选
        </button>
      )}
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
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <X className="w-6 h-6 text-red-500" />
      </div>
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
      {Array.from({ length: 3 }).map((_, i) => (
        <SeasonHistoryCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * 活动筛选标签
 */
function ActiveFilters({
  filters,
  onRemoveFilter,
}: {
  filters: FilterState;
  onRemoveFilter: (key: keyof FilterState) => void;
}) {
  const hasFilters = filters.minTier || filters.startDate || filters.endDate;

  if (!hasFilters) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-gray-500 dark:text-gray-400">筛选:</span>
      
      {filters.minTier && (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
          )}
        >
          段位 ≥ {SEASON_TIER_NAMES[filters.minTier]}
          <button
            onClick={() => onRemoveFilter('minTier')}
            className="ml-1 hover:text-indigo-900 dark:hover:text-indigo-100"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      {filters.startDate && (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
          )}
        >
          从 {filters.startDate}
          <button
            onClick={() => onRemoveFilter('startDate')}
            className="ml-1 hover:text-purple-900 dark:hover:text-purple-100"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}

      {filters.endDate && (
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
            'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
          )}
        >
          至 {filters.endDate}
          <button
            onClick={() => onRemoveFilter('endDate')}
            className="ml-1 hover:text-pink-900 dark:hover:text-pink-100"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      )}
    </div>
  );
}

// ==================== 主页面内容组件 ====================

function HistoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 页面状态
  const [state, setState] = useState<HistoryPageState>({
    entries: [],
    pagination: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 },
    isLoading: true,
    error: null,
  });

  // 筛选状态
  const [filters, setFilters] = useState<FilterState>({
    minTier: (searchParams.get('minTier') as SeasonTier) || null,
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
  });

  // 筛选面板状态
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // 当前页码
  const currentPage = parseInt(searchParams.get('page') || '1', 10);

  // 检查是否有活动筛选
  const hasActiveFilters = useMemo(() => {
    return !!(filters.minTier || filters.startDate || filters.endDate);
  }, [filters]);

  // 加载数据
  const loadData = useCallback(async (page: number, filterState: FilterState) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // 模拟 API 延迟
      await new Promise((resolve) => setTimeout(resolve, 800));

      // 模拟历史数据
      const mockEntries: UserSeasonHistoryEntry[] = Array.from({ length: 15 }, (_, i) => {
        const seasonNumber = 15 - i;
        const year = 2024 - Math.floor(i / 4);
        const quarter = 4 - (i % 4);
        const quarterNames = ['冬季', '秋季', '夏季', '春季'];
        
        const tiers: SeasonTier[] = ['NOVICE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'KING'];
        const tierIndex = Math.min(tiers.length - 1, Math.floor(Math.random() * 6) + Math.floor(i / 3));
        const tier = tiers[tierIndex];

        return {
          season: {
            id: `season-${seasonNumber}`,
            name: `${year} ${quarterNames[quarter - 1]}赛季`,
            description: `第 ${seasonNumber} 赛季`,
            seasonNumber,
            status: 'SETTLED' as const,
            startDate: `${year}-${String((quarter - 1) * 3 + 1).padStart(2, '0')}-01T00:00:00Z`,
            endDate: `${year}-${String(quarter * 3).padStart(2, '0')}-${quarter === 1 || quarter === 4 ? '31' : '30'}T23:59:59Z`,
            durationDays: 90,
            createdAt: `${year}-01-01T00:00:00Z`,
            updatedAt: `${year}-01-01T00:00:00Z`,
          },
          rank: {
            id: `rank-${seasonNumber}`,
            userId: 'current-user',
            seasonId: `season-${seasonNumber}`,
            tier,
            points: Math.floor(Math.random() * 3000) + 500,
            previousTier: tierIndex > 0 ? tiers[tierIndex - 1] : null,
            peakTier: tier,
            peakPoints: Math.floor(Math.random() * 3500) + 500,
            updatedAt: new Date().toISOString(),
          },
          rankings: [
            { category: 'READING' as LeaderboardCategory, finalScore: Math.floor(Math.random() * 2000) + 200, finalRank: Math.floor(Math.random() * 100) + 1 },
            { category: 'CREATION' as LeaderboardCategory, finalScore: Math.floor(Math.random() * 1500) + 100, finalRank: Math.floor(Math.random() * 150) + 1 },
            { category: 'SOCIAL' as LeaderboardCategory, finalScore: Math.floor(Math.random() * 1000) + 50, finalRank: Math.floor(Math.random() * 200) + 1 },
            { category: 'OVERALL' as LeaderboardCategory, finalScore: Math.floor(Math.random() * 4000) + 500, finalRank: Math.floor(Math.random() * 80) + 1 },
          ],
          rewards: [
            { id: `reward-${seasonNumber}-1`, rewardType: 'TOKENS', description: `${tier} 段位代币奖励`, status: 'CLAIMED', claimedAt: new Date().toISOString() },
            { id: `reward-${seasonNumber}-2`, rewardType: 'BADGE', description: `${SEASON_TIER_NAMES[tier]}徽章`, status: 'CLAIMED', claimedAt: new Date().toISOString() },
          ],
        };
      });

      // 应用筛选
      let filteredEntries = mockEntries;

      if (filterState.minTier) {
        const minTierIndex = ALL_TIERS.indexOf(filterState.minTier);
        filteredEntries = filteredEntries.filter((entry) => {
          const entryTierIndex = ALL_TIERS.indexOf(entry.rank.tier);
          return entryTierIndex >= minTierIndex;
        });
      }

      if (filterState.startDate) {
        const startDate = new Date(filterState.startDate);
        filteredEntries = filteredEntries.filter((entry) => {
          return new Date(entry.season.endDate) >= startDate;
        });
      }

      if (filterState.endDate) {
        const endDate = new Date(filterState.endDate);
        filteredEntries = filteredEntries.filter((entry) => {
          return new Date(entry.season.startDate) <= endDate;
        });
      }

      // 分页
      const total = filteredEntries.length;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      const startIndex = (page - 1) * PAGE_SIZE;
      const paginatedEntries = filteredEntries.slice(startIndex, startIndex + PAGE_SIZE);

      setState({
        entries: paginatedEntries,
        pagination: { page, limit: PAGE_SIZE, total, totalPages },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: '加载赛季历史失败，请稍后重试',
      }));
    }
  }, []);

  // 初始加载
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadData(currentPage, filters);
    }
  }, [authLoading, isAuthenticated, currentPage, filters, loadData]);

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/season/history');
    }
  }, [authLoading, isAuthenticated, router]);

  // 更新 URL 参数
  const updateUrlParams = useCallback((newPage: number, newFilters: FilterState) => {
    const params = new URLSearchParams();
    if (newPage > 1) params.set('page', String(newPage));
    if (newFilters.minTier) params.set('minTier', newFilters.minTier);
    if (newFilters.startDate) params.set('startDate', newFilters.startDate);
    if (newFilters.endDate) params.set('endDate', newFilters.endDate);
    
    const queryString = params.toString();
    router.push(`/season/history${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [router]);

  // 处理页码变化
  const handlePageChange = useCallback((page: number) => {
    updateUrlParams(page, filters);
  }, [filters, updateUrlParams]);

  // 处理筛选应用
  const handleApplyFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    updateUrlParams(1, newFilters);
  }, [updateUrlParams]);

  // 处理筛选重置
  const handleResetFilters = useCallback(() => {
    const resetFilters: FilterState = { minTier: null, startDate: '', endDate: '' };
    setFilters(resetFilters);
    updateUrlParams(1, resetFilters);
  }, [updateUrlParams]);

  // 处理移除单个筛选
  const handleRemoveFilter = useCallback((key: keyof FilterState) => {
    const newFilters = { ...filters, [key]: key === 'minTier' ? null : '' };
    setFilters(newFilters);
    updateUrlParams(1, newFilters);
  }, [filters, updateUrlParams]);

  // 返回赛季中心
  const handleBack = useCallback(() => {
    router.push('/season');
  }, [router]);

  // 查看赛季详情
  const handleViewDetails = useCallback((seasonId: string) => {
    router.push(`/season?seasonId=${seasonId}`);
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
    <div className="max-w-4xl mx-auto pb-8">
      {/* 页面头部 */}
      <PageHeader
        totalSeasons={state.pagination.total}
        onBack={handleBack}
      />

      {/* 筛选按钮和活动筛选标签 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            历史记录
          </h2>
          <button
            onClick={() => setIsFilterOpen(true)}
            className={cn(
              'inline-flex items-center gap-2 px-3 py-2 rounded-xl',
              'bg-white/60 dark:bg-gray-900/60 backdrop-blur-md',
              'border border-white/20 dark:border-gray-700/30',
              'text-sm font-medium text-gray-600 dark:text-gray-400',
              'hover:bg-white dark:hover:bg-gray-800',
              'transition-all duration-200',
              hasActiveFilters && 'ring-2 ring-indigo-500'
            )}
          >
            <Filter className="w-4 h-4" />
            <span>筛选</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
            )}
          </button>
        </div>

        <ActiveFilters filters={filters} onRemoveFilter={handleRemoveFilter} />
      </div>

      {/* 错误状态 */}
      {state.error && (
        <ErrorState message={state.error} onRetry={() => loadData(currentPage, filters)} />
      )}

      {/* 加载状态 */}
      {state.isLoading && <LoadingSkeleton />}

      {/* 空状态 */}
      {!state.isLoading && !state.error && state.entries.length === 0 && (
        <EmptyState hasFilters={hasActiveFilters} onResetFilters={handleResetFilters} />
      )}

      {/* 历史记录列表 */}
      {!state.isLoading && !state.error && state.entries.length > 0 && (
        <div className="space-y-4">
          {state.entries.map((entry, index) => (
            <motion.div
              key={entry.season.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <SeasonHistoryCard
                entry={entry}
                defaultExpanded={index === 0}
                onViewDetails={handleViewDetails}
              />
            </motion.div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {!state.isLoading && !state.error && state.entries.length > 0 && (
        <PaginationControls
          pagination={state.pagination}
          onPageChange={handlePageChange}
        />
      )}

      {/* 筛选面板 */}
      <FilterPanel
        filters={filters}
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      />
    </div>
  );
}

// ==================== 主页面组件 ====================

export default function SeasonHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      }
    >
      <HistoryPageContent />
    </Suspense>
  );
}
