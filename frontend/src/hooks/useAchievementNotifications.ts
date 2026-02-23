'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';
import type { AchievementTier, AchievementWithProgress } from '@/types/achievement';
import type { AchievementNotification } from '@/components/achievement/AchievementProgressToast';
import { createNotificationFromEvent } from '@/components/achievement/AchievementProgressToast';

/**
 * WebSocket 成就事件数据
 */
export interface AchievementProgressEvent {
  achievementId: string;
  achievementName: string;
  tier: AchievementTier;
  iconUrl?: string | null;
  currentProgress: number;
  targetValue: number;
  isUnlocked: boolean;
}

/**
 * 成就解锁事件数据
 */
export interface AchievementUnlockEvent extends AchievementProgressEvent {
  rewardType: string;
  rewardValue: Record<string, unknown>;
}

/**
 * Hook 配置选项
 */
export interface UseAchievementNotificationsOptions {
  /** 是否启用 */
  enabled?: boolean;
  /** 是否显示进度通知 */
  showProgressNotifications?: boolean;
  /** 是否显示解锁通知 */
  showUnlockNotifications?: boolean;
  /** 是否对重大成就显示全屏动画 */
  showFullAnimationForMajor?: boolean;
  /** 重大成就等级阈值（该等级及以上显示全屏动画） */
  majorTierThreshold?: AchievementTier;
  /** 进度通知回调 */
  onProgressUpdate?: (event: AchievementProgressEvent) => void;
  /** 解锁通知回调 */
  onUnlock?: (event: AchievementUnlockEvent) => void;
  /** 全屏动画触发回调 */
  onTriggerFullAnimation?: (achievement: AchievementUnlockEvent) => void;
}

/**
 * Hook 返回值
 */
export interface UseAchievementNotificationsReturn {
  /** 当前通知列表 */
  notifications: AchievementNotification[];
  /** 添加通知 */
  addNotification: (notification: AchievementNotification) => void;
  /** 移除通知 */
  removeNotification: (id: string) => void;
  /** 清空所有通知 */
  clearNotifications: () => void;
  /** WebSocket 连接状态 */
  isConnected: boolean;
  /** 手动触发进度通知（用于测试） */
  triggerProgressNotification: (achievement: AchievementWithProgress) => void;
  /** 手动触发解锁通知（用于测试） */
  triggerUnlockNotification: (achievement: AchievementWithProgress) => void;
}

/**
 * 等级排序值映射
 */
const TIER_ORDER: Record<AchievementTier, number> = {
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  DIAMOND: 5,
  LEGENDARY: 6,
};

/**
 * 成就通知管理 Hook
 *
 * 需求24: 成就系统
 * 任务24.2.9: 成就进度通知推送
 *
 * 功能：
 * - Listen to WebSocket events for achievement updates
 * - Queue and display notifications
 * - Option to show full unlock animation for major achievements
 * - Integrate with existing notification system
 */
export function useAchievementNotifications(
  options: UseAchievementNotificationsOptions = {}
): UseAchievementNotificationsReturn {
  const {
    enabled = true,
    showProgressNotifications = true,
    showUnlockNotifications = true,
    showFullAnimationForMajor = true,
    majorTierThreshold = 'GOLD',
    onProgressUpdate,
    onUnlock,
    onTriggerFullAnimation,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user, isAuthenticated } = useAuthStore();

  /**
   * 添加通知
   */
  const addNotification = useCallback((notification: AchievementNotification) => {
    setNotifications((prev) => {
      // 避免重复
      if (prev.some((n) => n.id === notification.id)) {
        return prev;
      }
      // 添加到开头
      return [notification, ...prev];
    });
  }, []);

  /**
   * 移除通知
   */
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  /**
   * 清空所有通知
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * 判断是否为重大成就
   */
  const isMajorAchievement = useCallback(
    (tier: AchievementTier): boolean => {
      return TIER_ORDER[tier] >= TIER_ORDER[majorTierThreshold];
    },
    [majorTierThreshold]
  );

  /**
   * 处理进度更新事件
   */
  const handleProgressUpdate = useCallback(
    (event: AchievementProgressEvent) => {
      console.log('[AchievementNotifications] Progress update:', event);

      // 调用外部回调
      onProgressUpdate?.(event);

      // 如果已解锁，作为解锁事件处理
      if (event.isUnlocked) {
        return;
      }

      // 显示进度通知
      if (showProgressNotifications) {
        const notification = createNotificationFromEvent(event);
        addNotification(notification);
      }
    },
    [showProgressNotifications, addNotification, onProgressUpdate]
  );

  /**
   * 处理解锁事件
   */
  const handleUnlock = useCallback(
    (event: AchievementUnlockEvent) => {
      console.log('[AchievementNotifications] Achievement unlocked:', event);

      // 调用外部回调
      onUnlock?.(event);

      // 判断是否显示全屏动画
      if (showFullAnimationForMajor && isMajorAchievement(event.tier)) {
        onTriggerFullAnimation?.(event);
        return; // 不显示 toast，由全屏动画处理
      }

      // 显示解锁通知
      if (showUnlockNotifications) {
        const notification = createNotificationFromEvent({
          ...event,
          isUnlocked: true,
        });
        addNotification(notification);
      }
    },
    [
      showUnlockNotifications,
      showFullAnimationForMajor,
      isMajorAchievement,
      addNotification,
      onUnlock,
      onTriggerFullAnimation,
    ]
  );

  /**
   * 手动触发进度通知（用于测试）
   */
  const triggerProgressNotification = useCallback(
    (achievement: AchievementWithProgress) => {
      const notification: AchievementNotification = {
        id: `${achievement.id}-${Date.now()}`,
        type: 'progress',
        achievementId: achievement.id,
        achievementName: achievement.displayName,
        tier: achievement.tier,
        iconUrl: achievement.iconUrl,
        currentProgress: achievement.currentProgress,
        targetValue: achievement.targetValue,
        progressPercent: achievement.progressPercent,
        isUnlocked: false,
        createdAt: Date.now(),
      };
      addNotification(notification);
    },
    [addNotification]
  );

  /**
   * 手动触发解锁通知（用于测试）
   */
  const triggerUnlockNotification = useCallback(
    (achievement: AchievementWithProgress) => {
      const notification: AchievementNotification = {
        id: `${achievement.id}-${Date.now()}`,
        type: 'unlock',
        achievementId: achievement.id,
        achievementName: achievement.displayName,
        tier: achievement.tier,
        iconUrl: achievement.iconUrl,
        currentProgress: achievement.targetValue,
        targetValue: achievement.targetValue,
        progressPercent: 100,
        isUnlocked: true,
        createdAt: Date.now(),
      };
      addNotification(notification);
    },
    [addNotification]
  );

  /**
   * 初始化 WebSocket 连接
   */
  useEffect(() => {
    if (!enabled || !isAuthenticated || !user?.id) {
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${backendUrl}/achievements`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('[AchievementNotifications] WebSocket connected');
      setIsConnected(true);
      // 认证
      socket.emit('authenticate', { userId: user.id });
    });

    socket.on('disconnect', (reason) => {
      console.log('[AchievementNotifications] WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[AchievementNotifications] Connection error:', error);
      setIsConnected(false);
    });

    // 监听成就进度更新
    socket.on('achievementProgress', handleProgressUpdate);

    // 监听成就解锁
    socket.on('achievementUnlock', handleUnlock);

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [enabled, isAuthenticated, user?.id, handleProgressUpdate, handleUnlock]);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    isConnected,
    triggerProgressNotification,
    triggerUnlockNotification,
  };
}

export default useAchievementNotifications;
