'use client';

import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * Service Worker Hook
 *
 * 需求 11.1.1: 配置 PWA 基础
 * 管理 Service Worker 注册和状态
 */
export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: false,
    isRegistered: false,
    isOnline: true,
    registration: null,
  });

  // 注册 Service Worker
  const register = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('[SW] Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW] Registered with scope:', registration.scope);

      setState((prev) => ({
        ...prev,
        isSupported: true,
        isRegistered: true,
        registration,
      }));

      // 监听更新
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[SW] New version available');
              // 可以在这里提示用户刷新
            }
          });
        }
      });
    } catch (error) {
      console.error('[SW] Registration failed:', error);
    }
  }, []);

  // 注销 Service Worker
  const unregister = useCallback(async () => {
    if (!state.registration) return;

    try {
      await state.registration.unregister();
      setState((prev) => ({
        ...prev,
        isRegistered: false,
        registration: null,
      }));
      console.log('[SW] Unregistered');
    } catch (error) {
      console.error('[SW] Unregistration failed:', error);
    }
  }, [state.registration]);

  // 缓存章节
  const cacheChapter = useCallback(
    (chapterId: string, content: unknown) => {
      if (!state.registration?.active) return;

      state.registration.active.postMessage({
        type: 'CACHE_CHAPTER',
        payload: { chapterId, content },
      });
    },
    [state.registration]
  );

  // 清理章节缓存
  const clearChapterCache = useCallback(
    (chapterId?: string) => {
      if (!state.registration?.active) return;

      state.registration.active.postMessage({
        type: 'CLEAR_CHAPTER_CACHE',
        payload: { chapterId },
      });
    },
    [state.registration]
  );

  // 获取缓存大小
  const getCacheSize = useCallback(async (): Promise<number> => {
    if (!state.registration?.active) return 0;

    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        resolve(event.data.size || 0);
      };

      state.registration!.active!.postMessage(
        { type: 'GET_CACHE_SIZE' },
        [channel.port2]
      );
    });
  }, [state.registration]);

  // 初始化
  useEffect(() => {
    // 检查支持
    const isSupported = 'serviceWorker' in navigator;
    setState((prev) => ({ ...prev, isSupported }));

    // 注册 SW
    if (isSupported && process.env.NODE_ENV === 'production') {
      register();
    }

    // 监听在线状态
    const handleOnline = () => setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始状态
    setState((prev) => ({ ...prev, isOnline: navigator.onLine }));

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [register]);

  return {
    ...state,
    register,
    unregister,
    cacheChapter,
    clearChapterCache,
    getCacheSize,
  };
}

export default useServiceWorker;
