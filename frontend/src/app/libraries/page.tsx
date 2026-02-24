'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { Flame, Clock, GitBranch, Filter, ChevronDown, BookOpen, Eye, Heart, Library as LibraryIcon } from 'lucide-react';
import Header from '@/components/layout/Header';
import { LibraryCard } from '@/components/library/LibraryCard';
import { libraryService } from '@/services/library.service';
import { worksService, workToDisplayBook } from '@/services/works';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { cn } from '@/utils/cn';
import type { Library, LibraryType, GetLibrariesQueryDto } from '@/types/library';
import type { WorkResponse, WorkSortField, ContentType } from '@/types/works';

/**
 * 排序选项
 */
const SORT_OPTIONS = [
  { id: 'hotScore', label: '热度排序', icon: Flame },
  { id: 'createdAt', label: '最新发布', icon: Clock },
  { id: 'branchCount', label: '分支数量', icon: GitBranch },
] as const;

type SortBy = typeof SORT_OPTIONS[number]['id'];

/**
 * 库类型筛选选项
 */
const TYPE_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'ORIGINAL', label: '原创库' },
  { id: 'SHARED', label: '共享库' },
] as const;

type TypeFilter = typeof TYPE_FILTERS[number]['id'];

/**
 * 视图模式
 */
type ViewMode = 'libraries' | 'works';

/**
 * 作品排序选项
 */
const WORKS_SORT_OPTIONS = [
  { id: 'updatedAt' as WorkSortField, label: '更新时间', icon: Clock },
  { id: 'viewCount' as WorkSortField, label: '浏览量', icon: Eye },
  { id: 'createdAt' as WorkSortField, label: '创建时间', icon: Clock },
  { id: 'likeCount' as WorkSortField, label: '点赞数', icon: Heart },
] as const;

/**
 * 作品类型筛选
 */
const CONTENT_TYPE_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'NOVEL', label: '小说' },
  { id: 'MANGA', label: '漫画' },
] as const;

type ContentTypeFilter = typeof CONTENT_TYPE_FILTERS[number]['id'];

/**
 * 作品卡片组件 - 紧凑三列布局风格
 */
