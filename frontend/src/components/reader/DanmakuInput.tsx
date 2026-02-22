'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, Palette, Type, AlignCenter, AlignLeft, AlignRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { DanmakuType, CreateDanmakuRequest } from '@/types/reader';

interface DanmakuInputProps {
  anchorId: string;
  isOpen: boolean;
  onClose: () => void;
  onSend: (data: CreateDanmakuRequest) => Promise<void>;
  maxLength?: number;
}

const PRESET_COLORS = [
  '#FFFFFF', // 白色
  '#FE0302', // 红色
  '#FF7204', // 橙色
  '#FFAA02', // 黄色
  '#FFD302', // 金色
  '#00CD00', // 绿色
  '#00A1D6', // 蓝色
  '#CC0273', // 粉色
];

const DANMAKU_TYPES: { value: DanmakuType; label: string; icon: React.ReactNode }[] = [
  { value: 'SCROLL', label: '滚动', icon: <AlignLeft className="h-4 w-4" /> },
  { value: 'TOP', label: '顶部', icon: <AlignCenter className="h-4 w-4" /> },
  { value: 'BOTTOM', label: '底部', icon: <AlignRight className="h-4 w-4" /> },
];

/**
 * 弹幕输入框组件
 *
 * 需求24.1: WHEN 用户在段落操作菜单中选择"发送弹幕" THEN System SHALL 显示弹幕输入框并限制内容在100字以内
 */
export function DanmakuInput({
  anchorId,
  isOpen,
  onClose,
  onSend,
  maxLength = 100,
}: DanmakuInputProps) {
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#FFFFFF');
  const [type, setType] = useState<DanmakuType>('SCROLL');
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时聚焦输入框
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // 关闭时重置状态
  useEffect(() => {
    if (!isOpen) {
      setContent('');
      setShowColorPicker(false);
      setShowTypePicker(false);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSend({
        anchorId,
        content: content.trim(),
        color,
        type,
      });
      setContent('');
      onClose();
    } catch (error) {
      console.error('Failed to send danmaku:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn('fixed bottom-4 left-1/2 z-50 -translate-x-1/2', 'w-full max-w-lg px-4')}
        >
          <div
            className={cn(
              'bg-card/95 rounded-2xl border border-border backdrop-blur-lg',
              'p-3 shadow-lg'
            )}
          >
            {/* 输入区域 */}
            <div className="flex items-center gap-2">
              {/* 颜色选择 */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowColorPicker(!showColorPicker);
                    setShowTypePicker(false);
                  }}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    'transition-colors hover:bg-muted'
                  )}
                  title="选择颜色"
                >
                  <Palette className="h-4 w-4" style={{ color }} />
                </button>

                {/* 颜色选择器 */}
                <AnimatePresence>
                  {showColorPicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        'absolute bottom-full left-0 mb-2',
                        'rounded-lg border border-border bg-card p-2 shadow-lg'
                      )}
                    >
                      <div className="grid grid-cols-4 gap-1">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              setColor(c);
                              setShowColorPicker(false);
                            }}
                            className={cn(
                              'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                              color === c ? 'border-primary' : 'border-transparent'
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 类型选择 */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowTypePicker(!showTypePicker);
                    setShowColorPicker(false);
                  }}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    'transition-colors hover:bg-muted'
                  )}
                  title="选择类型"
                >
                  <Type className="h-4 w-4" />
                </button>

                {/* 类型选择器 */}
                <AnimatePresence>
                  {showTypePicker && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className={cn(
                        'absolute bottom-full left-0 mb-2',
                        'rounded-lg border border-border bg-card p-2 shadow-lg'
                      )}
                    >
                      <div className="flex flex-col gap-1">
                        {DANMAKU_TYPES.map((t) => (
                          <button
                            key={t.value}
                            onClick={() => {
                              setType(t.value);
                              setShowTypePicker(false);
                            }}
                            className={cn(
                              'flex items-center gap-2 rounded-lg px-3 py-1.5',
                              'transition-colors hover:bg-muted',
                              type === t.value && 'bg-primary/10 text-primary'
                            )}
                          >
                            {t.icon}
                            <span className="text-sm">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 输入框 */}
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value.slice(0, maxLength))}
                  onKeyDown={handleKeyDown}
                  placeholder="发送弹幕..."
                  className={cn(
                    'w-full rounded-lg border border-border bg-background px-3 py-2',
                    'text-sm placeholder:text-muted-foreground',
                    'focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                  maxLength={maxLength}
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {content.length}/{maxLength}
                </span>
              </div>

              {/* 发送按钮 */}
              <button
                onClick={handleSend}
                disabled={!content.trim() || isSending}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  'text-primary-foreground bg-primary',
                  'transition-colors hover:bg-primary/90',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                <Send className="h-4 w-4" />
              </button>

              {/* 关闭按钮 */}
              <button
                onClick={onClose}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  'transition-colors hover:bg-muted'
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 预览 */}
            {content && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <span>预览:</span>
                <span
                  style={{
                    color,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                    fontWeight: 'bold',
                  }}
                >
                  {content}
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
