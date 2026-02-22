'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { cn } from '@/utils/cn';
import type { MangaPage, MangaReaderSettings } from '@/types/reader';

interface MangaScrollViewProps {
  pages: MangaPage[];
  settings: MangaReaderSettings;
  onPageChange: (pageIndex: number) => void;
}

/**
 * 漫画滚动阅读模式（Webtoon 长条优化）
 *
 * 需求4验收标准16: 支持 Webtoon 长条滚动模式
 * 任务4.3.2: 滚动阅读模式（Webtoon 长条优化）
 *
 * 特性：
 * - 垂直无缝滚动
 * - 图片懒加载
 * - 预缓存前后页面
 * - 自动追踪当前页码
 */
export function MangaScrollView({ pages, settings, onPageChange }: MangaScrollViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set([0]));

  // 追踪当前可见的页面
  const handlePageVisible = useCallback((pageIndex: number, isVisible: boolean) => {
    setVisiblePages((prev) => {
      const next = new Set(prev);
      if (isVisible) {
        next.add(pageIndex);
      } else {
        next.delete(pageIndex);
      }
      return next;
    });
  }, []);

  // 更新当前页码（取可见页面中最小的）
  useEffect(() => {
    if (visiblePages.size > 0) {
      const minPage = Math.min(...Array.from(visiblePages));
      onPageChange(minPage);
    }
  }, [visiblePages, onPageChange]);

  // 适应模式样式
  const fitModeStyles = {
    width: 'w-full max-w-4xl',
    height: 'h-screen object-contain',
    contain: 'max-w-full max-h-screen object-contain',
    original: '',
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'min-h-screen overflow-y-auto',
        'flex flex-col items-center',
        'pt-20 pb-8' // 为工具栏留出空间
      )}
    >
      {pages.map((page, index) => (
        <MangaScrollPage
          key={page.id}
          page={page}
          pageIndex={index}
          totalPages={pages.length}
          settings={settings}
          fitModeClass={fitModeStyles[settings.fitMode]}
          onVisibilityChange={handlePageVisible}
        />
      ))}
    </div>
  );
}

interface MangaScrollPageProps {
  page: MangaPage;
  pageIndex: number;
  totalPages: number;
  settings: MangaReaderSettings;
  fitModeClass: string;
  onVisibilityChange: (pageIndex: number, isVisible: boolean) => void;
}

/**
 * 单个滚动页面组件
 * 使用 Intersection Observer 实现懒加载和可见性追踪
 */
function MangaScrollPage({
  page,
  pageIndex,
  totalPages,
  settings,
  fitModeClass,
  onVisibilityChange,
}: MangaScrollPageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // 使用 Intersection Observer 追踪可见性
  const { ref, inView } = useInView({
    threshold: 0.3,
    rootMargin: '100px 0px', // 提前触发加载
  });

  // 预加载检测
  const { ref: preloadRef, inView: shouldPreload } = useInView({
    threshold: 0,
    rootMargin: `${settings.preloadAhead * 500}px 0px ${settings.preloadBehind * 500}px 0px`,
  });

  // 通知父组件可见性变化
  useEffect(() => {
    onVisibilityChange(pageIndex, inView);
  }, [inView, pageIndex, onVisibilityChange]);

  // 图片加载处理
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoaded(false);
  }, []);

  // 重试加载
  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoaded(false);
  }, []);

  // 计算图片高度占位（防止布局跳动）
  const aspectRatio = page.width && page.height ? page.width / page.height : 0.7;
  const placeholderStyle = {
    paddingBottom: `${(1 / aspectRatio) * 100}%`,
  };

  return (
    <div
      ref={(el) => {
        // 合并两个 ref
        if (typeof ref === 'function') ref(el);
        if (typeof preloadRef === 'function') preloadRef(el);
      }}
      className={cn(
        'relative',
        fitModeClass,
        settings.gapBetweenPages > 0 && 'mb-2'
      )}
      style={{ marginBottom: settings.gapBetweenPages }}
    >
      {/* 占位容器 */}
      <div className="relative w-full" style={placeholderStyle}>
        {/* 加载状态 */}
        {!isLoaded && !hasError && shouldPreload && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              <span className="text-xs text-white/50">加载中...</span>
            </div>
          </div>
        )}

        {/* 错误状态 */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm text-red-400">加载失败</span>
              <button
                onClick={handleRetry}
                className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
              >
                重试
              </button>
            </div>
          </div>
        )}

        {/* 图片 */}
        {shouldPreload && !hasError && (
          <img
            src={page.imageUrl}
            alt={`第 ${pageIndex + 1} 页`}
            onLoad={handleLoad}
            onError={handleError}
            className={cn(
              'absolute inset-0 h-full w-full object-contain',
              'transition-opacity duration-300',
              isLoaded ? 'opacity-100' : 'opacity-0'
            )}
            loading="lazy"
            decoding="async"
          />
        )}
      </div>

      {/* 页码指示器 */}
      {settings.showPageNumbers && (
        <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white/80">
          {pageIndex + 1} / {totalPages}
        </div>
      )}
    </div>
  );
}
