'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/store/auth';
import { userService } from '@/services/user';
import { Button } from '@/components/ui/Button';
import { ProfileCard, ActivitiesTab, FavoritesTab, FollowersTab, FollowingTab, ReadingStatsTab } from '@/components/user';
import { cn } from '@/utils/cn';
import type { UserProfileData, ProfileTab } from '@/types/user';
import type { ApiError } from '@/types';

/**
 * Tab 配置
 */
const TABS: { key: ProfileTab; label: string; icon: string }[] = [
  { key: 'activities', label: '动态', icon: '📝' },
  { key: 'works', label: '作品', icon: '📚' },
  { key: 'favorites', label: '收藏', icon: '⭐' },
  { key: 'stats', label: '统计', icon: '📊' },
  { key: 'following', label: '关注', icon: '👥' },
  { key: 'followers', label: '粉丝', icon: '💫' },
];

/**
 * 用户个人主页
 *
 * 需求17: 用户个人中心
 * 任务17.2.1: 个人主页布局
 */
export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const { user: currentUser } = useAuthStore();

  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<ProfileTab>('activities');
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = currentUser?.id === userId;

  // 加载用户数据
  const loadProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await userService.getUserProfile(userId);
      setProfile(response.data);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || '加载用户信息失败');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // 关注/取消关注
  const handleFollowToggle = async () => {
    if (!profile || isOwnProfile) return;

    try {
      setIsFollowLoading(true);
      if (profile.isFollowing) {
        const response = await userService.unfollowUser(userId);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: response.data.isFollowing,
                stats: {
                  ...prev.stats,
                  followersCount: response.data.followersCount,
                },
              }
            : null
        );
      } else {
        const response = await userService.followUser(userId);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: response.data.isFollowing,
                stats: {
                  ...prev.stats,
                  followersCount: response.data.followersCount,
                },
              }
            : null
        );
      }
    } catch (err) {
      const apiError = err as ApiError;
      console.error('Follow toggle failed:', apiError.message);
    } finally {
      setIsFollowLoading(false);
    }
  };

  // 加载状态
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <ProfileSkeleton />
      </div>
    );
  }

  // 错误状态
  if (error || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
          <div className="text-6xl mb-4">😢</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            {error || '用户不存在'}
          </h2>
          <p className="text-muted-foreground mb-6">
            无法加载用户信息，请稍后重试
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>
              返回
            </Button>
            <Button onClick={loadProfile}>重试</Button>
          </div>
        </div>
      </div>
    );
  }

  // 过滤 Tab（非创作者不显示作品 Tab）
  const visibleTabs =
    profile.stats.worksCount > 0
      ? TABS
      : TABS.filter((tab) => tab.key !== 'works');

  return (
    <div className="min-h-screen bg-background">
      {/* 背景装饰 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      {/* Header 背景区域 */}
      <div className="relative">
        {/* 背景图片/渐变 */}
        <div className="relative h-48 sm:h-56 md:h-64 overflow-hidden">
          {profile.backgroundImage ? (
            <Image
              src={profile.backgroundImage}
              alt="背景"
              fill
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-secondary" />
          )}
          {/* 渐变遮罩 */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
          {/* 装饰图案 */}
          <div className="absolute inset-0 bg-[url('/patterns/stars.svg')] opacity-20" />
        </div>

        {/* 用户信息卡片 */}
        <div className="relative mx-auto max-w-4xl px-4">
          <div className="relative -mt-20 sm:-mt-24">
            <ProfileCard
              userId={profile.id}
              username={profile.username}
              displayName={profile.displayName}
              avatar={profile.avatar}
              bio={profile.bio}
              memberLevel={profile.membershipLevel}
              stats={profile.stats}
              isFollowing={profile.isFollowing}
              isOwnProfile={isOwnProfile}
              isFollowLoading={isFollowLoading}
              onFollowToggle={handleFollowToggle}
              onStatClick={(stat) => {
                if (stat === 'followers') setActiveTab('followers');
                else if (stat === 'following') setActiveTab('following');
                else if (stat === 'works') setActiveTab('works');
              }}
            />
          </div>
        </div>
      </div>

      {/* Tab 导航 */}
      <div className="sticky top-0 z-10 mt-4 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto max-w-4xl px-4">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide py-2">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'relative flex items-center gap-1.5 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                  activeTab === tab.key
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-xl bg-primary/10"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab 内容区域 */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <TabContent tab={activeTab} userId={userId} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/**
 * Tab 内容组件
 * 任务17.2.3: 动态列表 Tab 已实现
 * 任务17.2.4: 收藏列表 Tab 已实现
 * 任务17.2.5: 关注/粉丝列表 已实现
 * 任务17.2.7: 阅读统计展示 已实现
 * 其他 Tab 为占位符，后续任务实现
 */
function TabContent({ tab, userId }: { tab: ProfileTab; userId: string }) {
  // 动态 Tab - 使用 ActivitiesTab 组件
  if (tab === 'activities') {
    return <ActivitiesTab userId={userId} />;
  }

  // 收藏 Tab - 使用 FavoritesTab 组件
  if (tab === 'favorites') {
    return <FavoritesTab userId={userId} />;
  }

  // 关注 Tab - 使用 FollowingTab 组件
  if (tab === 'following') {
    return <FollowingTab userId={userId} />;
  }

  // 粉丝 Tab - 使用 FollowersTab 组件
  if (tab === 'followers') {
    return <FollowersTab userId={userId} />;
  }

  // 统计 Tab - 使用 ReadingStatsTab 组件
  if (tab === 'stats') {
    return <ReadingStatsTab userId={userId} />;
  }

  // 其他 Tab 占位符
  const placeholderContent: Record<ProfileTab, { icon: string; title: string; desc: string }> = {
    activities: {
      icon: '📝',
      title: '动态',
      desc: '用户的动态将在这里显示',
    },
    works: {
      icon: '📚',
      title: '作品',
      desc: '用户创作的作品将在这里显示',
    },
    favorites: {
      icon: '⭐',
      title: '收藏',
      desc: '用户收藏的作品将在这里显示',
    },
    stats: {
      icon: '📊',
      title: '统计',
      desc: '用户的阅读统计将在这里显示',
    },
    following: {
      icon: '👥',
      title: '关注',
      desc: '用户关注的人将在这里显示',
    },
    followers: {
      icon: '💫',
      title: '粉丝',
      desc: '用户的粉丝将在这里显示',
    },
  };

  const content = placeholderContent[tab];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">{content.icon}</div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {content.title}
      </h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        {content.desc}
      </p>
      <p className="mt-4 text-xs text-muted-foreground/60">
        用户 ID: {userId}
      </p>
    </div>
  );
}

/**
 * 骨架屏组件
 */
function ProfileSkeleton() {
  return (
    <>
      {/* Header 骨架 */}
      <div className="relative h-48 sm:h-56 md:h-64 bg-gradient-to-br from-primary/20 to-secondary/20 animate-pulse" />

      <div className="relative mx-auto max-w-4xl px-4">
        <div className="relative -mt-20 sm:-mt-24">
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
              {/* 头像骨架 */}
              <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-muted animate-pulse self-center sm:self-start" />

              {/* 信息骨架 */}
              <div className="flex-1 space-y-3">
                <div className="h-7 w-40 bg-muted rounded animate-pulse mx-auto sm:mx-0" />
                <div className="h-4 w-24 bg-muted rounded animate-pulse mx-auto sm:mx-0" />
                <div className="h-4 w-full max-w-md bg-muted rounded animate-pulse mx-auto sm:mx-0" />
                <div className="flex gap-6 justify-center sm:justify-start pt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-1">
                      <div className="h-5 w-10 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-8 bg-muted rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab 骨架 */}
      <div className="mt-4 border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-2">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 w-20 bg-muted rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>

      {/* 内容骨架 */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 bg-muted rounded-xl animate-pulse"
            />
          ))}
        </div>
      </div>
    </>
  );
}
