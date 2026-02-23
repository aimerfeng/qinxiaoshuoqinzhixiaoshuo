'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { MessageCircle, Loader2, RefreshCw, Inbox, Settings } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/store/auth';
import { useMessageStore } from '@/store/message';
import {
  ConversationItem,
  ConversationSearch,
  ConversationSkeleton,
  NotificationSettings,
} from '@/components/message';

/**
 * 私信列表页面
 *
 * 需求20: 私信系统
 * 任务20.2.2: 会话列表页面
 * 任务20.2.4: 未读消息提示
 *
 * 功能:
 * - 显示所有会话列表
 * - 搜索/过滤会话
 * - 下拉刷新
 * - 无限滚动加载更多
 * - 空状态插画
 * - 加载骨架屏
 * - 通知设置
 */
export default function MessagesPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const {
    conversations,
    unreadCount,
    isLoading,
    hasMore,
    fetchConversations,
  } = useMessageStore();

  // 搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  // 下拉刷新状态
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  // 初始加载状态
  const [initialLoading, setInitialLoading] = useState(true);
  // 设置面板状态
  const [showSettings, setShowSettings] = useState(false);

  // 滚动容器引用
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/messages');
    }
  }, [authLoading, isAuthenticated, router]);

  // 初始加载会话列表
  useEffect(() => {
    if (isAuthenticated) {
      setInitialLoading(true);
      fetchConversations(true).finally(() => {
        setInitialLoading(false);
      });
    }
  }, [isAuthenticated, fetchConversations]);

  // 过滤会话（本地搜索）
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;

    const query = searchQuery.toLowerCase();
    return conversations.filter((conv) => {
      // 搜索会话标题
      if (conv.title?.toLowerCase().includes(query)) return true;

      // 搜索参与者名称
      const participantMatch = conv.participants.some(
        (p) =>
          p.displayName?.toLowerCase().includes(query) ||
          p.username.toLowerCase().includes(query)
      );
      if (participantMatch) return true;

      // 搜索最后消息内容
      if (conv.lastMessage?.content.toLowerCase().includes(query)) return true;

      return false;
    });
  }, [conversations, searchQuery]);

  // 下拉刷新处理
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchConversations(true);
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [isRefreshing, fetchConversations]);

  // 触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (container && container.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  // 触摸移动
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;

    if (diff > 0) {
      // 阻尼效果
      const dampedDistance = Math.min(diff * 0.5, 100);
      setPullDistance(dampedDistance);
    }
  }, []);

  // 触摸结束
  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
    isPulling.current = false;
  }, [pullDistance, handleRefresh]);

  // 无限滚动加载更多
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || isLoading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 100;

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      fetchConversations(false);
    }
  }, [isLoading, hasMore, fetchConversations]);

  // 删除会话（可选功能）
  const handleDeleteConversation = useCallback((conversationId: string) => {
    // TODO: 实现删除会话功能
    console.log('Delete conversation:', conversationId);
  }, []);

  // 静音会话（可选功能）
  const handleMuteConversation = useCallback((conversationId: string, muted: boolean) => {
    // TODO: 实现静音会话功能
    console.log('Mute conversation:', conversationId, muted);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <MessageCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                私信
              </h1>
              <p className="text-sm text-gray-500">
                共 {conversations.length} 个会话
                {unreadCount > 0 && `，${unreadCount} 条未读`}
              </p>
            </div>
          </div>

          {/* 设置按钮 */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="通知设置"
          >
            <Settings className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* 通知设置面板 */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 overflow-hidden"
            >
              <div className="p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <NotificationSettings />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 搜索框 */}
        <ConversationSearch
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="搜索会话、用户或消息..."
          className="mb-4"
        />

        {/* 会话列表容器 */}
        <div
          ref={scrollContainerRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onScroll={handleScroll}
          className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden relative"
          style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}
        >
          {/* 下拉刷新指示器 */}
          <AnimatePresence>
            {(pullDistance > 0 || isRefreshing) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: isRefreshing ? 50 : pullDistance,
                  opacity: 1,
                }}
                exit={{ height: 0, opacity: 0 }}
                className="flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 overflow-hidden"
              >
                <motion.div
                  animate={{ rotate: isRefreshing ? 360 : pullDistance * 3.6 }}
                  transition={
                    isRefreshing
                      ? { repeat: Infinity, duration: 1, ease: 'linear' }
                      : { duration: 0 }
                  }
                >
                  <RefreshCw
                    className={`w-5 h-5 ${
                      pullDistance > 60 || isRefreshing
                        ? 'text-indigo-500'
                        : 'text-gray-400'
                    }`}
                  />
                </motion.div>
                <span className="ml-2 text-sm text-gray-500">
                  {isRefreshing
                    ? '刷新中...'
                    : pullDistance > 60
                    ? '释放刷新'
                    : '下拉刷新'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 初始加载骨架屏 */}
          {initialLoading ? (
            <ConversationSkeleton count={6} />
          ) : filteredConversations.length === 0 ? (
            // 空状态
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-24 h-24 mb-6 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                <Inbox className="w-12 h-12 text-indigo-400 dark:text-indigo-500" />
              </div>
              {searchQuery ? (
                <>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    未找到匹配的会话
                  </p>
                  <p className="text-sm text-gray-500 text-center">
                    尝试使用其他关键词搜索
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 px-4 py-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                  >
                    清除搜索
                  </button>
                </>
              ) : (
                <>
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    暂无私信
                  </p>
                  <p className="text-sm text-gray-500 text-center max-w-xs">
                    去用户主页发起私信，开始与其他用户交流吧
                  </p>
                  <button
                    onClick={() => router.push('/plaza')}
                    className="mt-4 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
                  >
                    去广场看看
                  </button>
                </>
              )}
            </div>
          ) : (
            // 会话列表
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <AnimatePresence mode="popLayout">
                {filteredConversations.map((conversation, index) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <ConversationItem
                      conversation={conversation}
                      searchQuery={searchQuery}
                      onDelete={handleDeleteConversation}
                      onMute={handleMuteConversation}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* 加载更多指示器 */}
          {!initialLoading && hasMore && filteredConversations.length > 0 && (
            <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800">
              {isLoading ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  加载中...
                </div>
              ) : (
                <button
                  onClick={() => fetchConversations(false)}
                  className="w-full py-2 text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium"
                >
                  加载更多
                </button>
              )}
            </div>
          )}

          {/* 没有更多数据提示 */}
          {!initialLoading && !hasMore && filteredConversations.length > 5 && (
            <div className="px-4 py-3 text-center text-sm text-gray-400 border-t border-gray-100 dark:border-gray-800">
              已加载全部会话
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
