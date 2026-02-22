'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { userService } from '@/services/user';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import type { ApiError, PaginationMeta } from '@/types';

/**
 * 活动类型枚举（与后端保持一致）
 */
export enum UserActivityType {
  WORK_PUBLISHED = 'WORK_PUBLISHED',
  CHAPTER_PUBLISHED = 'CHAPTER_PUBLISHED',
  CARD_POSTED = 'CARD_POSTED',
  COMMENT_POSTED = 'COMMENT_POSTED',
  WORK_LIKED = 'WORK_LIKED',
  CARD_LIKED = 'CARD_LIKED',
  ACTIVITY_JOINED = 'ACTIVITY_JOINED',
  ACHIEVEMENT_EARNED = 'ACHIEVEMENT_EARNED',
}

/**
 * 活动类型配置
 */
const ACTIVITY_TYPE_CONFIG: Record<
  UserActivityType,
  { icon: string; label: string; color: string }
> = {
  [UserActivityType.WORK_PUBLISHED]: {
    icon: '📚',
    label: '发布了新作品',
    color: 'text-primary',
  },
  [UserActivityType.CHAPTER_PUBLISHED]: {
    icon: '📖',
    label: '发布了新章节',
    color: 'text-blue-500',
  },
  [UserActivityType.CARD_POSTED]: {
    icon: '📝',
    label: '发布了动态',
    color: 'text-green-500',
  },
  [UserActivityType.COMMENT_POSTED]: {
    icon: '💬',
    label: '发表了评论',
    color: 'text-amber-500',
  },
  [UserActivityType.WORK_LIKED]: {
    icon: '❤️',
    label: '点赞了作品',
    color: 'text-pink-500',
  },
  [UserActivityType.CARD_LIKED]: {
    icon: '👍',
    label: '点赞了动态',
    color: 'text-rose-500',
  },
  [UserActivityType.ACTIVITY_JOINED]: {
    icon: '🎉',
    label: '参与了活动',
    color: 'text-purple-500',
  },
  [UserActivityType.ACHIEVEMENT_EARNED]: {
    icon: '🏆',
    label: '获得了成就',
    color: 'text-yellow-500',
  },
};

/**
 * 活动项数据结构（与后端 UserActivityItem 对应）
 */
interface ActivityItem {
  id: string;
  type: UserActivityType;
  typeName: string;
  createdAt: string;
  work?: {
    id: string;
    title: string;
    coverImage: string | null;
  };
  chapter?: {
    id: string;
    title: string;
    workId: string;
    workTitle: string;
  };
  card?: {
    id: string;
    contentPreview: string;
  };
  comment?: {
    id: string;
    contentPreview: string;
    cardId: string;
  };
  activity?: {
    id: string;
    title: string;
    coverImage: string | null;
  };
  targetUser?: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

/**
 * ActivitiesTab 组件属性
 */
export interface ActivitiesTabProps {
  /** 用户 ID */
  userId: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSeconds < 60) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks}周前`;
  } else if (diffMonths < 12) {
    return `${diffMonths}个月前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}

