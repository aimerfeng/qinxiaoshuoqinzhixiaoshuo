/**
 * 通知类型
 */
export type NotificationType =
  | 'SYSTEM'
  | 'LIKE'
  | 'COMMENT'
  | 'FOLLOW'
  | 'CHAPTER_UPDATE'
  | 'QUOTE'
  | 'MENTION';

/**
 * 通知数据
 */
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  data?: Record<string, unknown> | null;
  isRead: boolean;
  createdAt: string;
}

/**
 * 通知列表响应
 */
export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

/**
 * 通知查询参数
 */
export interface NotificationQueryParams {
  type?: NotificationType;
  isRead?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * 标记已读请求
 */
export interface MarkReadRequest {
  notificationIds?: string[];
  markAll?: boolean;
}

/**
 * 通知图标映射
 */
export const notificationIcons: Record<NotificationType, string> = {
  SYSTEM: '📢',
  LIKE: '❤️',
  COMMENT: '💬',
  FOLLOW: '👤',
  CHAPTER_UPDATE: '📖',
  QUOTE: '📝',
  MENTION: '@',
};

/**
 * 通知类型名称映射
 */
export const notificationTypeNames: Record<NotificationType, string> = {
  SYSTEM: '系统通知',
  LIKE: '点赞',
  COMMENT: '评论',
  FOLLOW: '关注',
  CHAPTER_UPDATE: '更新',
  QUOTE: '引用',
  MENTION: '提及',
};
