import { create } from 'zustand';
import type { Conversation, Message } from '@/types/message';
import { messageService } from '@/services/message';

interface MessageState {
  // 会话列表
  conversations: Conversation[];
  // 当前活跃会话
  activeConversation: Conversation | null;
  // 当前会话的消息
  messages: Message[];
  // 未读消息总数
  unreadCount: number;
  // 加载状态
  isLoading: boolean;
  isLoadingMessages: boolean;
  // 分页状态
  hasMore: boolean;
  hasMoreMessages: boolean;
  messageCursor: string | null;

  // Actions
  fetchConversations: (reset?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  fetchMessages: (conversationId: string, reset?: boolean) => Promise<void>;
  sendMessage: (conversationId: string, content: string) => Promise<Message | null>;
  sendDirectMessage: (userId: string, content: string) => Promise<Message | null>;
  markAsRead: (conversationId: string) => Promise<void>;
  addMessage: (message: Message) => void;
  updateUnreadCount: (count: number) => void;
  decrementUnreadCount: (conversationId: string, count: number) => void;
}

const PAGE_SIZE = 20;
const MESSAGE_PAGE_SIZE = 30;

/**
 * 私信状态管理
 *
 * 需求20: 私信系统
 * 任务20.2.1: 私信入口 - 状态管理
 */
export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  unreadCount: 0,
  isLoading: false,
  isLoadingMessages: false,
  hasMore: true,
  hasMoreMessages: true,
  messageCursor: null,

  /**
   * 获取会话列表
   */
  fetchConversations: async (reset = false) => {
    const { conversations, isLoading } = get();
    if (isLoading) return;

    set({ isLoading: true });

    try {
      const page = reset ? 1 : Math.floor(conversations.length / PAGE_SIZE) + 1;
      const response = await messageService.getConversations({
        page,
        limit: PAGE_SIZE,
      });

      // 计算总未读数
      const totalUnread = response.conversations.reduce(
        (total, conv) => total + conv.unreadCount,
        0
      );

      set({
        conversations: reset
          ? response.conversations
          : [...conversations, ...response.conversations],
        hasMore: response.hasMore,
        unreadCount: reset ? totalUnread : get().unreadCount,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      set({ isLoading: false });
    }
  },

  /**
   * 获取未读消息总数
   */
  fetchUnreadCount: async () => {
    try {
      const response = await messageService.getUnreadCount();
      set({ unreadCount: response.count });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  /**
   * 设置当前活跃会话
   */
  setActiveConversation: (conversation) => {
    set({
      activeConversation: conversation,
      messages: [],
      messageCursor: null,
      hasMoreMessages: true,
    });
  },

  /**
   * 获取会话消息
   */
  fetchMessages: async (conversationId, reset = false) => {
    const { isLoadingMessages, messageCursor } = get();
    if (isLoadingMessages) return;

    set({ isLoadingMessages: true });

    try {
      const response = await messageService.getMessages(conversationId, {
        cursor: reset ? undefined : messageCursor || undefined,
        limit: MESSAGE_PAGE_SIZE,
        direction: 'before',
      });

      set({
        messages: reset
          ? response.messages
          : [...response.messages, ...get().messages],
        messageCursor: response.prevCursor,
        hasMoreMessages: response.hasMore,
        isLoadingMessages: false,
      });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      set({ isLoadingMessages: false });
    }
  },

  /**
   * 发送消息到会话
   */
  sendMessage: async (conversationId, content) => {
    try {
      const message = await messageService.sendMessage({
        conversationId,
        content,
      });

      // 添加消息到列表
      get().addMessage(message);

      // 更新会话列表中的最后消息
      const { conversations } = get();
      const updatedConversations = conversations.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            lastMessage: {
              id: message.id,
              content: message.content,
              sender: {
                id: message.sender.id,
                username: message.sender.username,
                displayName: message.sender.displayName,
              },
              createdAt: message.createdAt,
            },
            lastMessageAt: message.createdAt,
          };
        }
        return conv;
      });

      // 将更新的会话移到顶部
      const sortedConversations = [...updatedConversations].sort(
        (a, b) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
      );

      set({ conversations: sortedConversations });

      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      return null;
    }
  },

  /**
   * 发送直接消息给用户
   */
  sendDirectMessage: async (userId, content) => {
    try {
      const message = await messageService.sendDirectMessage(userId, {
        content,
      });

      // 刷新会话列表以获取新会话
      await get().fetchConversations(true);

      return message;
    } catch (error) {
      console.error('Failed to send direct message:', error);
      return null;
    }
  },

  /**
   * 标记会话为已读
   */
  markAsRead: async (conversationId) => {
    try {
      await messageService.markAsRead(conversationId);

      // 更新本地状态
      const { conversations, unreadCount } = get();
      const conversation = conversations.find((c) => c.id === conversationId);
      const readCount = conversation?.unreadCount || 0;

      set({
        conversations: conversations.map((conv) =>
          conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
        ),
        unreadCount: Math.max(0, unreadCount - readCount),
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  /**
   * 添加新消息（来自 WebSocket 或发送成功）
   */
  addMessage: (message) => {
    const { messages, activeConversation } = get();

    // 只有当消息属于当前活跃会话时才添加
    if (activeConversation?.id === message.conversationId) {
      // 避免重复
      if (!messages.some((m) => m.id === message.id)) {
        set({ messages: [...messages, message] });
      }
    }
  },

  /**
   * 更新未读数量（来自 WebSocket）
   */
  updateUnreadCount: (count) => {
    set({ unreadCount: count });
  },

  /**
   * 减少特定会话的未读数
   */
  decrementUnreadCount: (conversationId, count) => {
    const { conversations, unreadCount } = get();
    set({
      conversations: conversations.map((conv) =>
        conv.id === conversationId
          ? { ...conv, unreadCount: Math.max(0, conv.unreadCount - count) }
          : conv
      ),
      unreadCount: Math.max(0, unreadCount - count),
    });
  },
}));

export default useMessageStore;
