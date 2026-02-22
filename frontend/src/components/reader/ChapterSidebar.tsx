'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import Link from 'next/link';
import { X, BookOpen, Check } from 'lucide-react';
import { getChapterList } from '@/services/reader';
import { cn } from '@/utils/cn';

interface ChapterSidebarProps {
  workId: string;
  currentChapterId: string;
  onClose: () => void;
}

/**
 * 章节导航侧边栏
 *
 * 需求4验收标准12: WHEN 用户查看章节目录 THEN System SHALL 显示侧边栏目录并支持快速跳转
 * 任务4.2.5: 章节导航侧边栏
 */
export function ChapterSidebar({ workId, currentChapterId, onClose }: ChapterSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const currentChapterRef = useRef<HTMLAnchorElement>(null);

  // 获取章节列表
  const { data, isLoading } = useQuery({
    queryKey: ['chapterList', workId],
    queryFn: () => getChapterList(workId),
    staleTime: 5 * 60 * 1000,
  });

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // ESC 键关闭
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 滚动到当前章节
  useEffect(() => {
    if (currentChapterRef.current) {
      currentChapterRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [data]);

  return (
    <motion.div
      ref={sidebarRef}
      initial={{ x: '-100%' }}
      animate={{ x: 0 }}
      exit={{ x: '-100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed bottom-0 left-0 top-0 z-50 w-80',
        'bg-card/95 backdrop-blur-lg',
        'border-r border-border shadow-lg',
        'flex flex-col'
      )}
      data-interactive
    >
      {/* 头部 */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">章节目录</h2>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* 作品信息 */}
      {data && (
        <div className="bg-muted/50 border-b border-border px-4 py-3">
          <h3 className="truncate font-medium text-foreground">{data.workTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">共 {data.totalChapters} 章</p>
        </div>
      )}

      {/* 章节列表 */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <ChapterListSkeleton />
        ) : data?.chapters ? (
          <ul className="py-2">
            {data.chapters.map((chapter) => {
              const isCurrent = chapter.id === currentChapterId;
              return (
                <li key={chapter.id}>
                  <Link
                    ref={isCurrent ? currentChapterRef : null}
                    href={`/read/${workId}/${chapter.id}`}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3',
                      'transition-colors hover:bg-muted',
                      isCurrent && 'bg-primary/10'
                    )}
                  >
                    {/* 章节序号 */}
                    <span
                      className={cn(
                        'h-8 w-8 flex-shrink-0 rounded-full',
                        'flex items-center justify-center text-sm',
                        isCurrent ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {isCurrent ? <Check className="h-4 w-4" /> : chapter.orderIndex}
                    </span>

                    {/* 章节信息 */}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'truncate',
                          isCurrent ? 'font-medium text-primary' : 'text-foreground'
                        )}
                      >
                        {chapter.title}
                      </p>
                      {chapter.wordCount && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatWordCount(chapter.wordCount)}
                        </p>
                      )}
                    </div>

                    {/* 状态标记 */}
                    {chapter.status === 'DRAFT' && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                        草稿
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            暂无章节
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ChapterListSkeleton() {
  return (
    <div className="space-y-1 py-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatWordCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万字`;
  }
  return `${count}字`;
}
