import { api } from '@/lib/api';
import type {
  Conversation,
  ConversationListResponse,
  ConversationQueryParams,
  Message,
  MessageListResponse,
  MessageQueryParams,
  SendMessageRequest,
  SendDirectMessageRequest,
  CreateConversationRequest,
  CreateConversationResponse,
  UnreadCountResponse,
} from '@/types/message';

/**
 * 私信服务
 *
 * 需求20: 私信系统
 * 任务20.2.1: 私信入口 - API 服务
 */
export const messageService = {
  /**
   * 获取会话列表
   */
  async getConversations(
    params?: ConversationQueryParams
  ): Promise<ConversationListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    const url = query ? `/conversations?${query}` : '/conversations';
    const response = await api.get<{ data: ConversationListResponse }>(url);
    return response.data.data;
  },

  /**
   * 获取单个会话详情
   */
  async getConversation(conversationId: string): Promise<Conversation> {
    const response = await api.get<{ data: Conversation }>(
      `/conversations/${conversationId}`
    );
    return response.data.data;
  },

  /**
   * 获取会话消息历史
   */
  async getMessages(
    conversationId: string,
    params?: MessageQueryParams
  ): Promise<MessageListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.direction) searchParams.set('direction', params.direction);

    const query = searchParams.toString();
    const url = query
      ? `/conversations/${conversationId}/messages?${query}`
      : `/conversations/${conversationId}/messages`;
    const response = await api.get<{ data: MessageListResponse }>(url);
    return response.data.data;
  },

  /**
   * 发送消息到会话
   */
  async sendMessage(request: SendMessageRequest): Promise<Message> {
    const response = await api.post<{ data: Message }>('/messages', request);
    return response.data.data;
  },

  /**
   * 发送直接消息给用户
   */
  async sendDirectMessage(
    userId: string,
    request: SendDirectMessageRequest
  ): Promise<Message> {
    const response = await api.post<{ data: Message }>(
      `/messages/direct/${userId}`,
      request
    );
    return response.data.data;
  },

  /**
   * 创建新会话
   */
  async createConversation(
    request: CreateConversationRequest
  ): Promise<CreateConversationResponse> {
    const response = await api.post<{ data: CreateConversationResponse }>(
      '/conversations',
      request
    );
    return response.data.data;
  },

  /**
   * 标记会话为已读
   */
  async markAsRead(conversationId: string): Promise<{ lastReadAt: string }> {
    const response = await api.post<{ data: { lastReadAt: string } }>(
      `/conversations/${conversationId}/read`
    );
    return response.data.data;
  },

  /**
   * 获取未读消息总数
   * 注意：这个 API 需要后端实现，暂时通过获取会话列表计算
   */
  async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      // 获取会话列表并计算总未读数
      const response = await messageService.getConversations({ limit: 100 });
      const count = response.conversations.reduce(
        (total, conv) => total + conv.unreadCount,
        0
      );
      return { count };
    } catch {
      return { count: 0 };
    }
  },
};

export default messageService;
