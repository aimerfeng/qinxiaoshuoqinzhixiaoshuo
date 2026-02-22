'use client';

import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { useNotificationStore } from '@/store/notification';
import type { Notification, NotificationType } from '@/types/notification';
import { notificationIcons } from '@/types/notification';

interface NotificationItemProps {
  notification: Notification;
  compact?: boolean;
  onClick?: () => void;
}

/**
 * 通知项组件
 *
 * 需求 10.2.5: 通知点击跳转
 * WHEN 用户点击通知 THEN System SHALL 跳转到相关内容页面
 */
export default function NotificationItem({
  notification,
  compact = false,
  onClick,
}: NotificationItemProps) {
  const router = useRouter();
  const { markAsRead, deleteNotification } = useNotificationStore();

  // 获取跳转链接
  const getNavigationUrl = (): string | null => {
    const data = notification.data as Record<string, string> | null;
    if (!data) return null;

    switch (notification.type) {
      case 'LIKE':
      case 'COMMENT':
        return data.cardId ? `/plaza/${data.cardId}` : null;
      case 'CHAPTER_UPDATE':
        return data.workId && data.chapterId
          ? `/works/${data.workId}/chapters/${data.chapterId}`
          : null;
      case 'QUOTE':
        return data.cardId ? `/plaza/${data.cardId}` : null;
      case 'FOLLOW':
        return data.followerId ? `/user/${data.followerId}` : null;
      default:
        return null;
    }
  };

  // 点击处理
  const handleClick = () => {
    // 标记为已读
    if (!notification.isRead) {
      markAsRead([notification.id]);
    }

    // 跳转
    const url = getNavigationUrl();
    if (url) {
      router.push(url);
    }

    onClick?.();
  };

  // 删除处理
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  // 格式化时间
  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: zhCN,
  });

  const icon = notificationIcons[notification.type as NotificationType] || '📢';

  return (
    <div
      onClick={handleClick}
      className={`
        group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
        hover:bg-gray-50 dark:hover:bg-gray-800/50
        ${!notification.isRead ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}
      `}
    >
      {/* 图标 */}
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-xl">
        {icon}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={`
              text-sm font-medium
              ${notification.isRead ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white'}
            `}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-indigo-500" />
          )}
        </div>
        
        <p
          className={`
            mt-0.5 text-sm
            ${compact ? 'line-clamp-1' : 'line-clamp-2'}
            ${notification.isRead ? 'text-gray-500' : 'text-gray-600 dark:text-gray-400'}
          `}
        >
          {notification.content}
        </p>
        
        <p className="mt-1 text-xs text-gray-400">
          {timeAgo}
        </p>
      </div>

      {/* 删除按钮 */}
      {!compact && (
        <button
          onClick={handleDelete}
          className="flex-shrink-0 p-1.5 rounded-full opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          aria-label="删除通知"
        >
          <Trash2 className="w-4 h-4 text-gray-400" />
        </button>
      )}
    </div>
  );
}
