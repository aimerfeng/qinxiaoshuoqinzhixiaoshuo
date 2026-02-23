'use client';

import { Filter, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  AlertType,
  AlertSeverity,
  AlertStatus,
  ALERT_TYPE_LABELS,
  ALERT_SEVERITY_LABELS,
  ALERT_STATUS_LABELS,
  type AlertFilters as AlertFiltersType,
} from '@/types/risk-control';

/**
 * 告警过滤器组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.1: 风控告警列表 - 过滤控件
 *
 * 支持按类型、严重程度、状态过滤
 */
interface AlertFiltersProps {
  filters: AlertFiltersType;
  onFiltersChange: (filters: AlertFiltersType) => void;
  className?: string;
}

export function AlertFilters({ filters, onFiltersChange, className }: AlertFiltersProps) {
  const handleTypeChange = (type: AlertType | '') => {
    onFiltersChange({
      ...filters,
      type: type || undefined,
      offset: 0, // Reset pagination when filter changes
    });
  };

  const handleSeverityChange = (severity: AlertSeverity | '') => {
    onFiltersChange({
      ...filters,
      severity: severity || undefined,
      offset: 0,
    });
  };

  const handleStatusChange = (status: AlertStatus | '') => {
    onFiltersChange({
      ...filters,
      status: status || undefined,
      offset: 0,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      limit: filters.limit,
      offset: 0,
    });
  };

  const hasActiveFilters = filters.type || filters.severity || filters.status;

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 p-4',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        'rounded-xl',
        className
      )}
    >
      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
        <Filter className="w-4 h-4" />
        <span className="text-sm font-medium">筛选</span>
      </div>

      {/* 类型过滤 */}
      <select
        value={filters.type || ''}
        onChange={(e) => handleTypeChange(e.target.value as AlertType | '')}
        className={cn(
          'px-3 py-1.5 text-sm rounded-lg',
          'bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'text-gray-700 dark:text-gray-300',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
        )}
      >
        <option value="">全部类型</option>
        {Object.entries(ALERT_TYPE_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* 严重程度过滤 */}
      <select
        value={filters.severity || ''}
        onChange={(e) => handleSeverityChange(e.target.value as AlertSeverity | '')}
        className={cn(
          'px-3 py-1.5 text-sm rounded-lg',
          'bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'text-gray-700 dark:text-gray-300',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
        )}
      >
        <option value="">全部级别</option>
        {Object.entries(ALERT_SEVERITY_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* 状态过滤 */}
      <select
        value={filters.status || ''}
        onChange={(e) => handleStatusChange(e.target.value as AlertStatus | '')}
        className={cn(
          'px-3 py-1.5 text-sm rounded-lg',
          'bg-white dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'text-gray-700 dark:text-gray-300',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50'
        )}
      >
        <option value="">全部状态</option>
        {Object.entries(ALERT_STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      {/* 清除过滤 */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className={cn(
            'flex items-center gap-1 px-2 py-1 text-sm',
            'text-gray-500 dark:text-gray-400',
            'hover:text-gray-700 dark:hover:text-gray-200',
            'transition-colors'
          )}
        >
          <X className="w-3 h-3" />
          清除
        </button>
      )}
    </div>
  );
}
