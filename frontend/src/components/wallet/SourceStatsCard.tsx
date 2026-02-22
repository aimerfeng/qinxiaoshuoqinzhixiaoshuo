'use client';

import { motion } from 'motion/react';
import { PieChart, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  TRANSACTION_TYPE_ICONS,
  TRANSACTION_TYPE_COLORS,
  type SourceStatItem,
} from '@/types/wallet';

/**
 * 来源统计卡片组件
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.1: 钱包页面 - 来源统计
 *
 * 需求15验收标准5: WHEN 用户查看零芥子钱包 THEN System SHALL 显示余额、收支明细、来源统计
 */
interface SourceStatsCardProps {
  stats: SourceStatItem[];
  className?: string;
}

export function SourceStatsCard({ stats, className }: SourceStatsCardProps) {
  if (stats.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          'p-5 rounded-2xl',
          'bg-white/60 dark:bg-gray-900/60',
          'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">来源统计</h3>
        </div>
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <PieChart className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>暂无交易记录</p>
        </div>
      </motion.div>
    );
  }

  // 计算总收入和总支出
  const totalIncome = stats
    .filter((s) => s.totalAmount > 0)
    .reduce((sum, s) => sum + s.totalAmount, 0);
  const totalExpense = stats
    .filter((s) => s.totalAmount < 0)
    .reduce((sum, s) => sum + Math.abs(s.totalAmount), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        'p-5 rounded-2xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        <PieChart className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">来源统计</h3>
      </div>

      {/* 收支汇总 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-700 dark:text-green-300">总收入</span>
          </div>
          <div className="text-xl font-bold text-green-600 dark:text-green-400">
            +{totalIncome.toLocaleString()}
          </div>
        </div>
        <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">总支出</span>
          </div>
          <div className="text-xl font-bold text-red-600 dark:text-red-400">
            -{totalExpense.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 分类明细 */}
      <div className="space-y-2">
        {stats.map((stat, index) => {
          const colors = TRANSACTION_TYPE_COLORS[stat.type];
          const icon = TRANSACTION_TYPE_ICONS[stat.type];
          const isIncome = stat.totalAmount > 0;

          return (
            <motion.div
              key={stat.type}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', colors.bg)}>
                  <span className="text-lg">{icon}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {stat.typeName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {stat.count} 笔交易
                  </div>
                </div>
              </div>
              <div
                className={cn(
                  'font-semibold',
                  isIncome
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                )}
              >
                {isIncome ? '+' : ''}
                {stat.totalAmount.toLocaleString()}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
