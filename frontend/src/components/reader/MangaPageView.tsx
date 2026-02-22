'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useSpring, animated, config } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MangaPage, MangaReaderSettings } from '@/types/reader';

interface MangaPageViewProps {
  pages: MangaPage[];
  currentPageIndex: number;
  settings: MangaReaderSettings;
  onNextPage: () => void;
  onPrevPage: () => void;
}

/**
 * 漫画翻页阅读模式
 * 支持单页、双页、RTL 双页模式
 *
 * 需求4验收标准16: 支持 RTL 从右到左双页模式、单页模式
 * 任务4.3.3: 翻页阅读模式（含 RTL 从右到左双页模式，参考 Okuma-Reader）
 *
 * 特性：
 * - 单页模式：一次显示一页
 * - 双页模式：一次显示两页（左右排列）
 * - RTL 双页模式：从右到左阅读（日漫传统）
 * - 手势翻页（左右滑动）
 * - 点击翻页（左右区域）
 * - 物理弹性动画
 */
export function MangaPageView({
  pages,
  currentPageIndex,
  settings,
  onNextPage,
  onPrevPage,
}: MangaPageViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 更新容器尺寸
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // 判断是否为双页模式
  const isDoublePage = settings.readingMode === 'double' || settings.readingMode === 'rtl-double';
  const isRTL = settings.readingMode === 'rtl-double';

  // 计算当前显示的页面
  const displayPages = useMemo(() => {
    if (!isDoublePage) {
      // 单页模式
      return pages[currentPageIndex] ? [pages[currentPageIndex]] : [];
    }

    // 双页模式
    const leftIndex = currentPageIndex;
    const rightIndex = currentPageIndex + 1;

    const leftPage = pages[leftIndex];
    const rightPage = pages[rightIndex];

    if (isRTL) {
      // RTL 模式：右边是当前页，左边是下一页
      return [rightPage, leftPage].filter(Boolean);
    } else {
      // LTR 模式：左边是当前页，右边是下一页
      return [leftPage, rightPage].filter(Boolean);
    }
  }, [pages, currentPageIndex, isDoublePage, isRTL]);

  // 翻页动画
  const [{ x }, api] = useSpring(() => ({
    x: 0,
    config: {
      ...config.gentle,
      tension: 200,
      friction: 26,
    },
  }));

  // 拖拽手势
  const bind = useDrag(
    ({ active, movement: [mx], direction: [xDir], velocity: [vx] }) => {
      const threshold = containerSize.width * 0.15;
      const velocityThreshold = 0.5;

      if (active) {
        api.start({ x: mx, immediate: true });
      } else {
        // 判断是否触发翻页
        const shouldFlip = Math.abs(mx) > threshold || vx > velocityThreshold;

        if (shouldFlip) {
          // RTL 模式下方向相反
          const effectiveDir = isRTL ? -xDir : xDir;
          if (effectiveDir > 0) {
            onPrevPage();
          } else {
            onNextPage();
          }
        }

        // 回弹
        api.start({ x: 0 });
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      rubberband: true,
      bounds: { left: -containerSize.width * 0.5, right: containerSize.width * 0.5 },
    }
  );

  // 点击翻页
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickZone = clickX / rect.width;

      // RTL 模式下点击区域相反
      if (isRTL) {
        if (clickZone < 0.3) {
          onNextPage();
        } else if (clickZone > 0.7) {
          onPrevPage();
        }
      } else {
        if (clickZone < 0.3) {
          onPrevPage();
        } else if (clickZone > 0.7) {
          onNextPage();
        }
      }
    },
    [isRTL, onNextPage, onPrevPage]
  );

  // 判断是否可以翻页
  const canGoPrev = currentPageIndex > 0;
  const canGoNext = isDoublePage
    ? currentPageIndex + 2 < pages.length
    : currentPageIndex + 1 < pages.length;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative flex h-screen w-full items-center justify-center',
        'touch-pan-y overflow-hidden',
        'pt-16 pb-20' // 为工具栏留出空间
      )}
      onClick={handleClick}
      {...bind()}
    >
      {/* 页面容器 */}
      <animated.div
        style={{ x }}
        className={cn(
          'flex h-full items-center justify-center gap-1',
          isDoublePage && 'max-w-[90vw]'
        )}
      >
        {displayPages.map((page) => (
          <PageImage
            key={page.id}
            page={page}
            pageIndex={pages.indexOf(page)}
            totalPages={pages.length}
            settings={settings}
            isDoublePage={isDoublePage}
            showPageNumber={settings.showPageNumbers}
          />
        ))}
      </animated.div>

      {/* 翻页按钮 */}
      <PageNavigationButtons
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        isRTL={isRTL}
        onPrev={onPrevPage}
        onNext={onNextPage}
      />

      {/* 翻页提示区域 */}
      <PageClickZones isRTL={isRTL} />
    </div>
  );
}

