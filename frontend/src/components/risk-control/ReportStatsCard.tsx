'use client';

import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 报告统计卡片组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.4: 风控报告页面 - 统计卡片
 */
interface ReportStatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  className?: string;
  delay?: number;
}

export function ReportStatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-indigo-500',
  iconBgColor = 'bg-indigo-50 dark:bg-indigo-900/20',
  trend,
  className,
  delay = 0,
}: ReportStatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(
        'p-5 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        'hover:shadow-lg transition-shadow duration-200',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-green-500' : 'text-red-500'
                )}
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              {trend.label && (
                <span className="text-xs text-gray-400">{trend.label}</span>
              )}
            </div>
          )}
        </div>
        <div className={cn('p-2.5 rounded-xl', iconBgColor)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 统计卡片骨架屏
 */
export function ReportStatsCardSkeleton({ className }: { className?: string }) {
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
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
          <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    </div>
  );
}
