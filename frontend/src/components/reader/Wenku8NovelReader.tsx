'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { useReadingStore } from '@/store/reading';
import { useThemeStore } from '@/store/theme';
import { getWenku8ChapterContent } from '@/services/reader';
import { ReaderHeader } from './ReaderHeader';
import { ReaderContent } from './ReaderContent';
import { ReaderFooter } from './ReaderFooter';
import { SettingsPanel } from './SettingsPanel';
import { ProgressBar } from './ProgressBar';
import { useHotkeys } from '@/hooks/useHotkeys';
import { cn } from '@/utils/cn';
import { Info } from 'lucide-react';

interface Wenku8NovelReaderProps {
  novelId: string;
  chapterId: string;
}

export function Wenku8NovelReader({ novelId, chapterId }: Wenku8NovelReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showUI, setShowUI] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { settings, ui, toggleSettingsPanel, closeAllPanels } = useReadingStore();
  const { isDarkMode } = useThemeStore();

  // 获取章节内容
  const { data, isLoading, error } = useQuery({
    queryKey: ['wenku8-chapter', novelId, chapterId],
    queryFn: () => getWenku8ChapterContent(novelId, chapterId),
    staleTime: 5 * 60 * 1000,
  });


  // 热键系统
  useHotkeys({
    onNextPage: () => handlePageNavigation('next'),
    onPrevPage: () => handlePageNavigation('prev'),
    onNextChapter: () => navigateChapter('next'),
    onPrevChapter: () => navigateChapter('prev'),
    onToggleSettings: toggleSettingsPanel,
    onToggleChapterList: () => {},
    onToggleNightMode: () => useReadingStore.getState().toggleNightMode(),
    onToggleFullscreen: handleToggleFullscreen,
    onIncreaseFontSize: () => useReadingStore.getState().setFontSize(settings.fontSize + 2),
    onDecreaseFontSize: () => useReadingStore.getState().setFontSize(settings.fontSize - 2),
  });

  // 处理滚动进度
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
    const progress = scrollHeight > clientHeight 
      ? (scrollTop / (scrollHeight - clientHeight)) * 100 
      : 0;
    setScrollProgress(Math.min(100, Math.max(0, progress)));
  }, []);

  // 翻页导航
  const handlePageNavigation = useCallback(
    (direction: 'next' | 'prev') => {
      if (!contentRef.current || settings.readingMode !== 'page') return;
      const container = contentRef.current;
      const pageHeight = container.clientHeight;
      const currentScroll = container.scrollTop;
      if (direction === 'next') {
        container.scrollTo({ top: currentScroll + pageHeight * 0.9, behavior: 'smooth' });
      } else {
        container.scrollTo({ top: currentScroll - pageHeight * 0.9, behavior: 'smooth' });
      }
    },
    [settings.readingMode]
  );

  // 章节导航
  const navigateChapter = useCallback(
    (direction: 'next' | 'prev') => {
      if (!data) return;
      const targetChapter = direction === 'next' ? data.nextChapter : data.prevChapter;
      if (targetChapter) {
        window.location.href = `/read/wenku8/${novelId}/${targetChapter.id}`;
      }
    },
    [data, novelId]
  );

  // 全屏切换
  function handleToggleFullscreen() {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  // 点击内容区域切换 UI 显示
  const handleContentClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-interactive]')) return;
      setShowUI((prev) => !prev);
      if (ui.isSettingsPanelOpen) {
        closeAllPanels();
      }
    },
    [ui.isSettingsPanelOpen, closeAllPanels]
  );

  // 监听滚动
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    content.addEventListener('scroll', handleScroll);
    return () => content.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 应用夜间模式
  useEffect(() => {
    if (settings.nightMode || isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.nightMode, isDarkMode]);

  const backgroundStyles = {
    default: 'bg-background',
    sepia: 'bg-amber-50 dark:bg-amber-950',
    dark: 'bg-slate-900',
    green: 'bg-emerald-50 dark:bg-emerald-950',
  };

  const pageWidthStyles = {
    narrow: 'max-w-2xl',
    medium: 'max-w-4xl',
    wide: 'max-w-6xl',
    full: 'max-w-full px-4',
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">加载失败</h2>
          <p className="mt-2 text-muted-foreground">无法加载章节内容，请稍后重试</p>
        </div>
      </div>
    );
  }


  return (
    <div
      ref={containerRef}
      className={cn(
        'relative min-h-screen transition-colors duration-300',
        backgroundStyles[settings.backgroundColor]
      )}
    >
      {/* 顶部导航栏 */}
      <AnimatePresence>
        {showUI && (
          <ReaderHeader
            work={data?.work}
            chapter={data?.chapter}
            onToggleChapterList={() => window.location.href = `/read/wenku8/${novelId}`}
            onToggleSettings={toggleSettingsPanel}
          />
        )}
      </AnimatePresence>

      {/* 阅读进度条 */}
      <ProgressBar progress={scrollProgress} visible={showUI} />

      {/* 主内容区域 */}
      <div
        ref={contentRef}
        onClick={handleContentClick}
        className={cn(
          'mx-auto min-h-screen overflow-y-auto px-4 py-20',
          pageWidthStyles[settings.pageWidth],
          settings.readingMode === 'page' && 'snap-y snap-mandatory'
        )}
        style={{
          fontSize: `${settings.fontSize}px`,
          lineHeight: settings.lineHeight,
        }}
      >
        {isLoading ? (
          <ReaderSkeleton />
        ) : data ? (
          <>
            <ReaderContent
              paragraphs={data.paragraphs || []}
              content={data.content}
              settings={settings}
              onQuote={() => {}}
              highlightedAnchorId={null}
            />
            {/* 来源声明 */}
            <div className="mt-8 p-3 bg-muted/50 rounded-lg flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Info className="w-3 h-3 shrink-0" />
              <span>内容来源于第三方，仅供学习交流使用</span>
            </div>
          </>
        ) : null}
      </div>

      {/* 底部导航栏 */}
      <AnimatePresence>
        {showUI && (
          <ReaderFooter
            prevChapter={data?.prevChapter ?? null}
            nextChapter={data?.nextChapter ?? null}
            workId={`wenku8-${novelId}`}
            currentProgress={scrollProgress}
            onNavigate={navigateChapter}
          />
        )}
      </AnimatePresence>

      {/* 设置面板 */}
      <AnimatePresence>
        {ui.isSettingsPanelOpen && <SettingsPanel onClose={() => toggleSettingsPanel()} />}
      </AnimatePresence>
    </div>
  );
}

function ReaderSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-1/3 rounded bg-muted" />
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-5/6 rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
