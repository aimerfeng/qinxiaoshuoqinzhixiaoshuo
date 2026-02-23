'use client';

import { motion } from 'motion/react';
import { Clock, Users, ChevronRight, UserCheck, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { cn } from '@/utils/cn';
import { SeverityBadge } from './SeverityBadge';
import { StatusBadge } from './StatusBadge';
import type { RiskAlert } from '@/types/risk-control';
import { ALERT_TYPE_LABELS } from '@/types/risk-control';

/**
 * 告警行组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.1: 风控告警列表 - 单个告警显示
 *
 * 显示告警类型、严重程度、状态、标题、受影响用户数、创建时间
 * 支持选择功能（任务19.2.3 批量处理）
 */
interface AlertRowProps {
  alert: RiskAlert;
  index: number;
  onClick?: (alert: RiskAlert) => void;
  isSelected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function AlertRow({ alert, index, onClick, isSelected = false, onSelect, className }: AlertRowProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} 分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours} 小时前`;
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => onClick?.(alert)}
      className={cn(
        'flex items-center gap-4 p-4',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        'cursor-pointer transition-colors',
        'border-b border-gray-100 dark:border-gray-800 last:border-b-0',
        isSelected && 'bg-indigo-50 dark:bg-indigo-900/20',
        className
      )}
    >
      {/* 选择复选框 */}
      {onSelect && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className={cn(
            'flex-shrink-0 p-1 rounded transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          {isSelected ? (
            <CheckSquare className="w-5 h-5 text-indigo-500" />
          ) : (
            <Square className="w-5 h-5 text-gray-400" />
          )}
        </button>
      )}

      {/* 严重程度指示器 */}
      <div className="flex-shrink-0">
        <AlertTriangle
          className={cn(
            'w-5 h-5',
            alert.severity === 'CRITICAL' && 'text-red-500',
            alert.severity === 'HIGH' && 'text-orange-500',
            alert.severity === 'MEDIUM' && 'text-yellow-500',
            alert.severity === 'LOW' && 'text-gray-400'
          )}
        />
      </div>

      {/* 主要内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {ALERT_TYPE_LABELS[alert.type]}
          </span>
          <SeverityBadge severity={alert.severity} size="sm" />
          <StatusBadge status={alert.status} size="sm" />
        </div>
        <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {alert.title}
        </h4>
        {alert.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {alert.description}
          </p>
        )}
      </div>

      {/* 元信息 */}
      <div className="flex-shrink-0 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {/* 受影响用户数 */}
        {alert.affectedUserIds.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>{alert.affectedUserIds.length}</span>
          </div>
        )}

        {/* 分配给 */}
        {alert.assignedTo && (
          <div className="flex items-center gap-1 text-purple-500">
            <UserCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">已分配</span>
          </div>
        )}

        {/* 创建时间 */}
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          <span>{formatDate(alert.createdAt)}</span>
        </div>

        {/* 箭头 */}
        <ChevronRight className="w-4 h-4 text-gray-400" />
      </div>
    </motion.div>
  );
}
