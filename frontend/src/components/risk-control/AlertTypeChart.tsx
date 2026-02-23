'use client';

import { motion } from 'motion/react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { cn } from '@/utils/cn';
import type { AlertsByTypeStats } from '@/types/risk-control';

/**
 * 告警类型饼图组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.4: 风控报告页面 - 告警类型分布图
 */
interface AlertTypeChartProps {
  data: AlertsByTypeStats[];
  isLoading?: boolean;
  className?: string;
}

const COLORS = [
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
];

export function AlertTypeChart({ data, isLoading, className }: AlertTypeChartProps) {
  if (isLoading) {
    return <AlertTypeChartSkeleton className={className} />;
  }

  const chartData = data.map((item) => ({
    name: item.label,
    value: item.count,
    percentage: item.percentage,
  }));

  const total = data.reduce((sum, item) => sum + item.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn(
        'p-5 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        告警类型分布
      </h3>

      {total === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-gray-400">
          暂无数据
        </div>
      ) : (
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </Pie>
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
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value) => (
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {value}
                  </span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 图例详情 */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.type} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-400 truncate">
              {item.label}: {item.count}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AlertTypeChartSkeleton({ className }: { className?: string }) {
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
      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      <div className="h-[250px] flex items-center justify-center">
        <div className="w-40 h-40 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  );
}
