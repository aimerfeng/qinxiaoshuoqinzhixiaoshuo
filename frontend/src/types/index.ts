// Common type definitions for Project Anima

// User types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  membershipLevel: MembershipLevel;
  createdAt: string;
  updatedAt: string;
}

export type MembershipLevel = 'regular' | 'official' | 'senior' | 'honor';

// Work types
export interface Work {
  id: string;
  title: string;
  description: string;
  coverImage?: string;
  authorId: string;
  author?: User;
  status: WorkStatus;
  category: string;
  tags: string[];
  wordCount: number;
  chapterCount: number;
  viewCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

export type WorkStatus = 'draft' | 'published' | 'completed' | 'hiatus';

// Chapter types
export interface Chapter {
  id: string;
  workId: string;
  title: string;
  content: string;
  wordCount: number;
  order: number;
  status: ChapterStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChapterStatus = 'draft' | 'published';

// Card types (Plaza posts)
export interface Card {
  id: string;
  authorId: string;
  author?: User;
  content: string;
  quoteReference?: QuoteReference;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteReference {
  anchorId: string;
  workId: string;
  chapterId: string;
  paragraphIndex: number;
  originalContent: string;
  contentUpdated: boolean;
  contentDeleted: boolean;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
