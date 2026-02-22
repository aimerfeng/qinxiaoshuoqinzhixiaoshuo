'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Book,
  User,
  FileText,
  Eye,
  Heart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import type {
  SearchResponse,
  SearchType,
  WorkSearchResult,
  UserSearchResult,
  ChapterSearchResult,
} from '@/types/search';

interface SearchResultsProps {
  results: SearchResponse | null;
  isLoading: boolean;
  searchType: SearchType;
  page: number;
  onPageChange: (page: number) => void;
  onSuggestionClick: (query: string) => void;
}

export function SearchResults({
  results,
  isLoading,
  searchType,
  page,
  onPageChange,
  onSuggestionClick,
}: SearchResultsProps) {
  if (isLoading) {
    return <SearchResultsSkeleton />;
  }

  if (!results) {
    return null;
  }

  const { works, users, chapters } = results.results;
  const { pagination, suggestions } = results;
  const hasResults = works.length > 0 || users.length > 0 || chapters.length > 0;

  if (!hasResults) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
          <Sparkles className="w-12 h-12 text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          没有找到相关结果
        </h3>
        <p className="text-gray-500 mb-6">试试其他关键词或调整筛选条件</p>
        {suggestions && suggestions.length > 0 && (
          <div className="mt-6">
            <p className="text-sm text-gray-500 mb-3">你可能想搜索：</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 作品结果 */}
      {(searchType === 'all' || searchType === 'work') && works.length > 0 && (
        <section>
          {searchType === 'all' && (
            <div className="flex items-center gap-2 mb-4">
              <Book className="w-5 h-5 text-indigo-500" />
              <h2 className="text-lg font-semibold text-gray-900">作品</h2>
              <span className="text-sm text-gray-500">({works.length})</span>
            </div>
          )}
          <div className="grid gap-4">
            {works.map((work, index) => (
              <WorkResultCard key={work.id} work={work} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* 用户结果 */}
      {(searchType === 'all' || searchType === 'user') && users.length > 0 && (
        <section>
          {searchType === 'all' && (
            <div className="flex items-center gap-2 mb-4">
              <User className="w-5 h-5 text-pink-500" />
              <h2 className="text-lg font-semibold text-gray-900">用户</h2>
              <span className="text-sm text-gray-500">({users.length})</span>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            {users.map((user, index) => (
              <UserResultCard key={user.id} user={user} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* 章节结果 */}
      {(searchType === 'all' || searchType === 'chapter') &&
        chapters.length > 0 && (
          <section>
            {searchType === 'all' && (
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-gray-900">章节</h2>
                <span className="text-sm text-gray-500">
                  ({chapters.length})
                </span>
              </div>
            )}
            <div className="grid gap-4">
              {chapters.map((chapter, index) => (
                <ChapterResultCard
                  key={chapter.id}
                  chapter={chapter}
                  index={index}
                />
              ))}
            </div>
          </section>
        )}

      {/* 分页 */}
      {searchType !== 'all' && pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

// 作品结果卡片
function WorkResultCard({
  work,
  index,
}: {
  work: WorkSearchResult;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/works/${work.id}`}
        className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg transition-all group"
      >
        {/* 封面 */}
        <div className="flex-shrink-0 w-20 h-28 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg overflow-hidden">
          {work.coverImage ? (
            <img
              src={work.coverImage}
              alt={work.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Book className="w-8 h-8 text-indigo-300" />
            </div>
          )}
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
              {work.title}
            </h3>
            <span
              className={`flex-shrink-0 px-2 py-0.5 text-xs rounded-full ${
                work.contentType === 'NOVEL'
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-orange-100 text-orange-600'
              }`}
            >
              {work.contentType === 'NOVEL' ? '小说' : '漫画'}
            </span>
          </div>

          <p className="mt-1 text-sm text-gray-500 line-clamp-2">
            {work.description || '暂无简介'}
          </p>

          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <User className="w-3.5 h-3.5" />
              {work.authorName}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatNumber(work.viewCount)}
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" />
              {formatNumber(work.likeCount)}
            </span>
            <span>{work.chapterCount} 章</span>
          </div>

          {work.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {work.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// 用户结果卡片
function UserResultCard({
  user,
  index,
}: {
  user: UserSearchResult;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/profile/${user.id}`}
        className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-pink-200 hover:shadow-lg transition-all group"
      >
        {/* 头像 */}
        <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full overflow-hidden">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.displayName || user.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-6 h-6 text-pink-300" />
            </div>
          )}
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-pink-600 transition-colors">
            {user.displayName || user.username}
          </h3>
          <p className="text-sm text-gray-500">@{user.username}</p>
          {user.bio && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-1">{user.bio}</p>
          )}
          <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
            <span>{user.workCount} 作品</span>
            <span>{formatNumber(user.followerCount)} 粉丝</span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// 章节结果卡片
function ChapterResultCard({
  chapter,
  index,
}: {
  chapter: ChapterSearchResult;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link
        href={`/read/${chapter.workId}/${chapter.id}`}
        className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all group"
      >
        {/* 封面 */}
        <div className="flex-shrink-0 w-16 h-20 bg-gradient-to-br from-green-100 to-teal-100 rounded-lg overflow-hidden">
          {chapter.workCoverImage ? (
            <img
              src={chapter.workCoverImage}
              alt={chapter.workTitle}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-300" />
            </div>
          )}
        </div>

        {/* 信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors line-clamp-1">
            {chapter.title}
          </h3>
          <p className="text-sm text-gray-500">
            来自《{chapter.workTitle}》· {chapter.authorName}
          </p>
          <p className="mt-1 text-sm text-gray-400 line-clamp-2">
            {chapter.contentPreview}
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {formatNumber(chapter.viewCount)}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// 分页组件
function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const pages = getPageNumbers(page, totalPages);

  return (
    <div className="flex items-center justify-center gap-2 mt-8">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {pages.map((p, index) =>
        p === '...' ? (
          <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p as number)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              p === page
                ? 'bg-indigo-500 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

// 骨架屏
function SearchResultsSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100"
        >
          <div className="w-20 h-28 bg-gray-200 rounded-lg animate-pulse" />
          <div className="flex-1 space-y-3">
            <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// 工具函数
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

function getPageNumbers(
  current: number,
  total: number,
): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  if (current <= 3) {
    return [1, 2, 3, 4, 5, '...', total];
  }

  if (current >= total - 2) {
    return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, '...', current - 1, current, current + 1, '...', total];
}
