'use client';

import { motion } from 'motion/react';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/utils/cn';
import { AlertRow } from './AlertRow';
import type { RiskAlert, AlertListResponse } from '@/types/risk-control';

/**
 * 告警列表组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.1: 风控告警列表 - 主列表组件
 *
 * 功能:
 * - 显示告警列表
 * - 分页支持
 * - 点击查看详情
 * - 刷新功能
 * - 批量选择支持（任务19.2.3）
 */
interface AlertListProps {
  data: AlertListResponse | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  onAlertClick?: (alert: RiskAlert) => void;
  onRefresh?: () => void;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  className?: string;
}

export function AlertList({
  data,
  isLoading,
  currentPage,
  onPageChange,
  onAlertClick,
  onRefresh,
  selectedIds = [],
  onSelectionChange,
  className,
}: AlertListProps) {
  const alerts = data?.alerts || [];
  const total = data?.total || 0;
  const limit = data?.limit || 20;
  const totalPages = Math.ceil(total / limit);

  // 处理全选
  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedIds.length === alerts.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(alerts.map((a) => a.id));
    }
  };

  // 处理单个选择
  const handleSelectOne = (alertId: string) => {
    if (!onSelectionChange) return;
    if (selectedIds.includes(alertId)) {
      onSelectionChange(selectedIds.filter((id) => id !== alertId));
    } else {
      onSelectionChange([...selectedIds, alertId]);
    }
  };

  const isAllSelected = alerts.length > 0 && selectedIds.length === alerts.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < alerts.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          {/* 全选复选框 */}
          {onSelectionChange && alerts.length > 0 && (
            <button
              onClick={handleSelectAll}
              className={cn(
                'p-1 rounded transition-colors',
                'hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              {isAllSelected ? (
                <CheckSquare className="w-5 h-5 text-indigo-500" />
              ) : isSomeSelected ? (
                <div className="w-5 h-5 relative">
                  <Square className="w-5 h-5 text-indigo-500" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2.5 h-0.5 bg-indigo-500 rounded" />
                  </div>
                </div>
              ) : (
                <Square className="w-5 h-5 text-gray-400" />
              )}
            </button>
          )}
          <AlertTriangle className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">风控告警</h3>
          {total > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              共 {total} 条
            </span>
          )}
          {selectedIds.length > 0 && (
            <span className="text-sm text-indigo-600 dark:text-indigo-400">
              已选 {selectedIds.length} 条
            </span>
          )}
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className={cn(
              'p-2 rounded-lg transition-colors',
              'text-gray-500 dark:text-gray-400',
              'hover:bg-gray-100 dark:hover:bg-gray-800',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
          </button>
        )}
      </div>

      {/* 列表内容 */}
      {isLoading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : alerts.length > 0 ? (
        <>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {alerts.map((alert, index) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                index={index}
                onClick={onAlertClick}
                isSelected={selectedIds.includes(alert.id)}
                onSelect={onSelectionChange ? () => handleSelectOne(alert.id) : undefined}
              />
            ))}
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  currentPage <= 1
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                        currentPage === pageNum
                          ? 'bg-indigo-500 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  currentPage >= totalPages
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>暂无告警记录</p>
          <p className="text-sm mt-1">系统运行正常</p>
        </div>
      )}
    </motion.div>
  );
}
