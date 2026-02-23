'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, X, ChevronRight, Sparkles, Target } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AchievementTier, AchievementWithProgress } from '@/types/achievement';
import {
  ACHIEVEMENT_TIER_NAMES,
  ACHIEVEMENT_TIER_COLORS,
} from '@/types/achievement';

/**
 * 成就通知类型
 */
export type AchievementNotificationType = 'progress' | 'unlock';

/**
 * 成就通知数据
 */
export interface AchievementNotification {
  /** 通知ID */
  id: string;
  /** 通知类型 */
  type: AchievementNotificationType;
  /** 成就ID */
  achievementId: string;
  /** 成就名称 */
  achievementName: string;
  /** 成就等级 */
  tier: AchievementTier;
  /** 成就图标URL */
  iconUrl?: string | null;
  /** 当前进度 */
  currentProgress: number;
  /** 目标值 */
  targetValue: number;
  /** 进度百分比 */
  progressPercent: number;
  /** 是否已解锁 */
  isUnlocked: boolean;
  /** 创建时间 */
  createdAt: number;
}

/**
 * Toast 位置
 */
export type ToastPosition = 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';

/**
 * 单个 Toast 组件属性
 */
interface AchievementToastItemProps {
  notification: AchievementNotification;
  position: ToastPosition;
  index: number;
  onDismiss: (id: string) => void;
  onClick?: (notification: AchievementNotification) => void;
  autoDismissDelay?: number;
}

/**
 * 获取位置对应的动画配置
 */
function getPositionAnimation(position: ToastPosition) {
  const isRight = position.includes('right');

  return {
    initial: {
      x: isRight ? 100 : -100,
      opacity: 0,
      scale: 0.9,
    },
    animate: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: {
      x: isRight ? 100 : -100,
      opacity: 0,
      scale: 0.9,
    },
  };
}

/**
 * 获取位置对应的容器样式
 */
function getPositionStyles(position: ToastPosition): string {
  switch (position) {
    case 'top-right':
      return 'top-4 right-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    case 'top-left':
      return 'top-4 left-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    default:
      return 'top-4 right-4';
  }
}

/**
 * 单个 Toast 组件
 */
