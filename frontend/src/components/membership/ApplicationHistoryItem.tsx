'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { format, formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/utils/cn';
import { getMemberLevelConfig, type ApplicationRecord } from '@/types/membership';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';

export interface ApplicationHistoryItemProps {
  application: ApplicationRecord;
  index?: number;
  animated?: boolean;
  className?: string;
}

/**
 * 申请历史记录项组件
 *
 * 需求14: 会员等级体系
 * 任务14.2.4: 会员申请页面
 */
export function ApplicationHistoryItem({
  application,
  index = 0,
  animated = true,
  className,
}: ApplicationHistoryItemProps) {
  const levelConfig = useMemo(
    () => getMemberLevelConfig(application.targetLevel),
    [application.targetLevel]
  );

  const timeDisplay = useMemo(() => {
    const date = new Date(application.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    }
    return format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  }, [application.createdAt]);

  const reviewTimeDisplay = useMemo(() => {
    if (!application.reviewedAt) return null;
    const date = new Date(application.reviewedAt);
    return format(date, 'yyyy-MM-dd HH:mm', { locale: zhCN });
  }, [application.reviewedAt]);

  const content = (
    <div
      className={cn(
        'p-4 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'hover:bg-white/80 dark:hover:bg-gray-900/80',
        'transition-colors',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* 左侧：等级信息 */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center text-xl',
              levelConfig.bgColor,
              'border',
              levelConfig.borderColor
            )}
          >
            {levelConfig.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-white">
                申请 Lv.{levelConfig.value} {levelConfig.name}
              </span>
              <ApplicationStatusBadge status={application.status} size="sm" />
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {timeDisplay}
            </div>
          </div>
        </div>

        {/* 右侧：申请时贡献度 */}
        <div className="text-right flex-shrink-0">
          <div className="text-sm text-gray-500 dark:text-gray-400">申请时贡献度</div>
          <div className="font-semibold text-indigo-600 dark:text-indigo-400">
            {application.currentScore.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 申请理由 */}
      {application.reason && (
        <div className="mt-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">申请理由</div>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
            {application.reason}
          </p>
        </div>
      )}

      {/* 拒绝原因 */}
      {application.rejectReason && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/30">
          <div className="text-xs text-red-600 dark:text-red-400 mb-1">拒绝原因</div>
          <p className="text-sm text-red-700 dark:text-red-300">
            {application.rejectReason}
          </p>
        </div>
      )}

      {/* 审核时间 */}
      {reviewTimeDisplay && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          审核时间：{reviewTimeDisplay}
        </div>
      )}
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export default ApplicationHistoryItem;
