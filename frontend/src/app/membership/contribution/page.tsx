'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Calendar,
  History,
  Info,
} from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/auth';
import { membershipService } from '@/services/membership';
import { MemberLevelBadge } from '@/components/membership/MemberLevelBadge';
import { ContributionProgressBar } from '@/components/membership/ContributionProgressBar';
import { DailyContributionCard } from '@/components/membership/DailyContributionCard';
import { ContributionHistoryItem } from '@/components/membership/ContributionHistoryItem';
import { getLevelByScore } from '@/types/membership';
import type {
  UserContribution,
  DailyContributionItem,
  ContributionRecord,
  Pagination,
  ContributionConfigItem,
} from '@/types/membership';

/**
 * 贡献度明细页面
 *
 * 需求14: 会员等级体系
 * 任务14.2.3: 贡献度明细页面
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export default function ContributionPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 数据状态
  const [contribution, setContribution] = useState<UserContribution | null>(null);
  const [dailyContributions, setDailyContributions] = useState<DailyContributionItem[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [historyRecords, setHistoryRecords] = useState<ContributionRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [configs, setConfigs] = useState<ContributionConfigItem[]>([]);

  // 加载状态
  const [isLoadingContribution, setIsLoadingContribution] = useState(true);
  const [isLoadingDaily, setIsLoadingDaily] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // 当前页码
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // 加载总贡献度
  const loadContribution = useCallback(async () => {
    setIsLoadingContribution(true);
    try {
      const response = await membershipService.getContribution();
      setContribution(response.data);
    } catch (error) {
      console.error('Failed to load contribution:', error);
    } finally {
      setIsLoadingContribution(false);
    }
  }, []);

  // 加载今日贡献度
  const loadDailyContribution = useCallback(async () => {
    setIsLoadingDaily(true);
    try {
      const response = await membershipService.getDailyContribution();
      setDailyContributions(response.data.contributions);
      setTodayTotal(response.data.totalEarnedToday);
    } catch (error) {
      console.error('Failed to load daily contribution:', error);
    } finally {
      setIsLoadingDaily(false);
    }
  }, []);

  // 加载贡献度历史
  const loadHistory = useCallback(async (page: number) => {
    setIsLoadingHistory(true);
    try {
      const response = await membershipService.getContributionHistory({
        page,
        pageSize,
      });
      setHistoryRecords(response.data.records);
      setPagination(response.data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  // 加载贡献度配置
  const loadConfigs = useCallback(async () => {
    try {
      const response = await membershipService.getContributionConfig();
      setConfigs(response.data.configs);
    } catch (error) {
      console.error('Failed to load configs:', error);
    }
  }, []);

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/membership/contribution');
    }
  }, [authLoading, isAuthenticated, router]);

  // 加载数据
  useEffect(() => {
    if (isAuthenticated) {
      loadContribution();
      loadDailyContribution();
      loadHistory(1);
      loadConfigs();
    }
  }, [isAuthenticated, loadContribution, loadDailyContribution, loadHistory, loadConfigs]);

  // 翻页
  const handlePageChange = (page: number) => {
    if (page >= 1 && pagination && page <= pagination.totalPages) {
      loadHistory(page);
      // 滚动到历史记录区域
      document.getElementById('history-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const level = contribution ? getLevelByScore(contribution.totalScore) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              贡献度明细
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              查看您的贡献度详情和历史记录
            </p>
          </div>
        </motion.div>

        {/* 等级和总贡献度卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          {isLoadingContribution ? (
            <div className="h-40 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : contribution && level ? (
            <div className="p-5 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 shadow-lg">
              {/* 等级徽章和总分 */}
              <div className="flex items-center justify-between mb-4">
                <MemberLevelBadge
                  level={level}
                  score={contribution.totalScore}
                  showScore
                  size="lg"
                  variant="glass"
                />
                <div className="text-right">
                  <div className="text-sm text-gray-500 dark:text-gray-400">今日获得</div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                    +{todayTotal}
                  </div>
                </div>
              </div>

              {/* 进度条 */}
              <ContributionProgressBar
                score={contribution.totalScore}
                size="md"
                variant="minimal"
              />

              {/* 分类汇总 */}
              <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                <div className="text-center">
                  <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                    {contribution.breakdown.reading}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">阅读</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                    {contribution.breakdown.interaction}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">互动</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                    {contribution.breakdown.creation}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">创作</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {contribution.breakdown.community}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">社区</div>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>

        {/* 今日贡献度明细 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              今日贡献
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {format(new Date(), 'MM月dd日', { locale: zhCN })}
            </span>
          </div>

          {isLoadingDaily ? (
            <div className="h-32 rounded-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            </div>
          ) : dailyContributions.length > 0 ? (
            <div className="grid gap-3">
              {dailyContributions.map((item, index) => (
                <DailyContributionCard
                  key={item.type}
                  item={item}
                  index={index}
                />
              ))}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md text-center text-gray-500 dark:text-gray-400">
              <TrendingUp className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
              <p>今日暂无贡献记录</p>
              <p className="text-sm mt-1">去阅读、评论或创作来获取贡献度吧！</p>
            </div>
          )}
        </motion.div>

        {/* 贡献度历史记录 */}
        <motion.div
          id="history-section"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <History className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              历史记录
            </h2>
            {pagination && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                共 {pagination.total} 条
              </span>
            )}
          </div>

          <div className="rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
            {isLoadingHistory ? (
              <div className="h-48 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              </div>
            ) : historyRecords.length > 0 ? (
              <>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {historyRecords.map((record, index) => (
                    <ContributionHistoryItem
                      key={record.id}
                      record={record}
                      index={index}
                    />
                  ))}
                </div>

                {/* 分页 */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        currentPage <= 1
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={cn(
                              'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                              currentPage === pageNum
                                ? 'bg-indigo-500 text-white'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= pagination.totalPages}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        currentPage >= pagination.totalPages
                          ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <History className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>暂无历史记录</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* 贡献度规则说明 */}
        {configs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                贡献度规则
              </h2>
            </div>

            <div className="rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {configs.map((config) => (
                  <div
                    key={config.type}
                    className="flex items-center justify-between p-3"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {config.typeName}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {config.description}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-indigo-600 dark:text-indigo-400">
                        +{config.points}
                      </div>
                      {config.dailyLimit && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          每日上限 {config.dailyLimit}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
