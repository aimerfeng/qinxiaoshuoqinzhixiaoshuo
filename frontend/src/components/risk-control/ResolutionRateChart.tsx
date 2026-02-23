'use client';

import { motion } from 'motion/react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/utils/cn';
import type { ResolutionRateTrendPoint } from '@/types/risk-control';

/**
 * 解决率趋势图组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.4: 风控报告页面 - 解决率趋势
 */
interface ResolutionRateChartProps {
  data: ResolutionRateTrendPoint[];
  isLoading?: boolean;
  className?: string;
}

export function ResolutionRateChart({
  data,
  isLoading,
  className,
}: ResolutionRateChartProps) {
  if (isLoading) {
    return <ResolutionRateChartSkeleton className={className} />;
  }

  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    rate: item.rate,
    resolved: item.resolved,
    total: item.total,
  }));

  // 计算平均解决率
  const avgRate =
    data.length > 0
      ? data.reduce((sum, item) => sum + item.rate, 0) / data.length
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn(
        'p-5 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          解决率趋势
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">平均:</span>
          <span className="text-sm font-bold text-green-600 dark:text-green-400">
            {avgRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-400">
          暂无数据
        </div>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB"
                className="dark:stroke-gray-700"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fontSize: 12, fill: '#9CA3AF' }}
                tickLine={false}
                axisLine={{ stroke: '#E5E7EB' }}
                domain={[0, 100]}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {label}
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          解决率: {data.rate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          已解决: {data.resolved} / 总数: {data.total}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#colorRate)"
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </motion.div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function ResolutionRateChartSkeleton({ className }: { className?: string }) {
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
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
      <div className="h-[200px] bg-gray-200 dark:bg-gray-700 rounded" />
    </div>
  );
}
