'use client';

import { motion } from 'motion/react';
import { ArrowLeft, AlertTriangle, Clock, User, Calendar } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import type { RiskAlert } from '@/types/risk-control';
import { ALERT_TYPE_LABELS } from '@/types/risk-control';

/**
 * 告警详情头部组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.2: 告警详情页面 - 头部组件
 *
 * 显示告警标题、类型、严重程度、状态、创建时间等基本信息
 */
interface AlertDetailHeaderProps {
  alert: RiskAlert;
  onBack: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function AlertDetailHeader({ alert, onBack, children, className }: AlertDetailHeaderProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-2xl p-6',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      {/* 返回按钮和标题 */}
      <div className="flex items-start gap-4 mb-4">
        <button
          onClick={onBack}
          className={cn(
            'p-2 rounded-xl transition-colors',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'flex-shrink-0'
          )}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle
              className={cn(
                'w-5 h-5 flex-shrink-0',
                alert.severity === 'CRITICAL' && 'text-red-500',
                alert.severity === 'HIGH' && 'text-orange-500',
                alert.severity === 'MEDIUM' && 'text-yellow-500',
                alert.severity === 'LOW' && 'text-gray-400'
              )}
            />
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {ALERT_TYPE_LABELS[alert.type]}
            </span>
            <SeverityBadge severity={alert.severity} size="md" />
            <StatusBadge status={alert.status} size="md" />
          </div>

          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {alert.title}
          </h1>

          {alert.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {alert.description}
            </p>
          )}
        </div>

        {/* 操作按钮区域 */}
        {children && (
          <div className="flex-shrink-0">
            {children}
          </div>
        )}
      </div>

      {/* 元信息 */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400 pl-11">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>创建于 {formatDate(alert.createdAt)}</span>
        </div>

        {alert.assignedTo && (
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4" />
            <span>分配给 {alert.assignedToName || alert.assignedTo}</span>
          </div>
        )}

        {alert.resolvedAt && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>解决于 {formatDate(alert.resolvedAt)}</span>
          </div>
        )}

        {alert.sourceService && (
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs">
              来源: {alert.sourceService}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
