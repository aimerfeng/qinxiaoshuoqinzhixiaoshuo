'use client';

import { motion } from 'motion/react';
import { AlertTriangle, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AlertStats } from '@/types/risk-control';

/**
 * 告警统计卡片组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.1: 风控告警列表 - 统计展示
 *
 * 显示告警统计数据：总数、各状态数量、严重程度分布等
 */
interface AlertStatsCardProps {
  stats: AlertStats | null;
  isLoading: boolean;
  className?: string;
}

export function AlertStatsCard({ stats, isLoading, className }: AlertStatsCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'grid grid-cols-2 md:grid-cols-4 gap-4',
          className
        )}
      >
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={cn(
              'p-4 rounded-xl',
              'bg-white/60 dark:bg-gray-900/60',
              'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
              'animate-pulse'
            )}
          >
            <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
            <div className="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statItems = [
    {
      label: '待处理',
      value: stats.byStatus.pending,
      icon: AlertTriangle,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: '调查中',
      value: stats.byStatus.investigating,
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: '已解决',
      value: stats.byStatus.resolved,
      icon: CheckCircle,
      color: 'text-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: '24小时内',
      value: stats.last24Hours,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 md:grid-cols-4 gap-4', className)}>
      {statItems.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className={cn(
            'p-4 rounded-xl',
            'bg-white/60 dark:bg-gray-900/60',
            'backdrop-blur-xl border border-white/20 dark:border-gray-700/30'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('p-1.5 rounded-lg', item.bgColor)}>
              <item.icon className={cn('w-4 h-4', item.color)} />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">{item.label}</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {item.value}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/**
 * 严重程度分布卡片
 */
interface SeverityDistributionProps {
  stats: AlertStats | null;
  isLoading: boolean;
  className?: string;
}

export function SeverityDistribution({ stats, isLoading, className }: SeverityDistributionProps) {
  if (isLoading || !stats) {
    return null;
  }

  const severityItems = [
    { label: '紧急', value: stats.bySeverity.critical, color: 'bg-red-500' },
    { label: '高', value: stats.bySeverity.high, color: 'bg-orange-500' },
    { label: '中', value: stats.bySeverity.medium, color: 'bg-yellow-500' },
    { label: '低', value: stats.bySeverity.low, color: 'bg-gray-400' },
  ];

  const total = severityItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={cn(
        'p-4 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        严重程度分布
      </h3>
      
      {/* 进度条 */}
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden flex mb-3">
        {severityItems.map((item) => (
          <div
            key={item.label}
            className={cn('h-full', item.color)}
            style={{ width: total > 0 ? `${(item.value / total) * 100}%` : '0%' }}
          />
        ))}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-4">
        {severityItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div className={cn('w-3 h-3 rounded-full', item.color)} />
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {item.label}: {item.value}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
