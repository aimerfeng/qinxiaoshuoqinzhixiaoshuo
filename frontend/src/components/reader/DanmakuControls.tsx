'use client';

import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Eye,
  EyeOff,
  Gauge,
  Droplets,
  Type,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import type { DanmakuSettings } from '@/types/reader';

interface DanmakuControlsProps {
  settings: DanmakuSettings;
  onSettingsChange: (settings: Partial<DanmakuSettings>) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 弹幕控制面板组件
 *
 * 需求24.5: WHEN 用户调整弹幕设置 THEN System SHALL 支持弹幕密度控制、透明度调节和弹幕开关
 * 需求24.6: WHEN 用户关闭弹幕功能 THEN System SHALL 隐藏所有弹幕覆盖层并保持阅读体验不受影响
 */
export function DanmakuControls({
  settings,
  onSettingsChange,
  isOpen,
  onClose,
}: DanmakuControlsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className={cn(
            'fixed right-4 top-1/2 z-50 -translate-y-1/2',
            'bg-card/95 w-72 rounded-2xl border border-border backdrop-blur-lg',
            'p-4 shadow-lg'
          )}
        >
          {/* 标题栏 */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">弹幕设置</h3>
            </div>
            <button onClick={onClose} className="rounded-lg p-1 transition-colors hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* 弹幕开关 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.enabled ? (
                  <Eye className="h-4 w-4 text-primary" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm">弹幕开关</span>
              </div>
              <button
                onClick={() => onSettingsChange({ enabled: !settings.enabled })}
                className={cn(
                  'relative h-6 w-11 rounded-full transition-colors',
                  settings.enabled ? 'bg-primary' : 'bg-muted'
                )}
              >
                <motion.div
                  className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow"
                  animate={{ left: settings.enabled ? '22px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>

            {/* 透明度 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplets className="h-4 w-4" />
                  <span className="text-sm">透明度</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {Math.round(settings.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.opacity * 100}
                onChange={(e) => onSettingsChange({ opacity: parseInt(e.target.value) / 100 })}
                disabled={!settings.enabled}
                className={cn(
                  'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted',
                  '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
                  '[&::-webkit-slider-thumb]:bg-primary',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>

            {/* 密度 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  <span className="text-sm">弹幕密度</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {getDensityLabel(settings.density)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={settings.density}
                onChange={(e) => onSettingsChange({ density: parseInt(e.target.value) })}
                disabled={!settings.enabled}
                className={cn(
                  'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted',
                  '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
                  '[&::-webkit-slider-thumb]:bg-primary',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>

            {/* 字体大小 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  <span className="text-sm">字体大小</span>
                </div>
                <span className="text-xs text-muted-foreground">{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="36"
                value={settings.fontSize}
                onChange={(e) => onSettingsChange({ fontSize: parseInt(e.target.value) })}
                disabled={!settings.enabled}
                className={cn(
                  'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted',
                  '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
                  '[&::-webkit-slider-thumb]:bg-primary',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>

            {/* 弹幕类型过滤 */}
            <div className="space-y-2">
              <span className="text-sm">显示类型</span>
              <div className="flex gap-2">
                <TypeToggle
                  icon={<ArrowRight className="h-4 w-4" />}
                  label="滚动"
                  enabled={settings.showScrollDanmaku}
                  disabled={!settings.enabled}
                  onChange={(enabled) => onSettingsChange({ showScrollDanmaku: enabled })}
                />
                <TypeToggle
                  icon={<ArrowUp className="h-4 w-4" />}
                  label="顶部"
                  enabled={settings.showTopDanmaku}
                  disabled={!settings.enabled}
                  onChange={(enabled) => onSettingsChange({ showTopDanmaku: enabled })}
                />
                <TypeToggle
                  icon={<ArrowDown className="h-4 w-4" />}
                  label="底部"
                  enabled={settings.showBottomDanmaku}
                  disabled={!settings.enabled}
                  onChange={(enabled) => onSettingsChange({ showBottomDanmaku: enabled })}
                />
              </div>
            </div>

            {/* 速度 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">滚动速度</span>
                <span className="text-xs text-muted-foreground">
                  {getSpeedLabel(settings.speed)}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                value={settings.speed}
                onChange={(e) => onSettingsChange({ speed: parseInt(e.target.value) })}
                disabled={!settings.enabled}
                className={cn(
                  'h-2 w-full cursor-pointer appearance-none rounded-full bg-muted',
                  '[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4',
                  '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full',
                  '[&::-webkit-slider-thumb]:bg-primary',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface TypeToggleProps {
  icon: React.ReactNode;
  label: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
}

function TypeToggle({ icon, label, enabled, disabled, onChange }: TypeToggleProps) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      disabled={disabled}
      className={cn(
        'flex flex-1 flex-col items-center gap-1 rounded-lg p-2',
        'transition-colors',
        enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      {icon}
      <span className="text-xs">{label}</span>
    </button>
  );
}

function getDensityLabel(density: number): string {
  const labels = ['极少', '较少', '适中', '较多', '密集'];
  return labels[density - 1] || '适中';
}

function getSpeedLabel(speed: number): string {
  const labels = ['极慢', '较慢', '适中', '较快', '极快'];
  return labels[speed - 1] || '适中';
}
