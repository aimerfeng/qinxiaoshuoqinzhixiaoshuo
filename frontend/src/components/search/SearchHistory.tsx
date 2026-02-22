'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, TrendingUp, X, Trash2 } from 'lucide-react';
import { searchService } from '@/services/search';
import type { SearchHistoryItem } from '@/types/search';
import { useAuthStore } from '@/store/auth';

interface SearchHistoryProps {
  onSelect: (query: string) => void;
}

export function SearchHistory({ onSelect }: SearchHistoryProps) {
  const { isAuthenticated } = useAuthStore();
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [popularSearches, setPopularSearches] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);

  // 获取搜索历史
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const response = await searchService.getSearchHistory(10);
        setHistory(response.history);
      } catch (error) {
        console.error('Failed to fetch search history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [isAuthenticated]);

  // 获取热门搜索
  useEffect(() => {
    const fetchPopular = async () => {
      setIsLoadingPopular(true);
      try {
        const response = await searchService.getPopularSearches(10);
        setPopularSearches(response.searches);
      } catch (error) {
        console.error('Failed to fetch popular searches:', error);
      } finally {
        setIsLoadingPopular(false);
      }
    };

    fetchPopular();
  }, []);

  // 删除单条历史
  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await searchService.deleteSearchHistory(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete history:', error);
    }
  };

  // 清空所有历史
  const handleClearAllHistory = async () => {
    try {
      await searchService.deleteSearchHistory();
      setHistory([]);
    } catch (error) {
      console.error('Failed to clear history:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* 搜索历史 */}
      {isAuthenticated && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">搜索历史</h2>
            </div>
            {history.length > 0 && (
              <button
                onClick={handleClearAllHistory}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                清空
              </button>
            )}
          </div>

          {isLoadingHistory ? (
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-9 w-24 bg-gray-200 rounded-full animate-pulse"
                />
              ))}
            </div>
          ) : history.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {history.map((item, index) => (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onSelect(item.query)}
                  className="group flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                >
                  <span>{item.query}</span>
                  <button
                    onClick={(e) => handleDeleteHistory(item.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded-full hover:bg-gray-100 transition-all"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                </motion.button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">暂无搜索历史</p>
          )}
        </section>
      )}

      {/* 热门搜索 */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-900">热门搜索</h2>
        </div>

        {isLoadingPopular ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="h-12 bg-gray-200 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : popularSearches.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {popularSearches.map((search, index) => (
              <motion.button
                key={search}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onSelect(search)}
                className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl hover:border-orange-200 hover:shadow-md transition-all group"
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                    index < 3
                      ? 'bg-gradient-to-br from-orange-400 to-red-500 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="text-sm text-gray-700 group-hover:text-orange-600 truncate transition-colors">
                  {search}
                </span>
              </motion.button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">暂无热门搜索</p>
        )}
      </section>

      {/* 推荐分类 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">发现更多</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <CategoryCard
            title="轻小说"
            description="异世界、校园、恋爱"
            gradient="from-blue-400 to-indigo-500"
            onClick={() => onSelect('轻小说')}
          />
          <CategoryCard
            title="漫画"
            description="热血、搞笑、治愈"
            gradient="from-orange-400 to-pink-500"
            onClick={() => onSelect('漫画')}
          />
          <CategoryCard
            title="完结作品"
            description="一口气看完"
            gradient="from-green-400 to-teal-500"
            onClick={() => onSelect('完结')}
          />
          <CategoryCard
            title="新人作者"
            description="发现新星"
            gradient="from-purple-400 to-pink-500"
            onClick={() => onSelect('新人')}
          />
        </div>
      </section>
    </div>
  );
}

// 分类卡片
function CategoryCard({
  title,
  description,
  gradient,
  onClick,
}: {
  title: string;
  description: string;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden p-4 rounded-2xl text-left group"
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90 group-hover:opacity-100 transition-opacity`}
      />
      <div className="relative z-10">
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-sm text-white/80 mt-1">{description}</p>
      </div>
    </button>
  );
}
