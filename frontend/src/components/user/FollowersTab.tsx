'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { userService } from '@/services/user';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from './UserAvatar';
import { useAuthStore } from '@/store/auth';
import type { FollowUser } from '@/types/user';
import type { ApiError, PaginationMeta } from '@/types';

/**
 * FollowersTab 组件属性
 */
export interface FollowersTabProps {
  /** 用户 ID */
  userId: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 粉丝列表 Tab 组件
 *
 * 需求17: 用户个人中心
 * 任务17.2.5: 关注/粉丝列表
 *
 * 功能:
 * - 获取并展示用户粉丝列表
 * - 显示用户头像、用户名、简介
 * - 关注/取消关注按钮（非自己）
 * - 支持"加载更多"分页
 * - 加载骨架屏
 * - 空状态展示
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function FollowersTab({ userId, className }: FollowersTabProps) {
  const { user: currentUser } = useAuthStore();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [followLoadingIds, setFollowLoadingIds] = useState<Set<string>>(new Set());
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 加载粉丝列表
  const loadFollowers = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        if (page === 1) {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }
        setError(null);

        const response = await userService.getUserFollowers(userId, {
          page,
          limit: 20,
        });

        const newFollowers = response.data || [];
        const meta = response.meta;

        if (append) {
          setFollowers((prev) => [...prev, ...newFollowers]);
        } else {
          setFollowers(newFollowers);
        }

        setPagination(meta);
        setHasMore(meta ? meta.page < meta.totalPages : false);
      } catch (err) {
        const apiError = err as ApiError;
        setError(apiError.message || '加载粉丝列表失败');
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [userId]
  );

  // 初始加载
  useEffect(() => {
    loadFollowers(1, false);
  }, [loadFollowers]);

  // 关注/取消关注
  const handleFollowToggle = async (targetUserId: string, isFollowing: boolean) => {
    if (!currentUser) return;

    setFollowLoadingIds((prev) => new Set(prev).add(targetUserId));

    try {
      if (isFollowing) {
        await userService.unfollowUser(targetUserId);
      } else {
        await userService.followUser(targetUserId);
      }

      // 更新本地状态
      setFollowers((prev) =>
        prev.map((follower) =>
          follower.id === targetUserId
            ? { ...follower, isFollowing: !isFollowing }
            : follower
        )
      );
    } catch (err) {
      const apiError = err as ApiError;
      console.error('Follow toggle failed:', apiError.message);
    } finally {
      setFollowLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    }
  };

  // 加载更多
  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && pagination) {
      loadFollowers(pagination.page + 1, true);
    }
  };

  // 加载状态
  if (isLoading) {
    return <FollowListSkeleton />;
  }

  // 错误状态
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-12', className)}>
        <div className="text-5xl mb-4">😢</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">加载失败</h3>
        <p className="text-sm text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => loadFollowers(1, false)} variant="outline">
          重试
        </Button>
      </div>
    );
  }

  // 空状态
  if (followers.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        <div className="text-6xl mb-4">💫</div>
        <h3 className="text-lg font-semibold text-foreground mb-2">暂无粉丝</h3>
        <p className="text-sm text-muted-foreground max-w-xs text-center">
          还没有人关注，多发布优质内容吸引粉丝吧~
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* 粉丝列表 */}
      <AnimatePresence mode="popLayout">
        {followers.map((follower, index) => (
          <motion.div
            key={follower.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
          >
            <FollowUserCard
              user={follower}
              currentUserId={currentUser?.id}
              isFollowLoading={followLoadingIds.has(follower.id)}
              onFollowToggle={handleFollowToggle}
            />
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
        ) : followers.length > 0 ? (
          <p className="text-sm text-muted-foreground">已经到底啦 ~</p>
        ) : null}
      </div>
    </div>
  );
}


/**
 * 单个用户卡片组件
 */
function FollowUserCard({
  user,
  currentUserId,
  isFollowLoading,
  onFollowToggle,
}: {
  user: FollowUser;
  currentUserId?: string;
  isFollowLoading: boolean;
  onFollowToggle: (userId: string, isFollowing: boolean) => void;
}) {
  const isSelf = currentUserId === user.id;

  return (
    <div
      className={cn(
        'group rounded-2xl border border-border bg-card/80 p-4 backdrop-blur-sm transition-all',
        'hover:border-primary/30 hover:shadow-md'
      )}
    >
      <div className="flex items-center gap-3">
        {/* 头像 */}
        <Link href={`/user/${user.id}`}>
          <UserAvatar
            avatar={user.avatar}
            username={user.username}
            displayName={user.displayName}
            memberLevel={user.membershipLevel}
            showBadge
            size="md"
            className="cursor-pointer"
          />
        </Link>

        {/* 用户信息 */}
        <div className="flex-1 min-w-0">
          <Link href={`/user/${user.id}`}>
            <h4 className="font-medium text-foreground line-clamp-1 hover:text-primary transition-colors">
              {user.displayName || user.username}
            </h4>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </Link>
          {user.bio && (
            <p className="text-sm text-foreground/70 line-clamp-1 mt-1">
              {user.bio}
            </p>
          )}
        </div>

        {/* 关注按钮 */}
        {!isSelf && currentUserId && (
          <Button
            variant={user.isFollowing ? 'outline' : 'primary'}
            size="sm"
            className="rounded-xl min-w-[72px] flex-shrink-0"
            onClick={() => onFollowToggle(user.id, user.isFollowing)}
            isLoading={isFollowLoading}
          >
            {user.isFollowing ? '已关注' : '关注'}
          </Button>
        )}
      </div>
    </div>
  );
}

/**
 * 骨架屏组件
 */
function FollowListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-border bg-card/80 p-4 animate-pulse"
        >
          <div className="flex items-center gap-3">
            {/* 头像骨架 */}
            <div className="h-12 w-12 rounded-xl bg-muted flex-shrink-0" />

            {/* 内容骨架 */}
            <div className="flex-1 space-y-2">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
              <div className="h-3 w-full max-w-[200px] bg-muted rounded" />
            </div>

            {/* 按钮骨架 */}
            <div className="h-8 w-[72px] bg-muted rounded-xl flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default FollowersTab;
