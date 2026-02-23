'use client';

import { motion } from 'motion/react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Gavel, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { PunishmentStats } from '@/types/risk-control';

/**
 * 惩罚统计图表组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.4: 风控报告页面 - 惩罚统计
 */
interface PunishmentStatsChartProps {
  stats: PunishmentStats | null;
  isLoading?: boolean;
  className?: string;
}

const COLORS = {
  WARNING: '#F59E0B',
  MUTE: '#8B5CF6',
  FEATURE_RESTRICT: '#3B82F6',
  ACCOUNT_FREEZE: '#EC4899',
  ACCOUNT_BAN: '#EF4444',
};

export function PunishmentStatsChart({
  stats,
  isLoading,
  className,
}: PunishmentStatsChartProps) {
  if (isLoading) {
    return <PunishmentStatsChartSkeleton className={className} />;
  }

  if (!stats) {
    return null;
  }

  const chartData = stats.byType.map((item) => ({
    name: item.label,
    value: item.count,
    type: item.type,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className={cn(
        'p-5 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
          <Gavel className="w-4 h-4 text-indigo-500" />
          惩罚统计
        </h3>
      </div>

      {/* 概览统计 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400">总惩罚</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {stats.totalCount}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-1 mb-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <p className="text-xs text-gray-500 dark:text-gray-400">生效中</p>
          </div>
          <p className="text-lg font-bold text-green-600 dark:text-green-400">
            {stats.activeCount}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-1 mb-1">
            <XCircle className="w-3 h-3 text-gray-400" />
            <p className="text-xs text-gray-500 dark:text-gray-400">已过期</p>
          </div>
          <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
            {stats.expiredCount}
          </p>
        </div>
      </div>

      {/* 柱状图 */}
      {chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-400">
          暂无数据
        </div>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB"
                className="dark:stroke-gray-700"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                width={80}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {data.name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          数量: {data.value}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[entry.type as keyof typeof COLORS] || '#6366F1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 有效性指标 */}
      <div className="mt-4 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            惩罚有效率
          </span>
          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
            {stats.effectivenessRate.toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          惩罚后无再犯用户比例
        </p>
      </div>
    </motion.div>
  );
}

function PunishmentStatsChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        'animate-pulse',
        className
      )}
    >
      <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        ))}
      </div>
      <div className="h-[200px] bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}
