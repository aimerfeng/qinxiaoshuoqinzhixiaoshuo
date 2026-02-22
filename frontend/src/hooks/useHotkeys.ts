'use client';

import { useEffect, useCallback } from 'react';
import { useReadingStore } from '@/store/reading';

interface HotkeyHandlers {
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  onToggleSettings?: () => void;
  onToggleChapterList?: () => void;
  onToggleNightMode?: () => void;
  onToggleFullscreen?: () => void;
  onIncreaseFontSize?: () => void;
  onDecreaseFontSize?: () => void;
  onGoToTop?: () => void;
  onGoToBottom?: () => void;
}

/**
 * 热键系统 Hook
 *
 * 需求4验收标准13: WHEN 用户使用键盘快捷键 THEN System SHALL 支持方向键翻页、快捷键设置面板等热键操作
 * 任务4.2.11: 热键系统（方向键翻页、快捷键设置面板，参考 Yomikiru）
 */
export function useHotkeys(handlers: HotkeyHandlers) {
  const { hotkeys } = useReadingStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 如果焦点在输入框中，不处理热键
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // 检查修饰键
      const modifiers = {
        ctrl: event.ctrlKey || event.metaKey,
        shift: event.shiftKey,
        alt: event.altKey,
      };

      // 查找匹配的热键
      for (const hotkey of hotkeys) {
        const keyMatch = event.key === hotkey.key || event.code === hotkey.key;

        if (!keyMatch) continue;

        // 检查修饰键匹配
        const requiredModifiers = hotkey.modifiers || [];
        const ctrlRequired = requiredModifiers.includes('ctrl');
        const shiftRequired = requiredModifiers.includes('shift');
        const altRequired = requiredModifiers.includes('alt');

        const modifiersMatch =
          modifiers.ctrl === ctrlRequired &&
          modifiers.shift === shiftRequired &&
          modifiers.alt === altRequired;

        if (!modifiersMatch) continue;

        // 执行对应的处理函数
        event.preventDefault();

        switch (hotkey.action) {
          case 'nextPage':
            handlers.onNextPage?.();
            break;
          case 'prevPage':
            handlers.onPrevPage?.();
            break;
          case 'nextChapter':
            handlers.onNextChapter?.();
            break;
          case 'prevChapter':
            handlers.onPrevChapter?.();
            break;
          case 'toggleSettings':
            handlers.onToggleSettings?.();
            break;
          case 'toggleChapterList':
            handlers.onToggleChapterList?.();
            break;
          case 'toggleNightMode':
            handlers.onToggleNightMode?.();
            break;
          case 'toggleFullscreen':
            handlers.onToggleFullscreen?.();
            break;
          case 'increaseFontSize':
            handlers.onIncreaseFontSize?.();
            break;
          case 'decreaseFontSize':
            handlers.onDecreaseFontSize?.();
            break;
          case 'goToTop':
            handlers.onGoToTop?.();
            break;
          case 'goToBottom':
            handlers.onGoToBottom?.();
            break;
        }

        return;
      }
    },
    [hotkeys, handlers]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * 格式化热键显示
 */
export function formatHotkey(key: string, modifiers?: string[]): string {
  const parts: string[] = [];

  if (modifiers?.includes('ctrl')) {
    parts.push('Ctrl');
  }
  if (modifiers?.includes('shift')) {
    parts.push('Shift');
  }
  if (modifiers?.includes('alt')) {
    parts.push('Alt');
  }

  // 格式化特殊键名
  const keyName =
    {
      ArrowLeft: '←',
      ArrowRight: '→',
      ArrowUp: '↑',
      ArrowDown: '↓',
      ' ': 'Space',
      Escape: 'Esc',
    }[key] || key.toUpperCase();

  parts.push(keyName);

  return parts.join(' + ');
}
