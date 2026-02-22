'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
import type { Notification } from '@/types/notification';

interface UseNotificationSocketOptions {
  onNotification?: (notification: Notification) => void;
  onUnreadCount?: (count: number) => void;
  onNotificationsRead?: (notificationIds: string[]) => void;
  onSystemNotification?: (notification: Notification) => void;
}

/**
 * 通知 WebSocket Hook
 *
 * 需求 10.2.4: WebSocket 连接管理
 * WHEN 用户登录 THEN System SHALL 建立 WebSocket 连接接收实时通知
 */
export function useNotificationSocket(options: UseNotificationSocketOptions = {}) {
  const socketRef = useRef<Socket | null>(null);
  const { user, isAuthenticated } = useAuthStore();
  const {
    onNotification,
    onUnreadCount,
    onNotificationsRead,
    onSystemNotification,
  } = options;

  // 连接 WebSocket
  const connect = useCallback(() => {
    if (!isAuthenticated || !user?.id) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${backendUrl}/notifications`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('[NotificationSocket] Connected');
      // 认证
      socket.emit('authenticate', { userId: user.id });
    });

    socket.on('disconnect', (reason) => {
      console.log('[NotificationSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[NotificationSocket] Connection error:', error);
    });

    // 接收新通知
    socket.on('notification', (notification: Notification) => {
      console.log('[NotificationSocket] New notification:', notification);
      onNotification?.(notification);
    });

    // 接收未读计数更新
    socket.on('unreadCount', (data: { count: number }) => {
      console.log('[NotificationSocket] Unread count:', data.count);
      onUnreadCount?.(data.count);
    });

    // 接收已读状态更新
    socket.on('notificationsRead', (data: { notificationIds: string[] }) => {
      console.log('[NotificationSocket] Notifications read:', data.notificationIds);
      onNotificationsRead?.(data.notificationIds);
    });

    // 接收系统广播通知
    socket.on('systemNotification', (notification: Notification) => {
      console.log('[NotificationSocket] System notification:', notification);
      onSystemNotification?.(notification);
    });

    socketRef.current = socket;
  }, [isAuthenticated, user?.id, onNotification, onUnreadCount, onNotificationsRead, onSystemNotification]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // 自动连接/断开
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, user?.id, connect, disconnect]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected ?? false,
    connect,
    disconnect,
  };
}

export default useNotificationSocket;
