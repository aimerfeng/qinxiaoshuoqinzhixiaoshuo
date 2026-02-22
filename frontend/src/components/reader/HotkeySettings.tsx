'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Keyboard, RotateCcw } from 'lucide-react';
import { useReadingStore } from '@/store/reading';
import { formatHotkey } from '@/hooks/useHotkeys';
import { cn } from '@/utils/cn';

interface HotkeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 热键设置面板
 *
 * 需求4验收标准13: WHEN 用户使用键盘快捷键 THEN System SHALL 支持方向键翻页、快捷键设置面板等热键操作
 * 任务4.2.11: 热键系统（方向键翻页、快捷键设置面板，参考 Yomikiru）
 */
export function HotkeySettings({ isOpen, onClose }: HotkeySettingsProps) {
  const { hotkeys, updateHotkey, resetHotkeys } = useReadingStore();
  const [editingAction, setEditingAction] = useState<string | null>(null);
  const [recordedKey, setRecordedKey] = useState<{
    key: string;
    modifiers: string[];
  } | null>(null);

  // 监听按键录制
  useEffect(() => {
    if (!editingAction) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // 忽略单独的修饰键
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      const modifiers: string[] = [];
      if (e.ctrlKey || e.metaKey) modifiers.push('ctrl');
      if (e.shiftKey) modifiers.push('shift');
      if (e.altKey) modifiers.push('alt');

      setRecordedKey({
        key: e.key,
        modifiers,
      });
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editingAction]);

  // 保存热键
  const handleSaveHotkey = useCallback(() => {
    if (editingAction && recordedKey) {
      updateHotkey(editingAction, recordedKey.key, recordedKey.modifiers);
    }
    setEditingAction(null);
    setRecordedKey(null);
  }, [editingAction, recordedKey, updateHotkey]);

  // 取消编辑
  const handleCancelEdit = useCallback(() => {
    setEditingAction(null);
    setRecordedKey(null);
  }, []);

  // 开始编辑
  const handleStartEdit = useCallback((action: string) => {
    setEditingAction(action);
    setRecordedKey(null);
  }, []);

  // 热键分组
  const hotkeyGroups = [
    {
      title: '翻页',
      actions: ['nextPage', 'prevPage', 'nextChapter', 'prevChapter'],
    },
    {
      title: '界面',
      actions: ['toggleSettings', 'toggleChapterList', 'toggleFullscreen'],
    },
    {
      title: '阅读',
      actions: ['toggleNightMode', 'increaseFontSize', 'decreaseFontSize'],
    },
    {
      title: '导航',
      actions: ['goToTop', 'goToBottom'],
    },
  ];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'max-h-[80vh] w-full max-w-lg',
          'rounded-xl bg-card shadow-lg',
          'flex flex-col overflow-hidden'
        )}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">快捷键设置</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetHotkeys}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted"
              title="重置为默认"
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

        {/* 热键列表 */}
        <div className="flex-1 space-y-6 overflow-y-auto p-4">
          {hotkeyGroups.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{group.title}</h3>
              <div className="space-y-2">
                {group.actions.map((action) => {
                  const hotkey = hotkeys.find((h) => h.action === action);
                  if (!hotkey) return null;

                  const isEditing = editingAction === action;

                  return (
                    <div
                      key={action}
                      className={cn(
                        'flex items-center justify-between rounded-lg p-3',
                        'border border-border',
                        isEditing && 'border-primary bg-primary/5'
                      )}
                    >
                      <span className="text-foreground">{hotkey.description}</span>

                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'rounded-md px-3 py-1.5',
                              'bg-muted font-mono text-sm text-foreground',
                              'min-w-[100px] text-center',
                              'border-2 border-dashed border-primary'
                            )}
                          >
                            {recordedKey
                              ? formatHotkey(recordedKey.key, recordedKey.modifiers)
                              : '按下按键...'}
                          </div>
                          <button
                            onClick={handleSaveHotkey}
                            disabled={!recordedKey}
                            className={cn(
                              'rounded-md px-3 py-1.5 text-sm',
                              'bg-primary text-white',
                              'disabled:cursor-not-allowed disabled:opacity-50'
                            )}
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="rounded-md bg-muted px-3 py-1.5 text-sm text-foreground"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(action)}
                          className={cn(
                            'rounded-md px-3 py-1.5',
                            'hover:bg-muted/80 bg-muted transition-colors',
                            'font-mono text-sm text-foreground'
                          )}
                        >
                          {formatHotkey(hotkey.key, hotkey.modifiers)}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="bg-muted/50 border-t border-border p-4">
          <p className="text-center text-xs text-muted-foreground">
            点击快捷键按钮后，按下新的按键组合即可修改
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
