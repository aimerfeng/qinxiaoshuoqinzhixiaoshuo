'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GitBranch, Heart, Eye, Coins, Flame, BookOpen, Palette } from 'lucide-react';
import { libraryService } from '@/services/library.service';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { UserAvatar } from '@/components/user/UserAvatar';
import { cn } from '@/utils/cn';
import type { BranchListProps, LibraryBranch, BranchType, GetBranchesQueryDto } from '@/types/library';
import { BRANCH_TYPE_NAMES, DERIVATIVE_TYPE_NAMES } from '@/types/library';

const BRANCH_TABS: { type: BranchType; label: string; icon: typeof BookOpen }[] = [
  { type: 'MAIN', label: '\u6B63\u6587\u5206\u652F', icon: BookOpen },
  { type: 'DERIVATIVE', label: '\u6539\u5199\u5206\u652F', icon: Palette },
  { type: 'MANGA', label: '\u6F2B\u753B\u5206\u652F', icon: GitBranch },
];

function formatNumber(num: number): string {
  if (num >= 10000) return (num / 10000).toFixed(1) + '\u4E07';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function BranchCard({ branch }: { branch: LibraryBranch }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-4 rounded-xl',
        'bg-white/60 dark:bg-gray-800/60',
        'backdrop-blur-sm',
        'border border-gray-100 dark:border-gray-700'
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <UserAvatar
          avatar={branch.creator.avatar}
          username={branch.creator.username}
          displayName={branch.creator.displayName}
          size="sm"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {branch.creator.displayName || branch.creator.username}
          </p>
          <p className="text-xs text-gray-500">
            {new Date(branch.createdAt).toLocaleDateString('zh-CN')}
          </p>
        </div>
        {branch.derivativeType && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600">
            {DERIVATIVE_TYPE_NAMES[branch.derivativeType]}
          </span>
        )}
      </div>
      <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1 line-clamp-1">
        {branch.title}
      </h4>
      {branch.description && (
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{branch.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span>{formatNumber(branch.stats.hotScore)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Heart className="w-3.5 h-3.5 text-pink-500" />
          <span>{formatNumber(branch.stats.likeCount)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Coins className="w-3.5 h-3.5 text-amber-500" />
          <span>{formatNumber(branch.stats.tipAmount)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5 text-blue-500" />
          <span>{formatNumber(branch.stats.viewCount)}</span>
        </div>
      </div>
    </motion.div>
  );
}

export function BranchList({ libraryId, initialTab = 'MAIN' }: BranchListProps) {
  const [activeTab, setActiveTab] = useState<BranchType>(initialTab);
  const [branches, setBranches] = useState<LibraryBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadBranches = useCallback(async (pageNum: number, branchType: BranchType, append = false) => {
    if (append) setIsLoadingMore(true);
    else setIsLoading(true);
    try {
      const params: GetBranchesQueryDto = {
        page: pageNum, limit: 10, branchType, sortBy: 'hotScore', sortOrder: 'desc',
      };
      const response = await libraryService.getBranches(libraryId, params);
      if (append) setBranches(prev => [...prev, ...response.data]);
      else setBranches(response.data);
      setHasMore(pageNum < response.pagination.totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [libraryId]);

  useEffect(() => { loadBranches(1, activeTab); }, [activeTab, loadBranches]);

  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoadingMore) loadBranches(page + 1, activeTab, true);
  }, [hasMore, isLoadingMore, page, activeTab, loadBranches]);

  const { loadMoreRef } = useInfiniteScroll({
    onLoadMore: handleLoadMore, hasMore, isLoading: isLoadingMore,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {BRANCH_TABS.map((tab) => (
          <button
            key={tab.type}
            onClick={() => setActiveTab(tab.type)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === tab.type
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      {isLoading && branches.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {!isLoading && branches.length === 0 && (
        <div className="text-center py-12">
          <GitBranch className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500">{'\u6682\u65E0'}{BRANCH_TYPE_NAMES[activeTab]}</p>
        </div>
      )}
      <AnimatePresence mode="popLayout">
        <div className="space-y-3">
          {branches.map((branch) => (
            <BranchCard key={branch.id} branch={branch} />
          ))}
        </div>
      </AnimatePresence>
      <div ref={loadMoreRef} className="h-4" />
      {isLoadingMore && (
        <div className="flex items-center justify-center py-4">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

export default BranchList;
