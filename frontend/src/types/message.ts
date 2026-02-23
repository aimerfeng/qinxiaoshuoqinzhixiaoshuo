/**
 * 私信系统类型定义
 *
 * 需求20: 私信系统
 * 任务20.2.1: 私信入口 - 类型定义
 */

/**
 * 消息类型枚举
 */
export enum MessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  SYSTEM = 'SYSTEM',
}

/**
 * 消息发送者信息
 */
export interface MessageSender {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 回复消息信息
 */
export interface ReplyTo {
  id: string;
  content: string;
  sender: MessageSender;
}

/**
 * 消息数据
 */
export interface Message {
  id: string;
  conversationId: string;
  content: string;
  messageType: MessageType;
  sender: MessageSender;
  replyTo: ReplyTo | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 会话参与者信息
 */
export interface ConversationParticipant {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 最后消息预览
 */
export interface LastMessagePreview {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
  };
  createdAt: string;
}

/**
 * 会话数据
 */
export interface Conversation {
  id: string;
  title: string | null;
  isGroup: boolean;
  lastMessage: LastMessagePreview | null;
  unreadCount: number;
  participants: ConversationParticipant[];
  lastMessageAt: string;
  createdAt: string;
}

/**
 * 会话列表响应
 */
export interface ConversationListResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 消息列表响应
 */
export interface MessageListResponse {
  messages: Message[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}

/**
 * 发送消息请求
 */
export interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType?: MessageType;
  replyToId?: string;
}

/**
 * 发送直接消息请求
 */
export interface SendDirectMessageRequest {
  content: string;
}

/**
 * 创建会话请求
 */
export interface CreateConversationRequest {
  participantIds: string[];
  title?: string;
  isGroup?: boolean;
}

/**
 * 创建会话响应
 */
export interface CreateConversationResponse {
  conversation: Conversation;
  isNew: boolean;
}

/**
 * 会话查询参数
 */
export interface ConversationQueryParams {
  page?: number;
  limit?: number;
}

/**
 * 消息查询参数
 */
export interface MessageQueryParams {
  cursor?: string;
  limit?: number;
  direction?: 'before' | 'after';
}

/**
 * 未读消息计数响应
 */
export interface UnreadCountResponse {
  count: number;
}
