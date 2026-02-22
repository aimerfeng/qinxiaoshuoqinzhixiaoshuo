'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNotificationStore } from '@/store/notification';
import { useNotificationSocket } from '@/hooks/useNotificationSocket';
import { useAuthStore } from '@/store/auth';
import NotificationDropdown from './NotificationDropdown';

/**
 * 通知铃铛图标组件
 *
 * 需求 10.2.1: 通知图标和未读数
 * WHEN 用户有未读通知 THEN System SHALL 在通知图标上显示未读数量徽章
 */
export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuthStore();
  const {
    unreadCount,
    fetchUnreadCount,
    addNotification,
    updateUnreadCount,
    markNotificationsRead,
  } = useNotificationStore();

  // WebSocket 连接
  useNotificationSocket({
    onNotification: addNotification,
    onUnreadCount: updateUnreadCount,
    onNotificationsRead: markNotificationsRead,
    onSystemNotification: addNotification,
  });

  // 初始化获取未读数量
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated, fetchUnreadCount]);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={`通知${unreadCount > 0 ? `，${unreadCount}条未读` : ''}`}
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        
        {/* 未读数量徽章 */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-medium text-white bg-red-500 rounded-full"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* 下拉面板 */}
      <AnimatePresence>
        {isOpen && (
          <NotificationDropdown onClose={() => setIsOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
