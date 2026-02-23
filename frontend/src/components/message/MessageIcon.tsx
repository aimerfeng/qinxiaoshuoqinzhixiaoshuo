'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence, useAnimation } from 'motion/react';
import { useAuthStore } from '@/store/auth';
import { useMessageStore } from '@/store/message';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import MessageDropdown from './MessageDropdown';

/**
 * 私信图标组件
 *
 * 需求20: 私信系统
 * 任务20.2.1: 私信入口 - Header 中的消息图标
 * 任务20.2.4: 未读消息提示
 *
 * 功能:
 * - 显示消息图标
 * - 显示未读消息数量徽章
 * - 徽章动画效果（数量变化时弹跳）
 * - 超过99显示"99+"
 * - 定期轮询更新未读数
 * - 更新文档标题显示未读数
 * - 点击展开消息下拉面板
 */
export default function MessageIcon() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuthStore();
  const { fetchConversations } = useMessageStore();
  const badgeControls = useAnimation();
  const previousCountRef = useRef(0);

  // 使用未读通知 Hook
  const { unreadCount, refreshUnreadCount } = useUnreadNotifications({
    pollingInterval: 30000, // 30秒轮询
    enableTitleBadge: true,
    enableBrowserNotifications: false, // 默认关闭浏览器通知
    enableSoundNotifications: false, // 默认关闭声音
  });

  // 初始化获取会话列表
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations(true);
    }
  }, [isAuthenticated, fetchConversations]);

  // 未读数变化时触发徽章动画
  useEffect(() => {
    const prevCount = previousCountRef.current;
    
    if (unreadCount > 0 && unreadCount !== prevCount) {
      // 弹跳动画
      badgeControls.start({
        scale: [1, 1.3, 0.9, 1.1, 1],
        transition: {
          duration: 0.5,
          ease: 'easeInOut',
        },
      });
    }
    
    previousCountRef.current = unreadCount;
  }, [unreadCount, badgeControls]);

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 打开下拉框时刷新数据
  const handleToggle = useCallback(() => {
    if (!isOpen) {
      refreshUnreadCount();
      fetchConversations(true);
    }
    setIsOpen(!isOpen);
  }, [isOpen, refreshUnreadCount, fetchConversations]);

  // 关闭下拉框
  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  if (!isAuthenticated) return null;

  // 格式化显示的未读数
  const displayCount = unreadCount > 99 ? '99+' : unreadCount;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
        aria-label={`私信${unreadCount > 0 ? `，${unreadCount}条未读` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MessageCircle 
          className={`w-5 h-5 transition-colors ${
            unreadCount > 0 
              ? 'text-indigo-600 dark:text-indigo-400' 
              : 'text-gray-600 dark:text-gray-300'
          }`} 
        />

        {/* 未读数量徽章 */}
        <AnimatePresence mode="wait">
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 25,
              }}
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-medium text-white bg-red-500 rounded-full shadow-sm"
            >
              <motion.span animate={badgeControls}>
                {displayCount}
              </motion.span>
            </motion.span>
          )}
        </AnimatePresence>

        {/* 新消息脉冲动画 */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 1, opacity: 0.5 }}
              animate={{ 
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute -top-0.5 -right-0.5 w-[18px] h-[18px] bg-red-500 rounded-full pointer-events-none"
            />
          )}
        </AnimatePresence>
      </button>

      {/* 下拉面板 */}
      <AnimatePresence>
        {isOpen && <MessageDropdown onClose={handleClose} />}
      </AnimatePresence>
    </div>
  );
}
