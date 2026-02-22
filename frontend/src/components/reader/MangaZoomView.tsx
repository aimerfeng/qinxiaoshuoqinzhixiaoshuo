'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSpring, animated, config } from '@react-spring/web';
import { useDrag, usePinch, useWheel } from '@use-gesture/react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/utils/cn';

interface MangaZoomViewProps {
  src: string;
  alt?: string;
  maxZoom?: number;
  minZoom?: number;
  className?: string;
  onZoomChange?: (zoom: number) => void;
}

/**
 * 漫画缩放视图组件
 * 支持双指缩放、滚轮缩放、双击缩放
 *
 * 任务4.3.5: 缩放手势支持
 *
 * 特性：
 * - 双指捏合缩放（移动端）
 * - 滚轮缩放（桌面端）
 * - 双击快速缩放
 * - 拖拽平移
 * - 缩放控制按钮
 * - 边界限制
 */
export function MangaZoomView({
  src,
  alt = '漫画页面',
  maxZoom = 3,
  minZoom = 1,
  className,
  onZoomChange,
}: MangaZoomViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // 动画状态
  const [{ scale, x, y }, api] = useSpring(() => ({
    scale: 1,
    x: 0,
    y: 0,
    config: config.gentle,
  }));

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

  // 图片加载完成后获取尺寸
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
  }, []);

  // 计算平移边界
  const getBounds = useCallback(
    (currentScale: number) => {
      if (!containerSize.width || !imageSize.width) {
        return { left: 0, right: 0, top: 0, bottom: 0 };
      }

      // 计算图片在容器中的实际尺寸
      const aspectRatio = imageSize.width / imageSize.height;
      let displayWidth: number;
      let displayHeight: number;

      if (containerSize.width / containerSize.height > aspectRatio) {
        displayHeight = containerSize.height;
        displayWidth = displayHeight * aspectRatio;
      } else {
        displayWidth = containerSize.width;
        displayHeight = displayWidth / aspectRatio;
      }

      // 缩放后的尺寸
      const scaledWidth = displayWidth * currentScale;
      const scaledHeight = displayHeight * currentScale;

      // 计算可移动范围
      const maxX = Math.max(0, (scaledWidth - containerSize.width) / 2);
      const maxY = Math.max(0, (scaledHeight - containerSize.height) / 2);

      return {
        left: -maxX,
        right: maxX,
        top: -maxY,
        bottom: maxY,
      };
    },
    [containerSize, imageSize]
  );

  // 限制值在范围内
  const clamp = (value: number, min: number, max: number) => {
    return Math.min(Math.max(value, min), max);
  };

  // 拖拽手势
  const bindDrag = useDrag(
    ({ offset: [ox, oy], memo = { scale: scale.get() } }) => {
      const currentScale = memo.scale;
      const bounds = getBounds(currentScale);

      api.start({
        x: clamp(ox, bounds.left, bounds.right),
        y: clamp(oy, bounds.top, bounds.bottom),
        immediate: true,
      });

      return memo;
    },
    {
      from: () => [x.get(), y.get()],
      enabled: scale.get() > 1,
    }
  );

  // 捏合缩放手势
  const bindPinch = usePinch(
    ({ offset: [s], memo }) => {
      const newScale = clamp(s, minZoom, maxZoom);

      // 计算缩放中心点偏移
      if (memo === undefined) {
        memo = { x: x.get(), y: y.get() };
      }

      const bounds = getBounds(newScale);

      api.start({
        scale: newScale,
        x: clamp(memo.x, bounds.left, bounds.right),
        y: clamp(memo.y, bounds.top, bounds.bottom),
      });

      onZoomChange?.(newScale);
      return memo;
    },
    {
      scaleBounds: { min: minZoom, max: maxZoom },
      rubberband: true,
    }
  );

  // 滚轮缩放
  const bindWheel = useWheel(
    ({ delta: [, dy], event }) => {
      event.preventDefault();

      const currentScale = scale.get();
      const zoomFactor = dy > 0 ? 0.9 : 1.1;
      const newScale = clamp(currentScale * zoomFactor, minZoom, maxZoom);

      const bounds = getBounds(newScale);

      api.start({
        scale: newScale,
        x: clamp(x.get(), bounds.left, bounds.right),
        y: clamp(y.get(), bounds.top, bounds.bottom),
      });

      onZoomChange?.(newScale);
    },
    {
      eventOptions: { passive: false },
    }
  );

  // 双击缩放
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      const currentScale = scale.get();
      const newScale = currentScale > 1 ? 1 : 2;

      if (newScale === 1) {
        // 重置位置
        api.start({ scale: 1, x: 0, y: 0 });
      } else {
        // 以点击位置为中心放大
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const clickX = e.clientX - rect.left - rect.width / 2;
          const clickY = e.clientY - rect.top - rect.height / 2;

          const bounds = getBounds(newScale);
          api.start({
            scale: newScale,
            x: clamp(-clickX, bounds.left, bounds.right),
            y: clamp(-clickY, bounds.top, bounds.bottom),
          });
        }
      }

      onZoomChange?.(newScale);
    },
    [api, scale, getBounds, onZoomChange]
  );

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    const currentScale = scale.get();
    const newScale = clamp(currentScale + 0.5, minZoom, maxZoom);
    const bounds = getBounds(newScale);

    api.start({
      scale: newScale,
      x: clamp(x.get(), bounds.left, bounds.right),
      y: clamp(y.get(), bounds.top, bounds.bottom),
    });

    onZoomChange?.(newScale);
  }, [api, scale, x, y, minZoom, maxZoom, getBounds, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    const currentScale = scale.get();
    const newScale = clamp(currentScale - 0.5, minZoom, maxZoom);
    const bounds = getBounds(newScale);

    api.start({
      scale: newScale,
      x: clamp(x.get(), bounds.left, bounds.right),
      y: clamp(y.get(), bounds.top, bounds.bottom),
    });

    onZoomChange?.(newScale);
  }, [api, scale, x, y, minZoom, maxZoom, getBounds, onZoomChange]);

  const handleReset = useCallback(() => {
    api.start({ scale: 1, x: 0, y: 0 });
    onZoomChange?.(1);
  }, [api, onZoomChange]);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden touch-none',
        className
      )}
      {...bindDrag()}
      {...bindPinch()}
      {...bindWheel()}
      onDoubleClick={handleDoubleClick}
    >
      <animated.div
        style={{
          scale,
          x,
          y,
          touchAction: 'none',
        }}
        className="flex h-full w-full items-center justify-center"
      >
        <img
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          className="max-h-full max-w-full object-contain select-none"
          draggable={false}
        />
      </animated.div>

      {/* 缩放控制按钮 */}
      <ZoomControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        currentZoom={scale.get()}
        minZoom={minZoom}
        maxZoom={maxZoom}
      />
    </div>
  );
}

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  currentZoom: number;
  minZoom: number;
  maxZoom: number;
}

