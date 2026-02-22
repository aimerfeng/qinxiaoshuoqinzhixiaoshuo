'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import Danmaku from 'danmaku';
import type { Danmaku as DanmakuData, DanmakuSettings } from '@/types/reader';
import { DEFAULT_DANMAKU_SETTINGS } from '@/types/reader';
import { cn } from '@/utils/cn';

interface DanmakuLayerProps {
  anchorId: string;
  danmakus: DanmakuData[];
  settings?: DanmakuSettings;
  className?: string;
  onReady?: () => void;
}

/**
 * 弹幕渲染层组件
 *
 * 需求24.3: WHEN 用户阅读到包含弹幕的段落 THEN System SHALL 使用 Danmaku 引擎在段落上方渲染滚动弹幕
 */
export function DanmakuLayer({
  anchorId,
  danmakus,
  settings = DEFAULT_DANMAKU_SETTINGS,
  className,
  onReady,
}: DanmakuLayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Danmaku | null>(null);
  const [isReady, setIsReady] = useState(false);

  // 初始化弹幕引擎
  useEffect(() => {
    if (!containerRef.current || !settings.enabled) return;

    // 创建弹幕引擎实例
    const engine = new Danmaku({
      container: containerRef.current,
      speed: settings.speed * 50, // 转换为像素/秒
    });

    engineRef.current = engine;
    setIsReady(true);
    onReady?.();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [settings.enabled, settings.speed, onReady]);

  // 更新透明度
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.style.opacity = String(settings.opacity);
  }, [settings.opacity]);

  // 加载初始弹幕
  useEffect(() => {
    if (!engineRef.current || !isReady || !settings.enabled) return;

    // 清空现有弹幕
    engineRef.current.clear();

    // 根据密度设置过滤弹幕
    const filteredDanmakus = filterByDensity(danmakus, settings.density);

    // 添加弹幕
    filteredDanmakus.forEach((danmaku) => {
      if (shouldShowDanmaku(danmaku, settings)) {
        emitDanmaku(engineRef.current!, danmaku, settings);
      }
    });
  }, [danmakus, isReady, settings]);

  // 添加新弹幕的方法
  const addDanmaku = useCallback(
    (danmaku: DanmakuData) => {
      if (!engineRef.current || !settings.enabled) return;
      if (!shouldShowDanmaku(danmaku, settings)) return;

      emitDanmaku(engineRef.current, danmaku, settings);
    },
    [settings]
  );

  // 暴露添加弹幕的方法
  useEffect(() => {
    if (containerRef.current) {
      (containerRef.current as HTMLDivElement & { __addDanmaku?: typeof addDanmaku }).__addDanmaku = addDanmaku;
    }
  }, [addDanmaku]);

  if (!settings.enabled) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-anchor-id={anchorId}
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{
        opacity: settings.opacity,
        zIndex: 10,
      }}
    />
  );
}

/**
 * 根据密度过滤弹幕
 */
function filterByDensity(danmakus: DanmakuData[], density: number): DanmakuData[] {
  if (density >= 5) return danmakus;

  // 密度 1-5 对应显示 20%-100% 的弹幕
  const ratio = density / 5;
  const count = Math.ceil(danmakus.length * ratio);

  // 随机选择弹幕
  const shuffled = [...danmakus].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 判断是否应该显示弹幕
 */
function shouldShowDanmaku(danmaku: DanmakuData, settings: DanmakuSettings): boolean {
  switch (danmaku.type) {
    case 'SCROLL':
      return settings.showScrollDanmaku;
    case 'TOP':
      return settings.showTopDanmaku;
    case 'BOTTOM':
      return settings.showBottomDanmaku;
    default:
      return true;
  }
}

/**
 * 发射弹幕到引擎
 */
function emitDanmaku(engine: Danmaku, danmaku: DanmakuData, settings: DanmakuSettings) {
  const mode = danmaku.type === 'TOP' ? 'top' : danmaku.type === 'BOTTOM' ? 'bottom' : 'rtl';

  engine.emit({
    text: danmaku.content,
    style: {
      fontSize: `${settings.fontSize}px`,
      color: danmaku.color,
      textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
      fontWeight: 'bold',
    },
    mode,
  });
}

/**
 * 获取弹幕层的添加弹幕方法
 */
export function getDanmakuLayerAddMethod(
  container: HTMLElement | null
): ((danmaku: DanmakuData) => void) | null {
  if (!container) return null;
  return (container as HTMLElement & { __addDanmaku?: (danmaku: DanmakuData) => void }).__addDanmaku || null;
}
