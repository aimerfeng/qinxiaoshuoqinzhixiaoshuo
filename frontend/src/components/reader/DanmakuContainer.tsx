'use client';

import { useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare } from 'lucide-react';
import { useDanmakuStore } from '@/store/danmaku';
import { useAuthStore } from '@/store/auth';
import { useDanmakuSocket } from '@/hooks/useDanmakuSocket';
import { getDanmakuByAnchorIds, sendDanmaku as sendDanmakuApi } from '@/services/danmaku';
import { DanmakuLayer } from './DanmakuLayer';
import { DanmakuInput } from './DanmakuInput';
import { DanmakuControls } from './DanmakuControls';
import { cn } from '@/utils/cn';
import type { Paragraph, Danmaku, CreateDanmakuRequest } from '@/types/reader';

interface DanmakuContainerProps {
  paragraphs: Paragraph[];
  className?: string;
}

/**
 * 弹幕容器组件
 *
 * 整合弹幕层、输入框、控制面板和 WebSocket 连接
 */
export function DanmakuContainer({ paragraphs, className }: DanmakuContainerProps) {
  const {
    settings,
    updateSettings,
    danmakusByAnchor,
    setDanmakus,
    addDanmaku,
    removeDanmaku,
    isControlsOpen,
    isInputOpen,
    currentAnchorId,
    toggleControls,
    closeInput,
  } = useDanmakuStore();

  const { user, isAuthenticated } = useAuthStore();

  // 获取所有段落的 anchorId
  const anchorIds = useMemo(() => paragraphs.map((p) => p.anchorId), [paragraphs]);

  // WebSocket 连接
  const { isConnected, subscribe, unsubscribe } = useDanmakuSocket({
    enabled: settings.enabled && anchorIds.length > 0,
    onNewDanmaku: (danmaku: Danmaku) => {
      addDanmaku(danmaku);
    },
    onDanmakuDeleted: ({ anchorId, danmakuId }) => {
      removeDanmaku(anchorId, danmakuId);
    },
  });

  // 订阅当前页面的段落弹幕
  useEffect(() => {
    if (isConnected && anchorIds.length > 0) {
      subscribe(anchorIds);
    }

    return () => {
      if (isConnected && anchorIds.length > 0) {
        unsubscribe(anchorIds);
      }
    };
  }, [isConnected, anchorIds, subscribe, unsubscribe]);

  // 批量获取弹幕数据
  const { data: batchDanmakus } = useQuery({
    queryKey: ['danmakus', anchorIds],
    queryFn: () => getDanmakuByAnchorIds(anchorIds, 50),
    enabled: settings.enabled && anchorIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // 更新 store 中的弹幕数据
  useEffect(() => {
    if (batchDanmakus) {
      Object.entries(batchDanmakus).forEach(([anchorId, danmakus]) => {
        setDanmakus(anchorId, danmakus);
      });
    }
  }, [batchDanmakus, setDanmakus]);

  // 发送弹幕
  const handleSendDanmaku = useCallback(
    async (data: CreateDanmakuRequest) => {
      if (!isAuthenticated || !user) {
        throw new Error('请先登录');
      }

      const danmaku = await sendDanmakuApi(data);
      addDanmaku(danmaku);
    },
    [isAuthenticated, user, addDanmaku]
  );

  if (!settings.enabled) {
    return (
      <>
        {/* 弹幕开关按钮 */}
        <DanmakuToggleButton
          enabled={settings.enabled}
          onClick={() => updateSettings({ enabled: true })}
        />
      </>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* 弹幕层 - 覆盖在每个段落上 */}
      {paragraphs.map((paragraph) => (
        <DanmakuLayerWrapper
          key={paragraph.anchorId}
          anchorId={paragraph.anchorId}
          danmakus={danmakusByAnchor[paragraph.anchorId] || []}
          settings={settings}
        />
      ))}

      {/* 弹幕输入框 */}
      {currentAnchorId && (
        <DanmakuInput
          anchorId={currentAnchorId}
          isOpen={isInputOpen}
          onClose={closeInput}
          onSend={handleSendDanmaku}
        />
      )}

      {/* 弹幕控制面板 */}
      <DanmakuControls
        settings={settings}
        onSettingsChange={updateSettings}
        isOpen={isControlsOpen}
        onClose={toggleControls}
      />

      {/* 弹幕开关按钮 */}
      <DanmakuToggleButton enabled={settings.enabled} onClick={toggleControls} />
    </div>
  );
}

interface DanmakuLayerWrapperProps {
  anchorId: string;
  danmakus: Danmaku[];
  settings: typeof useDanmakuStore.getState extends () => infer S
    ? S extends { settings: infer T }
      ? T
      : never
    : never;
}

function DanmakuLayerWrapper({ anchorId, danmakus, settings }: DanmakuLayerWrapperProps) {
  // 找到对应段落的 DOM 元素
  useEffect(() => {
    const paragraphElement = document.querySelector(`[data-anchor-id="${anchorId}"]`);
    if (paragraphElement) {
      // 确保段落元素有相对定位
      (paragraphElement as HTMLElement).style.position = 'relative';
    }
  }, [anchorId]);

  return <DanmakuLayer anchorId={anchorId} danmakus={danmakus} settings={settings} />;
}

interface DanmakuToggleButtonProps {
  enabled: boolean;
  onClick: () => void;
}

function DanmakuToggleButton({ enabled, onClick }: DanmakuToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'fixed bottom-20 right-4 z-40',
        'flex h-10 w-10 items-center justify-center rounded-full',
        'bg-card/90 shadow-lg backdrop-blur-sm',
        'border border-border',
        'transition-colors hover:bg-muted',
        enabled ? 'text-primary' : 'text-muted-foreground'
      )}
      title={enabled ? '弹幕设置' : '开启弹幕'}
    >
      <MessageSquare className="h-5 w-5" />
    </button>
  );
}
