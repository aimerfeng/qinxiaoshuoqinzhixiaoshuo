'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpring, animated, config } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { cn } from '@/utils/cn';

interface PageFlipProps {
  children: React.ReactNode[];
  currentPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * 翻页模式组件
 * 使用 react-spring 实现物理弹性翻页动画
 *
 * 需求4验收标准10: WHEN 用户使用翻页模式 THEN System SHALL 支持左右滑动或点击翻页，并使用物理弹性动画提供自然翻页手感
 * 任务4.2.8: 翻页模式支持（react-spring 物理弹性翻页动画）
 */
export function PageFlip({ children, currentPage, onPageChange, className }: PageFlipProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // 更新容器宽度
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // 翻页动画
  const [{ x }, api] = useSpring(() => ({
    x: 0,
    config: {
      ...config.gentle,
      tension: 200,
      friction: 26,
    },
  }));

  // 更新页面位置
  useEffect(() => {
    api.start({ x: -currentPage * containerWidth });
  }, [currentPage, containerWidth, api]);

  // 拖拽手势
  const bind = useDrag(
    ({ active, movement: [mx], direction: [xDir] }) => {
      // 如果拖拽距离超过阈值，触发翻页
      const threshold = containerWidth * 0.2;

      if (active) {
        // 拖拽中，跟随手指
        api.start({
          x: -currentPage * containerWidth + mx,
          immediate: true,
        });
      } else {
        // 拖拽结束，判断是否翻页
        if (Math.abs(mx) > threshold) {
          const newPage =
            xDir > 0
              ? Math.max(0, currentPage - 1)
              : Math.min(children.length - 1, currentPage + 1);

          if (newPage !== currentPage) {
            onPageChange(newPage);
          }
        }

        // 回弹到当前页
        api.start({ x: -currentPage * containerWidth });
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      rubberband: true,
      bounds: {
        left: -(children.length - 1) * containerWidth,
        right: 0,
      },
    }
  );

  // 点击翻页
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickZone = clickX / rect.width;

      // 左侧 30% 区域点击上一页
      if (clickZone < 0.3 && currentPage > 0) {
        onPageChange(currentPage - 1);
      }
      // 右侧 30% 区域点击下一页
      else if (clickZone > 0.7 && currentPage < children.length - 1) {
        onPageChange(currentPage + 1);
      }
    },
    [currentPage, children.length, onPageChange]
  );

  return (
    <div
      ref={containerRef}
      className={cn('relative touch-pan-y overflow-hidden', className)}
      onClick={handleClick}
      {...bind()}
    >
      <animated.div
        className="flex"
        style={{
          x,
          width: `${children.length * 100}%`,
        }}
      >
        {children.map((child, index) => (
          <div key={index} className="flex-shrink-0" style={{ width: containerWidth || '100%' }}>
            {child}
          </div>
        ))}
      </animated.div>

      {/* 翻页指示器 */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {children.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              onPageChange(index);
            }}
            className={cn(
              'h-2 w-2 rounded-full transition-all',
              index === currentPage
                ? 'w-6 bg-primary'
                : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
            )}
            aria-label={`跳转到第 ${index + 1} 页`}
          />
        ))}
      </div>

      {/* 翻页提示区域 */}
      <div className="absolute inset-y-0 left-0 w-1/4 cursor-w-resize opacity-0 transition-opacity hover:opacity-100">
        <div className="absolute inset-y-0 left-4 flex items-center">
          <div className="rounded-full bg-black/20 p-2 text-white">←</div>
        </div>
      </div>
      <div className="absolute inset-y-0 right-0 w-1/4 cursor-e-resize opacity-0 transition-opacity hover:opacity-100">
        <div className="absolute inset-y-0 right-4 flex items-center">
          <div className="rounded-full bg-black/20 p-2 text-white">→</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 简单的翻页容器
 * 用于将内容分页显示
 */
export function PageContainer({
  content,
  pageHeight,
  className,
}: {
  content: React.ReactNode;
  pageHeight: number;
  className?: string;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<React.ReactNode[]>([]);
  const [currentPage, setCurrentPage] = useState(0);

  // 计算分页
  useEffect(() => {
    if (!contentRef.current) return;

    const contentHeight = contentRef.current.scrollHeight;
    const pageCount = Math.ceil(contentHeight / pageHeight);

    // 创建分页视图
    const newPages = Array.from({ length: pageCount }, (_, i) => (
      <div key={i} className="overflow-hidden" style={{ height: pageHeight }}>
        <div
          style={{
            transform: `translateY(-${i * pageHeight}px)`,
          }}
        >
          {content}
        </div>
      </div>
    ));

    setPages(newPages);
  }, [content, pageHeight]);

  return (
    <div className={className}>
      {/* 隐藏的内容用于计算高度 */}
      <div ref={contentRef} className="pointer-events-none absolute opacity-0">
        {content}
      </div>

      {/* 分页显示 */}
      {pages.length > 0 && (
        <PageFlip currentPage={currentPage} onPageChange={setCurrentPage} className="h-full">
          {pages}
        </PageFlip>
      )}
    </div>
  );
}