/**
 * 缩放控制按钮组
 */
function ZoomControls({
  onZoomIn,
  onZoomOut,
  onReset,
  currentZoom,
  minZoom,
  maxZoom,
}: ZoomControlsProps) {
  return (
    <div
      className={cn(
        'absolute bottom-4 right-4 z-10',
        'flex items-center gap-1',
        'rounded-full bg-black/50 p-1 backdrop-blur-sm'
      )}
      data-interactive
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onZoomOut();
        }}
        disabled={currentZoom <= minZoom}
        className={cn(
          'rounded-full p-2 text-white transition-colors',
          'hover:bg-white/20',
          'disabled:opacity-30 disabled:cursor-not-allowed'
        )}
        title="缩小"
      >
        <ZoomOut className="h-4 w-4" />
      </button>

      <span className="min-w-[3rem] text-center text-xs text-white">
        {Math.round(currentZoom * 100)}%
      </span>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onZoomIn();
        }}
        disabled={currentZoom >= maxZoom}
        className={cn(
          'rounded-full p-2 text-white transition-colors',
          'hover:bg-white/20',
          'disabled:opacity-30 disabled:cursor-not-allowed'
        )}
        title="放大"
      >
        <ZoomIn className="h-4 w-4" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onReset();
        }}
        disabled={currentZoom === 1}
        className={cn(
          'rounded-full p-2 text-white transition-colors',
          'hover:bg-white/20',
          'disabled:opacity-30 disabled:cursor-not-allowed'
        )}
        title="重置"
      >
        <RotateCcw className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * 缩放手势 Hook
 * 用于在其他组件中添加缩放功能
 */
export function useZoomGesture(options: {
  minZoom?: number;
  maxZoom?: number;
  onZoomChange?: (zoom: number) => void;
} = {}) {
  const { minZoom = 1, maxZoom = 3, onZoomChange } = options;

  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.min(prev + 0.5, maxZoom);
      onZoomChange?.(newZoom);
      return newZoom;
    });
  }, [maxZoom, onZoomChange]);

  const zoomOut = useCallback(() => {
    setZoom((prev) => {
      const newZoom = Math.max(prev - 0.5, minZoom);
      onZoomChange?.(newZoom);
      return newZoom;
    });
  }, [minZoom, onZoomChange]);

  const reset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    onZoomChange?.(1);
  }, [onZoomChange]);

  const setZoomLevel = useCallback(
    (level: number) => {
      const newZoom = Math.min(Math.max(level, minZoom), maxZoom);
      setZoom(newZoom);
      onZoomChange?.(newZoom);
    },
    [minZoom, maxZoom, onZoomChange]
  );

  const updatePosition = useCallback((newPosition: { x: number; y: number }) => {
    setPosition(newPosition);
  }, []);

  return {
    zoom,
    position,
    setPosition: updatePosition,
    zoomIn,
    zoomOut,
    reset,
    setZoomLevel,
    isZoomed: zoom > 1,
  };
}
