'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { Trash2, BellOff, Bell } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/auth';
import type { Conversation } from '@/types/message';

interface ConversationItemProps {
  conversation: Conversation;
  compact?: boolean;
  onClick?: () => void;
  onDelete?: (conversationId: string) => void;
  onMute?: (conversationId: string, muted: boolean) => void;
  searchQuery?: string;
}

/**
 * 格式化相对时间
 * 显示: "刚刚", "5分钟前", "昨天", "3天前" 等
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}周前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
    });
  }
}

/**
 * 高亮搜索关键词
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * 会话列表项组件
 *
 * 需求20: 私信系统
 * 任务20.2.2: 会话列表页面 - 增强版会话列表项
 *
 * 功能:
 * - 显示会话参与者头像和名称
 * - 显示最后消息预览（截断）
 * - 显示相对时间（"刚刚", "5分钟前", "昨天"）
 * - 显示未读消息数徽章
 * - 高亮未读会话
 * - 滑动操作（删除、静音）- 可选
 * - 搜索关键词高亮
 */
export default function ConversationItem({
  conversation,
  compact = false,
  onClick,
  onDelete,
  onMute,
  searchQuery = '',
}: ConversationItemProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [isMuted, setIsMuted] = useState(false);
  const constraintsRef = useRef<HTMLDivElement>(null);

  // 滑动动画值
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -50], [1, 0]);
  const muteOpacity = useTransform(x, [50, 100], [0, 1]);

  // 获取对方用户信息（一对一会话）
  const otherParticipant = conversation.participants.find(
    (p) => p.userId !== user?.id
  );

  // 会话显示名称
  const displayName = conversation.isGroup
    ? conversation.title || '群聊'
    : otherParticipant?.displayName || otherParticipant?.username || '未知用户';

  // 头像
  const avatar = conversation.isGroup
    ? null
    : otherParticipant?.avatar;

  // 群聊头像（显示多个参与者）
  const groupAvatars = conversation.isGroup
    ? conversation.participants.slice(0, 3)
    : [];

  const handleClick = useCallback(() => {
    onClick?.();
    router.push(`/messages/${conversation.id}`);
  }, [onClick, router, conversation.id]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 80;

      if (info.offset.x < -threshold && onDelete) {
        onDelete(conversation.id);
      } else if (info.offset.x > threshold && onMute) {
        setIsMuted(!isMuted);
        onMute(conversation.id, !isMuted);
      }
    },
    [conversation.id, isMuted, onDelete, onMute]
  );

  const hasUnread = conversation.unreadCount > 0;

  // 消息预览内容
  const messagePreview = conversation.lastMessage?.content || '暂无消息';
  const truncatedPreview = messagePreview.length > 30
    ? messagePreview.slice(0, 30) + '...'
    : messagePreview;

  return (
    <div ref={constraintsRef} className="relative overflow-hidden">
      {/* 滑动操作背景 */}
      {(onDelete || onMute) && (
        <>
          {/* 左滑删除 */}
          <motion.div
            style={{ opacity: deleteOpacity }}
            className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </motion.div>

          {/* 右滑静音 */}
          <motion.div
            style={{ opacity: muteOpacity }}
            className="absolute inset-y-0 left-0 w-20 bg-gray-500 flex items-center justify-center"
          >
            {isMuted ? (
              <Bell className="w-5 h-5 text-white" />
            ) : (
              <BellOff className="w-5 h-5 text-white" />
            )}
          </motion.div>
        </>
      )}

      {/* 会话内容 */}
      <motion.button
        onClick={handleClick}
        drag={onDelete || onMute ? 'x' : false}
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={cn(
          'w-full flex items-start gap-3 text-left transition-colors relative',
          'bg-white dark:bg-gray-900',
          'hover:bg-gray-50 dark:hover:bg-gray-800/50',
          hasUnread && 'bg-indigo-50/50 dark:bg-indigo-950/20',
          compact ? 'px-4 py-3' : 'px-4 py-4'
        )}
      >
        {/* 未读指示器 */}
        {hasUnread && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-r" />
        )}

        {/* 头像 */}
        {conversation.isGroup && groupAvatars.length > 1 ? (
          // 群聊多头像
          <div
            className={cn(
              'flex-shrink-0 relative',
              compact ? 'w-10 h-10' : 'w-12 h-12'
            )}
          >
            {groupAvatars.slice(0, 2).map((participant, index) => (
              <div
                key={participant.id}
                className={cn(
                  'absolute rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium border-2 border-white dark:border-gray-900',
                  compact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm',
                  index === 0 ? 'top-0 left-0' : 'bottom-0 right-0'
                )}
              >
                {participant.avatar ? (
                  <img
                    src={participant.avatar}
                    alt={participant.displayName || participant.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  (participant.displayName || participant.username).charAt(0).toUpperCase()
                )}
              </div>
            ))}
          </div>
        ) : (
          // 单头像
          <div
            className={cn(
              'flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium',
              compact ? 'w-10 h-10 text-sm' : 'w-12 h-12'
            )}
          >
            {avatar ? (
              <img
                src={avatar}
                alt={displayName}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>
        )}

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'font-medium truncate',
                hasUnread
                  ? 'text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-200',
                compact ? 'text-sm' : ''
              )}
            >
              {highlightText(displayName, searchQuery)}
            </span>
            {conversation.lastMessage && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                {formatRelativeTime(conversation.lastMessage.createdAt)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 mt-0.5">
            <p
              className={cn(
                'truncate',
                hasUnread
                  ? 'text-gray-700 dark:text-gray-300 font-medium'
                  : 'text-gray-500 dark:text-gray-400',
                compact ? 'text-xs' : 'text-sm'
              )}
            >
              {conversation.lastMessage ? (
                <>
                  {conversation.lastMessage.sender.id === user?.id && (
                    <span className="text-gray-400">我: </span>
                  )}
                  {highlightText(truncatedPreview, searchQuery)}
                </>
              ) : (
                '暂无消息'
              )}
            </p>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {/* 静音图标 */}
              {isMuted && (
                <BellOff className="w-3.5 h-3.5 text-gray-400" />
              )}

              {/* 未读数量徽章 */}
              {hasUnread && (
                <span
                  className={cn(
                    'min-w-[18px] h-[18px] px-1.5 flex items-center justify-center text-xs font-medium text-white bg-red-500 rounded-full',
                    compact ? 'text-2xs' : ''
                  )}
                >
                  {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.button>
    </div>
  );
}
