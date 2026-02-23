'use client';

import { cn } from '@/utils/cn';
import { AlertSeverity, ALERT_SEVERITY_LABELS } from '@/types/risk-control';

/**
 * 告警严重程度徽章组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.1: 风控告警列表 - 严重程度徽章
 *
 * 颜色编码:
 * - CRITICAL: 红色
 * - HIGH: 橙色
 * - MEDIUM: 黄色
 * - LOW: 灰色
 */
interface SeverityBadgeProps {
  severity: AlertSeverity;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SeverityBadge({ severity, size = 'md', className }: SeverityBadgeProps) {
  const severityStyles: Record<AlertSeverity, string> = {
    [AlertSeverity.CRITICAL]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    [AlertSeverity.HIGH]: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    [AlertSeverity.MEDIUM]: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    [AlertSeverity.LOW]: 'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200 dark:border-gray-700',
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
        severityStyles[severity],
        sizeStyles[size],
        className
      )}
    >
      {ALERT_SEVERITY_LABELS[severity]}
    </span>
  );
}
