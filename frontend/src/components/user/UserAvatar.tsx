'use client';

import Image from 'next/image';
import { cn } from '@/utils/cn';
import { MemberLevelBadge } from '@/components/membership/MemberLevelBadge';
import type { MemberLevel } from '@/types/membership';

/**
 * UserAvatar 组件属性
 */
export interface UserAvatarProps {
  /** 头像 URL */
  avatar: string | null;
  /** 用户名（用于生成默认头像） */
  username: string;
  /** 显示名称（优先用于生成默认头像） */
  displayName?: string | null;
  /** 会员等级 */
  memberLevel?: MemberLevel | string;
  /** 是否显示会员徽章 */
  showBadge?: boolean;
  /** 尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 自定义类名 */
  className?: string;
  /** 点击事件 */
  onClick?: () => void;
}

/**
 * 尺寸配置
 */
const sizeConfig = {
  xs: {
    container: 'h-8 w-8',
    text: 'text-xs',
    badge: 'xs' as const,
    badgePosition: '-bottom-1 -right-1',
  },
  sm: {
    container: 'h-10 w-10',
    text: 'text-sm',
    badge: 'xs' as const,
    badgePosition: '-bottom-1 -right-1',
  },
  md: {
    container: 'h-12 w-12',
    text: 'text-base',
    badge: 'xs' as const,
    badgePosition: '-bottom-1 -right-1',
  },
  lg: {
    container: 'h-16 w-16',
    text: 'text-xl',
    badge: 'sm' as const,
    badgePosition: '-bottom-1.5 -right-1.5',
  },
  xl: {
    container: 'h-24 w-24 sm:h-28 sm:w-28',
    text: 'text-3xl sm:text-4xl',
    badge: 'sm' as const,
    badgePosition: '-bottom-2 -right-2',
  },
};

/**
 * 用户头像组件
 *
 * 需求17: 用户个人中心
 * 任务17.2.2: 资料卡片组件
 *
 * 功能:
 * - 显示用户头像或默认字母头像
 * - 可选显示会员等级徽章
 * - 支持多种尺寸
 * - 可复用于不同场景
 */
export function UserAvatar({
  avatar,
  username,
  displayName,
  memberLevel,
  showBadge = false,
  size = 'md',
  className,
  onClick,
}: UserAvatarProps) {
  const config = sizeConfig[size];
  const name = displayName || username;
  const initial = name[0]?.toUpperCase() || '?';

  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      className={cn('relative flex-shrink-0', className)}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-2xl border-2 border-card shadow-md',
          config.container,
          onClick && 'cursor-pointer hover:opacity-90 transition-opacity'
        )}
      >
        {avatar ? (
          <Image
            src={avatar}
            alt={name}
            fill
            className="object-cover"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center',
              'bg-gradient-to-br from-primary to-secondary',
              'font-bold text-white',
              config.text
            )}
          >
            {initial}
          </div>
        )}
      </div>

      {/* 会员等级徽章 */}
      {showBadge && memberLevel && (
        <div className={cn('absolute', config.badgePosition)}>
          <MemberLevelBadge
            level={memberLevel}
            size={config.badge}
            variant="glass"
            showName={false}
          />
        </div>
      )}
    </Component>
  );
}

export default UserAvatar;
