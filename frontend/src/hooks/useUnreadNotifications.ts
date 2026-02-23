'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useMessageStore } from '@/store/message';

/**
 * 未读消息通知管理 Hook
 *
 * 需求20: 私信系统
 * 任务20.2.4: 未读消息提示
 *
 * 功能:
 * - 定期轮询未读消息数量（每30-60秒）
 * - 更新浏览器标签页标题显示未读数
 * - 支持浏览器通知（可选）
 * - 支持声音提示（可选）
 */

interface UseUnreadNotificationsOptions {
  /** 轮询间隔（毫秒），默认 30000 (30秒) */
  pollingInterval?: number;
  /** 是否启用浏览器通知 */
  enableBrowserNotifications?: boolean;
  /** 是否启用声音提示 */
  enableSoundNotifications?: boolean;
  /** 是否启用标题徽章 */
  enableTitleBadge?: boolean;
}

interface UseUnreadNotificationsReturn {
  /** 当前未读数量 */
  unreadCount: number;
  /** 是否已获得通知权限 */
  hasNotificationPermission: boolean;
  /** 请求通知权限 */
  requestNotificationPermission: () => Promise<boolean>;
  /** 手动刷新未读数量 */
  refreshUnreadCount: () => Promise<void>;
  /** 播放通知声音 */
  playNotificationSound: () => void;
}

// 原始标题（不含未读数）
let originalTitle = '';

// 通知声音 - 使用内联 base64 编码的简短提示音
// 这是一个简单的 "叮" 声音，避免依赖外部文件
const NOTIFICATION_SOUND_DATA_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQYAQKPd7LF5Fx1Coverage7LF5Fx1Cov';

export function useUnreadNotifications(
  options: UseUnreadNotificationsOptions = {}
): UseUnreadNotificationsReturn {
  const {
    pollingInterval = 30000, // 30秒
    enableBrowserNotifications = false,
    enableSoundNotifications = false,
    enableTitleBadge = true,
  } = options;

  const { isAuthenticated } = useAuthStore();
  const { unreadCount, fetchUnreadCount } = useMessageStore();
  
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const previousUnreadCountRef = useRef(unreadCount);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化原始标题
  useEffect(() => {
    if (typeof document !== 'undefined' && !originalTitle) {
      // 移除可能存在的未读数前缀
      const title = document.title;
      const match = title.match(/^\(\d+\+?\)\s*/);
      originalTitle = match ? title.replace(match[0], '') : title;
    }
  }, []);

  // 检查通知权限
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setHasNotificationPermission(Notification.permission === 'granted');
    }
  }, []);

  // 初始化音频元素
  useEffect(() => {
    if (enableSoundNotifications && typeof Audio !== 'undefined') {
      audioRef.current = new Audio(NOTIFICATION_SOUND_DATA_URL);
      audioRef.current.volume = 0.5;
    }
    return () => {
      audioRef.current = null;
    };
  }, [enableSoundNotifications]);

  /**
   * 更新文档标题
   */
  const updateDocumentTitle = useCallback((count: number) => {
    if (!enableTitleBadge || typeof document === 'undefined') return;

    if (count > 0) {
      const badge = count > 99 ? '(99+)' : `(${count})`;
      document.title = `${badge} ${originalTitle}`;
    } else {
      document.title = originalTitle;
    }
  }, [enableTitleBadge]);

  /**
   * 播放通知声音
   */
  const playNotificationSound = useCallback(() => {
    if (!enableSoundNotifications || !audioRef.current) return;

    try {
      // 重置播放位置
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // 忽略自动播放限制错误
      });
    } catch {
      // 忽略错误
    }
  }, [enableSoundNotifications]);

  /**
   * 显示浏览器通知
   */
  const showBrowserNotification = useCallback((newCount: number) => {
    if (!enableBrowserNotifications || !hasNotificationPermission) return;
    if (typeof Notification === 'undefined') return;

    // 只在标签页不可见时显示通知
    if (document.visibilityState === 'visible') return;

    const notification = new Notification('新消息', {
      body: `您有 ${newCount} 条未读消息`,
      icon: '/icons/message-icon.png',
      tag: 'unread-messages',
    });

    // 点击通知时聚焦窗口并跳转到消息页面
    notification.onclick = () => {
      window.focus();
      window.location.href = '/messages';
      notification.close();
    };

    // 5秒后自动关闭
    setTimeout(() => notification.close(), 5000);
  }, [enableBrowserNotifications, hasNotificationPermission]);

  /**
   * 请求通知权限
   */
  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof Notification === 'undefined') return false;

    if (Notification.permission === 'granted') {
      setHasNotificationPermission(true);
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasNotificationPermission(granted);
      return granted;
    } catch {
      return false;
    }
  }, []);

  /**
   * 刷新未读数量
   */
  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    await fetchUnreadCount();
  }, [isAuthenticated, fetchUnreadCount]);

  // 监听未读数变化
  useEffect(() => {
    const prevCount = previousUnreadCountRef.current;
    
    // 更新标题
    updateDocumentTitle(unreadCount);

    // 如果未读数增加，触发通知
    if (unreadCount > prevCount && prevCount >= 0) {
      if (enableSoundNotifications) {
        playNotificationSound();
      }
      if (enableBrowserNotifications && hasNotificationPermission) {
        showBrowserNotification(unreadCount);
      }
    }

    previousUnreadCountRef.current = unreadCount;
  }, [
    unreadCount,
    updateDocumentTitle,
    playNotificationSound,
    showBrowserNotification,
    enableSoundNotifications,
    enableBrowserNotifications,
    hasNotificationPermission,
  ]);

  // 设置轮询
  useEffect(() => {
    if (!isAuthenticated) {
      // 清除轮询
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      // 重置标题
      if (enableTitleBadge && typeof document !== 'undefined') {
        document.title = originalTitle;
      }
      return;
    }

    // 立即获取一次
    fetchUnreadCount();

    // 设置轮询
    pollingIntervalRef.current = setInterval(() => {
      fetchUnreadCount();
    }, pollingInterval);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, pollingInterval, fetchUnreadCount, enableTitleBadge]);

  // 页面可见性变化时刷新
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isAuthenticated) {
        fetchUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, fetchUnreadCount]);

  // 组件卸载时重置标题
  useEffect(() => {
    return () => {
      if (enableTitleBadge && typeof document !== 'undefined' && originalTitle) {
        document.title = originalTitle;
      }
    };
  }, [enableTitleBadge]);

  return {
    unreadCount,
    hasNotificationPermission,
    requestNotificationPermission,
    refreshUnreadCount,
    playNotificationSound,
  };
}

export default useUnreadNotifications;
