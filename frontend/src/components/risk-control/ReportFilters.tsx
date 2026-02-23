'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, ChevronDown, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { TimeRange, TimeRangeConfig } from '@/types/risk-control';
import { TIME_RANGE_LABELS } from '@/types/risk-control';

/**
 * 报告过滤器组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.4: 风控报告页面 - 时间范围和过滤控件
 */
interface ReportFiltersProps {
  timeRange: TimeRangeConfig;
  onTimeRangeChange: (config: TimeRangeConfig) => void;
  className?: string;
}

export function ReportFilters({
  timeRange,
  onTimeRangeChange,
  className,
}: ReportFiltersProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState(timeRange.startDate || '');
  const [customEnd, setCustomEnd] = useState(timeRange.endDate || '');

  const handleRangeSelect = (range: TimeRange) => {
    if (range === 'custom') {
      setShowCustomPicker(true);
      setIsDropdownOpen(false);
    } else {
      onTimeRangeChange({ range });
      setIsDropdownOpen(false);
      setShowCustomPicker(false);
    }
  };

  const handleCustomApply = () => {
    if (customStart && customEnd) {
      onTimeRangeChange({
        range: 'custom',
        startDate: customStart,
        endDate: customEnd,
      });
      setShowCustomPicker(false);
    }
  };

  const handleCustomCancel = () => {
    setShowCustomPicker(false);
    setCustomStart(timeRange.startDate || '');
    setCustomEnd(timeRange.endDate || '');
  };

  const getDisplayLabel = () => {
    if (timeRange.range === 'custom' && timeRange.startDate && timeRange.endDate) {
      return `${formatDate(timeRange.startDate)} - ${formatDate(timeRange.endDate)}`;
    }
    return TIME_RANGE_LABELS[timeRange.range];
  };

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* 时间范围选择器 */}
      <div className="relative">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'bg-white/60 dark:bg-gray-900/60',
            'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
            'hover:bg-white/80 dark:hover:bg-gray-800/80',
            'transition-colors text-sm font-medium',
            'text-gray-700 dark:text-gray-300'
          )}
        >
          <Calendar className="w-4 h-4" />
          <span>{getDisplayLabel()}</span>
          <ChevronDown
            className={cn(
              'w-4 h-4 transition-transform',
              isDropdownOpen && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                'absolute top-full left-0 mt-2 z-50',
                'min-w-[160px] py-1 rounded-lg',
                'bg-white dark:bg-gray-800',
                'border border-gray-200 dark:border-gray-700',
                'shadow-lg'
              )}
            >
              {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => handleRangeSelect(range)}
                  className={cn(
                    'w-full px-4 py-2 text-left text-sm',
                    'hover:bg-gray-100 dark:hover:bg-gray-700',
                    'transition-colors',
                    timeRange.range === range
                      ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  {TIME_RANGE_LABELS[range]}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 自定义日期选择器 */}
      <AnimatePresence>
        {showCustomPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'bg-white/60 dark:bg-gray-900/60',
              'backdrop-blur-xl border border-white/20 dark:border-gray-700/30'
            )}
          >
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className={cn(
                'px-2 py-1 rounded border border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-sm text-gray-700 dark:text-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500'
              )}
            />
            <span className="text-gray-500">至</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className={cn(
                'px-2 py-1 rounded border border-gray-300 dark:border-gray-600',
                'bg-white dark:bg-gray-800',
                'text-sm text-gray-700 dark:text-gray-300',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500'
              )}
            />
            <button
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd}
              className={cn(
                'px-3 py-1 rounded text-sm font-medium',
                'bg-indigo-500 text-white',
                'hover:bg-indigo-600 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              应用
            </button>
            <button
              onClick={handleCustomCancel}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}
