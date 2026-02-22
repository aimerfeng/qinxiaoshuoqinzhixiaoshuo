'use client';

import { useEffect, useCallback, useRef } from 'react';
import { offlineStorage } from '@/services/offline-storage';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

/**
 * 离线同步 Hook
 *
 * 需求 11.2.3: 网络恢复同步
 * WHEN 网络恢复 THEN System SHALL 自动同步离线期间的阅读进度
 */
export function useOfflineSync() {
  const { isAuthenticated } = useAuthStore();
  const isSyncing = useRef(false);

  // 同步未同步的阅读进度
  const syncProgress = useCallback(async () => {
    if (!isAuthenticated || isSyncing.current) return;

    isSyncing.current = true;

    try {
      const unsyncedProgress = await offlineStorage.getUnsyncedProgress();
      
      if (unsyncedProgress.length === 0) {
        isSyncing.current = false;
        return;
      }

      console.log(`[OfflineSync] Syncing ${unsyncedProgress.length} progress records`);

      const syncedIds: string[] = [];

      for (const progress of unsyncedProgress) {
        try {
          await api.post('/reader/progress', {
            chapterId: progress.chapterId,
            paragraphIndex: progress.paragraphIndex,
            scrollPosition: progress.scrollPosition,
            readPercentage: progress.readPercentage,
          });
          syncedIds.push(progress.chapterId);
        } catch (error) {
          console.error(`[OfflineSync] Failed to sync progress for ${progress.chapterId}:`, error);
        }
      }

      if (syncedIds.length > 0) {
        await offlineStorage.markProgressSynced(syncedIds);
        console.log(`[OfflineSync] Synced ${syncedIds.length} progress records`);
      }
    } catch (error) {
      console.error('[OfflineSync] Sync failed:', error);
    } finally {
      isSyncing.current = false;
    }
  }, [isAuthenticated]);

  // 监听网络恢复
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineSync] Network restored, starting sync...');
      syncProgress();
    };

    window.addEventListener('online', handleOnline);

    // 初始同步（如果在线）
    if (navigator.onLine && isAuthenticated) {
      syncProgress();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [syncProgress, isAuthenticated]);

  return {
    syncProgress,
    isSyncing: isSyncing.current,
  };
}

export default useOfflineSync;
