'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { X, Minus, Plus, RotateCcw } from 'lucide-react';
import { useReadingStore } from '@/store/reading';
import { cn } from '@/utils/cn';
import { MIN_FONT_SIZE, MAX_FONT_SIZE, MIN_LINE_HEIGHT, MAX_LINE_HEIGHT } from '@/constants';

interface SettingsPanelProps {
  onClose: () => void;
}

/**
 * 阅读设置面板
 *
 * 需求4验收标准4: WHEN 用户调整阅读设置 THEN System SHALL 应用字体大小、行距、背景色等自定义配置
 * 任务4.2.3: 阅读设置面板（字体、行距、背景色）
 */
export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const {
    settings,
    setFontSize,
    setLineHeight,
    setFontFamily,
    setBackgroundColor,
    setReadingMode,
    setPageWidth,
    setParagraphSpacing,
    toggleParagraphNumbers,
    resetSettings,
  } = useReadingStore();

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
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

  const backgroundOptions = [
    { value: 'default', label: '默认', color: 'bg-background' },
    { value: 'sepia', label: '护眼', color: 'bg-amber-50' },
    { value: 'dark', label: '夜间', color: 'bg-slate-900' },
    { value: 'green', label: '绿色', color: 'bg-teal-50' },
  ] as const;

  const fontOptions = [
    { value: 'sans', label: '黑体' },
    { value: 'serif', label: '宋体' },
    { value: 'display', label: '艺术' },
  ] as const;

  const modeOptions = [
    { value: 'scroll', label: '滚动' },
    { value: 'page', label: '翻页' },
  ] as const;

  const widthOptions = [
    { value: 'narrow', label: '窄' },
    { value: 'medium', label: '中' },
    { value: 'wide', label: '宽' },
    { value: 'full', label: '全' },
  ] as const;

  return (
    <motion.div
      ref={panelRef}
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'fixed bottom-0 right-0 top-0 z-50 w-80',
        'bg-card/95 backdrop-blur-lg',
        'border-l border-border shadow-lg',
        'overflow-y-auto'
      )}
      data-interactive
    >
      {/* 头部 */}
      <div className="bg-card/95 sticky top-0 flex items-center justify-between border-b border-border p-4 backdrop-blur-lg">
        <h2 className="text-lg font-semibold text-foreground">阅读设置</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={resetSettings}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
            title="重置设置"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-foreground transition-colors hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="space-y-6 p-4">
        {/* 字体大小 */}
        <SettingSection title="字体大小">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setFontSize(settings.fontSize - 2)}
              disabled={settings.fontSize <= MIN_FONT_SIZE}
              className={cn(
                'rounded-lg border border-border p-2',
                'transition-colors hover:bg-muted',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-lg font-medium text-foreground">{settings.fontSize}px</span>
            <button
              onClick={() => setFontSize(settings.fontSize + 2)}
              disabled={settings.fontSize >= MAX_FONT_SIZE}
              className={cn(
                'rounded-lg border border-border p-2',
                'transition-colors hover:bg-muted',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input
            type="range"
            min={MIN_FONT_SIZE}
            max={MAX_FONT_SIZE}
            step={2}
            value={settings.fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </SettingSection>

        {/* 行距 */}
        <SettingSection title="行距">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setLineHeight(settings.lineHeight - 0.1)}
              disabled={settings.lineHeight <= MIN_LINE_HEIGHT}
              className={cn(
                'rounded-lg border border-border p-2',
                'transition-colors hover:bg-muted',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-lg font-medium text-foreground">
              {settings.lineHeight.toFixed(1)}
            </span>
            <button
              onClick={() => setLineHeight(settings.lineHeight + 0.1)}
              disabled={settings.lineHeight >= MAX_LINE_HEIGHT}
              className={cn(
                'rounded-lg border border-border p-2',
                'transition-colors hover:bg-muted',
                'disabled:cursor-not-allowed disabled:opacity-50'
              )}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <input
            type="range"
            min={MIN_LINE_HEIGHT}
            max={MAX_LINE_HEIGHT}
            step={0.1}
            value={settings.lineHeight}
            onChange={(e) => setLineHeight(Number(e.target.value))}
            className="mt-2 w-full accent-primary"
          />
        </SettingSection>

        {/* 段落间距 */}
        <SettingSection title="段落间距">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">紧凑</span>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.25}
              value={settings.paragraphSpacing}
              onChange={(e) => setParagraphSpacing(Number(e.target.value))}
              className="mx-4 flex-1 accent-primary"
            />
            <span className="text-sm text-muted-foreground">宽松</span>
          </div>
        </SettingSection>

        {/* 字体 */}
        <SettingSection title="字体">
          <div className="grid grid-cols-3 gap-2">
            {fontOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setFontFamily(option.value)}
                className={cn(
                  'rounded-lg border px-3 py-2 transition-colors',
                  settings.fontFamily === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:bg-muted'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </SettingSection>

        {/* 背景色 */}
        <SettingSection title="背景色">
          <div className="grid grid-cols-4 gap-2">
            {backgroundOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setBackgroundColor(option.value)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-lg border py-2 transition-colors',
                  settings.backgroundColor === option.value
                    ? 'border-primary'
                    : 'border-border hover:border-primary/50'
                )}
              >
                <div className={cn('h-8 w-8 rounded-full border border-border', option.color)} />
                <span className="text-xs text-muted-foreground">{option.label}</span>
              </button>
            ))}
          </div>
        </SettingSection>

        {/* 阅读模式 */}
        <SettingSection title="阅读模式">
          <div className="grid grid-cols-2 gap-2">
            {modeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setReadingMode(option.value)}
                className={cn(
                  'rounded-lg border px-3 py-2 transition-colors',
                  settings.readingMode === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:bg-muted'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </SettingSection>

        {/* 页面宽度 */}
        <SettingSection title="页面宽度">
          <div className="grid grid-cols-4 gap-2">
            {widthOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setPageWidth(option.value)}
                className={cn(
                  'rounded-lg border px-2 py-2 text-sm transition-colors',
                  settings.pageWidth === option.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:bg-muted'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </SettingSection>

        {/* 其他选项 */}
        <SettingSection title="其他">
          <label className="flex cursor-pointer items-center justify-between">
            <span className="text-foreground">显示段落序号</span>
            <input
              type="checkbox"
              checked={settings.showParagraphNumbers}
              onChange={toggleParagraphNumbers}
              className="h-5 w-5 rounded accent-primary"
            />
          </label>
        </SettingSection>
      </div>
    </motion.div>
  );
}

function SettingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}