function WorkCard({ work }: { work: WorkResponse }) {
  return (
    <Link href={`/works/${work.id}`}>
      <div className="group flex gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
        {/* 封面 - 更小更紧凑 */}
        <div className="relative h-20 w-[60px] shrink-0 rounded overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600">
          {work.coverImage ? (
            <img
              src={work.coverImage}
              alt={work.title}
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
          <div className="absolute top-0 left-0 px-1 py-0.5 text-[10px] font-medium text-white bg-emerald-500">
            本地
          </div>
        </div>

        {/* 信息 - 更紧凑 */}
        <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
          <div>
            <h3 className="truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
              {work.title}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              作者：{work.author.displayName || work.author.username}
            </p>
            {work.description && (
              <p className="line-clamp-1 text-xs text-muted-foreground mt-1">{work.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Eye className="w-3 h-3" />
              {work.stats.viewCount}
            </span>
            <span className="flex items-center gap-0.5">
              <Heart className="w-3 h-3" />
              {work.stats.likeCount}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * 创作库列表页面
 *
 * 需求7.2: 支持按热度分数降序排序
 *
 * 功能:
 * - 显示创作库列表（原创/导入作品，支持分支创作）
 * - 支持按热度/时间/分支数排序
 * - 支持按库类型筛选
 * - 无限滚动加载
 */
export default function LibrariesPage() {
  const router = useRouter();

  // 视图模式状态
  const [viewMode, setViewMode] = useState<ViewMode>('libraries');

  // 创作库状态
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 创作库筛选和排序状态
  const [sortBy, setSortBy] = useState<SortBy>('hotScore');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  // 作品列表状态
  const [works, setWorks] = useState<WorkResponse[]>([]);
  const [worksLoading, setWorksLoading] = useState(false);
  const [worksLoadingMore, setWorksLoadingMore] = useState(false);
  const [worksError, setWorksError] = useState<string | null>(null);
  const [worksPage, setWorksPage] = useState(1);
  const [worksHasMore, setWorksHasMore] = useState(true);
  const [worksSortBy, setWorksSortBy] = useState<WorkSortField>('updatedAt');
  const [contentTypeFilter, setContentTypeFilter] = useState<ContentTypeFilter>('all');
  const [showContentTypeDropdown, setShowContentTypeDropdown] = useState(false);

  const LIMIT = 12;

  /**
   * 加载创作库列表
   */
  const loadLibraries = useCallback(async (
    pageNum: number,
    sort: SortBy,
    type: TypeFilter,
    append: boolean = false
  ) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params: GetLibrariesQueryDto = {
        page: pageNum,
        limit: LIMIT,
        sortBy: sort,
        sortOrder: 'desc',
      };

      if (type !== 'all') {
        params.libraryType = type as LibraryType;
      }

      const response = await libraryService.getLibraries(params);

      if (append) {
        setLibraries(prev => [...prev, ...response.data]);
      } else {
        setLibraries(response.data);
      }

      setHasMore(pageNum < response.pagination.totalPages);
      setPage(pageNum);
    } catch (err: any) {
      setError(err.message || '加载失败，请稍后重试');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  /**
   * 加载作品列表
   */
  const loadWorks = useCallback(async (
    pageNum: number,
    sort: WorkSortField,
    contentType: ContentTypeFilter,
    append: boolean = false
  ) => {
    if (append) {
      setWorksLoadingMore(true);
    } else {
      setWorksLoading(true);
    }
    setWorksError(null);

    try {
      const response = await worksService.listWorks({
        page: pageNum,
        limit: LIMIT,
        status: 'PUBLISHED',
        sortBy: sort,
        sortOrder: 'desc',
        contentType: contentType !== 'all' ? contentType as ContentType : undefined,
      });

      if (append) {
        setWorks(prev => [...prev, ...response.data]);
      } else {
        setWorks(response.data);
      }

      setWorksHasMore(response.meta.hasNextPage);
      setWorksPage(pageNum);
    } catch (err: any) {
      setWorksError(err.message || '加载失败，请稍后重试');
    } finally {
      setWorksLoading(false);
      setWorksLoadingMore(false);
    }
  }, []);

  /**
   * 初始加载
   */
  useEffect(() => {
    if (viewMode === 'libraries') {
      loadLibraries(1, sortBy, typeFilter);
    } else {
      loadWorks(1, worksSortBy, contentTypeFilter);
    }
  }, [viewMode, sortBy, typeFilter, worksSortBy, contentTypeFilter, loadLibraries, loadWorks]);

  /**
   * 加载更多
   */
  const handleLoadMore = useCallback(() => {
    if (viewMode === 'libraries') {
      if (hasMore && !isLoadingMore) {
        loadLibraries(page + 1, sortBy, typeFilter, true);
      }
    } else {
      if (worksHasMore && !worksLoadingMore) {
        loadWorks(worksPage + 1, worksSortBy, contentTypeFilter, true);
      }
    }
  }, [viewMode, hasMore, isLoadingMore, page, sortBy, typeFilter, loadLibraries, worksHasMore, worksLoadingMore, worksPage, worksSortBy, contentTypeFilter, loadWorks]);

  /**
   * 无限滚动
   */
  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore,
    hasMore: viewMode === 'libraries' ? hasMore : worksHasMore,
    isLoading: viewMode === 'libraries' ? isLoadingMore : worksLoadingMore,
  });

  /**
   * 切换排序
   */
  const handleSortChange = (newSort: SortBy) => {
    if (newSort !== sortBy) {
      setSortBy(newSort);
      setPage(1);
    }
  };

  /**
   * 切换类型筛选
   */
  const handleTypeFilterChange = (newType: TypeFilter) => {
    if (newType !== typeFilter) {
      setTypeFilter(newType);
      setPage(1);
      setShowFilterDropdown(false);
    }
  };

  /**
   * 切换作品排序
   */
  const handleWorksSortChange = (newSort: WorkSortField) => {
    if (newSort !== worksSortBy) {
      setWorksSortBy(newSort);
      setWorksPage(1);
    }
  };

  /**
   * 切换作品类型筛选
   */
  const handleContentTypeFilterChange = (newType: ContentTypeFilter) => {
    if (newType !== contentTypeFilter) {
      setContentTypeFilter(newType);
      setWorksPage(1);
      setShowContentTypeDropdown(false);
    }
  };

  /**
   * 点击卡片跳转详情
   */
  const handleCardClick = (libraryId: string) => {
    router.push(`/libraries/${libraryId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-purple-50/30 dark:from-gray-900 dark:to-gray-900">
      <Header />

      {/* 页面头部 */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100/50 dark:border-gray-800/50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* 视图切换 Tab */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setViewMode('libraries')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                viewMode === 'libraries'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              )}
            >
              <LibraryIcon className="w-4 h-4" />
              创作库
            </button>
            <button
              onClick={() => setViewMode('works')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                viewMode === 'works'
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
              )}
            >
              <BookOpen className="w-4 h-4" />
              全部作品
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {viewMode === 'libraries' ? '创作库' : '全部作品'}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {viewMode === 'libraries' ? '探索原创作品，参与分支创作' : '浏览所有已发布的书籍'}
              </p>
            </div>

            {/* 类型筛选下拉 */}
            {viewMode === 'libraries' ? (
              <div className="relative">
                <button
                  onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                    'hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <Filter className="w-4 h-4" />
                  <span>{TYPE_FILTERS.find(t => t.id === typeFilter)?.label}</span>
                  <ChevronDown className={cn(
                    'w-4 h-4 transition-transform',
                    showFilterDropdown && 'rotate-180'
                  )} />
                </button>

                <AnimatePresence>
                  {showFilterDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={cn(
                        'absolute right-0 mt-2 w-36 py-1 rounded-xl',
                        'bg-white dark:bg-gray-800',
                        'border border-gray-200 dark:border-gray-700',
                        'shadow-lg'
                      )}
                    >
                      {TYPE_FILTERS.map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => handleTypeFilterChange(filter.id)}
                          className={cn(
                            'w-full px-4 py-2 text-left text-sm transition-colors',
                            typeFilter === filter.id
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowContentTypeDropdown(!showContentTypeDropdown)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors',
                    'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700',
                    'hover:bg-gray-50 dark:hover:bg-gray-700'
                  )}
                >
                  <Filter className="w-4 h-4" />
                  <span>{CONTENT_TYPE_FILTERS.find(t => t.id === contentTypeFilter)?.label}</span>
                  <ChevronDown className={cn(
                    'w-4 h-4 transition-transform',
                    showContentTypeDropdown && 'rotate-180'
                  )} />
                </button>

                <AnimatePresence>
                  {showContentTypeDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className={cn(
                        'absolute right-0 mt-2 w-36 py-1 rounded-xl',
                        'bg-white dark:bg-gray-800',
                        'border border-gray-200 dark:border-gray-700',
                        'shadow-lg'
                      )}
                    >
                      {CONTENT_TYPE_FILTERS.map((filter) => (
                        <button
                          key={filter.id}
                          onClick={() => handleContentTypeFilterChange(filter.id)}
                          className={cn(
                            'w-full px-4 py-2 text-left text-sm transition-colors',
                            contentTypeFilter === filter.id
                              ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          )}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* 排序选项 */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {viewMode === 'libraries' ? (
              SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleSortChange(option.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    sortBy === option.id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  )}
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </button>
              ))
            ) : (
              WORKS_SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleWorksSortChange(option.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    worksSortBy === option.id
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  )}
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      </header>

      {/* 内容区域 */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {viewMode === 'libraries' ? (
          <>
            {/* 创作库加载状态 */}
            {isLoading && libraries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            )}

            {/* 创作库错误状态 */}
            {error && libraries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                  onClick={() => loadLibraries(1, sortBy, typeFilter)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
                >
                  重试
                </button>
              </div>
            )}

            {/* 创作库空状态 */}
            {!isLoading && !error && libraries.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl">📚</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  暂无创作库
                </p>
              </div>
            )}

            {/* 创作库网格 */}
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {libraries.map((library) => (
                  <LibraryCard
                    key={library.id}
                    library={library}
                    onClick={() => handleCardClick(library.id)}
                  />
                ))}
              </div>
            </AnimatePresence>

            {/* 创作库加载更多指示器 */}
            {isLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* 创作库没有更多内容 */}
            {!hasMore && libraries.length > 0 && !isLoading && (
              <p className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">
                没有更多内容了
              </p>
            )}
          </>
        ) : (
          <>
            {/* 作品加载状态 */}
            {worksLoading && works.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400">加载中...</p>
              </div>
            )}

            {/* 作品错误状态 */}
            {worksError && works.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-red-500 mb-4">{worksError}</p>
                <button
                  onClick={() => loadWorks(1, worksSortBy, contentTypeFilter)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 transition-colors"
                >
                  重试
                </button>
              </div>
            )}

            {/* 作品空状态 */}
            {!worksLoading && !worksError && works.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl">📖</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400">
                  暂无作品
                </p>
              </div>
            )}

            {/* 作品网格 - 紧凑三列布局 */}
            <AnimatePresence mode="popLayout">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {works.map((work) => (
                  <WorkCard key={work.id} work={work} />
                ))}
              </div>
            </AnimatePresence>

            {/* 作品加载更多指示器 */}
            {worksLoadingMore && (
              <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* 作品没有更多内容 */}
            {!worksHasMore && works.length > 0 && !worksLoading && (
              <p className="text-center text-gray-400 dark:text-gray-500 py-4 text-sm">
                没有更多内容了
              </p>
            )}
          </>
        )}

        {/* 加载更多触发器 */}
        <div ref={loadMoreRef} className="h-10" />
      </main>
    </div>
  );
}
