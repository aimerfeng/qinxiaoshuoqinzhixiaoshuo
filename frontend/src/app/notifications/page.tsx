'use client';

import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Filter, Loader2 } from 'lucide-react';
import { useNotificationStore } from '@/store/notification';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'next/navigation';
import NotificationItem from '@/components/notification/NotificationItem';
import type { NotificationType } from '@/types/notification';
import { notificationTypeNames } from '@/types/notification';

const filterOptions: { value: NotificationType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'SYSTEM', label: '系统' },
  { value: 'LIKE', label: '点赞' },
  { value: 'COMMENT', label: '评论' },
  { value: 'CHAPTER_UPDATE', label: '更新' },
  { value: 'QUOTE', label: '引用' },
];

/**
 * 通知列表页面
 *
 * 需求 10.2.3: 通知列表页面
 * WHEN 用户访问通知页面 THEN System SHALL 显示完整的通知列表
 */
export default function NotificationsPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const {
    notifications,
    unreadCount,
    total,
    isLoading,
    hasMore,
    fetchNotifications,
    markAllAsRead,
  } = useNotificationStore();

  const [filter, setFilter] = useState<NotificationType | 'all'>('all');

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/notifications');
    }
  }, [authLoading, isAuthenticated, router]);

  // 加载通知
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications(true);
    }
  }, [isAuthenticated, fetchNotifications]);

  // 加载更多
  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      fetchNotifications(false);
    }
  };

  // 过滤通知
  const filteredNotifications = filter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                通知中心
              </h1>
              <p className="text-sm text-gray-500">
                共 {total} 条通知，{unreadCount} 条未读
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              全部已读
            </button>
          )}
        </div>

        {/* 过滤器 */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`
                px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors
                ${filter === option.value
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* 通知列表 */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
          {isLoading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <Bell className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">暂无通知</p>
              <p className="text-sm mt-1">
                {filter !== 'all' ? `没有${notificationTypeNames[filter as NotificationType]}类型的通知` : '你还没有收到任何通知'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                />
              ))}
            </div>
          )}

          {/* 加载更多 */}
          {hasMore && filteredNotifications.length > 0 && (
            <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    加载中...
                  </span>
                ) : (
                  '加载更多'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
