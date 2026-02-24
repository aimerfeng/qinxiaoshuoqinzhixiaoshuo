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
  BookOpen,
} from 'lucide-react';
import { motion } from 'motion/react';
import Header from '@/components/layout/Header';
import { cn } from '@/utils/cn';
import { mockHotTags, mockCreators, mockRankings } from '@/constants/mock-data';
import { wenku8Service, type Wenku8Novel } from '@/services/wenku8';
import { worksService, workToDisplayBook } from '@/services/works';
import { plazaService } from '@/services/plaza';
import { Card as PlazaCard } from '@/components/plaza';
import type { CardItem } from '@/types/plaza';
import type { WorkSortField } from '@/types/works';

const tabs: TabConfig[] = [
  { id: 'recommend', label: '推荐', listType: 'lastupdate', localSortBy: 'updatedAt' },
  { id: 'following', label: '关注', listType: null },
  { id: 'hot', label: '热榜', listType: 'allvisit', localSortBy: 'viewCount' },
  { id: 'novel', label: '轻小说', listType: 'goodnum', localSortBy: 'likeCount', localContentType: 'NOVEL' },
  { id: 'new', label: '新书', listType: 'postdate', localSortBy: 'createdAt' },
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

// 标签页配置，包含本地作品的排序参数
interface TabConfig {
  id: string;
  label: string;
  listType: string | null;
  localSortBy?: WorkSortField;
  localContentType?: 'NOVEL' | 'MANGA';
}

function BookCard({ book }: { book: DisplayBook }) {
  const href =
    book.source === 'wenku8'
      ? `/read/wenku8/${book.id}`
      : `/works/${book.id}`;

  return (
    <Link href={href}>
      <div className="group flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
        {/* 封面 - 更小更紧凑 */}
        <div className="relative h-20 w-[60px] shrink-0 rounded overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600">
          {book.coverUrl ? (
            <img
              src={book.coverUrl}
              alt={book.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement!.innerHTML = '<div class="flex h-full w-full items-center justify-center text-2xl text-white">📖</div>';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl text-white">
              📖
            </div>
          )}
          {/* 来源角标 */}
          <div className={cn(
            "absolute top-0 left-0 px-1 py-0.5 text-[10px] font-medium text-white",
            book.source === 'wenku8' ? 'bg-indigo-500' : 'bg-emerald-500'
          )}>
            {book.source === 'wenku8' ? '文库' : '本地'}
          </div>
        </div>

        {/* 信息 - 更紧凑 */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <h3 className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {book.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">作者：{book.author}</p>
            {book.description && (
              <p className="line-clamp-1 text-xs text-muted-foreground mt-1">{book.description}</p>
            )}
          </div>
          {book.tags && book.tags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {book.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
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
      loadBooks(currentTabConfig.listType, 1, currentTabConfig);
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

  const loadBooks = async (listType: string, pageNum: number, tabConfig: TabConfig) => {
    setIsLoading(true);
    setError(null);
    
    // 并行加载 wenku8 和本地作品
    const [wenku8Result, localResult] = await Promise.allSettled([
      wenku8Service.getNovelList(listType, pageNum),
      worksService.listWorks({
        status: 'PUBLISHED',
        page: pageNum,
        limit: 20,
        sortBy: tabConfig.localSortBy || 'updatedAt',
        sortOrder: 'desc',
        contentType: tabConfig.localContentType,
      }),
    ]);
    
    const displayBooks: DisplayBook[] = [];
    let hasError = false;
    let wenku8TotalPages = 1;
    
    // 处理 wenku8 结果
    if (wenku8Result.status === 'fulfilled') {
      const novels = wenku8Result.value?.novels ?? [];
      displayBooks.push(...novels.map((novel: Wenku8Novel) => ({
        id: novel.id,
        title: novel.title,
        author: novel.author || '未知作者',
        description: novel.description,
        coverUrl: novel.coverUrl,
        source: 'wenku8' as const,
      })));
      wenku8TotalPages = wenku8Result.value?.totalPages ?? 1;
    } else {
      console.error('Wenku8 加载失败:', wenku8Result.reason);
      hasError = true;
    }
    
    // 处理本地作品结果
    if (localResult.status === 'fulfilled') {
      displayBooks.push(...localResult.value.data.map(workToDisplayBook));
    } else {
      console.error('本地作品加载失败:', localResult.reason);
      hasError = true;
    }
    
    // 只有两个都失败才显示错误状态
    if (displayBooks.length === 0 && hasError) {
      setError('加载失败，请检查网络连接');
    }
    
    setBooks(displayBooks);
    setPage(pageNum);
    setTotalPages(wenku8TotalPages);
    setIsLoading(false);
  };

  const handlePageChange = (newPage: number) => {
    if (currentTabConfig?.listType) {
      loadBooks(currentTabConfig.listType, newPage, currentTabConfig);
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
                  loadBooks(currentTabConfig.listType, page, currentTabConfig)
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
