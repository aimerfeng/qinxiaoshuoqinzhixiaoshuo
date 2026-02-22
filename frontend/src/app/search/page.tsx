'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { searchService } from '@/services/search';
import type {
  SearchType,
  SortBy,
  ContentTypeFilter,
  WorkStatusFilter,
  SearchResponse,
} from '@/types/search';
import { SearchInput } from '@/components/search/SearchInput';
import { SearchResults } from '@/components/search/SearchResults';
import { SearchFilters } from '@/components/search/SearchFilters';
import { SearchHistory } from '@/components/search/SearchHistory';

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // 从 URL 获取初始搜索参数
  const initialQuery = searchParams.get('q') || '';
  const initialType = (searchParams.get('type') as SearchType) || 'all';
  const initialSort = (searchParams.get('sort') as SortBy) || 'relevance';
  const initialContentType =
    (searchParams.get('contentType') as ContentTypeFilter) || 'all';
  const initialStatus =
    (searchParams.get('status') as WorkStatusFilter) || 'all';
  const initialPage = parseInt(searchParams.get('page') || '1', 10);

  // 状态
  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<SearchType>(initialType);
  const [sortBy, setSortBy] = useState<SortBy>(initialSort);
  const [contentType, setContentType] =
    useState<ContentTypeFilter>(initialContentType);
  const [status, setStatus] = useState<WorkStatusFilter>(initialStatus);
  const [page, setPage] = useState(initialPage);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);

  // 执行搜索
  const performSearch = useCallback(
    async (searchQuery: string, resetPage = false) => {
      if (!searchQuery.trim()) {
        setResults(null);
        setHasSearched(false);
        return;
      }

      setIsLoading(true);
      setHasSearched(true);
      const currentPage = resetPage ? 1 : page;

      try {
        const response = await searchService.search({
          q: searchQuery,
          type: searchType,
          sort: sortBy,
          contentType,
          status,
          page: currentPage,
          pageSize: 20,
        });
        setResults(response);
        if (resetPage) setPage(1);

        // 更新 URL
        const params = new URLSearchParams();
        params.set('q', searchQuery);
        if (searchType !== 'all') params.set('type', searchType);
        if (sortBy !== 'relevance') params.set('sort', sortBy);
        if (contentType !== 'all') params.set('contentType', contentType);
        if (status !== 'all') params.set('status', status);
        if (currentPage > 1) params.set('page', currentPage.toString());
        router.replace(`/search?${params.toString()}`, { scroll: false });
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [searchType, sortBy, contentType, status, page, router],
  );

  // 初始搜索
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 处理搜索提交
  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    performSearch(searchQuery, true);
  };

  // 处理筛选变化
  const handleFilterChange = () => {
    if (query) {
      performSearch(query, true);
    }
  };

  // 处理分页
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (query) {
      performSearch(query);
    }
  };

  // 处理历史记录点击
  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    performSearch(historyQuery, true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white">
      {/* 搜索头部 */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <SearchInput
              value={query}
              onChange={setQuery}
              onSearch={handleSearch}
              placeholder="搜索作品、用户、章节..."
              autoFocus={!initialQuery}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                showFilters
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">筛选</span>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {/* 筛选面板 */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <SearchFilters
                  searchType={searchType}
                  sortBy={sortBy}
                  contentType={contentType}
                  status={status}
                  onSearchTypeChange={(v) => {
                    setSearchType(v);
                    handleFilterChange();
                  }}
                  onSortByChange={(v) => {
                    setSortBy(v);
                    handleFilterChange();
                  }}
                  onContentTypeChange={(v) => {
                    setContentType(v);
                    handleFilterChange();
                  }}
                  onStatusChange={(v) => {
                    setStatus(v);
                    handleFilterChange();
                  }}
                  facets={results?.facets}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {!hasSearched ? (
          // 未搜索时显示历史记录和热门搜索
          <SearchHistory onSelect={handleHistoryClick} />
        ) : (
          // 搜索结果
          <SearchResults
            results={results}
            isLoading={isLoading}
            searchType={searchType}
            page={page}
            onPageChange={handlePageChange}
            onSuggestionClick={handleSearch}
          />
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 to-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
