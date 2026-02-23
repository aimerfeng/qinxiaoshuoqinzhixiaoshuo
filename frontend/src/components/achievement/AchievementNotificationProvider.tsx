'use client';

import {
  createContext,
  useContext,
  useCallback,
  useState,
  useMemo,
  type ReactNode,
} from 'react';
import {
  AchievementProgressToast,
  type AchievementNotification,
  type ToastPosition,
} from './AchievementProgressToast';
import { AchievementUnlockAnimation } from './AchievementUnlockAnimation';
import {
  useAchievementNotifications,
  type AchievementUnlockEvent,
  type UseAchievementNotificationsOptions,
} from '@/hooks/useAchievementNotifications';
import type { AchievementTier, AchievementWithProgress } from '@/types/achievement';

/**
 * 全屏动画状态
 */
interface FullAnimationState {
  isVisible: boolean;
  achievementName: string;
  tier: AchievementTier;
  iconUrl?: string | null;
}

/**
 * Context 值类型
 */
export interface AchievementNotificationContextValue {
  /** 当前通知列表 */
  notifications: AchievementNotification[];
  /** 添加进度通知 */
  showProgressNotification: (achievement: AchievementWithProgress) => void;
  /** 添加解锁通知 */
  showUnlockNotification: (achievement: AchievementWithProgress) => void;
  /** 显示全屏解锁动画 */
  showFullUnlockAnimation: (
    achievementName: string,
    tier: AchievementTier,
    iconUrl?: string | null
  ) => void;
  /** 移除通知 */
  removeNotification: (id: string) => void;
  /** 清空所有通知 */
  clearNotifications: () => void;
  /** WebSocket 连接状态 */
  isConnected: boolean;
}

/**
 * Provider 属性
 */
export interface AchievementNotificationProviderProps {
  children: ReactNode;
  /** Toast 位置 */
  position?: ToastPosition;
  /** 自动关闭延迟（毫秒） */
  autoDismissDelay?: number;
  /** 最大显示数量 */
  maxVisible?: number;
  /** 是否启用 WebSocket */
  enableWebSocket?: boolean;
  /** 是否显示进度通知 */
  showProgressNotifications?: boolean;
  /** 是否显示解锁通知 */
  showUnlockNotifications?: boolean;
  /** 是否对重大成就显示全屏动画 */
  showFullAnimationForMajor?: boolean;
  /** 重大成就等级阈值 */
  majorTierThreshold?: AchievementTier;
  /** 点击通知回调 */
  onNotificationClick?: (notification: AchievementNotification) => void;
  /** 全屏动画关闭回调 */
  onFullAnimationClose?: () => void;
}

const AchievementNotificationContext = createContext<AchievementNotificationContextValue | null>(
  null
);

/**
 * 成就通知 Provider
 *
 * 需求24: 成就系统
 * 任务24.2.9: 成就进度通知推送
 *
 * 功能：
 * - 提供成就通知的全局管理
 * - 集成 WebSocket 实时推送
 * - 支持 Toast 通知和全屏动画
 * - 可配置通知位置、自动关闭等
 */
export function AchievementNotificationProvider({
  children,
  position = 'top-right',
  autoDismissDelay = 5000,
  maxVisible = 5,
  enableWebSocket = true,
  showProgressNotifications = true,
  showUnlockNotifications = true,
  showFullAnimationForMajor = true,
  majorTierThreshold = 'GOLD',
  onNotificationClick,
  onFullAnimationClose,
}: AchievementNotificationProviderProps) {
  // 全屏动画状态
  const [fullAnimation, setFullAnimation] = useState<FullAnimationState>({
    isVisible: false,
    achievementName: '',
    tier: 'BRONZE',
    iconUrl: null,
  });

  /**
   * 显示全屏解锁动画
   */
  const showFullUnlockAnimation = useCallback(
    (achievementName: string, tier: AchievementTier, iconUrl?: string | null) => {
      setFullAnimation({
        isVisible: true,
        achievementName,
        tier,
        iconUrl,
      });
    },
    []
  );

  /**
   * 关闭全屏动画
   */
  const handleFullAnimationClose = useCallback(() => {
    setFullAnimation((prev) => ({ ...prev, isVisible: false }));
    onFullAnimationClose?.();
  }, [onFullAnimationClose]);

  /**
   * 处理全屏动画触发（来自 WebSocket）
   */
  const handleTriggerFullAnimation = useCallback(
    (event: AchievementUnlockEvent) => {
      showFullUnlockAnimation(event.achievementName, event.tier, event.iconUrl);
    },
    [showFullUnlockAnimation]
  );

  // WebSocket Hook 配置
  const hookOptions: UseAchievementNotificationsOptions = useMemo(
    () => ({
      enabled: enableWebSocket,
      showProgressNotifications,
      showUnlockNotifications,
      showFullAnimationForMajor,
      majorTierThreshold,
      onTriggerFullAnimation: handleTriggerFullAnimation,
    }),
    [
      enableWebSocket,
      showProgressNotifications,
      showUnlockNotifications,
      showFullAnimationForMajor,
      majorTierThreshold,
      handleTriggerFullAnimation,
    ]
  );

  // 使用 Hook
  const {
    notifications,
    removeNotification,
    clearNotifications,
    isConnected,
    triggerProgressNotification,
    triggerUnlockNotification,
  } = useAchievementNotifications(hookOptions);

  /**
   * 显示进度通知
   */
  const showProgressNotification = useCallback(
    (achievement: AchievementWithProgress) => {
      triggerProgressNotification(achievement);
    },
    [triggerProgressNotification]
  );

  /**
   * 显示解锁通知
   */
  const showUnlockNotification = useCallback(
    (achievement: AchievementWithProgress) => {
      triggerUnlockNotification(achievement);
    },
    [triggerUnlockNotification]
  );

  // Context 值
  const contextValue = useMemo<AchievementNotificationContextValue>(
    () => ({
      notifications,
      showProgressNotification,
      showUnlockNotification,
      showFullUnlockAnimation,
      removeNotification,
      clearNotifications,
      isConnected,
    }),
    [
      notifications,
      showProgressNotification,
      showUnlockNotification,
      showFullUnlockAnimation,
      removeNotification,
      clearNotifications,
      isConnected,
    ]
  );

  return (
    <AchievementNotificationContext.Provider value={contextValue}>
      {children}

      {/* Toast 通知 */}
      <AchievementProgressToast
        notifications={notifications}
        position={position}
        onDismiss={removeNotification}
        onClick={onNotificationClick}
        autoDismissDelay={autoDismissDelay}
        maxVisible={maxVisible}
      />

      {/* 全屏解锁动画 */}
      <AchievementUnlockAnimation
        isVisible={fullAnimation.isVisible}
        achievementName={fullAnimation.achievementName}
        tier={fullAnimation.tier}
        iconUrl={fullAnimation.iconUrl}
        onClose={handleFullAnimationClose}
      />
    </AchievementNotificationContext.Provider>
  );
}

/**
 * 使用成就通知 Context Hook
 */
export function useAchievementNotificationContext(): AchievementNotificationContextValue {
  const context = useContext(AchievementNotificationContext);
  if (!context) {
    throw new Error(
      'useAchievementNotificationContext must be used within AchievementNotificationProvider'
    );
  }
  return context;
}

export default AchievementNotificationProvider;
