'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence } from 'motion/react';
import { useReadingStore } from '@/store/reading';
import { useThemeStore } from '@/store/theme';
import { useDanmakuStore } from '@/store/danmaku';
import { useQuoteStore } from '@/store/quote';
import { getChapterContent } from '@/services/reader';
import { sendDanmaku as sendDanmakuApi } from '@/services/danmaku';
import { useAuthStore } from '@/store/auth';
import { ReaderHeader } from './ReaderHeader';
import { ReaderContent } from './ReaderContent';
import { ReaderFooter } from './ReaderFooter';
import { SettingsPanel } from './SettingsPanel';
import { ChapterSidebar } from './ChapterSidebar';
import { ProgressBar } from './ProgressBar';
import { DanmakuInput } from './DanmakuInput';
import { DanmakuControls } from './DanmakuControls';
import { QuoteModal } from './QuoteModal';
import { useHotkeys } from '@/hooks/useHotkeys';
import { useAutoSaveProgress } from '@/hooks/useAutoSaveProgress';
import { cn } from '@/utils/cn';
import { MessageSquare } from 'lucide-react';
import type { CreateDanmakuRequest, Paragraph } from '@/types/reader';

interface NovelReaderProps {
  workId: string;
  chapterId: string;
  /** 锚点ID，用于跳转到指定段落 */
  anchorId?: string | null;
}

/**
 * 小说阅读器主组件
 *
 * 需求4: 沉浸式阅读器
 * 需求3: 段落锚点精准引用体系
 * 需求3验收标准5: WHEN 用户点击 Card 中的引用链接 THEN System SHALL 导航到 Reader 并定位到对应 Paragraph
 * 任务4.2.1: 阅读器页面布局
 * 任务7.2.1: 段落选择引用交互
 * 任务7.2.5: 引用跳转到原文功能
 */
