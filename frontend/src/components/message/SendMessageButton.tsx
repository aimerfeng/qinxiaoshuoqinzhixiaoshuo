'use client';

import { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/auth';
import { useSendDirectMessage } from '@/hooks/useMessages';

interface SendMessageButtonProps {
  /** 目标用户 ID */
  userId: string;
  /** 目标用户名 */
  username: string;
  /** 目标用户显示名称 */
  displayName?: string | null;
  /** 按钮变体 */
  variant?: 'primary' | 'outline' | 'ghost';
  /** 按钮大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 是否只显示图标 */
  iconOnly?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 发送私信按钮组件
 *
 * 需求20: 私信系统
 * 任务20.2.1: 私信入口 - 用户主页发私信按钮
 *
 * 功能:
 * - 点击打开发送私信对话框
 * - 发送成功后跳转到聊天页面
 * - 支持多种按钮样式
 */
export default function SendMessageButton({
  userId,
  username,
  displayName,
  variant = 'ghost',
  size = 'sm',
  iconOnly = false,
  className,
}: SendMessageButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const sendDirectMessage = useSendDirectMessage();

  // 不显示给自己
  if (user?.id === userId) return null;

  // 未登录不显示
  if (!isAuthenticated) return null;

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      await sendDirectMessage.mutateAsync({
        userId,
        content: message.trim(),
      });

      setMessage('');
      setIsOpen(false);

      // 跳转到消息页面
      router.push('/messages');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsOpen(true)}
        className={className}
        aria-label={`发私信给 ${displayName || username}`}
      >
        <MessageCircle className={iconOnly ? 'w-4 h-4' : 'w-4 h-4 mr-1.5'} />
        {!iconOnly && '发私信'}
      </Button>

      {/* 发送私信对话框 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 背景遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* 对话框 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-xl z-50 overflow-hidden"
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  发私信给 {displayName || username}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* 内容 */}
              <div className="p-4">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息内容..."
                  className="w-full h-32 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  maxLength={500}
                  autoFocus
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    {message.length}/500
                  </span>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSend}
                    disabled={!message.trim() || sendDirectMessage.isPending}
                    isLoading={sendDirectMessage.isPending}
                    className="rounded-xl"
                  >
                    <Send className="w-4 h-4 mr-1.5" />
                    发送
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
