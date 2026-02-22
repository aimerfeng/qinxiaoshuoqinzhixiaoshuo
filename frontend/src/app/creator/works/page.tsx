'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

// ==================== 类型定义 ====================

interface Work {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  type: 'NOVEL' | 'MANGA';
  status: 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'HIATUS' | 'ABANDONED';
  tags: string[];
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  stats: {
    wordCount: number;
    viewCount: number;
    likeCount: number;
    quoteCount: number;
    chapterCount: number;
    pageCount: number;
  };
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WorksResponse {
  data: Work[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

type StatusFilter = 'all' | 'DRAFT' | 'PUBLISHED' | 'COMPLETED' | 'HIATUS' | 'ABANDONED';
type TypeFilter = 'all' | 'NOVEL' | 'MANGA';
type SortBy = 'createdAt' | 'updatedAt' | 'viewCount' | 'likeCount';
type SortOrder = 'asc' | 'desc';

// ==================== 图标组件 ====================

const PlusIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const ViewsIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const LikesIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
  </svg>
);

const ChaptersIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const EmptyIcon = () => (
  <svg className="h-16 w-16 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
  </svg>
);

// ==================== 辅助函数 ====================

const statusLabels: Record<string, string> = {
  DRAFT: '草稿',
  PUBLISHED: '已发布',
  COMPLETED: '已完结',
  HIATUS: '暂停更新',
  ABANDONED: '已弃坑',
};

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  PUBLISHED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIATUS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ABANDONED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const typeLabels: Record<string, string> = {
  NOVEL: '小说',
  MANGA: '漫画',
};

const typeColors: Record<string, string> = {
  NOVEL: 'bg-primary/10 text-primary',
  MANGA: 'bg-secondary/10 text-secondary',
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '今天';
  } else if (diffDays === 1) {
    return '昨天';
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)}周前`;
  } else {
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}


// ==================== 作品卡片组件 ====================

interface WorkCardProps {
  work: Work;
  onDelete: (workId: string) => void;
  isDeleting: boolean;
}

function WorkCard({ work, onDelete, isDeleting }: WorkCardProps) {

  return (
    <div className="group rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:border-primary/30 hover:shadow-card-hover">
      <div className="flex gap-4">
        {/* 封面图 */}
        <Link href={`/creator/works/${work.id}`} className="shrink-0">
          <div className="h-24 w-18 overflow-hidden rounded-lg bg-muted sm:h-32 sm:w-24">
            {work.coverImage ? (
              <img
                src={work.coverImage}
                alt={work.title}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <span className="text-2xl font-bold text-primary/50">
                  {work.title.charAt(0)}
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* 作品信息 */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* 标题和标签 */}
          <div className="flex flex-wrap items-start gap-2">
            <Link
              href={`/creator/works/${work.id}`}
              className="text-base font-semibold text-foreground hover:text-primary sm:text-lg"
            >
              {work.title}
            </Link>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[work.type]}`}>
              {typeLabels[work.type]}
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[work.status]}`}>
              {statusLabels[work.status]}
            </span>
          </div>

          {/* 统计数据 */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <ViewsIcon />
              {formatNumber(work.stats.viewCount)}
            </span>
            <span className="flex items-center gap-1">
              <LikesIcon />
              {formatNumber(work.stats.likeCount)}
            </span>
            <span className="flex items-center gap-1">
              <ChaptersIcon />
              {work.stats.chapterCount} 章
            </span>
            {work.type === 'NOVEL' && work.stats.wordCount > 0 && (
              <span className="hidden sm:inline">
                {formatNumber(work.stats.wordCount)} 字
              </span>
            )}
          </div>

          {/* 更新时间 */}
          <div className="mt-1 text-xs text-muted-foreground">
            更新于 {formatDate(work.updatedAt)}
          </div>

          {/* 操作按钮 */}
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
            <Link
              href={`/creator/works/${work.id}/edit`}
              className="flex items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
            >
              <EditIcon />
              编辑
            </Link>
            <Link
              href={`/creator/works/${work.id}/stats`}
              className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            >
              <ChartIcon />
              数据
            </Link>
            <button
              onClick={() => onDelete(work.id)}
              disabled={isDeleting}
              className="flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent-red/10 hover:text-accent-red disabled:opacity-50"
            >
              <TrashIcon />
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 筛选面板组件 ====================

interface FilterPanelProps {
  statusFilter: StatusFilter;
  typeFilter: TypeFilter;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onStatusChange: (status: StatusFilter) => void;
  onTypeChange: (type: TypeFilter) => void;
  onSortByChange: (sortBy: SortBy) => void;
  onSortOrderChange: (order: SortOrder) => void;
}

function FilterPanel({
  statusFilter,
  typeFilter,
  sortBy,
  sortOrder,
  onStatusChange,
  onTypeChange,
  onSortByChange,
  onSortOrderChange,
}: FilterPanelProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-center gap-4">
        {/* 状态筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">状态:</span>
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as StatusFilter)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">全部</option>
            <option value="DRAFT">草稿</option>
            <option value="PUBLISHED">已发布</option>
            <option value="COMPLETED">已完结</option>
            <option value="HIATUS">暂停更新</option>
            <option value="ABANDONED">已弃坑</option>
          </select>
        </div>

        {/* 类型筛选 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">类型:</span>
          <select
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value as TypeFilter)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">全部</option>
            <option value="NOVEL">小说</option>
            <option value="MANGA">漫画</option>
          </select>
        </div>

        {/* 排序 */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">排序:</span>
          <select
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value as SortBy)}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="updatedAt">更新时间</option>
            <option value="createdAt">创建时间</option>
            <option value="viewCount">阅读量</option>
            <option value="likeCount">点赞数</option>
          </select>
          <button
            onClick={() => onSortOrderChange(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title={sortOrder === 'desc' ? '降序' : '升序'}
          >
            {sortOrder === 'desc' ? '↓' : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 分页组件 ====================

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
}

function Pagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
  }

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!hasPreviousPage}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronLeftIcon />
      </button>

      {pages.map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' && onPageChange(page)}
          disabled={page === '...'}
          className={`flex h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors ${
            page === currentPage
              ? 'bg-primary text-white'
              : page === '...'
              ? 'cursor-default text-muted-foreground'
              : 'border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasNextPage}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}


// ==================== 删除确认弹窗 ====================

interface DeleteModalProps {
  isOpen: boolean;
  workTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteModal({ isOpen, workTitle, onConfirm, onCancel, isDeleting }: DeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* 弹窗内容 */}
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-foreground">确认删除</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          确定要删除作品「<span className="font-medium text-foreground">{workTitle}</span>」吗？
          此操作无法撤销。
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-accent-red px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-red/90 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                删除中...
              </>
            ) : (
              '确认删除'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 空状态组件 ====================

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 py-16">
      <EmptyIcon />
      <h3 className="mt-4 text-lg font-medium text-foreground">还没有作品</h3>
      <p className="mt-1 text-sm text-muted-foreground">开始创作你的第一部作品吧！</p>
      <Link
        href="/creator/works/new"
        className="mt-6 flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary px-6 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
      >
        <PlusIcon />
        创建作品
      </Link>
    </div>
  );
}

