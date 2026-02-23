'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Clock, Gift, Trophy, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 活动通知推送组件
 *
 * 需求26: 限时活动前端
 * 任务26.2.8: 活动通知推送
 *
 * 活动相关通知
 */

export type NotificationType = 'activity_start' | 'activity_ending' | 'reward_available' | 'milestone_reached' | 'activity_completed';

export interface ActivityNotificationData {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  activityId?: string;
  activityTitle?: string;
  rewardAmount?: number;
  timestamp: Date;
  read?: boolean;
}

interface ActivityNotificationProps {
  notification: ActivityNotificationData;
  onDismiss?: (id: string) => void;
  onClick?: (notification: ActivityNotificationData) => void;
  autoHide?: boolean;
  autoHideDelay?: number;
  className?: string;
}

const notificationConfig: Record<NotificationType, { icon: React.ReactNode; color: string; bgColor: string }> = {
  activity_start: {
    icon: <Sparkles className="w-5 h-5" />,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  activity_ending: {
    icon: <Clock className="w-5 h-5" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  reward_available: {
    icon: <Gift className="w-5 h-5" />,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  milestone_reached: {
    icon: <Trophy className="w-5 h-5" />,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  activity_completed: {
    icon: <Trophy className="w-5 h-5" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
};

export function ActivityNotification({
  notification,
  onDismiss,
  onClick,
  autoHide = false,
  autoHideDelay = 5000,
  className = '',
}: ActivityNotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const config = notificationConfig[notification.type];

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onDismiss?.(notification.id), 300);
      }, autoHideDelay);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [autoHide, autoHideDelay, notification.id, onDismiss]);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(() => onDismiss?.(notification.id), 300);
  };

  const handleClick = () => {
    onClick?.(notification);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          onClick={handleClick}
          className={cn(
            'relative p-4 rounded-2xl cursor-pointer',
            'bg-white/90 dark:bg-gray-900/90',
            'backdrop-blur-xl border border-white/30 dark:border-gray-700/30',
            'shadow-lg shadow-black/5',
            'hover:shadow-xl transition-shadow',
            className
          )}
        >
          <div className="flex items-start gap-3">
            {/* 图标 */}
            <div className={cn('p-2 rounded-xl', config.bgColor, config.color)}>
              {config.icon}
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {notification.title}
                </h4>
                {notification.rewardAmount && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
                    +{notification.rewardAmount}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {notification.message}
              </p>
              {notification.activityTitle && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                  <span className="truncate">{notification.activityTitle}</span>
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                </p>
              )}
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 自动隐藏进度条 */}
          {autoHide && (
            <motion.div
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: autoHideDelay / 1000, ease: 'linear' }}
              className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * 通知列表容器
 */
interface NotificationContainerProps {
  notifications: ActivityNotificationData[];
  onDismiss?: (id: string) => void;
  onClick?: (notification: ActivityNotificationData) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
}

const positionClasses = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export function NotificationContainer({
  notifications,
  onDismiss,
  onClick,
  position = 'top-right',
  maxVisible = 3,
}: NotificationContainerProps) {
  const visibleNotifications = notifications.slice(0, maxVisible);

  return (
    <div className={cn('fixed z-50 w-80 space-y-2', positionClasses[position])}>
      <AnimatePresence>
        {visibleNotifications.map((notification) => (
          <ActivityNotification
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
            onClick={onClick}
            autoHide
            autoHideDelay={5000}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/**
 * 通知铃铛按钮
 */
interface NotificationBellProps {
  count?: number;
  onClick?: () => void;
  className?: string;
}

export function NotificationBell({ count = 0, onClick, className = '' }: NotificationBellProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        'relative p-2 rounded-xl',
        'bg-white/60 dark:bg-gray-800/60',
        'backdrop-blur-md border border-white/20 dark:border-gray-700/30',
        'hover:bg-white/80 dark:hover:bg-gray-800/80',
        'transition-colors',
        className
      )}
    >
      <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      {count > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-medium"
        >
          {count > 9 ? '9+' : count}
        </motion.span>
      )}
    </motion.button>
  );
}

export default ActivityNotification;
