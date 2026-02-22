'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'motion/react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { LightboxImage } from '@/types/reader';

interface LightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 插图 Lightbox 组件
 * Motion 驱动，支持手势缩放和滑动关闭
 *
 * 需求25验收标准1-5: Lightbox 交互
 * 任务4.2.10: 插图 Lightbox（Motion 驱动，手势缩放/滑动关闭）
 */
export function Lightbox({ images, initialIndex = 0, isOpen, onClose }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion values for drag
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-200, 0, 200], [0.5, 1, 0.5]);
  const backgroundOpacity = useTransform(y, [-200, 0, 200], [0.3, 0.9, 0.3]);

  // 重置状态
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setScale(1);
      setRotation(0);
      y.set(0);
    }
  }, [isOpen, initialIndex, y]);

  // 图片导航
  const navigateImage = useCallback(
    (direction: 'prev' | 'next') => {
      setScale(1);
      setRotation(0);

      if (direction === 'prev' && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (direction === 'next' && currentIndex < images.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    },
    [currentIndex, images.length]
  );

  // 缩放
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setScale((prev) => {
      if (direction === 'in') {
        return Math.min(prev + 0.5, 4);
      } else {
        return Math.max(prev - 0.5, 0.5);
      }
    });
  }, []);

  // 旋转
  const handleRotate = useCallback(() => {
    setRotation((prev) => (prev + 90) % 360);
  }, []);

  // 键盘导航
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigateImage('prev');
          break;
        case 'ArrowRight':
          navigateImage('next');
          break;
        case '+':
        case '=':
          handleZoom('in');
          break;
        case '-':
          handleZoom('out');
          break;
        case 'r':
          handleRotate();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, navigateImage, handleZoom, handleRotate]);

  // 拖拽结束处理
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      // 如果向下拖拽超过阈值，关闭 Lightbox
      if (Math.abs(info.offset.y) > 100 && Math.abs(info.velocity.y) > 100) {
        onClose();
      } else {
        // 回弹
        y.set(0);
      }
    },
    [onClose, y]
  );

  // 双击缩放
  const handleDoubleClick = useCallback(() => {
    setScale((prev) => (prev === 1 ? 2 : 1));
  }, []);

  // 点击背景关闭
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  const currentImage = images[currentIndex];

  return (
    <AnimatePresence>
      {isOpen && currentImage && (
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={handleBackgroundClick}
        >
          {/* 背景遮罩 */}
          <motion.div
            className="absolute inset-0 bg-black"
            style={{ opacity: backgroundOpacity }}
          />

          {/* 工具栏 */}
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className={cn(
              'absolute left-0 right-0 top-0 z-10',
              'flex items-center justify-between p-4',
              'bg-gradient-to-b from-black/50 to-transparent'
            )}
          >
            {/* 图片计数 */}
            <div className="text-sm text-white">
              {currentIndex + 1} / {images.length}
            </div>

            {/* 工具按钮 */}
            <div className="flex items-center gap-2">
              <ToolButton onClick={() => handleZoom('out')} title="缩小">
                <ZoomOut className="h-5 w-5" />
              </ToolButton>
              <span className="min-w-[3rem] text-center text-sm text-white">
                {Math.round(scale * 100)}%
              </span>
              <ToolButton onClick={() => handleZoom('in')} title="放大">
                <ZoomIn className="h-5 w-5" />
              </ToolButton>
              <ToolButton onClick={handleRotate} title="旋转">
                <RotateCw className="h-5 w-5" />
              </ToolButton>
              <ToolButton onClick={onClose} title="关闭">
                <X className="h-5 w-5" />
              </ToolButton>
            </div>
          </motion.div>

          {/* 图片容器 */}
          <motion.div
            drag={scale === 1 ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ y, opacity }}
            className="relative z-0 max-h-[90vh] max-w-[90vw]"
          >
            <motion.img
              key={currentIndex}
              src={currentImage.src}
              alt={currentImage.alt || '插图'}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{
                scale: scale,
                opacity: 1,
                rotate: rotation,
              }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onDoubleClick={handleDoubleClick}
              className={cn(
                'max-h-[90vh] max-w-full object-contain',
                'cursor-grab active:cursor-grabbing',
                'select-none'
              )}
              draggable={false}
            />
          </motion.div>

          {/* 左右导航按钮 */}
          {images.length > 1 && (
            <>
              <NavButton
                direction="prev"
                disabled={currentIndex === 0}
                onClick={() => navigateImage('prev')}
              />
              <NavButton
                direction="next"
                disabled={currentIndex === images.length - 1}
                onClick={() => navigateImage('next')}
              />
            </>
          )}

          {/* 缩略图导航 */}
          {images.length > 1 && (
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className={cn(
                'absolute bottom-0 left-0 right-0 z-10',
                'flex items-center justify-center gap-2 p-4',
                'bg-gradient-to-t from-black/50 to-transparent'
              )}
            >
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentIndex(index);
                    setScale(1);
                    setRotation(0);
                  }}
                  className={cn(
                    'h-12 w-12 overflow-hidden rounded-lg border-2 transition-all',
                    index === currentIndex
                      ? 'scale-110 border-white'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <img src={img.src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ToolButton({
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
        'rounded-lg p-2',
        'bg-white/10 transition-colors hover:bg-white/20',
        'text-white'
      )}
    >
      {children}
    </button>
  );
}

function NavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'prev' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'absolute top-1/2 z-10 -translate-y-1/2',
        'rounded-full p-3',
        'bg-white/10 transition-colors hover:bg-white/20',
        'text-white',
        'disabled:cursor-not-allowed disabled:opacity-30',
        direction === 'prev' ? 'left-4' : 'right-4'
      )}
    >
      {direction === 'prev' ? (
        <ChevronLeft className="h-6 w-6" />
      ) : (
        <ChevronRight className="h-6 w-6" />
      )}
    </button>
  );
}

/**
 * Lightbox Hook
 * 用于管理 Lightbox 状态
 */
export function useLightbox() {
  const [state, setState] = useState<{
    isOpen: boolean;
    images: LightboxImage[];
    initialIndex: number;
  }>({
    isOpen: false,
    images: [],
    initialIndex: 0,
  });

  const open = useCallback((images: LightboxImage[], initialIndex = 0) => {
    setState({ isOpen: true, images, initialIndex });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    ...state,
    open,
    close,
  };
}
