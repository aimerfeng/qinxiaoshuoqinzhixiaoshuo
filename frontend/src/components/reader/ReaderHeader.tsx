'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { ChevronLeft, List, Settings, Moon, Sun } from 'lucide-react';
import { useReadingStore } from '@/store/reading';
import { cn } from '@/utils/cn';
import type { WorkBrief } from '@/types/reader';

interface ReaderHeaderProps {
  work?: WorkBrief;
  chapter?: {
    id: string;
    title: string;
    orderIndex: number;
  };
  onToggleChapterList: () => void;
  onToggleSettings: () => void;
}

/**
 * 阅读器顶部导航栏
 *
 * 需求4验收标准1: WHEN 用户进入 Reader THEN System SHALL 隐藏非必要UI元素并全屏展示内容
 */
export function ReaderHeader({
  work,
  chapter,
  onToggleChapterList,
  onToggleSettings,
}: ReaderHeaderProps) {
  const { settings, toggleNightMode } = useReadingStore();

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed left-0 right-0 top-0 z-50',
        'bg-background/80 border-border/50 border-b backdrop-blur-lg',
        'safe-top'
      )}
    >
      <div className="flex h-14 items-center justify-between px-4">
        {/* 左侧：返回按钮和作品信息 */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href={work ? `/works/${work.id}` : '/'}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              'transition-colors hover:bg-muted',
              'text-foreground'
            )}
            aria-label="返回"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-medium text-foreground">
              {work?.title || '加载中...'}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {chapter ? `第${chapter.orderIndex}章 ${chapter.title}` : ''}
            </p>
          </div>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-1">
          {/* 章节目录按钮 */}
          <button
            onClick={onToggleChapterList}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              'transition-colors hover:bg-muted',
              'text-foreground'
            )}
            aria-label="章节目录"
            data-interactive
          >
            <List className="h-5 w-5" />
          </button>

          {/* 夜间模式切换 */}
          <button
            onClick={toggleNightMode}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              'transition-colors hover:bg-muted',
              'text-foreground'
            )}
            aria-label={settings.nightMode ? '关闭夜间模式' : '开启夜间模式'}
            data-interactive
          >
            {settings.nightMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          {/* 设置按钮 */}
          <button
            onClick={onToggleSettings}
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg',
              'transition-colors hover:bg-muted',
              'text-foreground'
            )}
            aria-label="阅读设置"
            data-interactive
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>
    </motion.header>
  );
}
