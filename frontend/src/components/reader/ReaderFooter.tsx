'use client';

import { motion } from 'motion/react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BottomProgressIndicator } from './ProgressBar';
import { cn } from '@/utils/cn';
import type { ChapterBrief } from '@/types/reader';

interface ReaderFooterProps {
  prevChapter: ChapterBrief | null;
  nextChapter: ChapterBrief | null;
  workId: string;
  currentProgress: number;
  onNavigate?: (direction: 'next' | 'prev') => void;
}

/**
 * 阅读器底部导航栏
 *
 * 需求4验收标准6: WHEN 用户切换章节 THEN System SHALL 平滑过渡并保持阅读设置
 */
export function ReaderFooter({
  prevChapter,
  nextChapter,
  workId,
  currentProgress,
}: ReaderFooterProps) {
  return (
    <motion.footer
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-card/80 border-border/50 border-t backdrop-blur-lg',
        'safe-bottom'
      )}
    >
      <div className="mx-auto max-w-4xl px-4 py-3">
        {/* 进度条 */}
        <div className="mb-3">
          <BottomProgressIndicator progress={currentProgress} />
        </div>

        {/* 章节导航 */}
        <div className="flex items-center justify-between gap-4">
          {/* 上一章 */}
          {prevChapter ? (
            <Link
              href={`/read/${workId}/${prevChapter.id}`}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2',
                'hover:bg-muted/80 bg-muted transition-colors',
                'min-w-0 flex-1 text-foreground'
              )}
            >
              <ChevronLeft className="h-5 w-5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">上一章</p>
                <p className="truncate text-sm">{prevChapter.title}</p>
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}

          {/* 下一章 */}
          {nextChapter ? (
            <Link
              href={`/read/${workId}/${nextChapter.id}`}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2',
                'bg-primary transition-colors hover:bg-primary/90',
                'min-w-0 flex-1 text-white',
                'justify-end text-right'
              )}
            >
              <div className="min-w-0">
                <p className="text-xs text-white/80">下一章</p>
                <p className="truncate text-sm">{nextChapter.title}</p>
              </div>
              <ChevronRight className="h-5 w-5 flex-shrink-0" />
            </Link>
          ) : (
            <div
              className={cn(
                'flex items-center justify-center rounded-lg px-4 py-2',
                'bg-muted text-muted-foreground',
                'flex-1'
              )}
            >
              <span className="text-sm">已是最新章节</span>
            </div>
          )}
        </div>
      </div>
    </motion.footer>
  );
}
