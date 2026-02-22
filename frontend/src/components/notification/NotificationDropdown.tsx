'use client';

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Check, CheckCheck, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useNotificationStore } from '@/store/notification';
import NotificationItem from './NotificationItem';

interface NotificationDropdownProps {
  onClose: () => void;
}

/**
 * 通知下拉面板
 *
 * 需求 10.2.2: 通知下拉面板
 * WHEN 用户点击通知图标 THEN System SHALL 显示最近通知的下拉面板
 */
export default function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAllAsRead,
  } = useNotificationStore();

  // 加载通知
  useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  // 显示最近 5 条
  const recentNotifications = notifications.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          通知
          {unreadCount > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              ({unreadCount}条未读)
            </span>
          )}
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsRead()}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            <CheckCheck className="w-4 h-4" />
            全部已读
          </button>
        )}
      </div>

      {/* 通知列表 */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Check className="w-12 h-12 mb-2 text-gray-300" />
            <p>暂无通知</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                compact
                onClick={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部 */}
      {notifications.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <Link
            href="/notifications"
            onClick={onClose}
            className="flex items-center justify-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            查看全部通知
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
