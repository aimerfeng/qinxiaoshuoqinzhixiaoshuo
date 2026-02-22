'use client';

import type {
  SearchType,
  SortBy,
  ContentTypeFilter,
  WorkStatusFilter,
  SearchResponse,
} from '@/types/search';

interface SearchFiltersProps {
  searchType: SearchType;
  sortBy: SortBy;
  contentType: ContentTypeFilter;
  status: WorkStatusFilter;
  onSearchTypeChange: (value: SearchType) => void;
  onSortByChange: (value: SortBy) => void;
  onContentTypeChange: (value: ContentTypeFilter) => void;
  onStatusChange: (value: WorkStatusFilter) => void;
  facets?: SearchResponse['facets'];
}

export function SearchFilters({
  searchType,
  sortBy,
  contentType,
  status,
  onSearchTypeChange,
  onSortByChange,
  onContentTypeChange,
  onStatusChange,
  facets,
}: SearchFiltersProps) {
  return (
    <div className="pt-4 pb-2 space-y-4">
      {/* 搜索类型 */}
      <FilterGroup label="搜索范围">
        <FilterButton
          active={searchType === 'all'}
          onClick={() => onSearchTypeChange('all')}
        >
          全部
        </FilterButton>
        <FilterButton
          active={searchType === 'work'}
          onClick={() => onSearchTypeChange('work')}
        >
          作品
        </FilterButton>
        <FilterButton
          active={searchType === 'user'}
          onClick={() => onSearchTypeChange('user')}
        >
          用户
        </FilterButton>
        <FilterButton
          active={searchType === 'chapter'}
          onClick={() => onSearchTypeChange('chapter')}
        >
          章节
        </FilterButton>
      </FilterGroup>

      {/* 排序方式 */}
      <FilterGroup label="排序方式">
        <FilterButton
          active={sortBy === 'relevance'}
          onClick={() => onSortByChange('relevance')}
        >
          相关度
        </FilterButton>
        <FilterButton
          active={sortBy === 'latest'}
          onClick={() => onSortByChange('latest')}
        >
          最新
        </FilterButton>
        <FilterButton
          active={sortBy === 'popular'}
          onClick={() => onSortByChange('popular')}
        >
          热门
        </FilterButton>
        <FilterButton
          active={sortBy === 'views'}
          onClick={() => onSortByChange('views')}
        >
          浏览量
        </FilterButton>
      </FilterGroup>

      {/* 内容类型（仅作品搜索时显示） */}
      {(searchType === 'all' || searchType === 'work' || searchType === 'chapter') && (
        <FilterGroup label="内容类型">
          <FilterButton
            active={contentType === 'all'}
            onClick={() => onContentTypeChange('all')}
            count={facets?.contentTypes?.reduce((sum, c) => sum + c.count, 0)}
          >
            全部
          </FilterButton>
          <FilterButton
            active={contentType === 'novel'}
            onClick={() => onContentTypeChange('novel')}
            count={facets?.contentTypes?.find((c) => c.name === 'NOVEL')?.count}
          >
            小说
          </FilterButton>
          <FilterButton
            active={contentType === 'manga'}
            onClick={() => onContentTypeChange('manga')}
            count={facets?.contentTypes?.find((c) => c.name === 'MANGA')?.count}
          >
            漫画
          </FilterButton>
        </FilterGroup>
      )}

      {/* 作品状态（仅作品搜索时显示） */}
      {(searchType === 'all' || searchType === 'work') && (
        <FilterGroup label="作品状态">
          <FilterButton
            active={status === 'all'}
            onClick={() => onStatusChange('all')}
          >
            全部
          </FilterButton>
          <FilterButton
            active={status === 'ongoing'}
            onClick={() => onStatusChange('ongoing')}
            count={facets?.statuses?.find((s) => s.name === 'PUBLISHED')?.count}
          >
            连载中
          </FilterButton>
          <FilterButton
            active={status === 'completed'}
            onClick={() => onStatusChange('completed')}
            count={facets?.statuses?.find((s) => s.name === 'COMPLETED')?.count}
          >
            已完结
          </FilterButton>
        </FilterGroup>
      )}

      {/* 热门标签 */}
      {facets?.tags && facets.tags.length > 0 && (
        <FilterGroup label="热门标签">
          <div className="flex flex-wrap gap-2">
            {facets.tags.slice(0, 10).map((tag) => (
              <button
                key={tag.name}
                className="px-3 py-1.5 bg-gray-100 hover:bg-indigo-100 text-gray-700 hover:text-indigo-600 text-sm rounded-full transition-colors"
              >
                {tag.name}
                <span className="ml-1 text-gray-400 text-xs">({tag.count})</span>
              </button>
            ))}
          </div>
        </FilterGroup>
      )}
    </div>
  );
}

// 筛选组
function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <span className="flex-shrink-0 w-20 text-sm text-gray-500 pt-2">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

// 筛选按钮
function FilterButton({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-lg transition-all ${
        active
          ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-indigo-300 hover:text-indigo-600'
      }`}
    >
      {children}
      {count !== undefined && (
        <span
          className={`ml-1 ${active ? 'text-indigo-200' : 'text-gray-400'}`}
        >
          ({count})
        </span>
      )}
    </button>
  );
}
