'use client';

import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  List,
  Settings,
  Maximize,
  Minimize,
  BookOpen,
  Columns2,
  ScrollText,
  FlipHorizontal,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MangaReadingMode, WorkBrief } from '@/types/reader';

interface MangaToolbarProps {
  work?: WorkBrief;
  chapter?: { id: string; title: string; orderIndex: number };
  currentPage: number;
  totalPages: number;
  readingMode: MangaReadingMode;
  isFullscreen: boolean;
  onToggleChapterList: () => void;
  onToggleSettings: () => void;
  onToggleFullscreen: () => void;
  onReadingModeChange: (mode: MangaReadingMode) => void;
}

/**
 * 漫画阅读器工具栏
 *
 * 任务4.3.1: 漫画阅读器页面布局
 */
export function MangaToolbar({
  work,
  chapter,
  currentPage,
  totalPages,
  readingMode,
  isFullscreen,
  onToggleChapterList,
  onToggleSettings,
  onToggleFullscreen,
  onReadingModeChange,
}: MangaToolbarProps) {
  const router = useRouter();

  const readingModes: { mode: MangaReadingMode; icon: React.ReactNode; label: string }[] = [
    { mode: 'scroll', icon: <ScrollText className="h-4 w-4" />, label: '滚动' },
    { mode: 'single', icon: <BookOpen className="h-4 w-4" />, label: '单页' },
    { mode: 'double', icon: <Columns2 className="h-4 w-4" />, label: '双页' },
    { mode: 'rtl-double', icon: <FlipHorizontal className="h-4 w-4" />, label: 'RTL双页' },
  ];

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed left-0 right-0 top-0 z-50',
        'bg-gradient-to-b from-black/90 via-black/70 to-transparent',
        'px-4 pb-12 pt-4'
      )}
      data-interactive
    >
      <div className="flex items-center justify-between">
        {/* 左侧：返回和标题 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className={cn(
              'rounded-full p-2',
              'bg-white/10 backdrop-blur-sm',
              'transition-colors hover:bg-white/20'
            )}
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <div className="max-w-[200px] truncate">
            <h1 className="truncate text-sm font-medium text-white">
              {work?.title || '加载中...'}
            </h1>
            <p className="truncate text-xs text-white/60">
              {chapter?.title || `第 ${chapter?.orderIndex || 0} 话`}
            </p>
          </div>
        </div>

        {/* 中间：页码 */}
        <div className="hidden text-sm text-white/80 sm:block">
          {currentPage} / {totalPages}
        </div>

        {/* 右侧：工具按钮 */}
        <div className="flex items-center gap-2">
          {/* 阅读模式切换 */}
          <div className="hidden items-center gap-1 rounded-full bg-white/10 p-1 backdrop-blur-sm sm:flex">
            {readingModes.map(({ mode, icon, label }) => (
              <button
                key={mode}
                onClick={() => onReadingModeChange(mode)}
                title={label}
                className={cn(
                  'rounded-full p-2 transition-colors',
                  readingMode === mode
                    ? 'bg-white/30 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                )}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* 章节目录 */}
          <ToolbarButton onClick={onToggleChapterList} title="章节目录">
            <List className="h-5 w-5" />
          </ToolbarButton>

          {/* 设置 */}
          <ToolbarButton onClick={onToggleSettings} title="设置">
            <Settings className="h-5 w-5" />
          </ToolbarButton>

          {/* 全屏 */}
          <ToolbarButton onClick={onToggleFullscreen} title={isFullscreen ? '退出全屏' : '全屏'}>
            {isFullscreen ? (
              <Minimize className="h-5 w-5" />
            ) : (
              <Maximize className="h-5 w-5" />
            )}
          </ToolbarButton>
        </div>
      </div>

      {/* 移动端阅读模式切换 */}
      <div className="mt-3 flex items-center justify-center gap-1 sm:hidden">
        {readingModes.map(({ mode, icon, label }) => (
          <button
            key={mode}
            onClick={() => onReadingModeChange(mode)}
            className={cn(
              'flex items-center gap-1 rounded-full px-3 py-1.5 text-xs transition-colors',
              readingMode === mode
                ? 'bg-white/30 text-white'
                : 'bg-white/10 text-white/60'
            )}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function ToolbarButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'rounded-full p-2',
        'bg-white/10 backdrop-blur-sm',
        'text-white transition-colors hover:bg-white/20'
      )}
    >
      {children}
    </button>
  );
}
