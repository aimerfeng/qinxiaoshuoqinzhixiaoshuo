'use client';

import { cn } from '@/utils/cn';

interface MessageDateDividerProps {
  date: Date;
  className?: string;
}

/**
 * 格式化日期显示
 */
function formatDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (messageDate.getTime() === today.getTime()) {
    return '今天';
  } else if (messageDate.getTime() === yesterday.getTime()) {
    return '昨天';
  } else if (now.getFullYear() === date.getFullYear()) {
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}

/**
 * 消息日期分隔组件
 *
 * 需求20: 私信系统
 * 任务20.2.3: 聊天界面 - 日期分隔组件
 */
export default function MessageDateDivider({
  date,
  className,
}: MessageDateDividerProps) {
  return (
    <div className={cn('flex items-center justify-center py-4', className)}>
      <div className="px-3 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full">
        {formatDateLabel(date)}
      </div>
    </div>
  );
}
