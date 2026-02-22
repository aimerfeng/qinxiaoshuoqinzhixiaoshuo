'use client';

import { useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, RefreshCw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { usePlazaStore } from '@/store/plaza';
import { plazaService } from '@/services/plaza';
import {
  Card,
  FeedTabs,
  CreateCardModal,
  CommentList,
  PullToRefreshIndicator,
} from '@/components/plaza';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import type { FeedType } from '@/types/plaza';

export default function PlazaPage() {
  const searchParams = useSearchParams();
  const highlightCardId = searchParams.get('highlight');
  const { isAuthenticated } = useAuthStore();
  const {
    feedType,
    cards,
    nextCursor,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    setFeedType,
    setCards,
    appendCards,
    setNextCursor,
    setMeta,
    setLoading,
    setRefreshing,
    setLoadingMore,
    setError,
    reset,
  } = usePlazaStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeCommentCardId, setActiveCommentCardId] = useState<string | null>(null);

  // 加载信息流
  const loadFeed = useCallback(async (type: FeedType, cursor?: string) => {
    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await plazaService.getFeed(type, cursor);
      
      if (cursor) {
        appendCards(response.cards);
      } else {
        setCards(response.cards);
      }
      setNextCursor(response.nextCursor);
      setMeta(response.meta);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [setLoading, setLoadingMore, setError, setCards, appendCards, setNextCursor, setMeta]);

  // 刷新
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const response = await plazaService.getFeed(feedType);
      setCards(response.cards);
      setNextCursor(response.nextCursor);
      setMeta(response.meta);
    } catch (err: any) {
      setError(err.message || '刷新失败');
    } finally {
      setRefreshing(false);
    }
  }, [feedType, setRefreshing, setCards, setNextCursor, setMeta, setError]);

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (nextCursor && !isLoadingMore) {
      loadFeed(feedType, nextCursor);
    }
  }, [feedType, nextCursor, isLoadingMore, loadFeed]);

  // 切换 Tab
  const handleTabChange = useCallback((type: FeedType) => {
    if (type !== feedType) {
      setFeedType(type);
      loadFeed(type);
    }
  }, [feedType, setFeedType, loadFeed]);

  // 初始加载
  useEffect(() => {
    loadFeed(feedType);
    return () => reset();
  }, []);

  // 无限滚动
  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore: !!nextCursor,
    isLoading: isLoadingMore,
  });

  // 下拉刷新
  const { containerRef, pullDistance, isRefreshing: isPullRefreshing } = usePullToRefresh({
    onRefresh: handleRefresh,
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-purple-50/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100/50">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              广场
            </h1>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <RefreshCw
                className={`w-5 h-5 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
          
          <FeedTabs activeTab={feedType} onTabChange={handleTabChange} />
        </div>
      </header>

      {/* Content */}
      <main
        ref={containerRef}
        className="max-w-2xl mx-auto px-4 py-4 pb-24"
      >
        {/* Pull to Refresh Indicator */}
        <PullToRefreshIndicator
          pullDistance={pullDistance}
          isRefreshing={isPullRefreshing}
        />

        {/* Loading State */}
        {isLoading && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        )}

        {/* Error State */}
        {error && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => loadFeed(feedType)}
              className="px-4 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-4xl">📭</span>
            </div>
            <p className="text-gray-500 mb-2">
              {feedType === 'following' ? '关注一些用户来查看他们的动态' : '暂无内容'}
            </p>
            {isAuthenticated && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full hover:shadow-md transition-shadow"
              >
                发布第一条动态
              </button>
            )}
          </div>
        )}

        {/* Cards List */}
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {cards.map((card) => (
              <Card
                key={card.id}
                card={card}
                onCommentClick={setActiveCommentCardId}
                isHighlighted={card.id === highlightCardId}
              />
            ))}
          </div>
        </AnimatePresence>

        {/* Load More Trigger */}
        <div ref={loadMoreRef} className="h-10" />

        {/* Loading More Indicator */}
        {isLoadingMore && (
          <div className="flex items-center justify-center py-4">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* No More Content */}
        {!nextCursor && cards.length > 0 && !isLoading && (
          <p className="text-center text-gray-400 py-4 text-sm">
            没有更多内容了
          </p>
        )}
      </main>

      {/* FAB - Create Card */}
      {isAuthenticated && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full shadow-lg flex items-center justify-center text-white z-50"
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      {/* Create Card Modal */}
      <CreateCardModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Comment List Modal */}
      <AnimatePresence>
        {activeCommentCardId && (
          <CommentList
            cardId={activeCommentCardId}
            isOpen={!!activeCommentCardId}
            onClose={() => setActiveCommentCardId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
