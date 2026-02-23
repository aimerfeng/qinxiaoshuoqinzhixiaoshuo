'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, Phone, Video, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import type { Conversation } from '@/types/message';

interface ChatHeaderProps {
  conversation: Conversation;
  currentUserId?: string;
  onInfoClick?: () => void;
  className?: string;
}

/**
 * 聊天界面头部组件
 *
 * 需求20: 私信系统
 * 任务20.2.3: 聊天界面 - 头部组件
 *
 * 功能:
 * - 返回按钮
 * - 对方用户头像和名称
 * - 在线状态指示（可选）
 * - 更多操作菜单
 */
export default function ChatHeader({
  conversation,
  currentUserId,
  onInfoClick,
  className,
}: ChatHeaderProps) {
  const router = useRouter();

  // 获取对方用户信息（一对一会话）
  const otherParticipant = conversation.participants.find(
    (p) => p.userId !== currentUserId
  );

  // 会话显示名称
  const displayName = conversation.isGroup
    ? conversation.title || '群聊'
    : otherParticipant?.displayName || otherParticipant?.username || '未知用户';

  // 头像
  const avatar = conversation.isGroup ? null : otherParticipant?.avatar;

  // 群聊参与者数量
  const participantCount = conversation.participants.length;

  const handleBack = () => {
    router.push('/messages');
  };

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn(
        'sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg',
        'border-b border-gray-200 dark:border-gray-800',
        'px-4 py-3',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* 返回按钮 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="返回"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </motion.button>

        {/* 头像 */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex-shrink-0 cursor-pointer"
          onClick={onInfoClick}
        >
          {conversation.isGroup ? (
            // 群聊头像
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium">
              {displayName.charAt(0).toUpperCase()}
            </div>
          ) : avatar ? (
            <img
              src={avatar}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-white dark:ring-gray-900"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </motion.div>

        {/* 用户信息 */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onInfoClick}
        >
          <h2 className="font-semibold text-gray-900 dark:text-white truncate">
            {displayName}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {conversation.isGroup
              ? `${participantCount} 位成员`
              : '点击查看资料'}
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          {/* 更多操作 */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onInfoClick}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="更多"
          >
            <Info className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </motion.button>
        </div>
      </div>
    </motion.header>
  );
}
