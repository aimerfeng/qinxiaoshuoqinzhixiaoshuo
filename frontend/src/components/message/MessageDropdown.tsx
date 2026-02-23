'use client';

import { motion } from 'motion/react';
import { MessageCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useMessageStore } from '@/store/message';
import ConversationItem from './ConversationItem';

interface MessageDropdownProps {
  onClose: () => void;
}

/**
 * 私信下拉面板
 *
 * 需求20: 私信系统
 * 任务20.2.1: 私信入口 - 消息下拉面板
 *
 * 功能:
 * - 显示最近会话列表
 * - 显示未读消息数
 * - 点击会话跳转到聊天页面
 * - 查看全部消息入口
 */
export default function MessageDropdown({ onClose }: MessageDropdownProps) {
  const { conversations, unreadCount, isLoading } = useMessageStore();

  // 显示最近 5 条会话
  const recentConversations = conversations.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white">
          私信
          {unreadCount > 0 && (
            <span className="ml-2 text-sm text-gray-500">
              ({unreadCount}条未读)
            </span>
          )}
        </h3>
      </div>

      {/* 会话列表 */}
      <div className="max-h-[400px] overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recentConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mb-2 text-gray-300" />
            <p>暂无私信</p>
            <p className="text-sm text-gray-400 mt-1">
              去用户主页发起私信吧
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                compact
                onClick={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部 */}
      {conversations.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <Link
            href="/messages"
            onClick={onClose}
            className="flex items-center justify-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            查看全部私信
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
