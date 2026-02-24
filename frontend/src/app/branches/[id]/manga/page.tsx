'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useSpring, animated, config } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minimize,
  Settings,
  List,
  RotateCcw,
  Loader2,
  X,
} from 'lucide-react';
import { libraryService } from '@/services/library.service';
import { getChapterContent, getChapterList } from '@/services/reader';
import { cn } from '@/utils/cn';
import type { MangaPage } from '@/types/reader';

/**
 * 漫画分支阅读器页面
 *
 * 需求4.5: 支持翻页阅读器界面
 * - 支持 LTR/RTL 阅读方向
 * - 支持翻页阅读器界面
 * - 支持键盘导航（方向键）
 * - 支持触摸/滑动手势
 * - 支持全屏模式
 */

type ReadingDirection = 'LTR' | 'RTL';
type ReadingMode = 'single' | 'double';

interface MangaReaderSettings {
  readingDirection: ReadingDirection;
  readingMode: ReadingMode;
  showPageNumbers: boolean;
  backgroundColor: 'black' | 'white' | 'gray';
}

const DEFAULT_SETTINGS: MangaReaderSettings = {
  readingDirection: 'LTR',
  readingMode: 'single',
  showPageNumbers: true,
  backgroundColor: 'black',
};

export default function MangaBranchReaderPage() {
  const params = useParams();
  const router = useRouter();
  const branchId = params.id as string;
  const containerRef = useRef<HTMLDivElement>(null);

  // 状态
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUI, setShowUI] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showChapterList, setShowChapterList] = useState(false);
  const [currentChapterId, setCurrentChapterId] = useState<string | null>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // 从 localStorage 加载设置
  const [settings, setSettings] = useState<MangaReaderSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manga-branch-reader-settings');
      if (saved) {
        try {
          return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_SETTINGS;
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  // 保存设置到 localStorage
  useEffect(() => {
    localStorage.setItem('manga-branch-reader-settings', JSON.stringify(settings));
  }, [settings]);

  // 获取分支详情
  const {
    data: branch,
    isLoading: isBranchLoading,
    error: branchError,
  } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => libraryService.getBranchById(branchId),
    staleTime: 5 * 60 * 1000,
  });

  // 获取章节列表
  const { data: chapterList } = useQuery({
    queryKey: ['chapters', branch?.workId],
    queryFn: () => getChapterList(branch!.workId),
    enabled: !!branch?.workId,
    staleTime: 5 * 60 * 1000,
  });

  // 设置默认章节
  useEffect(() => {
    if (chapterList?.chapters && chapterList.chapters.length > 0 && !currentChapterId) {
      setCurrentChapterId(chapterList.chapters[0].id);
    }
  }, [chapterList, currentChapterId]);

  // 获取当前章节内容（漫画页面）
  const {
    data: chapterContent,
    isLoading: isContentLoading,
  } = useQuery({
    queryKey: ['chapterContent', branch?.workId, currentChapterId],
    queryFn: () => getChapterContent(branch!.workId, currentChapterId!),
    enabled: !!branch?.workId && !!currentChapterId,
    staleTime: 5 * 60 * 1000,
  });

  // 漫画页面
  const pages: MangaPage[] = useMemo(() => chapterContent?.pages || [], [chapterContent?.pages]);
  const totalPages = pages.length;

  // 根据阅读方向获取实际页面顺序
  const isRTL = settings.readingDirection === 'RTL';
  const orderedPages = useMemo(() => {
    if (isRTL) {
      return [...pages].reverse();
    }
    return pages;
  }, [pages, isRTL]);

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

  // 更新设置
  const updateSettings = useCallback((updates: Partial<MangaReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  // 页面导航
  const goToPage = useCallback((index: number) => {
    setCurrentPageIndex(Math.max(0, Math.min(index, totalPages - 1)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    const step = settings.readingMode === 'double' ? 2 : 1;
    goToPage(currentPageIndex + step);
  }, [currentPageIndex, settings.readingMode, goToPage]);

  const prevPage = useCallback(() => {
    const step = settings.readingMode === 'double' ? 2 : 1;
    goToPage(currentPageIndex - step);
  }, [currentPageIndex, settings.readingMode, goToPage]);

  // 章节导航
  const navigateChapter = useCallback((direction: 'prev' | 'next') => {
    if (!chapterContent) return;
    const targetChapter = direction === 'next' ? chapterContent.nextChapter : chapterContent.prevChapter;
    if (targetChapter) {
      setCurrentChapterId(targetChapter.id);
      setCurrentPageIndex(0);
    }
  }, [chapterContent]);

  // 全屏切换
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // 监听全屏变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showSettings || showChapterList) return;

      switch (e.key) {
        case 'ArrowRight':
          if (isRTL) prevPage();
          else nextPage();
          break;
        case 'ArrowLeft':
          if (isRTL) nextPage();
          else prevPage();
          break;
        case 'ArrowDown':
        case ' ':
          nextPage();
          e.preventDefault();
          break;
        case 'ArrowUp':
          prevPage();
          e.preventDefault();
          break;
        case 'Home':
          goToPage(0);
          break;
        case 'End':
          goToPage(totalPages - 1);
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) document.exitFullscreen();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRTL, nextPage, prevPage, goToPage, totalPages, toggleFullscreen, isFullscreen, showSettings, showChapterList]);

  // 点击切换 UI 显示
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-interactive]')) return;
    setShowUI((prev) => !prev);
  }, []);

  // 返回
  const handleBack = () => {
    router.back();
  };

  // 背景色样式
  const bgStyles = {
    black: 'bg-black',
    white: 'bg-white',
    gray: 'bg-neutral-800',
  };

  // 加载状态
  if (isBranchLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
          <p className="text-neutral-400">加载中...</p>
        </div>
      </div>
    );
  }

  // 错误状态
  if (branchError || !branch) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold">加载失败</h2>
          <p className="mt-2 text-neutral-400">
            {branchError instanceof Error ? branchError.message : '分支不存在'}
          </p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  // 非漫画分支
  if (branch.branchType !== 'MANGA') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold">不支持的分支类型</h2>
          <p className="mt-2 text-neutral-400">此分支不是漫画分支</p>
          <button
            onClick={handleBack}
            className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            返回
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative min-h-screen select-none',
        bgStyles[settings.backgroundColor]
      )}
      onClick={handleContainerClick}
    >
      {/* 顶部工具栏 */}
      <AnimatePresence>
        {showUI && (
          <MangaToolbar
            title={branch.title}
            currentPage={currentPageIndex + 1}
            totalPages={totalPages}
            readingDirection={settings.readingDirection}
            isFullscreen={isFullscreen}
            onBack={handleBack}
            onToggleChapterList={() => setShowChapterList(true)}
            onToggleSettings={() => setShowSettings(true)}
            onToggleFullscreen={toggleFullscreen}
            onDirectionChange={(dir) => updateSettings({ readingDirection: dir })}
          />
        )}
      </AnimatePresence>

      {/* 主内容区域 */}
      {isContentLoading ? (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
            <p className="text-neutral-400">加载中...</p>
          </div>
        </div>
      ) : pages.length > 0 ? (
        <MangaPageView
          pages={orderedPages}
          currentPageIndex={currentPageIndex}
          settings={settings}
          containerSize={containerSize}
          onNextPage={nextPage}
          onPrevPage={prevPage}
        />
      ) : (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-neutral-400">暂无页面</p>
        </div>
      )}

      {/* 底部导航栏 */}
      <AnimatePresence>
        {showUI && pages.length > 0 && (
          <MangaBottomBar
            currentPage={currentPageIndex}
            totalPages={totalPages}
            prevChapter={chapterContent?.prevChapter ?? null}
            nextChapter={chapterContent?.nextChapter ?? null}
            onPageChange={goToPage}
            onNavigateChapter={navigateChapter}
          />
        )}
      </AnimatePresence>

      {/* 设置面板 */}
      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            settings={settings}
            onSettingsChange={updateSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      {/* 章节目录 */}
      <AnimatePresence>
        {showChapterList && chapterList && (
          <ChapterListPanel
            chapters={chapterList.chapters}
            currentChapterId={currentChapterId}
            onSelectChapter={(id) => {
              setCurrentChapterId(id);
              setCurrentPageIndex(0);
              setShowChapterList(false);
            }}
            onClose={() => setShowChapterList(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


/**
 * 顶部工具栏
 */
interface MangaToolbarProps {
  title: string;
  currentPage: number;
  totalPages: number;
  readingDirection: ReadingDirection;
  isFullscreen: boolean;
  onBack: () => void;
  onToggleChapterList: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
  onDirectionChange: (dir: ReadingDirection) => void;
}

function MangaToolbar({
  title,
  currentPage,
  totalPages,
  readingDirection,
  isFullscreen,
  onBack,
  onToggleChapterList,
  onToggleSettings,
  onToggleFullscreen,
  onDirectionChange,
}: MangaToolbarProps) {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50',
        'bg-gradient-to-b from-black/90 via-black/70 to-transparent',
        'px-4 pt-4 pb-12'
      )}
      data-interactive
    >
      <div className="flex items-center justify-between">
        {/* 左侧：返回和标题 */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-white font-medium text-sm line-clamp-1 max-w-[200px]">
              {title}
            </h1>
            <span className="text-white/60 text-xs">
              {currentPage} / {totalPages}
            </span>
          </div>
        </div>

        {/* 右侧：工具按钮 */}
        <div className="flex items-center gap-2">
          {/* 阅读方向切换 */}
          <button
            onClick={() => onDirectionChange(readingDirection === 'LTR' ? 'RTL' : 'LTR')}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium',
              'bg-white/10 hover:bg-white/20 transition-colors',
              'text-white'
            )}
          >
            {readingDirection === 'LTR' ? 'LTR →' : '← RTL'}
          </button>

          {/* 章节目录 */}
          <button
            onClick={onToggleChapterList}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <List className="w-5 h-5 text-white" />
          </button>

          {/* 设置 */}
          <button
            onClick={onToggleSettings}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>

          {/* 全屏 */}
          <button
            onClick={onToggleFullscreen}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            {isFullscreen ? (
              <Minimize className="w-5 h-5 text-white" />
            ) : (
              <Maximize className="w-5 h-5 text-white" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 漫画翻页视图
 * 支持手势翻页和点击翻页
 */
interface MangaPageViewProps {
  pages: MangaPage[];
  currentPageIndex: number;
  settings: MangaReaderSettings;
  containerSize: { width: number; height: number };
  onNextPage: () => void;
  onPrevPage: () => void;
}

function MangaPageView({
  pages,
  currentPageIndex,
  settings,
  containerSize,
  onNextPage,
  onPrevPage,
}: MangaPageViewProps) {
  const isRTL = settings.readingDirection === 'RTL';
  const isDoublePage = settings.readingMode === 'double';

  // 计算当前显示的页面
  const displayPages = useMemo(() => {
    if (!isDoublePage) {
      return pages[currentPageIndex] ? [pages[currentPageIndex]] : [];
    }

    const leftIndex = currentPageIndex;
    const rightIndex = currentPageIndex + 1;
    const leftPage = pages[leftIndex];
    const rightPage = pages[rightIndex];

    if (isRTL) {
      return [rightPage, leftPage].filter(Boolean);
    } else {
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
        const shouldFlip = Math.abs(mx) > threshold || vx > velocityThreshold;

        if (shouldFlip) {
          const effectiveDir = isRTL ? -xDir : xDir;
          if (effectiveDir > 0) {
            onPrevPage();
          } else {
            onNextPage();
          }
        }

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
      const target = e.target as HTMLElement;
      if (target.closest('[data-interactive]')) return;

      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickZone = clickX / rect.width;

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

  const canGoPrev = currentPageIndex > 0;
  const canGoNext = isDoublePage
    ? currentPageIndex + 2 < pages.length
    : currentPageIndex + 1 < pages.length;

  return (
    <div
      className={cn(
        'relative flex h-screen w-full items-center justify-center',
        'touch-pan-y overflow-hidden',
        'pt-16 pb-20'
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


/**
 * 单个页面图片组件
 */
interface PageImageProps {
  page: MangaPage;
  pageIndex: number;
  totalPages: number;
  isDoublePage: boolean;
  showPageNumber: boolean;
}

function PageImage({
  page,
  pageIndex,
  totalPages,
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

  return (
    <div className="relative flex items-center justify-center">
      {/* 加载状态 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white/30" />
        </div>
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="flex h-[60vh] w-[40vw] flex-col items-center justify-center bg-neutral-900 rounded-lg">
          <span className="text-sm text-red-400">加载失败</span>
          <button
            onClick={handleRetry}
            className="mt-2 flex items-center gap-1 rounded-lg bg-white/10 px-3 py-1 text-xs text-white hover:bg-white/20"
            data-interactive
          >
            <RotateCcw className="w-3 h-3" />
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
            isDoublePage ? 'max-w-[45vw]' : 'max-w-[90vw]',
            'max-h-[calc(100vh-9rem)]',
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

/**
 * 翻页导航按钮
 */
interface PageNavigationButtonsProps {
  canGoPrev: boolean;
  canGoNext: boolean;
  isRTL: boolean;
  onPrev: () => void;
  onNext: () => void;
}

function PageNavigationButtons({
  canGoPrev,
  canGoNext,
  isRTL,
  onPrev,
  onNext,
}: PageNavigationButtonsProps) {
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
          'opacity-0 hover:opacity-100 focus:opacity-100'
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
          'opacity-0 hover:opacity-100 focus:opacity-100'
        )}
        data-interactive
      >
        <ChevronRight className="h-6 w-6" />
      </button>
    </>
  );
}

/**
 * 点击翻页区域提示
 */
interface PageClickZonesProps {
  isRTL: boolean;
}

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


/**
 * 底部导航栏
 */
interface MangaBottomBarProps {
  currentPage: number;
  totalPages: number;
  prevChapter: { id: string; title: string } | null;
  nextChapter: { id: string; title: string } | null;
  onPageChange: (page: number) => void;
  onNavigateChapter: (direction: 'prev' | 'next') => void;
}

function MangaBottomBar({
  currentPage,
  totalPages,
  prevChapter,
  nextChapter,
  onPageChange,
  onNavigateChapter,
}: MangaBottomBarProps) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-gradient-to-t from-black/90 via-black/70 to-transparent',
        'px-4 pb-4 pt-12'
      )}
      data-interactive
    >
      {/* 进度滑块 */}
      <div className="mx-auto max-w-2xl">
        <input
          type="range"
          min={0}
          max={totalPages - 1}
          value={currentPage}
          onChange={(e) => onPageChange(Number(e.target.value))}
          className={cn(
            'w-full cursor-pointer appearance-none',
            'h-1 rounded-full bg-white/30',
            '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg'
          )}
        />
        <div className="mt-2 flex items-center justify-between text-sm text-white/70">
          <span>{currentPage + 1} / {totalPages}</span>
          <div className="flex gap-4">
            <button
              onClick={() => onNavigateChapter('prev')}
              disabled={!prevChapter}
              className="disabled:opacity-30 hover:text-white transition-colors"
            >
              上一章
            </button>
            <button
              onClick={() => onNavigateChapter('next')}
              disabled={!nextChapter}
              className="disabled:opacity-30 hover:text-white transition-colors"
            >
              下一章
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * 设置面板
 */
interface SettingsPanelProps {
  settings: MangaReaderSettings;
  onSettingsChange: (updates: Partial<MangaReaderSettings>) => void;
  onClose: () => void;
}

function SettingsPanel({ settings, onSettingsChange, onClose }: SettingsPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-md mx-4 rounded-2xl overflow-hidden',
          'bg-neutral-900 border border-neutral-800',
          'shadow-2xl'
        )}
        data-interactive
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">阅读设置</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* 设置内容 */}
        <div className="p-6 space-y-6">
          {/* 阅读方向 */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              阅读方向
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSettingsChange({ readingDirection: 'LTR' })}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  settings.readingDirection === 'LTR'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                )}
              >
                LTR（从左到右）
              </button>
              <button
                onClick={() => onSettingsChange({ readingDirection: 'RTL' })}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  settings.readingDirection === 'RTL'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                )}
              >
                RTL（从右到左）
              </button>
            </div>
          </div>

          {/* 阅读模式 */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              阅读模式
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onSettingsChange({ readingMode: 'single' })}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  settings.readingMode === 'single'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                )}
              >
                单页模式
              </button>
              <button
                onClick={() => onSettingsChange({ readingMode: 'double' })}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  settings.readingMode === 'double'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                )}
              >
                双页模式
              </button>
            </div>
          </div>

          {/* 背景颜色 */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-3">
              背景颜色
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['black', 'gray', 'white'] as const).map((color) => (
                <button
                  key={color}
                  onClick={() => onSettingsChange({ backgroundColor: color })}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                    settings.backgroundColor === color
                      ? 'ring-2 ring-indigo-500'
                      : '',
                    color === 'black' && 'bg-black text-white border border-neutral-700',
                    color === 'gray' && 'bg-neutral-700 text-white',
                    color === 'white' && 'bg-white text-black'
                  )}
                >
                  {color === 'black' ? '黑色' : color === 'gray' ? '灰色' : '白色'}
                </button>
              ))}
            </div>
          </div>

          {/* 显示页码 */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white/80">
              显示页码
            </label>
            <button
              onClick={() => onSettingsChange({ showPageNumbers: !settings.showPageNumbers })}
              className={cn(
                'relative w-12 h-6 rounded-full transition-colors',
                settings.showPageNumbers ? 'bg-indigo-500' : 'bg-white/20'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
                  settings.showPageNumbers ? 'left-7' : 'left-1'
                )}
              />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}


/**
 * 章节目录面板
 */
interface ChapterListPanelProps {
  chapters: { id: string; title: string; orderIndex: number }[];
  currentChapterId: string | null;
  onSelectChapter: (id: string) => void;
  onClose: () => void;
}

function ChapterListPanel({
  chapters,
  currentChapterId,
  onSelectChapter,
  onClose,
}: ChapterListPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -100, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'fixed left-0 top-0 bottom-0 w-80 max-w-[80vw]',
          'bg-neutral-900 border-r border-neutral-800',
          'shadow-2xl overflow-hidden flex flex-col'
        )}
        data-interactive
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-800">
          <h3 className="text-lg font-semibold text-white">章节目录</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* 章节列表 */}
        <div className="flex-1 overflow-y-auto">
          {chapters.length > 0 ? (
            <div className="py-2">
              {chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => onSelectChapter(chapter.id)}
                  className={cn(
                    'w-full px-4 py-3 text-left transition-colors',
                    'hover:bg-white/5',
                    chapter.id === currentChapterId
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'text-white/80'
                  )}
                >
                  <span className="text-sm line-clamp-2">{chapter.title}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-white/40 text-sm">暂无章节</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
