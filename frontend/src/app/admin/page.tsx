'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Coins,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { adminService, type StatisticsOverview } from '@/services/admin';

/**
 * 管理后台数据看板
 *
 * 需求18: 管理后台
 * 任务18.2.2: 数据看板页面
 *
 * 显示 DAU/MAU、用户增长、内容统计、交易统计
 */

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isUp: boolean };
  color: 'indigo' | 'green' | 'amber' | 'purple' | 'blue' | 'pink';
  delay?: number;
}

const colorClasses = {
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-900/20',
    icon: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    text: 'text-green-600 dark:text-green-400',
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
    text: 'text-purple-600 dark:text-purple-400',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400',
    text: 'text-blue-600 dark:text-blue-400',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-900/20',
    icon: 'bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400',
    text: 'text-pink-600 dark:text-pink-400',
  },
};

function StatCard({ title, value, subtitle, icon, trend, color, delay = 0 }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className={cn(
        'p-5 rounded-2xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        'hover:shadow-lg transition-shadow'
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('p-2.5 rounded-xl', colors.icon)}>{icon}</div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              trend.isUp
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            )}
          >
            {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend.value}%
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
      </div>
    </motion.div>
  );
}

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<StatisticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await adminService.getStatisticsOverview();
      setOverview(data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
            <LayoutDashboard className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">数据看板</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">平台运营数据概览</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            'p-2 rounded-xl',
            'bg-white/60 dark:bg-gray-800/60',
            'backdrop-blur-md border border-white/20 dark:border-gray-700/30',
            'hover:bg-white/80 dark:hover:bg-gray-800/80',
            'transition-colors disabled:opacity-50'
          )}
        >
          <RefreshCw className={cn('w-5 h-5 text-gray-600 dark:text-gray-400', isRefreshing && 'animate-spin')} />
        </button>
      </div>

      {/* 用户统计 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          用户统计
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="总用户数"
            value={overview?.totalUsers || 0}
            icon={<Users className="w-5 h-5" />}
            color="indigo"
            delay={0}
          />
          <StatCard
            title="日活跃用户 (DAU)"
            value={overview?.dau || 0}
            icon={<Activity className="w-5 h-5" />}
            color="green"
            delay={1}
          />
          <StatCard
            title="月活跃用户 (MAU)"
            value={overview?.mau || 0}
            icon={<Activity className="w-5 h-5" />}
            color="blue"
            delay={2}
          />
          <StatCard
            title="今日新增"
            value={overview?.newUsersToday || 0}
            subtitle={`本周: ${overview?.newUsersThisWeek || 0} | 本月: ${overview?.newUsersThisMonth || 0}`}
            icon={<TrendingUp className="w-5 h-5" />}
            color="purple"
            delay={3}
          />
        </div>
      </section>

      {/* 内容统计 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-500" />
          内容统计
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="总作品数"
            value={overview?.totalWorks || 0}
            icon={<BookOpen className="w-5 h-5" />}
            color="amber"
            delay={4}
          />
          <StatCard
            title="总章节数"
            value={overview?.totalChapters || 0}
            icon={<BookOpen className="w-5 h-5" />}
            color="pink"
            delay={5}
          />
          <StatCard
            title="今日发布作品"
            value={overview?.publishedWorksToday || 0}
            icon={<TrendingUp className="w-5 h-5" />}
            color="green"
            delay={6}
          />
          <StatCard
            title="今日发布章节"
            value={overview?.publishedChaptersToday || 0}
            icon={<TrendingUp className="w-5 h-5" />}
            color="blue"
            delay={7}
          />
        </div>
      </section>

      {/* 交易统计 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Coins className="w-5 h-5 text-green-500" />
          交易统计
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="总交易数"
            value={overview?.totalTransactions || 0}
            subtitle={`今日: ${overview?.transactionsToday || 0}`}
            icon={<Coins className="w-5 h-5" />}
            color="green"
            delay={8}
          />
          <StatCard
            title="代币流通量"
            value={overview?.totalTokensCirculated || 0}
            icon={<Coins className="w-5 h-5" />}
            color="amber"
            delay={9}
          />
          <StatCard
            title="活动统计"
            value={`${overview?.activeActivities || 0} 进行中`}
            subtitle={`${overview?.pendingActivities || 0} 待审核`}
            icon={<Calendar className="w-5 h-5" />}
            color="purple"
            delay={10}
          />
        </div>
      </section>
    </div>
  );
}