interface PageImageProps {
  page: MangaPage;
  pageIndex: number;
  totalPages: number;
  settings: MangaReaderSettings;
  isDoublePage: boolean;
  showPageNumber: boolean;
}

/**
 * 单个页面图片组件
 */
function PageImage({
  page,
  pageIndex,
  totalPages,
  settings,
  isDoublePage,
  showPageNumber,
}: PageImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
  }, []);

  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  const handleRetry = useCallback(() => {
    setHasError(false);
    setIsLoaded(false);
  }, []);

  // 适应模式样式
  const fitModeStyles = {
    width: isDoublePage ? 'max-w-[45vw]' : 'max-w-[90vw]',
    height: 'max-h-[calc(100vh-9rem)]',
    contain: isDoublePage ? 'max-w-[45vw] max-h-[calc(100vh-9rem)]' : 'max-w-[90vw] max-h-[calc(100vh-9rem)]',
    original: '',
  };

  return (
    <div className="relative flex items-center justify-center">
      {/* 加载状态 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="flex h-[60vh] w-[40vw] flex-col items-center justify-center bg-neutral-900 rounded-lg">
          <span className="text-sm text-red-400">加载失败</span>
          <button
            onClick={handleRetry}
            className="mt-2 rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
          >
            重试
          </button>
        </div>
      )}

      {/* 图片 */}
      {!hasError && (
        <img
          src={page.imageUrl}
          alt={`第 ${pageIndex + 1} 页`}
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'object-contain',
            fitModeStyles[settings.fitMode],
            fitModeStyles.height,
            'transition-opacity duration-200',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          draggable={false}
        />
      )}

      {/* 页码 */}
      {showPageNumber && isLoaded && (
        <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white/80">
          {pageIndex + 1} / {totalPages}
        </div>
      )}
    </div>
  );
}

interface PageNavigationButtonsProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  isRTL: boolean;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * 翻页导航按钮
 */
function PageNavigationButtons({
  canGoPrev,
  canGoNext,
  isRTL,
  onPrev,
  onNext,
}: PageNavigationButtonsProps) {
  // RTL 模式下按钮位置和功能互换
  const leftAction = isRTL ? onNext : onPrev;
  const rightAction = isRTL ? onPrev : onNext;
  const canGoLeft = isRTL ? canGoNext : canGoPrev;
  const canGoRight = isRTL ? canGoPrev : canGoNext;

  return (
    <>
      {/* 左侧按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          leftAction();
        }}
        disabled={!canGoLeft}
        className={cn(
          'absolute left-4 top-1/2 z-10 -translate-y-1/2',
          'rounded-full p-3',
          'bg-black/30 backdrop-blur-sm',
          'text-white transition-all',
          'hover:bg-black/50',
          'disabled:cursor-not-allowed disabled:opacity-20',
          'opacity-0 hover:opacity-100 focus:opacity-100',
          'group-hover:opacity-100'
        )}
        data-interactive
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      {/* 右侧按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          rightAction();
        }}
        disabled={!canGoRight}
        className={cn(
          'absolute right-4 top-1/2 z-10 -translate-y-1/2',
          'rounded-full p-3',
          'bg-black/30 backdrop-blur-sm',
          'text-white transition-all',
          'hover:bg-black/50',
          'disabled:cursor-not-allowed disabled:opacity-20',
          'opacity-0 hover:opacity-100 focus:opacity-100',
          'group-hover:opacity-100'
        )}
        data-interactive
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </>
  );
}

interface PageClickZonesProps {
  isRTL: boolean;
}

/**
 * 点击翻页区域提示
 */
function PageClickZones({ isRTL }: PageClickZonesProps) {
  return (
    <>
      {/* 左侧点击区域 */}
      <div
        className={cn(
          'absolute inset-y-0 left-0 w-[30%]',
          'cursor-pointer opacity-0 transition-opacity',
          'hover:opacity-100'
        )}
      >
        <div className="absolute inset-y-0 left-4 flex items-center">
          <div className="rounded-full bg-black/20 p-2 text-white backdrop-blur-sm">
            {isRTL ? '→' : '←'}
          </div>
        </div>
      </div>

      {/* 右侧点击区域 */}
      <div
        className={cn(
          'absolute inset-y-0 right-0 w-[30%]',
          'cursor-pointer opacity-0 transition-opacity',
          'hover:opacity-100'
        )}
      >
        <div className="absolute inset-y-0 right-4 flex items-center">
          <div className="rounded-full bg-black/20 p-2 text-white backdrop-blur-sm">
            {isRTL ? '←' : '→'}
          </div>
        </div>
      </div>
    </>
  );
}
