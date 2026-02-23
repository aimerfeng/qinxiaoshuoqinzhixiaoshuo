'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { UserAvatar } from './UserAvatar';
import { SendMessageButton } from '@/components/message';
import type { MemberLevel } from '@/types/membership';

/**
 * 用户统计数据
 */
export interface ProfileStats {
  followersCount: number;
  followingCount: number;
  worksCount: number;
  likesCount: number;
}

/**
 * ProfileCard 组件属性
 */
export interface ProfileCardProps {
  /** 用户 ID */
  userId: string;
  /** 用户名 */
  username: string;
  /** 显示名称 */
  displayName: string | null;
  /** 头像 URL */
  avatar: string | null;
  /** 个人简介 */
  bio: string | null;
  /** 会员等级 */
  memberLevel: MemberLevel | string;
  /** 统计数据 */
  stats: ProfileStats;
  /** 是否已关注 */
  isFollowing?: boolean;
  /** 是否是自己的资料 */
  isOwnProfile?: boolean;
  /** 变体样式 */
  variant?: 'full' | 'compact';
  /** 关注按钮加载状态 */
  isFollowLoading?: boolean;
  /** 关注/取消关注回调 */
  onFollowToggle?: () => void;
  /** 统计项点击回调 */
  onStatClick?: (stat: 'followers' | 'following' | 'works' | 'likes') => void;
  /** 自定义类名 */
  className?: string;
  /** 是否启用动画 */
  animated?: boolean;
}

/**
 * 格式化数字
 */
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

/**
 * 用户资料卡片组件
 *
 * 需求17: 用户个人中心
 * 任务17.2.2: 资料卡片组件
 *
 * 功能:
 * - 显示用户头像和会员等级徽章
 * - 显示用户名、显示名称和简介
 * - 显示统计数据（粉丝、关注、作品、获赞）
 * - 关注/取消关注按钮（他人资料）
 * - 编辑资料按钮（自己资料）
 * - 支持 full 和 compact 两种变体
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function ProfileCard({
  userId,
  username,
  displayName,
  avatar,
  bio,
  memberLevel,
  stats,
  isFollowing = false,
  isOwnProfile = false,
  variant = 'full',
  isFollowLoading = false,
  onFollowToggle,
  onStatClick,
  className,
  animated = true,
}: ProfileCardProps) {
  const isCompact = variant === 'compact';

  const content = (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card/95 shadow-card backdrop-blur-xl',
        isCompact ? 'p-3' : 'p-4 sm:p-6',
        className
      )}
    >
      <div className={cn('flex', isCompact ? 'gap-3' : 'flex-col sm:flex-row gap-4 sm:gap-6')}>
        {/* 头像 */}
        <UserAvatar
          avatar={avatar}
          username={username}
          displayName={displayName}
          memberLevel={memberLevel}
          showBadge
          size={isCompact ? 'md' : 'xl'}
          className={isCompact ? '' : 'self-center sm:self-start'}
        />

        {/* 用户信息 */}
        <div className={cn('flex-1', !isCompact && 'text-center sm:text-left')}>
          <div
            className={cn(
              'flex',
              isCompact
                ? 'flex-col gap-1'
                : 'flex-col sm:flex-row sm:items-start sm:justify-between gap-3'
            )}
          >
            <div className={isCompact ? '' : 'min-w-0'}>
              <h2
                className={cn(
                  'font-bold text-foreground truncate',
                  isCompact ? 'text-sm' : 'text-xl sm:text-2xl'
                )}
              >
                {displayName || username}
              </h2>
              <p className={cn('text-muted-foreground', isCompact ? 'text-xs' : 'text-sm')}>
                @{username}
              </p>
            </div>

            {/* 操作按钮 - 仅在 full 模式显示 */}
            {!isCompact && (
              <div className="flex justify-center sm:justify-start gap-2 flex-shrink-0">
                {isOwnProfile ? (
                  <Link href="/profile">
                    <Button variant="outline" size="sm" className="rounded-xl">
                      <EditIcon className="mr-1.5 h-4 w-4" />
                      编辑资料
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Button
                      variant={isFollowing ? 'outline' : 'primary'}
                      size="sm"
                      className="rounded-xl min-w-[80px]"
                      onClick={onFollowToggle}
                      isLoading={isFollowLoading}
                    >
                      {isFollowing ? '已关注' : '关注'}
                    </Button>
                    <SendMessageButton
                      userId={userId}
                      username={username}
                      displayName={displayName}
                      variant="ghost"
                      size="sm"
                      iconOnly
                      className="rounded-xl"
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* 简介 */}
          {bio && !isCompact && (
            <p className="mt-3 text-sm text-foreground/80 line-clamp-2">{bio}</p>
          )}

          {/* 统计数据 */}
          <div
            className={cn(
              'flex flex-wrap',
              isCompact
                ? 'gap-3 mt-2'
                : 'justify-center sm:justify-start gap-4 sm:gap-6 mt-4'
            )}
          >
            <StatItem
              label="粉丝"
              value={formatNumber(stats.followersCount)}
              size={isCompact ? 'sm' : 'md'}
              onClick={onStatClick ? () => onStatClick('followers') : undefined}
            />
            <StatItem
              label="关注"
              value={formatNumber(stats.followingCount)}
              size={isCompact ? 'sm' : 'md'}
              onClick={onStatClick ? () => onStatClick('following') : undefined}
            />
            {stats.worksCount > 0 && (
              <StatItem
                label="作品"
                value={formatNumber(stats.worksCount)}
                size={isCompact ? 'sm' : 'md'}
                onClick={onStatClick ? () => onStatClick('works') : undefined}
              />
            )}
            <StatItem
              label="获赞"
              value={formatNumber(stats.likesCount)}
              size={isCompact ? 'sm' : 'md'}
              onClick={onStatClick ? () => onStatClick('likes') : undefined}
            />
          </div>

          {/* Compact 模式下的操作按钮 */}
          {isCompact && (
            <div className="flex gap-2 mt-3">
              {isOwnProfile ? (
                <Link href="/profile" className="flex-1">
                  <Button variant="outline" size="sm" className="rounded-xl w-full text-xs">
                    编辑资料
                  </Button>
                </Link>
              ) : (
                <Button
                  variant={isFollowing ? 'outline' : 'primary'}
                  size="sm"
                  className="rounded-xl flex-1 text-xs"
                  onClick={onFollowToggle}
                  isLoading={isFollowLoading}
                >
                  {isFollowing ? '已关注' : '关注'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

/**
 * 统计项组件
 */
function StatItem({
  label,
  value,
  size = 'md',
  onClick,
}: {
  label: string;
  value: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}) {
  const Component = onClick ? 'button' : 'div';
  const isSmall = size === 'sm';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'text-center',
        onClick && 'hover:opacity-80 transition-opacity cursor-pointer'
      )}
    >
      <div className={cn('font-bold text-foreground', isSmall ? 'text-sm' : 'text-lg')}>
        {value}
      </div>
      <div className={cn('text-muted-foreground', isSmall ? 'text-2xs' : 'text-xs')}>
        {label}
      </div>
    </Component>
  );
}

/**
 * 编辑图标
 */
function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

export default ProfileCard;
