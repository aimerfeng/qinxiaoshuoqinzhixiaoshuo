'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, BookOpen, TrendingUp, Clock, Star } from 'lucide-react';
import { motion } from 'motion/react';
import Header from '@/components/layout/Header';
import { cn } from '@/utils/cn';
import { wenku8Service, type Wenku8Novel, type Wenku8ListResult } from '@/services/wenku8';

const listTypes = [
  { id: 'lastupdate', label: '最新更新', icon: Clock },
  { id: 'allvisit', label: '总排行', icon: TrendingUp },
  { id: 'goodnum', label: '好评榜', icon: Star },
  { id: 'fullflag', label: '完结作品', icon: BookOpen },
];

function NovelCard({ novel }: { novel: Wenku8Novel }) {
  return (
    <Link href={`/wenku8/novel/${novel.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card card-hover p-4 flex gap-4"
      >
        <div className="w-16 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-2xl shrink-0">
          📖
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{novel.title}</h3>
          <p className="text-sm text-muted-foreground">{novel.author}</p>
          {novel.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {novel.description}
            </p>
          )}
        </div>
      </motion.div>
    </Link>
  );
}


export default function Wenku8Page() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<Wenku8Novel[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeList, setActiveList] = useState('lastupdate');
  const [listData, setListData] = useState<Wenku8ListResult | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadList(activeList);
  }, [activeList]);

  const loadList = async (type: string, page: number = 1) => {
    setIsLoadingList(true);
    setError(null);
    try {
      const response = await wenku8Service.getNovelList(type, page);
      setListData({
        novels: response?.novels ?? [],
        page: response?.page ?? 1,
        totalPages: response?.totalPages ?? 1,
      });
    } catch (err) {
      setError('加载失败，请稍后重试');
    } finally {
      setIsLoadingList(false);
    }
  };

  const handleSearch = async () => {
    if (!searchKeyword.trim()) return;
    setIsSearching(true);
    setError(null);
    try {
      const response = await wenku8Service.search(searchKeyword);
      // apiRequest already unwraps the data, so response IS the Wenku8Novel[]
      setSearchResults(response);
    } catch (err) {
      setError('搜索失败，请稍后重试');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Search */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="搜索轻小说..."
              className="input flex-1"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="btn btn-primary px-6"
            >
              {isSearching ? '搜索中...' : <Search className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">搜索结果</h2>
            <div className="space-y-3">
              {searchResults.map((novel) => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
            </div>
          </div>
        )}

        {/* List Tabs */}
        <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {listTypes.map((type) => (
            <button
              key={type.id}
              onClick={() => setActiveList(type.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                activeList === type.id
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80',
              )}
            >
              <type.icon className="w-4 h-4" />
              {type.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* List */}
        {isLoadingList ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          listData && (
            <div className="space-y-3">
              {(listData.novels ?? []).map((novel) => (
                <NovelCard key={novel.id} novel={novel} />
              ))}
              {/* Pagination */}
              {listData.totalPages > 1 && (
                <div className="flex justify-center gap-2 pt-4">
                  {Array.from({ length: Math.min(5, listData.totalPages) }, (_, i) => i + 1).map(
                    (page) => (
                      <button
                        key={page}
                        onClick={() => loadList(activeList, page)}
                        className={cn(
                          'w-8 h-8 rounded-full text-sm font-medium',
                          page === listData.page
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80',
                        )}
                      >
                        {page}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
}
