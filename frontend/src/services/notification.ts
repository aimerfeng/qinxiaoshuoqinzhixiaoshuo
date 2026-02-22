import { api } from '@/lib/api';
import type {
  Notification,
  NotificationListResponse,
  NotificationQueryParams,
  MarkReadRequest,
} from '@/types/notification';

/**
 * 通知服务
 *
 * 需求9: 通知系统前端 API 调用
 */
export const notificationService = {
  /**
   * 获取通知列表
   */
  async getNotifications(
    params?: NotificationQueryParams
  ): Promise<NotificationListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.isRead !== undefined) searchParams.set('isRead', String(params.isRead));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.offset) searchParams.set('offset', String(params.offset));

    const query = searchParams.toString();
    const url = query ? `/notifications?${query}` : '/notifications';
    return api.get<NotificationListResponse>(url);
  },

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(): Promise<{ count: number }> {
    return api.get<{ count: number }>('/notifications/unread-count');
  },

  /**
   * 标记通知为已读
   */
  async markAsRead(request: MarkReadRequest): Promise<{ success: boolean; count: number }> {
    return api.post<{ success: boolean; count: number }>('/notifications/mark-read', request);
  },

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(): Promise<{ success: boolean; count: number }> {
    return api.post<{ success: boolean; count: number }>('/notifications/mark-read', {
      markAll: true,
    });
  },

  /**
   * 删除通知
   */
  async deleteNotification(id: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/notifications/${id}`);
  },
};

export default notificationService;