export function NovelReader({ workId, chapterId, anchorId }: NovelReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showUI, setShowUI] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  // 高亮的锚点ID（用于引用跳转后的视觉反馈）
  const [highlightedAnchorId, setHighlightedAnchorId] = useState<string | null>(null);

  const { settings, ui, toggleSettingsPanel, toggleChapterList, closeAllPanels } =
    useReadingStore();
  const { isDarkMode } = useThemeStore();
  const { isAuthenticated } = useAuthStore();

  // 弹幕状态
  const {
    settings: danmakuSettings,
    updateSettings: updateDanmakuSettings,
    isControlsOpen: isDanmakuControlsOpen,
    isInputOpen: isDanmakuInputOpen,
    currentAnchorId,
    toggleControls: toggleDanmakuControls,
    closeInput: closeDanmakuInput,
    addDanmaku,
  } = useDanmakuStore();

  // 引用状态
  const {
    isQuoteModalOpen,
    quotedParagraph,
    openQuoteModal,
    closeQuoteModal,
  } = useQuoteStore();

  // 获取章节内容
  const { data, isLoading, error } = useQuery({
    queryKey: ['chapter', workId, chapterId],
    queryFn: () => getChapterContent(workId, chapterId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // 自动保存阅读进度
  useAutoSaveProgress({
    workId,
    chapterId,
    scrollProgress,
    enabled: !!data,
  });

  // 锚点跳转和高亮效果
  // 需求3验收标准5: WHEN 用户点击 Card 中的引用链接 THEN System SHALL 导航到 Reader 并定位到对应 Paragraph
  useEffect(() => {
    if (!anchorId || !data || isLoading) return;

    let highlightTimer: NodeJS.Timeout | null = null;

    // 等待内容渲染完成后再滚动
    const scrollToAnchor = () => {
      const targetElement = document.querySelector(`[data-anchor-id="${anchorId}"]`);
      
      if (targetElement) {
        // 滚动到目标段落，留出一些顶部空间
        targetElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });

        // 设置高亮状态
        setHighlightedAnchorId(anchorId);

        // 3秒后移除高亮
        highlightTimer = setTimeout(() => {
          setHighlightedAnchorId(null);
        }, 3000);
      }
    };

    // 使用 requestAnimationFrame 确保 DOM 已更新
    const rafId = requestAnimationFrame(() => {
      // 再延迟一小段时间确保段落动画完成
      setTimeout(scrollToAnchor, 100);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if (highlightTimer) {
        clearTimeout(highlightTimer);
      }
    };
  }, [anchorId, data, isLoading]);

  // 热键系统
  useHotkeys({
    onNextPage: () => handlePageNavigation('next'),
    onPrevPage: () => handlePageNavigation('prev'),
    onNextChapter: () => navigateChapter('next'),
    onPrevChapter: () => navigateChapter('prev'),
    onToggleSettings: toggleSettingsPanel,
    onToggleChapterList: toggleChapterList,
    onToggleNightMode: () => useReadingStore.getState().toggleNightMode(),
    onToggleFullscreen: handleToggleFullscreen,
    onIncreaseFontSize: () => useReadingStore.getState().setFontSize(settings.fontSize + 2),
    onDecreaseFontSize: () => useReadingStore.getState().setFontSize(settings.fontSize - 2),
  });

  // 处理滚动进度
  const handleScroll = useCallback(() => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const progress =
      scrollHeight > clientHeight ? (scrollTop / (scrollHeight - clientHeight)) * 100 : 0;
    setScrollProgress(Math.min(100, Math.max(0, progress)));
  }, []);

  // 翻页导航
  const handlePageNavigation = useCallback(
    (direction: 'next' | 'prev') => {
      if (settings.readingMode !== 'page') return;

      const pageHeight = window.innerHeight;
      const currentScroll = window.scrollY;

      if (direction === 'next') {
        window.scrollTo({
          top: currentScroll + pageHeight * 0.9,
          behavior: 'smooth',
        });
      } else {
        window.scrollTo({
          top: currentScroll - pageHeight * 0.9,
          behavior: 'smooth',
        });
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
        window.location.href = `/read/${workId}/${targetChapter.id}`;
      }
    },
    [data, workId]
  );

  // 发送弹幕
  const handleSendDanmaku = useCallback(
    async (danmakuData: CreateDanmakuRequest) => {
      if (!isAuthenticated) {
        throw new Error('请先登录');
      }

      const danmaku = await sendDanmakuApi(danmakuData);
      addDanmaku(danmaku);
    },
    [isAuthenticated, addDanmaku]
  );

  // 处理引用操作
  const handleQuote = useCallback(
    (paragraph: Paragraph) => {
      if (!data) return;
      
      // 打开引用弹窗，传入完整的段落上下文信息
      openQuoteModal({
        id: paragraph.id,
        anchorId: paragraph.anchorId,
        content: paragraph.content,
        workId: workId,
        workTitle: data.work?.title || '',
        chapterId: chapterId,
        chapterTitle: data.chapter?.title || '',
      });
    },
    [data, workId, chapterId, openQuoteModal]
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
      // 如果点击的是段落或其他交互元素，不切换 UI
      const target = e.target as HTMLElement;
      if (target.closest('[data-interactive]')) return;

      setShowUI((prev) => !prev);
      if (ui.isSettingsPanelOpen || ui.isChapterListOpen) {
        closeAllPanels();
      }
    },
    [ui.isSettingsPanelOpen, ui.isChapterListOpen, closeAllPanels]
  );

  // 监听滚动 - 改为监听 window
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    // 初始化时也计算一次
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // 应用夜间模式
  useEffect(() => {
    if (settings.nightMode || isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.nightMode, isDarkMode]);

  // 背景色样式
  const backgroundStyles = {
    default: 'bg-background',
    sepia: 'bg-amber-50 dark:bg-amber-950',
    dark: 'bg-slate-900',
    green: 'bg-teal-50 dark:bg-teal-950',
  };

  // 页面宽度样式
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
            onToggleChapterList={toggleChapterList}
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
          <ReaderContent
            paragraphs={data.paragraphs || []}
            content={data.content}
            settings={settings}
            onQuote={handleQuote}
            highlightedAnchorId={highlightedAnchorId}
          />
        ) : null}
      </div>

      {/* 底部导航栏 */}
      <AnimatePresence>
        {showUI && (
          <ReaderFooter
            prevChapter={data?.prevChapter ?? null}
            nextChapter={data?.nextChapter ?? null}
            workId={workId}
            currentProgress={scrollProgress}
            onNavigate={navigateChapter}
          />
        )}
      </AnimatePresence>

      {/* 设置面板 */}
      <AnimatePresence>
        {ui.isSettingsPanelOpen && <SettingsPanel onClose={() => toggleSettingsPanel()} />}
      </AnimatePresence>

      {/* 章节目录侧边栏 */}
      <AnimatePresence>
        {ui.isChapterListOpen && (
          <ChapterSidebar
            workId={workId}
            currentChapterId={chapterId}
            onClose={() => toggleChapterList()}
          />
        )}
      </AnimatePresence>

      {/* 弹幕输入框 */}
      {currentAnchorId && (
        <DanmakuInput
          anchorId={currentAnchorId}
          isOpen={isDanmakuInputOpen}
          onClose={closeDanmakuInput}
          onSend={handleSendDanmaku}
        />
      )}

      {/* 弹幕控制面板 */}
      <DanmakuControls
        settings={danmakuSettings}
        onSettingsChange={updateDanmakuSettings}
        isOpen={isDanmakuControlsOpen}
        onClose={toggleDanmakuControls}
      />

      {/* 引用到广场弹窗 */}
      <AnimatePresence>
        {isQuoteModalOpen && quotedParagraph && (
          <QuoteModal
            paragraph={quotedParagraph}
            onClose={closeQuoteModal}
          />
        )}
      </AnimatePresence>

      {/* 弹幕开关按钮 */}
      <button
        onClick={toggleDanmakuControls}
        className={cn(
          'fixed bottom-20 right-4 z-40',
          'flex h-10 w-10 items-center justify-center rounded-full',
          'bg-card/90 backdrop-blur-sm shadow-lg',
          'border border-border',
          'transition-colors hover:bg-muted',
          danmakuSettings.enabled ? 'text-primary' : 'text-muted-foreground'
        )}
        title={danmakuSettings.enabled ? '弹幕设置' : '开启弹幕'}
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    </div>
  );
}

/** 加载骨架屏 */
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
