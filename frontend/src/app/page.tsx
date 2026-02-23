'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Flame,
  TrendingUp,
  ChevronRight,
  Users,
  Library,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { motion } from 'motion/react';
import Header from '@/components/layout/Header';
import { cn } from '@/utils/cn';
import { mockHotTags, mockCreators, mockRankings } from '@/constants/mock-data';
import { wenku8Service, type Wenku8Novel } from '@/services/wenku8';
import { plazaService } from '@/services/plaza';
import { Card as PlazaCard } from '@/components/plaza';
import type { CardItem } from '@/types/plaza';

const tabs = [
  { id: 'recommend', label: '推荐', listType: 'lastupdate' },
  { id: 'following', label: '关注', listType: null },
  { id: 'hot', label: '热榜', listType: 'allvisit' },
  { id: 'novel', label: '轻小说', listType: 'goodnum' },
  { id: 'new', label: '新书', listType: 'postdate' },
  { id: 'plaza', label: '广场', listType: null },
];

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// Unified book interface for display
interface DisplayBook {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
  source: 'wenku8' | 'local';
  tags?: string[];
}

function BookCard({ book }: { book: DisplayBook }) {
  const href =
    book.source === 'wenku8'
      ? `/read/wenku8/${book.id}`
      : `/works/${book.id}`;

  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="group card card-hover flex gap-4 p-4"
      >
        {/* Cover */}
        <div className="h-28 w-20 shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                // Fallback to emoji on error
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div class="flex h-full w-full items-center justify-center text-3xl text-white">📖</div>';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl text-white">
              📖
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-1 flex items-center gap-2">
            <span className="truncate text-base font-semibold text-foreground group-hover:text-primary transition-colors">
              {book.title}
            </span>
            {book.source === 'wenku8' && (
              <span className="badge bg-indigo-100 text-indigo-600 text-xs shrink-0">
                <Library className="w-3 h-3 mr-0.5" />
                文库
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-1">{book.author}</p>

          {book.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground mb-2">
              {book.description}
            </p>
          )}

          {book.tags && book.tags.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1.5">
              {book.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="badge bg-muted text-muted-foreground text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </Link>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm text-muted-foreground">加载中...</p>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-sm text-red-500 mb-4">{message}</p>
      <button onClick={onRetry} className="btn btn-primary px-6">
        重试
      </button>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState('recommend');
  const [books, setBooks] = useState<DisplayBook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Plaza state
  const [plazaCards, setPlazaCards] = useState<CardItem[]>([]);
  const [plazaLoading, setPlazaLoading] = useState(false);
  const [plazaError, setPlazaError] = useState<string | null>(null);

  const currentTabConfig = tabs.find((t) => t.id === activeTab);

  useEffect(() => {
    if (activeTab === 'plaza') {
      loadPlazaCards();
    } else if (currentTabConfig?.listType) {
      loadBooks(currentTabConfig.listType, 1);
    } else {
      setBooks([]);
      setIsLoading(false);
    }
  }, [activeTab]);

  const loadPlazaCards = async () => {
    setPlazaLoading(true);
    setPlazaError(null);
    try {
      const response = await plazaService.getFeed('recommend', undefined, 10);
      setPlazaCards(response?.cards ?? []);
    } catch (err) {
      setPlazaError('加载广场内容失败');
    } finally {
      setPlazaLoading(false);
    }
  };

  const loadBooks = async (listType: string, pageNum: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await wenku8Service.getNovelList(listType, pageNum);
      const novels = response?.novels ?? [];
      const displayBooks: DisplayBook[] = novels.map(
        (novel: Wenku8Novel) => ({
          id: novel.id,
          title: novel.title,
          author: novel.author || '未知作者',
          description: novel.description,
          coverUrl: novel.coverUrl,
          source: 'wenku8' as const,
        }),
      );
      setBooks(displayBooks);
      setPage(response?.page ?? 1);
      setTotalPages(response?.totalPages ?? 1);
    } catch (err) {
      setError('加载失败，请检查网络连接');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    if (currentTabConfig?.listType) {
      loadBooks(currentTabConfig.listType, newPage);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex gap-8">
          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Tab Bar */}
            <div className="mb-6 flex items-center gap-1 overflow-x-auto border-b border-border scrollbar-hide">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'text-primary'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="tab-indicator"
                      className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-gradient-primary"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Content */}
            {activeTab === 'following' ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Users className="mb-3 h-12 w-12 opacity-40" />
                <p className="text-sm">登录后查看关注作者的更新</p>
                <Link href="/auth/login" className="btn btn-primary mt-4 px-6">
                  去登录
                </Link>
              </div>
            ) : activeTab === 'plaza' ? (
              // Plaza inline content
              plazaLoading ? (
                <LoadingState />
              ) : plazaError ? (
                <ErrorState message={plazaError} onRetry={loadPlazaCards} />
              ) : plazaCards.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <MessageSquare className="mb-3 h-12 w-12 opacity-40" />
                  <p className="text-sm">暂无广场内容</p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-4">
                    {plazaCards.map((card) => (
                      <PlazaCard key={card.id} card={card} />
                    ))}
                  </div>
                  <div className="flex justify-center mt-6">
                    <Link href="/plaza" className="btn btn-outline px-6">
                      查看更多广场内容
                    </Link>
                  </div>
                </>
              )
            ) : isLoading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState
                message={error}
                onRetry={() =>
                  currentTabConfig?.listType &&
                  loadBooks(currentTabConfig.listType, page)
                }
              />
            ) : (
              <>
                <div className="flex flex-col gap-4">
                  {books.map((book) => (
                    <BookCard key={`${book.source}-${book.id}`} book={book} />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page <= 1}
                      className="btn btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      上一页
                    </button>
                    <span className="flex items-center px-3 text-sm text-muted-foreground">
                      {page} / {totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page >= totalPages}
                      className="btn btn-outline px-3 py-1.5 text-sm disabled:opacity-50"
                    >
                      下一页
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="sticky top-20 flex flex-col gap-6">
              {/* Hot Tags */}
              <div className="card p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <Flame className="h-4 w-4 text-accent-red" />
                  热门标签
                </div>
                <div className="flex flex-wrap gap-2">
                  {mockHotTags.map((tag) => (
                    <Link
                      key={tag.name}
                      href={`/search?tag=${tag.name}`}
                      className="badge bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Active Creators */}
              <div className="card p-4">
                <div className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  活跃创作者
                </div>
                <div className="flex flex-col gap-3">
                  {mockCreators.map((creator) => (
                    <Link
                      key={creator.id}
                      href={`/user/${creator.id}`}
                      className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-medium text-white">
                        {creator.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">
                          {creator.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {creator.worksCount}部作品 ·{' '}
                          {formatCount(creator.followersCount)}粉丝
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Rankings */}
              <div className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-foreground">
                    <TrendingUp className="h-4 w-4 text-accent-gold" />
                    排行榜
                  </div>
                  <Link
                    href="/rankings"
                    className="flex items-center text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    更多 <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
                <div className="flex flex-col gap-2">
                  {mockRankings.map((item, i) => (
                    <Link
                      key={item.id}
                      href={`/read/wenku8/${item.id}`}
                      className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted"
                    >
                      <span
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-bold',
                          i < 3
                            ? 'bg-gradient-primary text-white'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.author}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-accent-red">
                        {item.heat}°
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
