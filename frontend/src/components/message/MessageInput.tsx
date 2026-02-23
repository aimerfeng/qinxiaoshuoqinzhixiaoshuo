'use client';

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Image, Smile, Paperclip } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { Message } from '@/types/message';

interface MessageInputProps {
  onSend: (content: string, replyToId?: string) => Promise<void>;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

/**
 * 消息输入组件
 *
 * 需求20: 私信系统
 * 任务20.2.3: 聊天界面 - 消息输入组件
 *
 * 功能:
 * - 文本输入框
 * - 发送按钮（内容非空时启用）
 * - Enter 发送，Shift+Enter 换行
 * - 回复引用显示
 * - 字符限制指示器（可选）
 */
export default function MessageInput({
  onSend,
  replyTo,
  onCancelReply,
  disabled = false,
  placeholder = '输入消息...',
  maxLength = 500,
  className,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [content]);

  // 聚焦到回复
  useEffect(() => {
    if (replyTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyTo]);

  const handleSend = useCallback(async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSending || disabled) return;

    setIsSending(true);
    try {
      await onSend(trimmedContent, replyTo?.id);
      setContent('');
      onCancelReply?.();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  }, [content, isSending, disabled, onSend, replyTo, onCancelReply]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter 发送，Shift+Enter 换行
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      if (value.length <= maxLength) {
        setContent(value);
      }
    },
    [maxLength]
  );

  const canSend = content.trim().length > 0 && !isSending && !disabled;
  const showCharCount = content.length > maxLength * 0.8;

  return (
    <div className={cn('bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800', className)}>
      {/* 回复引用预览 */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <div className="w-1 h-8 bg-indigo-500 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  回复 {replyTo.sender.displayName || replyTo.sender.username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {replyTo.content}
                </p>
              </div>
              <button
                onClick={onCancelReply}
                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 输入区域 */}
      <div className="flex items-end gap-2 p-3">
        {/* 文本输入 */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full px-4 py-2.5 text-sm resize-none rounded-2xl',
              'bg-gray-100 dark:bg-gray-800',
              'text-gray-900 dark:text-white',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500/50',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-all'
            )}
            style={{ maxHeight: '120px' }}
          />

          {/* 字符计数 */}
          <AnimatePresence>
            {showCharCount && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={cn(
                  'absolute right-3 bottom-2 text-xs',
                  content.length >= maxLength
                    ? 'text-red-500'
                    : 'text-gray-400'
                )}
              >
                {content.length}/{maxLength}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* 发送按钮 */}
        <motion.button
          whileHover={canSend ? { scale: 1.05 } : {}}
          whileTap={canSend ? { scale: 0.95 } : {}}
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex-shrink-0 p-3 rounded-full transition-all',
            canSend
              ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md hover:shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          )}
        >
          {isSending ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
            />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </motion.button>
      </div>
    </div>
  );
}
