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
import { cn } from '@/utils/cn';
import type { AlertsBySeverityStats } from '@/types/risk-control';

/**
 * 告警严重程度柱状图组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.4: 风控报告页面 - 严重程度分布图
 */
interface SeverityBarChartProps {
  data: AlertsBySeverityStats[];
  isLoading?: boolean;
  className?: string;
}

const SEVERITY_COLORS = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#EAB308',
  LOW: '#9CA3AF',
};

export function SeverityBarChart({
  data,
  isLoading,
  className,
}: SeverityBarChartProps) {
  if (isLoading) {
    return <SeverityBarChartSkeleton className={className} />;
  }

  const chartData = data.map((item) => ({
    name: item.label,
    value: item.count,
    severity: item.severity,
    percentage: item.percentage,
  }));

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className={cn(
        'p-5 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        严重程度分布
      </h3>

      {total === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-gray-400">
          暂无数据
        </div>
      ) : (
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#E5E7EB"
                className="dark:stroke-gray-700"
                vertical={false}
              />
              <XAxis
                dataKey="name"
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
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          占比: {data.percentage.toFixed(1)}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={SEVERITY_COLORS[entry.severity as keyof typeof SEVERITY_COLORS] || '#6366F1'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 图例 */}
      <div className="mt-4 flex flex-wrap gap-4">
        {data.map((item) => (
          <div key={item.severity} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{
                backgroundColor:
                  SEVERITY_COLORS[item.severity as keyof typeof SEVERITY_COLORS] || '#6366F1',
              }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {item.label}: {item.count} ({item.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SeverityBarChartSkeleton({ className }: { className?: string }) {
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
      <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-[200px] flex items-end gap-4 px-4">
        {[...Array(4)].map((_, i) => (
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
