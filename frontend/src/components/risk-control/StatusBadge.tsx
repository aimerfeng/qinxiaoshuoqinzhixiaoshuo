'use client';

import { cn } from '@/utils/cn';
import { AlertStatus, ALERT_STATUS_LABELS } from '@/types/risk-control';

/**
 * 告警状态徽章组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.1: 风控告警列表 - 状态徽章
 *
 * 颜色编码:
 * - PENDING: 蓝色
 * - INVESTIGATING: 紫色
 * - RESOLVED: 绿色
 * - DISMISSED: 灰色
 */
interface StatusBadgeProps {
  status: AlertStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const statusStyles: Record<AlertStatus, string> = {
    [AlertStatus.PENDING]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    [AlertStatus.INVESTIGATING]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    [AlertStatus.RESOLVED]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
    [AlertStatus.DISMISSED]: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700',
  };

  const sizeStyles = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border',
        statusStyles[status],
        sizeStyles[size],
        className
      )}
    >
      {ALERT_STATUS_LABELS[status]}
    </span>
  );
}
