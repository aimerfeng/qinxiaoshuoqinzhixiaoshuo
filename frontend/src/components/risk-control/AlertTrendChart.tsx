'use client';

import { motion } from 'motion/react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/utils/cn';
import type { TrendDataPoint } from '@/types/risk-control';

/**
 * 告警趋势折线图组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.4: 风控报告页面 - 告警趋势图
 */
interface AlertTrendChartProps {
  data: TrendDataPoint[];
  isLoading?: boolean;
  className?: string;
  showResolved?: boolean;
}

export function AlertTrendChart({
  data,
  isLoading,
  className,
  showResolved = true,
}: AlertTrendChartProps) {
  if (isLoading) {
    return <AlertTrendChartSkeleton className={className} />;
  }

  const chartData = data.map((item) => ({
    date: formatDate(item.date),
    总数: item.count,
    已解决: item.resolved || 0,
    待处理: item.pending || 0,
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        'p-5 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        告警趋势
      </h3>

      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-gray-400">
          暂无数据
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                          {label}
                        </p>
                        {payload.map((entry, index) => (
                          <p
                            key={index}
                            className="text-sm"
                            style={{ color: entry.color }}
                          >
                            {entry.name}: {entry.value}
                          </p>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {value}
                  </span>
                )}
              />
              <Line
                type="monotone"
                dataKey="总数"
                stroke="#6366F1"
                strokeWidth={2}
                dot={{ fill: '#6366F1', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              {showResolved && (
                <>
                  <Line
                    type="monotone"
                    dataKey="已解决"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="待处理"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </>
              )}
            </LineChart>
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

function AlertTrendChartSkeleton({ className }: { className?: string }) {
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
      <div className="h-[300px] flex items-end gap-2 px-4">
        {[...Array(7)].map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-t"
            style={{ height: `${Math.random() * 60 + 40}%` }}
          />
        ))}
      </div>
    </div>
  );
}
