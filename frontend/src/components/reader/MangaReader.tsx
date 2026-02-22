'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'motion/react';
import { getChapterContent } from '@/services/reader';
import { MangaToolbar } from './MangaToolbar';
import { MangaScrollView } from './MangaScrollView';
import { MangaPageView } from './MangaPageView';
import { MangaSettingsPanel } from './MangaSettingsPanel';
import { ChapterSidebar } from './ChapterSidebar';
import { cn } from '@/utils/cn';
import type { MangaReaderSettings, MangaReadingMode } from '@/types/reader';
import { DEFAULT_MANGA_SETTINGS } from '@/types/reader';

interface MangaReaderProps {
  workId: string;
  chapterId: string;
}

/**
 * 漫画阅读器主组件
 *
 * 需求4验收标准16: 支持 RTL 从右到左双页模式、单页模式和 Webtoon 长条滚动模式
 * 需求4验收标准17: 预缓存前后各 2-3 页图片以实现流畅阅读体验
 * 任务4.3: 漫画阅读器前端
 */
export function MangaReader({ workId, chapterId }: MangaReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showUI, setShowUI] = useState(true);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChapterListOpen, setIsChapterListOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 从 localStorage 加载设置
  const [settings, setSettings] = useState<MangaReaderSettings>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('manga-reader-settings');
      if (saved) {
        try {
          return { ...DEFAULT_MANGA_SETTINGS, ...JSON.parse(saved) };
        } catch {
          return DEFAULT_MANGA_SETTINGS;
        }
      }
    }
    return DEFAULT_MANGA_SETTINGS;
  });

  // 保存设置到 localStorage
  useEffect(() => {
    localStorage.setItem('manga-reader-settings', JSON.stringify(settings));
  }, [settings]);

  // 获取章节内容
  const { data, isLoading, error } = useQuery({
    queryKey: ['manga-chapter', workId, chapterId],
    queryFn: () => getChapterContent(workId, chapterId),
    staleTime: 5 * 60 * 1000,
  });

  const pages = useMemo(() => data?.pages || [], [data?.pages]);
  const totalPages = pages.length;

  // 根据阅读方向获取实际页面顺序
  const isRTL = settings.readingMode === 'rtl-double';
  const orderedPages = useMemo(() => {
    if (isRTL) {
      return [...pages].reverse();
    }
    return pages;
  }, [pages, isRTL]);

  // 更新设置
  const updateSettings = useCallback((updates: Partial<MangaReaderSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  }, []);

  // 切换阅读模式
  const setReadingMode = useCallback((mode: MangaReadingMode) => {
    updateSettings({ readingMode: mode });
    setCurrentPageIndex(0);
  }, [updateSettings]);

  // 页面导航
  const goToPage = useCallback((index: number) => {
    setCurrentPageIndex(Math.max(0, Math.min(index, totalPages - 1)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    const step = settings.readingMode === 'double' || settings.readingMode === 'rtl-double' ? 2 : 1;
    goToPage(currentPageIndex + step);
  }, [currentPageIndex, settings.readingMode, goToPage]);

  const prevPage = useCallback(() => {
    const step = settings.readingMode === 'double' || settings.readingMode === 'rtl-double' ? 2 : 1;
    goToPage(currentPageIndex - step);
  }, [currentPageIndex, settings.readingMode, goToPage]);

  // 章节导航
  const navigateChapter = useCallback((direction: 'prev' | 'next') => {
    if (!data) return;
    const targetChapter = direction === 'next' ? data.nextChapter : data.prevChapter;
    if (targetChapter) {
      window.location.href = `/read/${workId}/${targetChapter.id}`;
    }
  }, [data, workId]);

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
      // 如果设置面板打开，不处理键盘事件
      if (isSettingsOpen || isChapterListOpen) return;

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
          if (settings.readingMode !== 'scroll') nextPage();
          break;
        case 'ArrowUp':
          if (settings.readingMode !== 'scroll') prevPage();
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
  }, [isRTL, nextPage, prevPage, goToPage, totalPages, toggleFullscreen, isFullscreen, settings.readingMode, isSettingsOpen, isChapterListOpen]);

  // 点击切换 UI 显示
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-interactive]')) return;
    setShowUI((prev) => !prev);
  }, []);

  // 背景色样式
  const bgStyles = {
    black: 'bg-black',
    white: 'bg-white',
    gray: 'bg-neutral-800',
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center text-white">
          <h2 className="text-xl font-semibold">加载失败</h2>
          <p className="mt-2 text-neutral-400">无法加载漫画内容，请稍后重试</p>
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
            work={data?.work}
            chapter={data?.chapter}
            currentPage={currentPageIndex + 1}
            totalPages={totalPages}
            readingMode={settings.readingMode}
            isFullscreen={isFullscreen}
            onToggleChapterList={() => setIsChapterListOpen(true)}
            onToggleSettings={() => setIsSettingsOpen(true)}
            onToggleFullscreen={toggleFullscreen}
            onReadingModeChange={setReadingMode}
          />
        )}
      </AnimatePresence>

      {/* 主内容区域 */}
      {isLoading ? (
        <MangaLoadingSkeleton />
      ) : pages.length > 0 ? (
        settings.readingMode === 'scroll' ? (
          <MangaScrollView
            pages={orderedPages}
            settings={settings}
            onPageChange={setCurrentPageIndex}
          />
        ) : (
          <MangaPageView
            pages={orderedPages}
            currentPageIndex={currentPageIndex}
            settings={settings}
            onNextPage={nextPage}
            onPrevPage={prevPage}
          />
        )
      ) : (
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-neutral-400">暂无页面</p>
        </div>
      )}

      {/* 底部导航栏 */}
      <AnimatePresence>
        {showUI && settings.readingMode !== 'scroll' && (
          <MangaBottomBar
            currentPage={currentPageIndex}
            totalPages={totalPages}
            prevChapter={data?.prevChapter ?? null}
            nextChapter={data?.nextChapter ?? null}
            onPageChange={goToPage}
            onNavigateChapter={navigateChapter}
          />
        )}
      </AnimatePresence>

      {/* 设置面板 */}
      <AnimatePresence>
        {isSettingsOpen && (
          <MangaSettingsPanel
            settings={settings}
            onSettingsChange={updateSettings}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* 章节目录 */}
      <AnimatePresence>
        {isChapterListOpen && (
          <ChapterSidebar
            workId={workId}
            currentChapterId={chapterId}
            onClose={() => setIsChapterListOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


/** 加载骨架屏 */
function MangaLoadingSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <p className="text-neutral-400">加载中...</p>
      </div>
    </div>
  );
}

/** 底部导航栏 */
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
              className="disabled:opacity-30"
            >
              上一章
            </button>
            <button
              onClick={() => onNavigateChapter('next')}
              disabled={!nextChapter}
              className="disabled:opacity-30"
            >
              下一章
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
