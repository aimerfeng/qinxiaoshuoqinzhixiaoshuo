'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/utils/cn';
import type { ContributionRecord } from '@/types/membership';

/**
 * 贡献类型图标配置
 */
const typeIconMap: Record<string, string> = {
  // 阅读类
  CHAPTER_READ: '📖',
  READING_TIME: '⏱️',
  // 互动类
  COMMENT: '💬',
  COMMENT_LIKED: '👍',
  QUOTE_INTERACTION: '🔗',
  LIKE: '❤️',
  // 创作类
  CHAPTER_PUBLISH: '✍️',
  WORK_COLLECTED: '⭐',
  PARAGRAPH_QUOTED: '📝',
  // 社区类
  VALID_REPORT: '🛡️',
  ACTIVITY_PARTICIPATION: '🎉',
};

/**
 * 获取类型图标
 */
function getTypeIcon(type: string): string {
  return typeIconMap[type] || '📌';
}

/**
 * 获取类型颜色
 */
function getTypeColor(type: string): string {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('read') || lowerType.includes('time')) {
    return 'text-blue-600 dark:text-blue-400';
  }
  if (lowerType.includes('comment') || lowerType.includes('like') || lowerType.includes('quote')) {
    return 'text-green-600 dark:text-green-400';
  }
  if (lowerType.includes('publish') || lowerType.includes('collect') || lowerType.includes('paragraph')) {
    return 'text-purple-600 dark:text-purple-400';
  }
  if (lowerType.includes('report') || lowerType.includes('activity')) {
    return 'text-orange-600 dark:text-orange-400';
  }
  return 'text-indigo-600 dark:text-indigo-400';
}

export interface ContributionHistoryItemProps {
  record: ContributionRecord;
  index?: number;
  animated?: boolean;
  className?: string;
}

/**
 * 贡献度历史记录项
 *
 * 需求14: 会员等级体系
 * 任务14.2.3: 贡献度明细页面
 */
export function ContributionHistoryItem({
  record,
  index = 0,
  animated = true,
  className,
}: ContributionHistoryItemProps) {
  const icon = useMemo(() => getTypeIcon(record.type), [record.type]);
  const colorClass = useMemo(() => getTypeColor(record.type), [record.type]);

  const timeDisplay = useMemo(() => {
    const date = new Date(record.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    } else if (diffDays < 7) {
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    } else {
      return format(date, 'MM-dd HH:mm', { locale: zhCN });
    }
  }, [record.createdAt]);

  const content = (
    <div
      className={cn(
        'flex items-center gap-4 p-3 rounded-xl',
        'hover:bg-gray-50 dark:hover:bg-gray-800/50',
        'transition-colors',
        className
      )}
    >
      {/* 图标 */}
      <div className="flex-shrink-0 text-xl">
        {icon}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-white truncate">
            {record.description || record.type}
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {timeDisplay}
        </div>
      </div>

      {/* 积分 */}
      <div className={cn('flex-shrink-0 font-bold', colorClass)}>
        +{record.points}
      </div>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: index * 0.03 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export default ContributionHistoryItem;
