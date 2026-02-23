'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messageService } from '@/services/message';
import type {
  Conversation,
  ConversationQueryParams,
  Message,
  MessageQueryParams,
  SendMessageRequest,
} from '@/types/message';

/**
 * 私信相关 React Query Hooks
 *
 * 需求20: 私信系统
 * 任务20.2.1: 私信入口 - API Hooks
 */

// Query Keys
export const messageKeys = {
  all: ['messages'] as const,
  conversations: () => [...messageKeys.all, 'conversations'] as const,
  conversationList: (params?: ConversationQueryParams) =>
    [...messageKeys.conversations(), params] as const,
  conversation: (id: string) => [...messageKeys.conversations(), id] as const,
  messages: (conversationId: string) =>
    [...messageKeys.all, 'messages', conversationId] as const,
  messageList: (conversationId: string, params?: MessageQueryParams) =>
    [...messageKeys.messages(conversationId), params] as const,
  unreadCount: () => [...messageKeys.all, 'unreadCount'] as const,
};

/**
 * 获取会话列表
 */
export function useConversations(params?: ConversationQueryParams) {
  return useQuery({
    queryKey: messageKeys.conversationList(params),
    queryFn: () => messageService.getConversations(params),
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * 获取单个会话详情
 */
export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: messageKeys.conversation(conversationId),
    queryFn: () => messageService.getConversation(conversationId),
    enabled: !!conversationId,
  });
}

/**
 * 获取会话消息历史
 */
export function useMessages(
  conversationId: string,
  params?: MessageQueryParams
) {
  return useQuery({
    queryKey: messageKeys.messageList(conversationId, params),
    queryFn: () => messageService.getMessages(conversationId, params),
    enabled: !!conversationId,
  });
}

/**
 * 获取未读消息总数
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: messageKeys.unreadCount(),
    queryFn: () => messageService.getUnreadCount(),
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * 发送消息 Mutation
 */
export function useSendMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SendMessageRequest) =>
      messageService.sendMessage(request),
    onSuccess: (message: Message) => {
      // 更新消息列表缓存
      queryClient.invalidateQueries({
        queryKey: messageKeys.messages(message.conversationId),
      });
      // 更新会话列表缓存
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations(),
      });
    },
  });
}

/**
 * 发送直接消息 Mutation
 */
export function useSendDirectMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      content,
    }: {
      userId: string;
      content: string;
    }) => messageService.sendDirectMessage(userId, { content }),
    onSuccess: () => {
      // 刷新会话列表
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations(),
      });
      // 刷新未读数
      queryClient.invalidateQueries({
        queryKey: messageKeys.unreadCount(),
      });
    },
  });
}

/**
 * 标记会话为已读 Mutation
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (conversationId: string) =>
      messageService.markAsRead(conversationId),
    onSuccess: (_, conversationId) => {
      // 更新会话缓存
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversation(conversationId),
      });
      // 更新会话列表缓存
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations(),
      });
      // 更新未读数
      queryClient.invalidateQueries({
        queryKey: messageKeys.unreadCount(),
      });
    },
  });
}

/**
 * 创建会话 Mutation
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: messageService.createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations(),
      });
    },
  });
}

export default {
  useConversations,
  useConversation,
  useMessages,
  useUnreadCount,
  useSendMessage,
  useSendDirectMessage,
  useMarkAsRead,
  useCreateConversation,
};
