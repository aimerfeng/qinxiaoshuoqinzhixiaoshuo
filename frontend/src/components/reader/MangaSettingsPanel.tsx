'use client';

import { motion } from 'motion/react';
import { X, ScrollText, BookOpen, Columns2, FlipHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { MangaReaderSettings, MangaReadingMode } from '@/types/reader';

interface MangaSettingsPanelProps {
  settings: MangaReaderSettings;
  onSettingsChange: (updates: Partial<MangaReaderSettings>) => void;
  onClose: () => void;
}

/**
 * 漫画阅读器设置面板
 *
 * 任务4.3.6: 章节切换（设置面板部分）
 *
 * 设置项：
 * - 阅读模式（滚动/单页/双页/RTL双页）
 * - 适应模式（宽度/高度/包含/原始）
 * - 背景颜色
 * - 页码显示
 * - 预加载数量
 * - 页面间距
 * - 缩放设置
 */
export function MangaSettingsPanel({
  settings,
  onSettingsChange,
  onClose,
}: MangaSettingsPanelProps) {
  const readingModes: { mode: MangaReadingMode; icon: React.ReactNode; label: string; desc: string }[] = [
    { mode: 'scroll', icon: <ScrollText className="h-5 w-5" />, label: '滚动模式', desc: 'Webtoon 长条漫画' },
    { mode: 'single', icon: <BookOpen className="h-5 w-5" />, label: '单页模式', desc: '一次显示一页' },
    { mode: 'double', icon: <Columns2 className="h-5 w-5" />, label: '双页模式', desc: '左右两页并排' },
    { mode: 'rtl-double', icon: <FlipHorizontal className="h-5 w-5" />, label: 'RTL 双页', desc: '从右到左阅读（日漫）' },
  ];

  const fitModes: { value: MangaReaderSettings['fitMode']; label: string }[] = [
    { value: 'width', label: '适应宽度' },
    { value: 'height', label: '适应高度' },
    { value: 'contain', label: '完整显示' },
    { value: 'original', label: '原始尺寸' },
  ];

  const bgColors: { value: MangaReaderSettings['backgroundColor']; label: string; color: string }[] = [
    { value: 'black', label: '黑色', color: 'bg-black' },
    { value: 'white', label: '白色', color: 'bg-white' },
    { value: 'gray', label: '灰色', color: 'bg-neutral-800' },
  ];

  return (
    <>
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
      />

      {/* 设置面板 */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50',
          'w-full max-w-sm',
          'bg-neutral-900 text-white',
          'overflow-y-auto'
        )}
        data-interactive
      >
        {/* 头部 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-neutral-900 p-4">
          <h2 className="text-lg font-semibold">阅读设置</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-4">
          {/* 阅读模式 */}
          <section>
            <h3 className="mb-3 text-sm font-medium text-white/70">阅读模式</h3>
            <div className="grid grid-cols-2 gap-2">
              {readingModes.map(({ mode, icon, label, desc }) => (
                <button
                  key={mode}
                  onClick={() => onSettingsChange({ readingMode: mode })}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl p-4 transition-colors',
                    settings.readingMode === mode
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-white/5 hover:bg-white/10'
                  )}
                >
                  {icon}
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs text-white/50">{desc}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 适应模式 */}
          <section>
            <h3 className="mb-3 text-sm font-medium text-white/70">适应模式</h3>
            <div className="flex flex-wrap gap-2">
              {fitModes.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => onSettingsChange({ fitMode: value })}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm transition-colors',
                    settings.fitMode === value
                      ? 'bg-primary text-white'
                      : 'bg-white/10 hover:bg-white/20'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* 背景颜色 */}
          <section>
            <h3 className="mb-3 text-sm font-medium text-white/70">背景颜色</h3>
            <div className="flex gap-3">
              {bgColors.map(({ value, label, color }) => (
                <button
                  key={value}
                  onClick={() => onSettingsChange({ backgroundColor: value })}
                  className={cn(
                    'flex flex-col items-center gap-2'
                  )}
                >
                  <div
                    className={cn(
                      'h-10 w-10 rounded-full border-2 transition-all',
                      color,
                      settings.backgroundColor === value
                        ? 'border-primary scale-110'
                        : 'border-white/20'
                    )}
                  />
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 页码显示 */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">显示页码</h3>
                <p className="text-xs text-white/50">在页面角落显示当前页码</p>
              </div>
              <ToggleSwitch
                checked={settings.showPageNumbers}
                onChange={(checked) => onSettingsChange({ showPageNumbers: checked })}
              />
            </div>
          </section>

          {/* 预加载设置 */}
          <section>
            <h3 className="mb-3 text-sm font-medium text-white/70">预加载设置</h3>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">向前预加载</span>
                  <span className="text-sm text-white/50">{settings.preloadAhead} 页</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={settings.preloadAhead}
                  onChange={(e) => onSettingsChange({ preloadAhead: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">向后保留</span>
                  <span className="text-sm text-white/50">{settings.preloadBehind} 页</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={settings.preloadBehind}
                  onChange={(e) => onSettingsChange({ preloadBehind: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          </section>

          {/* 页面间距（仅滚动模式） */}
          {settings.readingMode === 'scroll' && (
            <section>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">页面间距</span>
                <span className="text-sm text-white/50">{settings.gapBetweenPages}px</span>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={settings.gapBetweenPages}
                onChange={(e) => onSettingsChange({ gapBetweenPages: Number(e.target.value) })}
                className="w-full"
              />
            </section>
          )}

          {/* 缩放设置 */}
          <section>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium">启用缩放</h3>
                <p className="text-xs text-white/50">双指捏合或滚轮缩放</p>
              </div>
              <ToggleSwitch
                checked={settings.enableZoom}
                onChange={(checked) => onSettingsChange({ enableZoom: checked })}
              />
            </div>
            {settings.enableZoom && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">最大缩放</span>
                  <span className="text-sm text-white/50">{settings.maxZoom}x</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={5}
                  step={0.5}
                  value={settings.maxZoom}
                  onChange={(e) => onSettingsChange({ maxZoom: Number(e.target.value) })}
                  className="w-full"
                />
              </div>
            )}
          </section>

          {/* 快捷键说明 */}
          <section>
            <h3 className="mb-3 text-sm font-medium text-white/70">快捷键</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/70">翻页</span>
                <span>← → 或 ↑ ↓</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">首页/末页</span>
                <span>Home / End</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">全屏</span>
                <span>F</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/70">退出全屏</span>
                <span>Esc</span>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function ToggleSwitch({ checked, onChange }: ToggleSwitchProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-white/20'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform',
          checked ? 'left-[22px]' : 'left-0.5'
        )}
      />
    </button>
  );
}
