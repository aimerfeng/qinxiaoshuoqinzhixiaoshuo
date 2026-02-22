'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { userService } from '@/services/user';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import type { FavoriteWork } from '@/types/user';
import type { ApiError, PaginationMeta } from '@/types';

/**
 * 阅读状态枚举
 */
export type ReadingStatus = 'all' | 'want_to_read' | 'reading' | 'completed' | 'on_hold';

/**
 * 阅读状态配置
 */
const READING_STATUS_CONFIG: Record<
  ReadingStatus,
  { label: string; color: string; bgColor: string }
> = {
  all: {
    label: '全部',
    color: 'text-foreground',
    bgColor: 'bg-muted',
  },
  want_to_read: {
    label: '想读',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  reading: {
    label: '在读',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  completed: {
    label: '已读',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  on_hold: {
    label: '搁置',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
};

/**
 * 状态筛选 Tab 配置
 */
const STATUS_TABS: { key: ReadingStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'want_to_read', label: '想读' },
  { key: 'reading', label: '在读' },
  { key: 'completed', label: '已读' },
  { key: 'on_hold', label: '搁置' },
];

/**
 * FavoritesTab 组件属性
 */
export interface FavoritesTabProps {
  /** 用户 ID */
  userId: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 格式化日期
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(dateString: string): string {
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
    return formatDate(dateString);
  }
}

/**
 * 收藏列表 Tab 组件
 *
 * 需求17: 用户个人中心
 * 任务17.2.4: 收藏列表 Tab
 *
 * 功能:
 * - 获取并展示用户收藏/阅读列表
 * - 显示阅读状态筛选 Tab (全部/想读/在读/已读/搁置)
 * - 显示作品卡片（封面、标题、作者、状态徽章、进度、添加日期）
 * - 支持"加载更多"分页
 * - 加载骨架屏
 * - 空状态展示
 * - 链接到作品详情页
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function FavoritesTab({ userId, className }: FavoritesTabProps) {
  const [favorites, setFavorites] = useState<FavoriteWork[]>([]);
  const [activeStatus, setActiveStatus] = useState<ReadingStatus>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 加载收藏列表
  const loadFavorites = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const params: {
          page: number;
          limit: number;
          status?: 'want_to_read' | 'reading' | 'completed';
        } = {
          page,
          limit: 12,
        };

        // 只有非 'all' 和非 'on_hold' 时才传递 status 参数
        // 注意: API 可能不支持 on_hold，这里做兼容处理
        if (activeStatus !== 'all' && activeStatus !== 'on_hold') {
          params.status = activeStatus;
        }

        const response = await userService.getUserFavorites(userId, params);

        const newFavorites = response.data || [];
        const meta = response.meta;

        if (append) {
          setFavorites((prev) => [...prev, ...newFavorites]);
        } else {
          setFavorites(newFavorites);
        }

        setPagination(meta);
        setHasMore(meta ? meta.page < meta.totalPages : false);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || '加载收藏列表失败');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [userId, activeStatus]
  );

  // 初始加载和状态切换时重新加载
  useEffect(() => {
    loadFavorites(1, false);
  }, [loadFavorites]);

  // 切换状态筛选
  const handleStatusChange = (status: ReadingStatus) => {
    if (status !== activeStatus) {
      setActiveStatus(status);
      setFavorites([]);
      setPagination(null);
      setHasMore(true);
    }
  };

  // 加载更多
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && pagination) {
      loadFavorites(pagination.page + 1, true);
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className={className}>
        <StatusFilterTabs
          activeStatus={activeStatus}
          onStatusChange={handleStatusChange}
        />
        <FavoritesSkeleton />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="text-5xl mb-4">😢</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">加载失败</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => loadFavorites(1, false)} variant="outline">
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 状态筛选 Tab */}
      <StatusFilterTabs
        activeStatus={activeStatus}
        onStatusChange={handleStatusChange}
      />

      {/* 空状态 */}
      {favorites.length === 0 ? (
        <EmptyState status={activeStatus} />
      ) : (
        <>
          {/* 收藏列表 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {favorites.map((favorite, index) => (
                <motion.div
                  key={favorite.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <FavoriteCard favorite={favorite} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 加载更多 */}
          <div ref={loadMoreRef} className="flex justify-center pt-4">
            {hasMore ? (
              <Button
                variant="outline"
                onClick={handleLoadMore}
                isLoading={isLoadingMore}
                className="rounded-xl"
              >
                {isLoadingMore ? '加载中...' : '加载更多'}
              </Button>
            ) : favorites.length > 0 ? (
              <p className="text-sm text-muted-foreground">已经到底啦 ~</p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * 状态筛选 Tab 组件
 */
function StatusFilterTabs({
  activeStatus,
  onStatusChange,
}: {
  activeStatus: ReadingStatus;
  onStatusChange: (status: ReadingStatus) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
      {STATUS_TABS.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onStatusChange(tab.key)}
          className={cn(
            'relative whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all',
            activeStatus === tab.key
              ? 'text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          {tab.label}
          {activeStatus === tab.key && (
            <motion.div
              layoutId="activeStatusTab"
              className="absolute inset-0 rounded-xl bg-primary/10"
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * 单个收藏作品卡片组件
 */
function FavoriteCard({ favorite }: { favorite: FavoriteWork }) {
  const { work, addedAt, lastReadAt, readProgress, hasUpdate } = favorite;

  // 根据阅读进度推断状态
  const inferredStatus: ReadingStatus =
    readProgress === 0
      ? 'want_to_read'
      : readProgress >= 100
        ? 'completed'
        : 'reading';

  const statusConfig = READING_STATUS_CONFIG[inferredStatus];

  return (
    <Link href={`/works/${work.id}`}>
      <div
        className={cn(
          'group relative rounded-2xl border border-border bg-card/80 p-3 backdrop-blur-sm transition-all',
          'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5'
        )}
      >
        {/* 更新标记 */}
        {hasUpdate && (
          <div className="absolute -right-1 -top-1 z-10">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary text-[10px] text-white font-medium shadow-md">
              新
            </span>
          </div>
        )}

        <div className="flex gap-3">
          {/* 封面图片 */}
          <div className="relative h-24 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
            {work.coverImage ? (
              <Image
                src={work.coverImage}
                alt={work.title}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                <span className="text-2xl">📚</span>
              </div>
            )}
          </div>

          {/* 作品信息 */}
          <div className="flex flex-1 flex-col justify-between min-w-0 py-0.5">
            {/* 标题和作者 */}
            <div>
              <h4 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                {work.title}
              </h4>
              {work.author && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                  {work.author.displayName || work.author.username}
                </p>
              )}
            </div>

            {/* 状态徽章和进度 */}
            <div className="space-y-1.5">
              {/* 阅读状态徽章 */}
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium',
                    statusConfig.bgColor,
                    statusConfig.color
                  )}
                >
                  {statusConfig.label}
                </span>
                {readProgress > 0 && readProgress < 100 && (
                  <span className="text-xs text-muted-foreground">
                    {readProgress}%
                  </span>
                )}
              </div>

              {/* 阅读进度条 */}
              {readProgress > 0 && readProgress < 100 && (
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
                    style={{ width: `${readProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* 时间信息 */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {lastReadAt ? (
                <span>上次阅读: {formatRelativeTime(lastReadAt)}</span>
              ) : (
                <span>添加于: {formatRelativeTime(addedAt)}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

/**
 * 空状态组件
 */
function EmptyState({ status }: { status: ReadingStatus }) {
  const emptyMessages: Record<ReadingStatus, { icon: string; title: string; desc: string }> = {
    all: {
      icon: '📚',
      title: '暂无收藏',
      desc: '去发现更多精彩作品，添加到你的收藏吧~',
    },
    want_to_read: {
      icon: '📖',
      title: '暂无想读',
      desc: '把感兴趣的作品标记为"想读"，方便以后阅读',
    },
    reading: {
      icon: '📕',
      title: '暂无在读',
      desc: '开始阅读一本新书吧~',
    },
    completed: {
      icon: '✅',
      title: '暂无已读',
      desc: '完成阅读的作品会显示在这里',
    },
    on_hold: {
      icon: '⏸️',
      title: '暂无搁置',
      desc: '暂时搁置的作品会显示在这里',
    },
  };

  const content = emptyMessages[status];

  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="text-6xl mb-4">{content.icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {content.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs text-center">
        {content.desc}
      </p>
    </div>
  );
}

/**
 * 骨架屏组件
 */
function FavoritesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card/80 p-3 animate-pulse"
        >
          <div className="flex gap-3">
            {/* 封面骨架 */}
            <div className="h-24 w-16 rounded-xl bg-muted flex-shrink-0" />

            {/* 内容骨架 */}
            <div className="flex-1 space-y-2 py-0.5">
              <div className="h-4 w-3/4 bg-muted rounded" />
              <div className="h-3 w-1/2 bg-muted rounded" />
              <div className="h-5 w-12 bg-muted rounded-lg" />
              <div className="h-3 w-2/3 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default FavoritesTab;
