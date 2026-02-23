'use client';

import { motion } from 'motion/react';
import { Clock, CheckCircle, XCircle, Search, AlertCircle, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';
import { AlertStatus, ALERT_STATUS_LABELS } from '@/types/risk-control';
import type { AlertStatusChange } from '@/types/risk-control';

/**
 * 告警状态变更时间线组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.2: 告警详情页面 - 时间线组件
 *
 * 显示告警状态变更历史
 */
interface AlertTimelineProps {
  statusHistory: AlertStatusChange[];
  createdAt: string;
  className?: string;
}

export function AlertTimeline({
  statusHistory,
  createdAt,
  className,
}: AlertTimelineProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: AlertStatus) => {
    switch (status) {
      case AlertStatus.PENDING:
        return <AlertCircle className="w-4 h-4" />;
      case AlertStatus.INVESTIGATING:
        return <Search className="w-4 h-4" />;
      case AlertStatus.RESOLVED:
        return <CheckCircle className="w-4 h-4" />;
      case AlertStatus.DISMISSED:
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: AlertStatus) => {
    switch (status) {
      case AlertStatus.PENDING:
        return 'bg-blue-500 text-white';
      case AlertStatus.INVESTIGATING:
        return 'bg-purple-500 text-white';
      case AlertStatus.RESOLVED:
        return 'bg-green-500 text-white';
      case AlertStatus.DISMISSED:
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-400 text-white';
    }
  };

  // 构建时间线事件列表
  const timelineEvents = [
    // 创建事件
    {
      id: 'created',
      type: 'created' as const,
      status: AlertStatus.PENDING,
      timestamp: createdAt,
      note: '告警创建',
    },
    // 状态变更事件
    ...statusHistory.map((change) => ({
      id: change.id,
      type: 'status_change' as const,
      status: change.toStatus,
      fromStatus: change.fromStatus,
      timestamp: change.createdAt,
      changedBy: change.changedByName || change.changedBy,
      note: change.note,
    })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-800">
        <Clock className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">状态变更历史</h3>
      </div>

      {/* 时间线 */}
      <div className="p-4">
        <div className="relative">
          {/* 连接线 */}
          <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-700" />

          {/* 事件列表 */}
          <div className="space-y-6">
            {timelineEvents.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative flex gap-4"
              >
                {/* 图标 */}
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10',
                    event.type === 'created'
                      ? 'bg-indigo-500 text-white'
                      : getStatusColor(event.status)
                  )}
                >
                  {event.type === 'created' ? (
                    <Plus className="w-4 h-4" />
                  ) : (
                    getStatusIcon(event.status)
                  )}
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    {event.type === 'created' ? (
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        告警创建
                      </span>
                    ) : (
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        状态变更为{' '}
                        <span
                          className={cn(
                            'px-1.5 py-0.5 rounded text-xs',
                            event.status === AlertStatus.PENDING &&
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            event.status === AlertStatus.INVESTIGATING &&
                              'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
                            event.status === AlertStatus.RESOLVED &&
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                            event.status === AlertStatus.DISMISSED &&
                              'bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-400'
                          )}
                        >
                          {ALERT_STATUS_LABELS[event.status]}
                        </span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(event.timestamp)}
                    {event.type === 'status_change' && event.changedBy && (
                      <span> · 操作人: {event.changedBy}</span>
                    )}
                  </div>

                  {event.note && event.type === 'status_change' && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2">
                      {event.note}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
