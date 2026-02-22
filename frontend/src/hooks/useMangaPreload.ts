import { useEffect, useRef, useCallback, useState } from 'react';
import type { MangaPage } from '@/types/reader';

interface PreloadConfig {
  ahead: number;
  behind: number;
}

interface PreloadState {
  loaded: Set<string>;
  loading: Set<string>;
  failed: Set<string>;
}

/**
 * 漫画图片预缓存 Hook
 *
 * 需求4验收标准17: 预缓存前后各 2-3 页图片以实现流畅阅读体验
 * 任务4.3.4: 图片懒加载 + 预缓存策略（前后各缓存 2-3 页）
 *
 * 特性：
 * - 预加载当前页前后指定数量的图片
 * - 追踪加载状态
 * - 自动清理过期缓存
 * - 支持重试失败的加载
 */
export function useMangaPreload(
  pages: MangaPage[],
  currentPageIndex: number,
  config: PreloadConfig = { ahead: 3, behind: 2 }
) {
  const [state, setState] = useState<PreloadState>({
    loaded: new Set(),
    loading: new Set(),
    failed: new Set(),
  });

  // 缓存 Image 对象以防止被垃圾回收
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // 预加载单张图片
  const preloadImage = useCallback((page: MangaPage): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 如果已经加载过，直接返回
      if (state.loaded.has(page.id)) {
        resolve();
        return;
      }

      // 如果正在加载，等待
      if (state.loading.has(page.id)) {
        resolve();
        return;
      }

      // 标记为加载中
      setState((prev) => ({
        ...prev,
        loading: new Set([...Array.from(prev.loading), page.id]),
      }));

      const img = new Image();

      img.onload = () => {
        // 缓存图片对象
        imageCache.current.set(page.id, img);

        setState((prev) => {
          const newLoading = new Set(Array.from(prev.loading));
          newLoading.delete(page.id);
          return {
            ...prev,
            loaded: new Set([...Array.from(prev.loaded), page.id]),
            loading: newLoading,
          };
        });
        resolve();
      };

      img.onerror = () => {
        setState((prev) => {
          const newLoading = new Set(Array.from(prev.loading));
          newLoading.delete(page.id);
          return {
            ...prev,
            loading: newLoading,
            failed: new Set([...Array.from(prev.failed), page.id]),
          };
        });
        reject(new Error(`Failed to load image: ${page.imageUrl}`));
      };

      // 开始加载
      img.src = page.imageUrl;
    });
  }, [state.loaded, state.loading]);

  // 预加载指定范围的页面
  const preloadRange = useCallback(
    async (startIndex: number, endIndex: number) => {
      const pagesToLoad = pages.slice(
        Math.max(0, startIndex),
        Math.min(pages.length, endIndex + 1)
      );

      // 并行加载所有页面
      await Promise.allSettled(pagesToLoad.map((page) => preloadImage(page)));
    },
    [pages, preloadImage]
  );

  // 当前页变化时，预加载前后页面
  useEffect(() => {
    const startIndex = currentPageIndex - config.behind;
    const endIndex = currentPageIndex + config.ahead;

    preloadRange(startIndex, endIndex);
  }, [currentPageIndex, config.ahead, config.behind, preloadRange]);

  // 重试加载失败的图片
  const retryFailed = useCallback(
    async (pageId: string) => {
      const page = pages.find((p) => p.id === pageId);
      if (!page) return;

      // 从失败列表中移除
      setState((prev) => {
        const newFailed = new Set(prev.failed);
        newFailed.delete(pageId);
        return { ...prev, failed: newFailed };
      });

      // 重新加载
      try {
        await preloadImage(page);
      } catch {
        // 加载失败会自动添加到 failed 列表
      }
    },
    [pages, preloadImage]
  );

  // 清理缓存（保留当前页前后的图片）
  const cleanupCache = useCallback(
    (keepRange: number = 10) => {
      const keepStart = Math.max(0, currentPageIndex - keepRange);
      const keepEnd = Math.min(pages.length - 1, currentPageIndex + keepRange);

      const keepIds = new Set(
        pages.slice(keepStart, keepEnd + 1).map((p) => p.id)
      );

      // 清理不在保留范围内的图片
      imageCache.current.forEach((_, id) => {
        if (!keepIds.has(id)) {
          imageCache.current.delete(id);
        }
      });

      // 更新状态
      setState((prev) => ({
        loaded: new Set(Array.from(prev.loaded).filter((id) => keepIds.has(id))),
        loading: prev.loading,
        failed: new Set(Array.from(prev.failed).filter((id) => keepIds.has(id))),
      }));
    },
    [currentPageIndex, pages]
  );

  // 获取页面加载状态
  const getPageStatus = useCallback(
    (pageId: string): 'pending' | 'loading' | 'loaded' | 'failed' => {
      if (state.loaded.has(pageId)) return 'loaded';
      if (state.loading.has(pageId)) return 'loading';
      if (state.failed.has(pageId)) return 'failed';
      return 'pending';
    },
    [state]
  );

  // 检查页面是否已加载
  const isPageLoaded = useCallback(
    (pageId: string): boolean => {
      return state.loaded.has(pageId);
    },
    [state.loaded]
  );

  // 获取加载进度
  const getLoadProgress = useCallback((): number => {
    const total = pages.length;
    if (total === 0) return 100;
    return Math.round((state.loaded.size / total) * 100);
  }, [pages.length, state.loaded.size]);

  return {
    state,
    preloadImage,
    preloadRange,
    retryFailed,
    cleanupCache,
    getPageStatus,
    isPageLoaded,
    getLoadProgress,
  };
}

/**
 * 简单的图片预加载函数
 * 用于预加载单张图片
 */
export function preloadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 批量预加载图片
 */
export async function preloadImages(
  srcs: string[],
  onProgress?: (loaded: number, total: number) => void
): Promise<HTMLImageElement[]> {
  const results: HTMLImageElement[] = [];
  let loaded = 0;

  for (const src of srcs) {
    try {
      const img = await preloadImage(src);
      results.push(img);
    } catch {
      // 忽略加载失败的图片
    }
    loaded++;
    onProgress?.(loaded, srcs.length);
  }

  return results;
}