/**
 * 用户动态列表 Tab 组件
 *
 * 需求17: 用户个人中心
 * 任务17.2.3: 动态列表 Tab
 *
 * 功能:
 * - 获取并展示用户动态列表
 * - 显示活动卡片（类型图标、标签、时间戳、内容预览）
 * - 支持"加载更多"分页
 * - 加载骨架屏
 * - 空状态展示
 * - 处理不同活动类型的布局
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function ActivitiesTab({ userId, className }: ActivitiesTabProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 加载动态列表
  const loadActivities = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const response = await userService.getUserActivities(userId, {
          page,
          limit: 20,
        });

        const newActivities = response.data || [];
        const meta = response.meta;

        if (append) {
          setActivities((prev) => [...prev, ...newActivities]);
        } else {
          setActivities(newActivities);
        }

        setPagination(meta);
        setHasMore(meta ? meta.page < meta.totalPages : false);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || '加载动态失败');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [userId]
  );

  // 初始加载
  useEffect(() => {
    loadActivities(1, false);
  }, [loadActivities]);

  // 加载更多
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && pagination) {
      loadActivities(pagination.page + 1, true);
    }
  };

  // 加载状态
  if (isLoading) {
    return <ActivitiesSkeleton />;
  }

  // 错误状态
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="text-5xl mb-4">😢</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">加载失败</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => loadActivities(1, false)} variant="outline">
          重试
        </Button>
      </div>
    );
  }

  // 空状态
  if (activities.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        <div className="text-6xl mb-4">📭</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">暂无动态</h3>
        <p className="text-sm text-muted-foreground max-w-xs text-center">
          这位用户还没有发布任何动态，去看看其他内容吧~
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 动态列表 */}
      <AnimatePresence mode="popLayout">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
          >
            <ActivityCard activity={activity} />
          </motion.div>
        ))}
      </AnimatePresence>

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
        ) : activities.length > 0 ? (
          <p className="text-sm text-muted-foreground">已经到底啦 ~</p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * 单条动态卡片组件
 */
function ActivityCard({ activity }: { activity: ActivityItem }) {
  const config = ACTIVITY_TYPE_CONFIG[activity.type] || {
    icon: '📌',
    label: activity.typeName || '动态',
    color: 'text-muted-foreground',
  };

  // 获取跳转链接
  const getLink = (): string | null => {
    switch (activity.type) {
      case UserActivityType.WORK_PUBLISHED:
      case UserActivityType.WORK_LIKED:
        return activity.work ? `/works/${activity.work.id}` : null;
      case UserActivityType.CHAPTER_PUBLISHED:
        return activity.chapter
          ? `/reader/${activity.chapter.workId}/${activity.chapter.id}`
          : null;
      case UserActivityType.CARD_POSTED:
      case UserActivityType.CARD_LIKED:
        return activity.card ? `/plaza?card=${activity.card.id}` : null;
      case UserActivityType.COMMENT_POSTED:
        return activity.comment
          ? `/plaza?card=${activity.comment.cardId}`
          : null;
      case UserActivityType.ACTIVITY_JOINED:
        return activity.activity ? `/activities/${activity.activity.id}` : null;
      default:
        return null;
    }
  };

  const link = getLink();

  const cardContent = (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm transition-all',
        link && 'hover:border-primary/30 hover:shadow-md cursor-pointer'
      )}
    >
      <div className="flex gap-3">
        {/* 类型图标 */}
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-muted/50 text-xl'
          )}
        >
          {config.icon}
        </div>

        {/* 内容区域 */}
        <div className="flex-1 min-w-0">
          {/* 类型标签和时间 */}
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className={cn('text-sm font-medium', config.color)}>
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground flex-shrink-0">
              {formatRelativeTime(activity.createdAt)}
            </span>
          </div>

          {/* 内容预览 */}
          <ActivityContent activity={activity} />
        </div>
      </div>
    </div>
  );

  if (link) {
    return <Link href={link}>{cardContent}</Link>;
  }

  return cardContent;
}

/**
 * 动态内容预览组件
 */
function ActivityContent({ activity }: { activity: ActivityItem }) {
  switch (activity.type) {
    case UserActivityType.WORK_PUBLISHED:
    case UserActivityType.WORK_LIKED:
      if (!activity.work) return null;
      return (
        <div className="flex gap-3 mt-2">
          {activity.work.coverImage && (
            <div className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src={activity.work.coverImage}
                alt={activity.work.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground line-clamp-1">
              {activity.work.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">作品</p>
          </div>
        </div>
      );

    case UserActivityType.CHAPTER_PUBLISHED:
      if (!activity.chapter) return null;
      return (
        <div className="mt-1">
          <h4 className="font-medium text-foreground line-clamp-1">
            {activity.chapter.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            《{activity.chapter.workTitle}》
          </p>
        </div>
      );

    case UserActivityType.CARD_POSTED:
    case UserActivityType.CARD_LIKED:
      if (!activity.card) return null;
      return (
        <p className="text-sm text-foreground/80 line-clamp-2 mt-1">
          {activity.card.contentPreview}
        </p>
      );

    case UserActivityType.COMMENT_POSTED:
      if (!activity.comment) return null;
      return (
        <p className="text-sm text-foreground/80 line-clamp-2 mt-1">
          {activity.comment.contentPreview}
        </p>
      );

    case UserActivityType.ACTIVITY_JOINED:
      if (!activity.activity) return null;
      return (
        <div className="flex gap-3 mt-2">
          {activity.activity.coverImage && (
            <div className="relative h-12 w-20 flex-shrink-0 overflow-hidden rounded-lg">
              <Image
                src={activity.activity.coverImage}
                alt={activity.activity.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-foreground line-clamp-1">
              {activity.activity.title}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">社区活动</p>
          </div>
        </div>
      );

    case UserActivityType.ACHIEVEMENT_EARNED:
      return (
        <p className="text-sm text-foreground/80 mt-1">
          解锁了新成就！
        </p>
      );

    default:
      return null;
  }
}

/**
 * 骨架屏组件
 */
function ActivitiesSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card/80 p-4 animate-pulse"
        >
          <div className="flex gap-3">
            {/* 图标骨架 */}
            <div className="h-10 w-10 rounded-xl bg-muted flex-shrink-0" />

            {/* 内容骨架 */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
              </div>
              <div className="h-4 w-full bg-muted rounded" />
              <div className="h-4 w-3/4 bg-muted rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivitiesTab;
