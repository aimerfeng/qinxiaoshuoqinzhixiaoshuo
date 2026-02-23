'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '@/store/auth';
import { useMessageStore } from '@/store/message';
import { messageService } from '@/services/message';
import {
  ChatHeader,
  MessageList,
  MessageInput,
} from '@/components/message';
import type { Conversation, Message } from '@/types/message';

/**
 * 聊天界面页面
 *
 * 需求20: 私信系统
 * 任务20.2.3: 聊天界面
 *
 * 功能:
 * - 头部显示会话信息（参与者名称/头像，返回按钮）
 * - 消息列表（无限滚动加载历史消息）
 * - 消息输入区域
 * - 新消息自动滚动到底部
 * - 打开会话时标记为已读
 */
export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();
  const {
    messages,
    isLoadingMessages,
    hasMoreMessages,
    fetchMessages,
    sendMessage,
    markAsRead,
    setActiveConversation,
  } = useMessageStore();

  // 会话信息
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 回复状态
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // 是否已标记已读
  const hasMarkedRead = useRef(false);

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=/messages/${conversationId}`);
    }
  }, [authLoading, isAuthenticated, router, conversationId]);

  // 加载会话信息
  useEffect(() => {
    if (!isAuthenticated || !conversationId) return;

    const loadConversation = async () => {
      setIsLoadingConversation(true);
      setError(null);

      try {
        const conv = await messageService.getConversation(conversationId);
        setConversation(conv);
        setActiveConversation(conv);
      } catch (err) {
        console.error('Failed to load conversation:', err);
        setError('无法加载会话');
      } finally {
        setIsLoadingConversation(false);
      }
    };

    loadConversation();

    return () => {
      setActiveConversation(null);
    };
  }, [isAuthenticated, conversationId, setActiveConversation]);

  // 加载消息
  useEffect(() => {
    if (!isAuthenticated || !conversationId) return;

    fetchMessages(conversationId, true);
  }, [isAuthenticated, conversationId, fetchMessages]);

  // 标记已读
  useEffect(() => {
    if (!conversation || hasMarkedRead.current) return;

    if (conversation.unreadCount > 0) {
      markAsRead(conversationId);
      hasMarkedRead.current = true;
    }
  }, [conversation, conversationId, markAsRead]);

  // 加载更多消息
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMessages && hasMoreMessages) {
      fetchMessages(conversationId, false);
    }
  }, [conversationId, isLoadingMessages, hasMoreMessages, fetchMessages]);

  // 发送消息
  const handleSend = useCallback(
    async (content: string, _replyToId?: string) => {
      // TODO: Support reply-to when backend supports it
      await sendMessage(conversationId, content);
    },
    [conversationId, sendMessage]
  );

  // 回复消息
  const handleReply = useCallback((message: Message) => {
    setReplyTo(message);
  }, []);

  // 取消回复
  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  // 复制消息
  const handleCopy = useCallback((content: string) => {
    // 可以添加 toast 提示
    console.log('Copied:', content);
  }, []);

  // 查看用户资料
  const handleInfoClick = useCallback(() => {
    if (!conversation) return;

    // 一对一会话跳转到用户主页
    if (!conversation.isGroup) {
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== user?.id
      );
      if (otherParticipant) {
        router.push(`/user/${otherParticipant.userId}`);
      }
    }
    // 群聊可以显示群信息弹窗（暂不实现）
  }, [conversation, user, router]);

  // 加载中状态
  if (authLoading || isLoadingConversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <span className="text-sm text-gray-500">加载中...</span>
        </motion.div>
      </div>
    );
  }

  // 未登录
  if (!isAuthenticated) {
    return null;
  }

  // 错误状态
  if (error || !conversation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {error || '会话不存在'}
          </p>
          <button
            onClick={() => router.push('/messages')}
            className="mt-4 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all"
          >
            返回私信列表
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* 头部 */}
      <ChatHeader
        conversation={conversation}
        currentUserId={user?.id}
        onInfoClick={handleInfoClick}
      />

      {/* 消息列表 */}
      <MessageList
        messages={messages}
        currentUserId={user?.id || ''}
        isLoading={isLoadingMessages}
        hasMore={hasMoreMessages}
        onLoadMore={handleLoadMore}
        onReply={handleReply}
        onCopy={handleCopy}
        className="flex-1"
      />

      {/* 消息输入 */}
      <MessageInput
        onSend={handleSend}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
        placeholder="输入消息..."
      />
    </div>
  );
}
