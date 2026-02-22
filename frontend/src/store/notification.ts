import { create } from 'zustand';
import type { Notification } from '@/types/notification';
import { notificationService } from '@/services/notification';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  total: number;
  isLoading: boolean;
  hasMore: boolean;
  
  // Actions
  fetchNotifications: (reset?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addNotification: (notification: Notification) => void;
  updateUnreadCount: (count: number) => void;
  markNotificationsRead: (notificationIds: string[]) => void;
}

const PAGE_SIZE = 20;

/**
 * 通知状态管理
 *
 * 需求9: 通知系统前端状态管理
 */
export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  total: 0,
  isLoading: false,
  hasMore: true,

  /**
   * 获取通知列表
   */
  fetchNotifications: async (reset = false) => {
    const { notifications, isLoading } = get();
    if (isLoading) return;

    set({ isLoading: true });

    try {
      const offset = reset ? 0 : notifications.length;
      const response = await notificationService.getNotifications({
        limit: PAGE_SIZE,
        offset,
      });

      set({
        notifications: reset
          ? response.notifications
          : [...notifications, ...response.notifications],
        total: response.total,
        unreadCount: response.unreadCount,
        hasMore: response.notifications.length === PAGE_SIZE,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ isLoading: false });
    }
  },

  /**
   * 获取未读数量
   */
  fetchUnreadCount: async () => {
    try {
      const response = await notificationService.getUnreadCount();
      set({ unreadCount: response.count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  /**
   * 标记为已读
   */
  markAsRead: async (notificationIds: string[]) => {
    try {
      await notificationService.markAsRead({ notificationIds });
      
      const { notifications, unreadCount } = get();
      const updatedNotifications = notifications.map((n) =>
        notificationIds.includes(n.id) ? { ...n, isRead: true } : n
      );
      const readCount = notifications.filter(
        (n) => notificationIds.includes(n.id) && !n.isRead
      ).length;

      set({
        notifications: updatedNotifications,
        unreadCount: Math.max(0, unreadCount - readCount),
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  /**
   * 标记所有为已读
   */
  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      
      const { notifications } = get();
      set({
        notifications: notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  /**
   * 删除通知
   */
  deleteNotification: async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      
      const { notifications, unreadCount } = get();
      const notification = notifications.find((n) => n.id === id);
      
      set({
        notifications: notifications.filter((n) => n.id !== id),
        total: get().total - 1,
        unreadCount: notification && !notification.isRead
          ? unreadCount - 1
          : unreadCount,
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  },

  /**
   * 添加新通知（来自 WebSocket）
   */
  addNotification: (notification: Notification) => {
    const { notifications, unreadCount, total } = get();
    
    // 避免重复
    if (notifications.some((n) => n.id === notification.id)) return;

    set({
      notifications: [notification, ...notifications],
      unreadCount: notification.isRead ? unreadCount : unreadCount + 1,
      total: total + 1,
    });
  },

  /**
   * 更新未读数量（来自 WebSocket）
   */
  updateUnreadCount: (count: number) => {
    set({ unreadCount: count });
  },

  /**
   * 标记通知为已读（来自 WebSocket）
   */
  markNotificationsRead: (notificationIds: string[]) => {
    const { notifications } = get();
    set({
      notifications: notifications.map((n) =>
        notificationIds.includes(n.id) ? { ...n, isRead: true } : n
      ),
    });
  },
}));

export default useNotificationStore;
