'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Message } from '@/types/message';
import MessageBubble from './MessageBubble';
import MessageDateDivider from './MessageDateDivider';
import TypingIndicator from './TypingIndicator';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onReply?: (message: Message) => void;
  onCopy?: (content: string) => void;
  onDelete?: (messageId: string) => void;
  typingUser?: string | null;
  className?: string;
}

/**
 * 判断两条消息是否需要日期分隔
 */
function shouldShowDateDivider(
  currentMsg: Message,
  prevMsg: Message | null
): boolean {
  if (!prevMsg) return true;

  const currentDate = new Date(currentMsg.createdAt);
  const prevDate = new Date(prevMsg.createdAt);

  return (
    currentDate.getFullYear() !== prevDate.getFullYear() ||
    currentDate.getMonth() !== prevDate.getMonth() ||
    currentDate.getDate() !== prevDate.getDate()
  );
}

/**
 * 判断是否显示头像（连续消息不重复显示）
 */
function shouldShowAvatar(
  currentMsg: Message,
  nextMsg: Message | null
): boolean {
  if (!nextMsg) return true;
  if (currentMsg.sender.id !== nextMsg.sender.id) return true;

  // 超过5分钟的消息显示头像
  const currentTime = new Date(currentMsg.createdAt).getTime();
  const nextTime = new Date(nextMsg.createdAt).getTime();
  return nextTime - currentTime > 5 * 60 * 1000;
}

/**
 * 消息列表组件
 *
 * 需求20: 私信系统
 * 任务20.2.3: 聊天界面 - 消息列表组件
 *
 * 功能:
 * - 消息列表渲染
 * - 日期分隔显示
 * - 向上滚动加载更多历史消息
 * - 新消息自动滚动到底部
 * - 滚动到底部按钮
 * - 输入中指示器
 */
export default function MessageList({
  messages,
  currentUserId,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  onReply,
  onCopy,
  onDelete,
  typingUser,
  className,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const prevMessagesLength = useRef(messages.length);

  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    bottomRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // 监听滚动
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;

    // 检查是否接近底部
    const nearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setIsNearBottom(nearBottom);
    setShowScrollButton(!nearBottom);

    // 检查是否滚动到顶部，加载更多
    if (scrollTop < 50 && hasMore && !isLoading && onLoadMore) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  // 新消息时自动滚动
  useEffect(() => {
    if (messages.length > prevMessagesLength.current && isNearBottom) {
      scrollToBottom();
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length, isNearBottom, scrollToBottom]);

  // 初始滚动到底部
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom(false);
    }
  }, []);

  // 复制消息
  const handleCopy = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
    onCopy?.(content);
  }, [onCopy]);

  // 处理消息分组和日期分隔
  const processedMessages = useMemo(() => {
    return messages.map((msg, index) => ({
      message: msg,
      showDateDivider: shouldShowDateDivider(msg, messages[index - 1] || null),
      showAvatar: shouldShowAvatar(msg, messages[index + 1] || null),
    }));
  }, [messages]);

  return (
    <div className={cn('relative flex-1 overflow-hidden', className)}>
      {/* 消息列表 */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overscroll-contain"
      >
        {/* 加载更多指示器 */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-4"
            >
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span className="ml-2 text-sm text-gray-500">加载中...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 没有更多消息提示 */}
        {!hasMore && messages.length > 0 && (
          <div className="text-center py-4 text-xs text-gray-400">
            已加载全部消息
          </div>
        )}

        {/* 消息列表 */}
        <div className="py-2">
          {processedMessages.map(({ message, showDateDivider, showAvatar }) => (
            <div key={message.id}>
              {showDateDivider && (
                <MessageDateDivider date={new Date(message.createdAt)} />
              )}
              <MessageBubble
                message={message}
                isOwn={message.sender.id === currentUserId}
                showAvatar={showAvatar}
                onReply={onReply}
                onCopy={handleCopy}
                onDelete={onDelete}
              />
            </div>
          ))}
        </div>

        {/* 输入中指示器 */}
        <AnimatePresence>
          {typingUser && <TypingIndicator username={typingUser} />}
        </AnimatePresence>

        {/* 底部锚点 */}
        <div ref={bottomRef} />
      </div>

      {/* 滚动到底部按钮 */}
      <AnimatePresence>
        {showScrollButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            onClick={() => scrollToBottom()}
            className={cn(
              'absolute bottom-4 right-4 p-3 rounded-full',
              'bg-white dark:bg-gray-800 shadow-lg',
              'border border-gray-200 dark:border-gray-700',
              'hover:bg-gray-50 dark:hover:bg-gray-700',
              'transition-colors'
            )}
          >
            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* 空状态 */}
      {messages.length === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              开始聊天吧
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
