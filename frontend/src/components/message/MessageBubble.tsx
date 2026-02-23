'use client';

import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Check, CheckCheck, Reply, Copy, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Message, MessageSender } from '@/types/message';

interface MessageBubbleProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  onReply?: (message: Message) => void;
  onCopy?: (content: string) => void;
  onDelete?: (messageId: string) => void;
  className?: string;
}

/**
 * 格式化消息时间
 */
function formatMessageTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 消息气泡组件
 *
 * 需求20: 私信系统
 * 任务20.2.3: 聊天界面 - 消息气泡组件
 *
 * 功能:
 * - 区分发送/接收消息样式（右蓝/左灰）
 * - 显示发送者头像（接收消息）
 * - 点击/悬停显示时间
 * - 支持回复引用显示
 * - 长按/右键菜单（回复、复制、删除）
 */
export default function MessageBubble({
  message,
  isOwn,
  showAvatar = true,
  onReply,
  onCopy,
  onDelete,
  className,
}: MessageBubbleProps) {
  const [showTime, setShowTime] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleClick = useCallback(() => {
    setShowTime((prev) => !prev);
  }, []);

  const handleLongPress = useCallback(() => {
    setShowMenu(true);
  }, []);

  const handleCopy = useCallback(() => {
    onCopy?.(message.content);
    setShowMenu(false);
  }, [message.content, onCopy]);

  const handleReply = useCallback(() => {
    onReply?.(message);
    setShowMenu(false);
  }, [message, onReply]);

  const handleDelete = useCallback(() => {
    onDelete?.(message.id);
    setShowMenu(false);
  }, [message.id, onDelete]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex gap-2 px-4 py-1',
        isOwn ? 'flex-row-reverse' : 'flex-row',
        className
      )}
    >
      {/* 头像 - 仅接收消息显示 */}
      {!isOwn && showAvatar && (
        <div className="flex-shrink-0 w-8 h-8 mt-1">
          {message.sender.avatar ? (
            <img
              src={message.sender.avatar}
              alt={message.sender.displayName || message.sender.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white text-xs font-medium">
              {(message.sender.displayName || message.sender.username).charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      )}

      {/* 消息内容 */}
      <div className={cn('flex flex-col max-w-[70%]', isOwn ? 'items-end' : 'items-start')}>
        {/* 回复引用 */}
        {message.replyTo && (
          <div
            className={cn(
              'text-xs px-3 py-1.5 mb-1 rounded-lg max-w-full truncate',
              isOwn
                ? 'bg-indigo-400/30 text-indigo-100'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
            )}
          >
            <span className="font-medium">
              {message.replyTo.sender.displayName || message.replyTo.sender.username}:
            </span>{' '}
            {message.replyTo.content.length > 50
              ? message.replyTo.content.slice(0, 50) + '...'
              : message.replyTo.content}
          </div>
        )}

        {/* 消息气泡 */}
        <motion.div
          onClick={handleClick}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowMenu(true);
          }}
          whileTap={{ scale: 0.98 }}
          className={cn(
            'relative px-4 py-2.5 rounded-2xl cursor-pointer select-none',
            isOwn
              ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-br-md'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
          )}
        >
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {message.content}
          </p>
        </motion.div>

        {/* 时间戳 */}
        <motion.div
          initial={false}
          animate={{
            height: showTime ? 'auto' : 0,
            opacity: showTime ? 1 : 0,
          }}
          className="overflow-hidden"
        >
          <div className="flex items-center gap-1.5 mt-1 px-1">
            <span className="text-xs text-gray-400">
              {formatMessageTime(message.createdAt)}
            </span>
            {isOwn && (
              <CheckCheck className="w-3.5 h-3.5 text-indigo-400" />
            )}
          </div>
        </motion.div>

        {/* 操作菜单 */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={cn(
                'absolute z-50 mt-1 py-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700',
                isOwn ? 'right-0' : 'left-0'
              )}
            >
              <button
                onClick={handleReply}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Reply className="w-4 h-4" />
                回复
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <Copy className="w-4 h-4" />
                复制
              </button>
              {isOwn && onDelete && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
            </motion.div>
          </>
        )}
      </div>

      {/* 占位符 - 保持对齐 */}
      {!isOwn && !showAvatar && <div className="w-8 flex-shrink-0" />}
    </motion.div>
  );
}
