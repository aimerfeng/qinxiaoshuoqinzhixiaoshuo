'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Send, Loader2, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AlertNote } from '@/types/risk-control';

/**
 * 告警备注组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.2: 告警详情页面 - 备注组件
 *
 * 显示告警备注列表，支持添加新备注
 */
interface AlertNotesProps {
  notes: AlertNote[];
  onAddNote: (content: string) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

export function AlertNotes({
  notes,
  onAddNote,
  isSubmitting = false,
  className,
}: AlertNotesProps) {
  const [newNote, setNewNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || isSubmitting) return;

    await onAddNote(newNote.trim());
    setNewNote('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} 分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours} 小时前`;
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-800">
        <MessageSquare className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">备注</h3>
        {notes.length > 0 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({notes.length})
          </span>
        )}
      </div>

      {/* 备注列表 */}
      <div className="max-h-80 overflow-y-auto">
        {notes.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notes.map((note, index) => (
              <motion.div
                key={note.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900 dark:text-white">
                        {note.authorName || '管理员'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatDate(note.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">暂无备注</p>
          </div>
        )}
      </div>

      {/* 添加备注表单 */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-gray-100 dark:border-gray-800"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="添加备注..."
            disabled={isSubmitting}
            className={cn(
              'flex-1 px-4 py-2 rounded-xl text-sm',
              'bg-gray-100 dark:bg-gray-800',
              'border border-transparent',
              'focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500',
              'text-gray-900 dark:text-white',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors'
            )}
          />
          <button
            type="submit"
            disabled={!newNote.trim() || isSubmitting}
            className={cn(
              'px-4 py-2 rounded-xl',
              'bg-indigo-500 text-white',
              'hover:bg-indigo-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'transition-colors',
              'flex items-center gap-2'
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
