import { IsString, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

// ==================== Request DTOs ====================

export class SearchNovelsDto {
  @IsString()
  keyword!: string;
}

export class GetNovelListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;
}

// ==================== Response Types ====================

export interface NovelSearchResult {
  id: string;
  title: string;
  author: string;
  description?: string;
  coverUrl?: string;
}

export interface NovelInfo {
  id: string;
  title: string;
  author: string;
  description: string;
  coverUrl: string;
  status: string;
  lastUpdate: string;
  tags: string[];
  volumes: NovelVolume[];
}

export interface NovelVolume {
  name: string;
  chapters: NovelChapter[];
}

export interface NovelChapter {
  id: string;
  title: string;
}

export interface ChapterContent {
  novelId: string;
  chapterId: string;
  title: string;
  content: string;
  prevChapterId?: string;
  nextChapterId?: string;
}

export interface NovelListItem {
  id: string;
  title: string;
  author?: string;
  coverUrl?: string;
  lastUpdate?: string;
  description?: string;
}

export interface NovelListResult {
  novels: NovelListItem[];
  page: number;
  totalPages: number;
}

// ==================== API Response Wrapper ====================

export interface Wenku8Response<T> {
  success: boolean;
  data: T;
  disclaimer: string;
  error?: string;
}

export const WENKU8_DISCLAIMER =
  '内容来源于 mojimoon/wenku8 项目 (https://mojimoon.github.io/wenku8/)，版权归原作者所有。本站仅提供代理访问服务，不存储任何内容。';
