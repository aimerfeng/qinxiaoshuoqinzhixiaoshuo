'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, ArrowLeft } from 'lucide-react';
import Header from '@/components/layout/Header';
import { LibraryCard } from '@/components/library/LibraryCard';
import { libraryService } from '@/services/library.service';
import { cn } from '@/utils/cn';
import type { Library } from '@/types/library';

/**
 * 热度排行榜页面
 *
 * 需求7.5: 展示 Top 100 小说库
 *
 * 功能:
 * - 显示 Top 100 小说库排行榜
 * - 按热度分数降序排序
 * - 前三名特殊样式展示
 */
export default function RankingPage() {
  const router = useRouter();

  // 状态
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载排行榜数据
   * 使用 getLibraries 按热度排序获取 Top 100
   */
  const loadRanking = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await libraryService.getLibraries({
        sortBy: 'hotScore',
        sortOrder: 'desc',
        limit: 100,
        page: 1,
      });
      setLibraries(response.data);
    } catch (err: any) {
      setError(err.message || '加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * 初始加载
   */
  useEffect(() => {
    loadRanking();
  }, [loadRanking]);

  /**
   * 点击卡片跳转详情
   */
  const handleCardClick = (libraryId: string) => {
    router.push(`/libraries/${libraryId}`);
  };

  /**
   * 返回小说库列表
   */
  const handleBack = () => {
    router.push('/libraries');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/50 to-orange-50/30 dark:from-gray-900 dark:to-gray-900">
      <Header />

      {/* 页面头部 */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/50 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {/* 返回按钮 */}
            <button
              onClick={handleBack}
              className={cn(
                'flex items-center justify-center w-10 h-10 rounded-full',
                'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                'hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'
              )}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>

            {/* 标题 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">
                  热度排行榜
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Top 100 小说库
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 加载状态 */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">加载排行榜...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={loadRanking}
              className="px-4 py-2 bg-amber-500 text-white rounded-full hover:bg-amber-600 transition-colors"
            >
              重试
            </button>
          </div>
        )}

        {/* 空状态 */}
        {!isLoading && !error && libraries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-amber-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              暂无排行数据
            </p>
          </div>
        )}

        {/* 排行榜网格 */}
        {!isLoading && !error && libraries.length > 0 && (
          <AnimatePresence mode="popLayout">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {libraries.map((library, index) => (
                <LibraryCard
                  key={library.id}
                  library={library}
                  rank={index + 1}
                  onClick={() => handleCardClick(library.id)}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
