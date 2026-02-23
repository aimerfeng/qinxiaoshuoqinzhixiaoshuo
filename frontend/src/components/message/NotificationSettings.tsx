'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';

/**
 * 消息通知设置组件
 *
 * 需求20: 私信系统
 * 任务20.2.4: 未读消息提示 - 通知设置
 *
 * 功能:
 * - 浏览器通知开关
 * - 声音通知开关
 * - 请求通知权限
 */

interface NotificationSettingsProps {
  className?: string;
  compact?: boolean;
}

// 本地存储键
const STORAGE_KEYS = {
  BROWSER_NOTIFICATIONS: 'message_browser_notifications',
  SOUND_NOTIFICATIONS: 'message_sound_notifications',
};

export default function NotificationSettings({
  className,
  compact = false,
}: NotificationSettingsProps) {
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const [soundNotificationsEnabled, setSoundNotificationsEnabled] = useState(false);
  const [hasNotificationPermission, setHasNotificationPermission] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);

  // 初始化状态
  useEffect(() => {
    // 从本地存储读取设置
    const browserEnabled = localStorage.getItem(STORAGE_KEYS.BROWSER_NOTIFICATIONS) === 'true';
    const soundEnabled = localStorage.getItem(STORAGE_KEYS.SOUND_NOTIFICATIONS) === 'true';
    
    setBrowserNotificationsEnabled(browserEnabled);
    setSoundNotificationsEnabled(soundEnabled);

    // 检查通知权限
    if (typeof Notification !== 'undefined') {
      setHasNotificationPermission(Notification.permission === 'granted');
    }
  }, []);

  /**
   * 请求浏览器通知权限
   */
  const requestNotificationPermission = async () => {
    if (typeof Notification === 'undefined') return false;

    if (Notification.permission === 'granted') {
      setHasNotificationPermission(true);
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    setIsRequestingPermission(true);
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasNotificationPermission(granted);
      return granted;
    } catch {
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  };

  /**
   * 切换浏览器通知
   */
  const toggleBrowserNotifications = async () => {
    if (!browserNotificationsEnabled) {
      // 开启时需要请求权限
      const granted = await requestNotificationPermission();
      if (granted) {
        setBrowserNotificationsEnabled(true);
        localStorage.setItem(STORAGE_KEYS.BROWSER_NOTIFICATIONS, 'true');
      }
    } else {
      setBrowserNotificationsEnabled(false);
      localStorage.setItem(STORAGE_KEYS.BROWSER_NOTIFICATIONS, 'false');
    }
  };

  /**
   * 切换声音通知
   */
  const toggleSoundNotifications = () => {
    const newValue = !soundNotificationsEnabled;
    setSoundNotificationsEnabled(newValue);
    localStorage.setItem(STORAGE_KEYS.SOUND_NOTIFICATIONS, String(newValue));

    // 播放测试声音
    if (newValue) {
      try {
        // 使用内联 base64 编码的简短提示音
        const soundDataUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleQYAQKPd7LF5Fx1Coverage7LF5Fx1Cov';
        const audio = new Audio(soundDataUrl);
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {
        // 忽略错误
      }
    }
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <button
          onClick={toggleBrowserNotifications}
          disabled={isRequestingPermission}
          className={cn(
            'p-2 rounded-lg transition-colors',
            browserNotificationsEnabled && hasNotificationPermission
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          )}
          title={browserNotificationsEnabled ? '关闭浏览器通知' : '开启浏览器通知'}
        >
          {browserNotificationsEnabled && hasNotificationPermission ? (
            <Bell className="w-4 h-4" />
          ) : (
            <BellOff className="w-4 h-4" />
          )}
        </button>

        <button
          onClick={toggleSoundNotifications}
          className={cn(
            'p-2 rounded-lg transition-colors',
            soundNotificationsEnabled
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          )}
          title={soundNotificationsEnabled ? '关闭声音提示' : '开启声音提示'}
        >
          {soundNotificationsEnabled ? (
            <Volume2 className="w-4 h-4" />
          ) : (
            <VolumeX className="w-4 h-4" />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
        通知设置
      </h3>

      {/* 浏览器通知 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            browserNotificationsEnabled && hasNotificationPermission
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          )}>
            {browserNotificationsEnabled && hasNotificationPermission ? (
              <Bell className="w-5 h-5" />
            ) : (
              <BellOff className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              浏览器通知
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {!hasNotificationPermission && browserNotificationsEnabled
                ? '需要授权通知权限'
                : '收到新消息时显示桌面通知'}
            </p>
          </div>
        </div>

        <button
          onClick={toggleBrowserNotifications}
          disabled={isRequestingPermission}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors',
            browserNotificationsEnabled && hasNotificationPermission
              ? 'bg-indigo-500'
              : 'bg-gray-300 dark:bg-gray-600'
          )}
        >
          <motion.span
            animate={{
              x: browserNotificationsEnabled && hasNotificationPermission ? 20 : 2,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
          />
        </button>
      </div>

      {/* 声音通知 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2 rounded-lg',
            soundNotificationsEnabled
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          )}>
            {soundNotificationsEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              声音提示
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              收到新消息时播放提示音
            </p>
          </div>
        </div>

        <button
          onClick={toggleSoundNotifications}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors',
            soundNotificationsEnabled
              ? 'bg-indigo-500'
              : 'bg-gray-300 dark:bg-gray-600'
          )}
        >
          <motion.span
            animate={{
              x: soundNotificationsEnabled ? 20 : 2,
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow"
          />
        </button>
      </div>

      {/* 权限提示 */}
      {!hasNotificationPermission && typeof Notification !== 'undefined' && Notification.permission !== 'denied' && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          提示：开启浏览器通知需要授权权限
        </p>
      )}

      {typeof Notification !== 'undefined' && Notification.permission === 'denied' && (
        <p className="text-xs text-red-600 dark:text-red-400">
          浏览器通知权限已被拒绝，请在浏览器设置中手动开启
        </p>
      )}
    </div>
  );
}
