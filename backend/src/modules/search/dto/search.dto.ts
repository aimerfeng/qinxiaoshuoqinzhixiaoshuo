import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export enum SearchType {
  ALL = 'all',
  WORK = 'work',
  USER = 'user',
  CHAPTER = 'chapter',
}

export enum SortBy {
  RELEVANCE = 'relevance',
  LATEST = 'latest',
  POPULAR = 'popular',
  VIEWS = 'views',
}

export enum ContentTypeFilter {
  ALL = 'all',
  NOVEL = 'novel',
  MANGA = 'manga',
}

export enum WorkStatusFilter {
  ALL = 'all',
  ONGOING = 'ongoing',
  COMPLETED = 'completed',
}

export class SearchQueryDto {
  @IsString()
  q!: string;

  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @IsOptional()
  @IsEnum(SortBy)
  sort?: SortBy = SortBy.RELEVANCE;

  @IsOptional()
  @IsEnum(ContentTypeFilter)
  contentType?: ContentTypeFilter = ContentTypeFilter.ALL;

  @IsOptional()
  @IsEnum(WorkStatusFilter)
  status?: WorkStatusFilter = WorkStatusFilter.ALL;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  tags?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}

export class AutocompleteQueryDto {
  @IsString()
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limit?: number = 5;
}

// Response DTOs
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
  publishedAt: Date | null;
  relevanceScore: number;
}

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
  publishedAt: Date | null;
  relevanceScore: number;
}

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

export interface AutocompleteResponse {
  suggestions: {
    text: string;
    type: 'query' | 'work' | 'author' | 'tag';
    metadata?: {
      id?: string;
      coverImage?: string;
      avatar?: string;
    };
  }[];
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  searchType: string;
  createdAt: Date;
}
