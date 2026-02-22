'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Danmaku, CreateDanmakuRequest } from '@/types/reader';

interface UseDanmakuSocketOptions {
  enabled?: boolean;
  onNewDanmaku?: (danmaku: Danmaku) => void;
  onDanmakuDeleted?: (data: { anchorId: string; danmakuId: string }) => void;
}

interface UseDanmakuSocketReturn {
  isConnected: boolean;
  subscribe: (anchorIds: string[]) => void;
  unsubscribe: (anchorIds: string[]) => void;
  sendDanmaku: (userId: string, danmaku: CreateDanmakuRequest) => Promise<Danmaku | null>;
}

/**
 * 弹幕 WebSocket 连接 Hook
 *
 * 需求24.4: WHEN 新弹幕被发送 THEN System SHALL 通过 WebSocket 实时推送给正在阅读同一段落的其他用户
 */
export function useDanmakuSocket(options: UseDanmakuSocketOptions = {}): UseDanmakuSocketReturn {
  const { enabled = true, onNewDanmaku, onDanmakuDeleted } = options;
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const subscribedAnchorsRef = useRef<Set<string>>(new Set());

  // 初始化 WebSocket 连接
  useEffect(() => {
    if (!enabled) return;

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${backendUrl}/danmaku`, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[Danmaku Socket] Connected');

      // 重新订阅之前的 anchors
      if (subscribedAnchorsRef.current.size > 0) {
        socket.emit('subscribe', {
          anchorIds: Array.from(subscribedAnchorsRef.current),
        });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Danmaku Socket] Disconnected');
    });

    socket.on('newDanmaku', (danmaku: Danmaku) => {
      console.log('[Danmaku Socket] New danmaku received:', danmaku);
      onNewDanmaku?.(danmaku);
    });

    socket.on('danmakuDeleted', (data: { anchorId: string; danmakuId: string }) => {
      console.log('[Danmaku Socket] Danmaku deleted:', data);
      onDanmakuDeleted?.(data);
    });

    socket.on('error', (error: Error) => {
      console.error('[Danmaku Socket] Error:', error);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [enabled, onNewDanmaku, onDanmakuDeleted]);

  // 订阅段落弹幕
  const subscribe = useCallback((anchorIds: string[]) => {
    if (!socketRef.current?.connected) return;

    // 过滤已订阅的
    const newAnchors = anchorIds.filter((id) => !subscribedAnchorsRef.current.has(id));
    if (newAnchors.length === 0) return;

    socketRef.current.emit('subscribe', { anchorIds: newAnchors });
    newAnchors.forEach((id) => subscribedAnchorsRef.current.add(id));
  }, []);

  // 取消订阅段落弹幕
  const unsubscribe = useCallback((anchorIds: string[]) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('unsubscribe', { anchorIds });
    anchorIds.forEach((id) => subscribedAnchorsRef.current.delete(id));
  }, []);

  // 通过 WebSocket 发送弹幕
  const sendDanmaku = useCallback(
    async (userId: string, danmaku: CreateDanmakuRequest): Promise<Danmaku | null> => {
      if (!socketRef.current?.connected) {
        console.error('[Danmaku Socket] Not connected');
        return null;
      }

      return new Promise((resolve) => {
        socketRef.current!.emit(
          'send',
          { userId, danmaku },
          (response: { success: boolean; danmaku?: Danmaku; error?: string }) => {
            if (response.success && response.danmaku) {
              resolve(response.danmaku);
            } else {
              console.error('[Danmaku Socket] Send failed:', response.error);
              resolve(null);
            }
          }
        );
      });
    },
    []
  );

  return {
    isConnected,
    subscribe,
    unsubscribe,
    sendDanmaku,
  };
}