function AchievementToastItem({
  notification,
  position,
  index,
  onDismiss,
  onClick,
  autoDismissDelay = 5000,
}: AchievementToastItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const tierColors = ACHIEVEMENT_TIER_COLORS[notification.tier];
  const animation = getPositionAnimation(position);
  const isTopPosition = position.includes('top');

  // Auto-dismiss timer
  useEffect(() => {
    if (isHovered || autoDismissDelay <= 0) return;

    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, autoDismissDelay);

    return () => clearTimeout(timer);
  }, [notification.id, autoDismissDelay, isHovered, onDismiss]);

  const handleClick = () => {
    onClick?.(notification);
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(notification.id);
  };

  const isUnlock = notification.type === 'unlock';

  return (
    <motion.div
      layout
      initial={animation.initial}
      animate={{
        ...animation.animate,
        y: isTopPosition ? index * 8 : -index * 8,
      }}
      exit={animation.exit}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        layout: { duration: 0.2 },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      className={cn(
        'relative w-80 cursor-pointer',
        'rounded-xl overflow-hidden',
        'shadow-lg',
        'backdrop-blur-md',
        isUnlock
          ? 'bg-gradient-to-r from-purple-500/90 to-indigo-500/90 border border-purple-400/50'
          : 'bg-white/90 dark:bg-gray-800/90 border border-gray-200/50 dark:border-gray-700/50'
      )}
      style={{
        zIndex: 100 - index,
      }}
    >
      {/* Progress bar for progress type */}
      {!isUnlock && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${notification.progressPercent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn('h-full bg-gradient-to-r', tierColors.gradient)}
          />
        </div>
      )}

      {/* Glow effect for unlock */}
      {isUnlock && (
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-pink-400/20"
        />
      )}

      <div className="relative p-4 flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center',
            isUnlock
              ? 'bg-white/20'
              : cn('bg-gradient-to-br', tierColors.gradient)
          )}
        >
          {notification.iconUrl ? (
            <img
              src={notification.iconUrl}
              alt={notification.achievementName}
              className="w-8 h-8"
            />
          ) : isUnlock ? (
            <Sparkles className="w-6 h-6 text-yellow-300" />
          ) : (
            <Target className="w-6 h-6 text-white" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            {isUnlock ? (
              <span className="text-xs font-semibold text-yellow-200 flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                成就解锁!
              </span>
            ) : (
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                成就进度
              </span>
            )}
            <span
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full font-medium',
                isUnlock
                  ? 'bg-white/20 text-white'
                  : cn(tierColors.bg, tierColors.text)
              )}
            >
              {ACHIEVEMENT_TIER_NAMES[notification.tier]}
            </span>
          </div>

          {/* Achievement name */}
          <h4
            className={cn(
              'font-semibold text-sm truncate',
              isUnlock ? 'text-white' : 'text-gray-900 dark:text-white'
            )}
          >
            {notification.achievementName}
          </h4>

          {/* Progress info */}
          <p
            className={cn(
              'text-xs mt-1',
              isUnlock ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {isUnlock ? (
              '点击查看详情领取奖励'
            ) : (
              <>
                进度: {notification.currentProgress}/{notification.targetValue} (
                {notification.progressPercent}%)
              </>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-1">
          {/* View button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isUnlock
                ? 'hover:bg-white/20 text-white/80 hover:text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>

          {/* Dismiss button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleDismiss}
            className={cn(
              'p-1.5 rounded-lg transition-colors',
              isUnlock
                ? 'hover:bg-white/20 text-white/60 hover:text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            )}
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      {/* Auto-dismiss progress indicator */}
      {!isHovered && autoDismissDelay > 0 && (
        <motion.div
          initial={{ scaleX: 1 }}
          animate={{ scaleX: 0 }}
          transition={{ duration: autoDismissDelay / 1000, ease: 'linear' }}
          className={cn(
            'absolute top-0 left-0 right-0 h-0.5 origin-left',
            isUnlock ? 'bg-white/40' : 'bg-indigo-500/40'
          )}
        />
      )}
    </motion.div>
  );
}


/**
 * AchievementProgressToast 组件属性
 */
export interface AchievementProgressToastProps {
  /** 通知列表 */
  notifications: AchievementNotification[];
  /** Toast 位置 */
  position?: ToastPosition;
  /** 关闭通知回调 */
  onDismiss: (id: string) => void;
  /** 点击通知回调 */
  onClick?: (notification: AchievementNotification) => void;
  /** 自动关闭延迟（毫秒） */
  autoDismissDelay?: number;
  /** 最大显示数量 */
  maxVisible?: number;
}

/**
 * 成就进度通知 Toast 组件
 *
 * 需求24: 成就系统
 * 任务24.2.9: 成就进度通知推送
 *
 * 功能：
 * - Toast notification for achievement progress updates (e.g., "阅读成就进度: 50/100")
 * - Toast notification for achievement unlock (smaller than full-screen animation)
 * - Slide-in animation from top-right or bottom-right
 * - Auto-dismiss after a few seconds
 * - Click to view achievement details
 * - Stack multiple notifications
 * - Different styles for progress update vs unlock notification
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function AchievementProgressToast({
  notifications,
  position = 'top-right',
  onDismiss,
  onClick,
  autoDismissDelay = 5000,
  maxVisible = 5,
}: AchievementProgressToastProps) {
  const positionStyles = getPositionStyles(position);
  const isTop = position.includes('top');

  // Limit visible notifications
  const visibleNotifications = notifications.slice(0, maxVisible);

  return (
    <div
      className={cn(
        'fixed z-50 flex gap-3 pointer-events-none',
        isTop ? 'flex-col' : 'flex-col-reverse',
        positionStyles
      )}
    >
      <AnimatePresence mode="popLayout">
        {visibleNotifications.map((notification, index) => (
          <div key={notification.id} className="pointer-events-auto">
            <AchievementToastItem
              notification={notification}
              position={position}
              index={index}
              onDismiss={onDismiss}
              onClick={onClick}
              autoDismissDelay={autoDismissDelay}
            />
          </div>
        ))}
      </AnimatePresence>

      {/* Overflow indicator */}
      {notifications.length > maxVisible && (
        <motion.div
          initial={{ opacity: 0, y: isTop ? -10 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            'pointer-events-auto text-center py-2 px-4 rounded-lg',
            'bg-gray-100/90 dark:bg-gray-800/90 backdrop-blur-sm',
            'text-xs text-gray-500 dark:text-gray-400'
          )}
        >
          还有 {notifications.length - maxVisible} 条通知
        </motion.div>
      )}
    </div>
  );
}

// ==================== 辅助函数 ====================

/**
 * 从成就数据创建通知
 */
export function createAchievementNotification(
  achievement: AchievementWithProgress,
  type: AchievementNotificationType = 'progress'
): AchievementNotification {
  return {
    id: `${achievement.id}-${Date.now()}`,
    type,
    achievementId: achievement.id,
    achievementName: achievement.displayName,
    tier: achievement.tier,
    iconUrl: achievement.iconUrl,
    currentProgress: achievement.currentProgress,
    targetValue: achievement.targetValue,
    progressPercent: achievement.progressPercent,
    isUnlocked: achievement.isUnlocked,
    createdAt: Date.now(),
  };
}

/**
 * 从 WebSocket 事件数据创建通知
 */
export function createNotificationFromEvent(data: {
  achievementId: string;
  achievementName: string;
  tier: AchievementTier;
  iconUrl?: string | null;
  currentProgress: number;
  targetValue: number;
  isUnlocked: boolean;
}): AchievementNotification {
  const progressPercent = Math.round((data.currentProgress / data.targetValue) * 100);
  return {
    id: `${data.achievementId}-${Date.now()}`,
    type: data.isUnlocked ? 'unlock' : 'progress',
    achievementId: data.achievementId,
    achievementName: data.achievementName,
    tier: data.tier,
    iconUrl: data.iconUrl,
    currentProgress: data.currentProgress,
    targetValue: data.targetValue,
    progressPercent,
    isUnlocked: data.isUnlocked,
    createdAt: Date.now(),
  };
}

export default AchievementProgressToast;
