'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useReadingStore } from '@/store/reading';
import { useAuthStore } from '@/store/auth';
import { saveReadingProgress } from '@/services/reader';

interface UseAutoSaveProgressOptions {
  workId: string;
  chapterId: string;
  scrollProgress: number;
  enabled?: boolean;
  debounceMs?: number;
}

/**
 * 自动保存阅读进度 Hook
 *
 * 需求4验收标准5: WHEN 用户滚动阅读 THEN System SHALL 记录阅读进度并支持断点续读
 * 需求4验收标准8: WHEN 用户退出 Reader THEN System SHALL 保存当前阅读位置
 * 任务4.2.9: 阅读进度自动保存
 */
export function useAutoSaveProgress({
  workId,
  chapterId,
  scrollProgress,
  enabled = true,
  debounceMs = 10000,
}: UseAutoSaveProgressOptions) {
  const { isAuthenticated } = useAuthStore();
  const { saveProgress: saveLocalProgress } = useReadingStore();
  const lastSavedProgress = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 服务端保存 mutation
  const { mutate: saveToServer } = useMutation({
    mutationFn: (data: { paragraphIndex: number; readPercentage: number }) =>
      saveReadingProgress(workId, {
        chapterId,
        paragraphIndex: data.paragraphIndex,
        scrollPosition: scrollProgress,
        readPercentage: data.readPercentage,
      }),
    onError: (error) => {
      console.error('Failed to save reading progress:', error);
    },
  });

  // 保存进度函数
  const saveProgress = useCallback(() => {
    if (!enabled) return;

    // 计算当前段落索引（基于滚动进度估算）
    const paragraphIndex = Math.floor(scrollProgress / 10);
    const readPercentage = Math.round(scrollProgress);

    // 保存到本地
    saveLocalProgress({
      workId,
      chapterId,
      paragraphIndex,
      scrollPosition: scrollProgress,
      lastReadAt: new Date().toISOString(),
    });

    // 如果已登录，同步到服务器
    if (isAuthenticated) {
      saveToServer({ paragraphIndex, readPercentage });
    }

    lastSavedProgress.current = scrollProgress;
  }, [
    enabled,
    workId,
    chapterId,
    scrollProgress,
    isAuthenticated,
    saveLocalProgress,
    saveToServer,
  ]);

  // 防抖保存
  useEffect(() => {
    if (!enabled) return;

    // 只有当进度变化超过 10% 时才保存
    if (Math.abs(scrollProgress - lastSavedProgress.current) < 10) {
      return;
    }

    // 清除之前的定时器
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // 设置新的定时器
    saveTimeoutRef.current = setTimeout(() => {
      saveProgress();
    }, debounceMs);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [scrollProgress, enabled, debounceMs, saveProgress]);

  // 页面卸载时保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveProgress();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // 组件卸载时也保存一次
      saveProgress();
    };
  }, [saveProgress]);

  // 页面可见性变化时保存
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveProgress();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveProgress]);

  return { saveProgress };
}