// ==================== 加载骨架屏 ====================

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-4">
          <div className="flex gap-4">
            <div className="h-24 w-18 animate-pulse rounded-lg bg-muted sm:h-32 sm:w-24" />
            <div className="flex flex-1 flex-col">
              <div className="h-5 w-48 animate-pulse rounded bg-muted" />
              <div className="mt-2 flex gap-2">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </div>
              <div className="mt-2 h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="mt-auto flex gap-2 pt-2">
                <div className="h-7 w-16 animate-pulse rounded-lg bg-muted" />
                <div className="h-7 w-16 animate-pulse rounded-lg bg-muted" />
                <div className="h-7 w-16 animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 错误提示组件 ====================

interface ErrorMessageProps {
  message: string;
  onRetry: () => void;
}

function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-accent-red/20 bg-accent-red/5 p-8 text-center">
      <div className="rounded-full bg-accent-red/10 p-4">
        <svg className="h-8 w-8 text-accent-red" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="mt-4 text-sm text-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="mt-4 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
      >
        <RefreshIcon />
        重试
      </button>
    </div>
  );
}

// ==================== 主页面组件 ====================

/**
 * 作品管理列表页面
 *
 * 任务 8.2.3: 作品管理列表
 *
 * 功能:
 * - 显示创作者的所有作品
 * - 支持按状态和类型筛选
 * - 支持按日期、阅读量、点赞数排序
 * - 分页显示
 * - 快捷操作（编辑、删除、查看数据）
 * - 创建新作品入口
 * - 加载状态和错误处理
 */
export default function CreatorWorksPage() {
  const { user } = useAuthStore();

  // 状态
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 分页
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);

  // 筛选和排序
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 删除相关
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [workToDelete, setWorkToDelete] = useState<Work | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // 获取作品列表
  const fetchWorks = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('limit', '10');
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);
      params.set('authorId', user.id);

      if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (typeFilter !== 'all') {
        params.set('contentType', typeFilter);
      }

      const response = await api.get<WorksResponse>(`/works?${params.toString()}`);
      const data = response.data;

      setWorks(data.data);
      setTotal(data.meta.total);
      setTotalPages(data.meta.totalPages);
      setHasNextPage(data.meta.hasNextPage);
      setHasPreviousPage(data.meta.hasPreviousPage);
    } catch (err) {
      console.error('Failed to fetch works:', err);
      setError('获取作品列表失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, typeFilter, sortBy, sortOrder, user?.id]);

  // 初始加载和筛选变化时重新获取
  useEffect(() => {
    fetchWorks();
  }, [fetchWorks]);

  // 筛选变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, typeFilter, sortBy, sortOrder]);

  // 删除作品
  const handleDeleteClick = (workId: string) => {
    const work = works.find((w) => w.id === workId);
    if (work) {
      setWorkToDelete(work);
      setDeleteModalOpen(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!workToDelete) return;

    setIsDeleting(true);
    try {
      await api.delete(`/works/${workToDelete.id}`);
      setDeleteModalOpen(false);
      setWorkToDelete(null);
      // 重新获取列表
      fetchWorks();
    } catch (err) {
      console.error('Failed to delete work:', err);
      setError('删除作品失败，请稍后重试');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setWorkToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">作品管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            管理你的所有作品，共 {total} 部
          </p>
        </div>
        <Link
          href="/creator/works/new"
          className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all hover:shadow-xl"
        >
          <PlusIcon />
          创建新作品
        </Link>
      </div>

      {/* 筛选面板 */}
      <FilterPanel
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onSortByChange={setSortBy}
        onSortOrderChange={setSortOrder}
      />

      {/* 错误提示 */}
      {error && !isLoading && (
        <ErrorMessage message={error} onRetry={fetchWorks} />
      )}

      {/* 作品列表 */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : works.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-4">
          {works.map((work) => (
            <WorkCard
              key={work.id}
              work={work}
              onDelete={handleDeleteClick}
              isDeleting={isDeleting && workToDelete?.id === work.id}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {!isLoading && works.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPageChange={setCurrentPage}
        />
      )}

      {/* 删除确认弹窗 */}
      <DeleteModal
        isOpen={deleteModalOpen}
        workTitle={workToDelete?.title || ''}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </div>
  );
}
