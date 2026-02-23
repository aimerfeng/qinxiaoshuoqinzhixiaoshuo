'use client';

import { cn } from '@/utils/cn';

interface ConversationSkeletonProps {
  count?: number;
  compact?: boolean;
}

/**
 * 会话列表骨架屏组件
 *
 * 需求20: 私信系统
 * 任务20.2.2: 会话列表页面 - 加载骨架屏
 *
 * 功能:
 * - 显示会话列表加载状态
 * - 支持自定义数量
 * - 支持紧凑模式
 */
export default function ConversationSkeleton({
  count = 5,
  compact = false,
}: ConversationSkeletonProps) {
  return (
    <div className="divide-y divide-gray-100 dark:divide-gray-800">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn(
            'flex items-start gap-3 animate-pulse',
            compact ? 'px-4 py-3' : 'px-4 py-4'
          )}
        >
          {/* 头像骨架 */}
          <div
            className={cn(
              'flex-shrink-0 rounded-full bg-gray-200 dark:bg-gray-700',
              compact ? 'w-10 h-10' : 'w-12 h-12'
            )}
          />

          {/* 内容骨架 */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center justify-between gap-2">
              {/* 名称骨架 */}
              <div
                className={cn(
                  'h-4 bg-gray-200 dark:bg-gray-700 rounded',
                  'w-24'
                )}
              />
              {/* 时间骨架 */}
              <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>

            <div className="flex items-center justify-between gap-2">
              {/* 消息预览骨架 */}
              <div
                className={cn(
                  'h-3 bg-gray-200 dark:bg-gray-700 rounded',
                  'w-3/4'
                )}
              />
              {/* 未读徽章骨架（随机显示） */}
              {index % 3 === 0 && (
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full" />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
