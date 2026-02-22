// 搜索类型
export type SearchType = 'all' | 'work' | 'user' | 'chapter';

// 排序方式
export type SortBy = 'relevance' | 'latest' | 'popular' | 'views';

// 内容类型筛选
export type ContentTypeFilter = 'all' | 'novel' | 'manga';

// 作品状态筛选
export type WorkStatusFilter = 'all' | 'ongoing' | 'completed';

// 搜索查询参数
export interface SearchQuery {
  q: string;
  type?: SearchType;
  sort?: SortBy;
  contentType?: ContentTypeFilter;
  status?: WorkStatusFilter;
  tags?: string[];
  page?: number;
  pageSize?: number;
}

// 作品搜索结果
export interface WorkSearchResult {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  contentType: string;
  status: string;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  viewCount: number;
  likeCount: number;
  chapterCount: number;
  tags: string[];
  publishedAt: string | null;
  relevanceScore: number;
}

// 用户搜索结果
export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  workCount: number;
  followerCount: number;
  relevanceScore: number;
}

// 章节搜索结果
export interface ChapterSearchResult {
  id: string;
  title: string;
  contentPreview: string;
  workId: string;
  workTitle: string;
  workCoverImage: string | null;
  authorId: string;
  authorName: string;
  viewCount: number;
  publishedAt: string | null;
  relevanceScore: number;
}

// 搜索响应
export interface SearchResponse {
  results: {
    works: WorkSearchResult[];
    users: UserSearchResult[];
    chapters: ChapterSearchResult[];
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  suggestions?: string[];
  facets?: {
    contentTypes: { name: string; count: number }[];
    tags: { name: string; count: number }[];
    statuses: { name: string; count: number }[];
  };
}

// 自动补全建议
export interface AutocompleteSuggestion {
  text: string;
  type: 'query' | 'work' | 'author' | 'tag';
  metadata?: {
    id?: string;
    coverImage?: string;
    avatar?: string;
  };
}

// 自动补全响应
export interface AutocompleteResponse {
  suggestions: AutocompleteSuggestion[];
}

// 搜索历史项
export interface SearchHistoryItem {
  id: string;
  query: string;
  searchType: string;
  createdAt: string;
}
