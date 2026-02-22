'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Quote, MessageCircle, Send, Copy, Highlighter, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useDanmakuStore } from '@/store/danmaku';
import type { Paragraph, ParagraphAction } from '@/types/reader';

interface ParagraphMenuProps {
  paragraph: Paragraph;
  position: { x: number; y: number };
  onClose: () => void;
  onQuote?: (paragraph: Paragraph) => void;
}

interface MenuItem {
  action: ParagraphAction;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  highlight?: boolean;
}

const menuItems: MenuItem[] = [
  { 
    action: 'quote', 
    label: '引用到广场', 
    icon: <Quote className="h-4 w-4" />,
    highlight: true,
  },
  { action: 'comment', label: '评论', icon: <MessageCircle className="h-4 w-4" /> },
  { action: 'danmaku', label: '弹幕', icon: <Send className="h-4 w-4" /> },
  { action: 'copy', label: '复制', icon: <Copy className="h-4 w-4" /> },
  { action: 'highlight', label: '标注', icon: <Highlighter className="h-4 w-4" /> },
];

/**
 * 段落操作菜单
 *
 * 需求4验收标准3: WHEN 用户点击 Paragraph THEN System SHALL 展开段落操作菜单（引用、评论、分享、发送弹幕）
 * 需求3验收标准2: WHEN 用户在 Reader 中选择 Paragraph THEN System SHALL 显示引用操作选项
 * 任务4.2.7: 段落操作菜单（引用、评论、发送弹幕）
 * 任务7.2.1: 段落选择引用交互
 */
export function ParagraphMenu({ paragraph, position, onClose, onQuote }: ParagraphMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const openDanmakuInput = useDanmakuStore((state) => state.openInput);

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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

  // 处理菜单项点击
  const handleAction = async (action: ParagraphAction) => {
    switch (action) {
      case 'copy':
        await navigator.clipboard.writeText(paragraph.content);
        // TODO: 显示复制成功提示
        break;
      case 'quote':
        // 触发引用到广场流程
        if (onQuote) {
          onQuote(paragraph);
        }
        break;
      case 'comment':
        // TODO: 打开评论弹窗
        console.log('Comment on paragraph:', paragraph.anchorId);
        break;
      case 'danmaku':
        // 打开弹幕输入框
        openDanmakuInput(paragraph.anchorId);
        break;
      case 'highlight':
        // TODO: 添加高亮标注
        console.log('Highlight paragraph:', paragraph.anchorId);
        break;
    }
    onClose();
  };

  // 计算菜单位置，确保不超出视口
  const menuStyle = {
    left: Math.min(position.x - 100, window.innerWidth - 220),
    top: Math.max(position.y - 60, 10),
  };

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={cn(
        'fixed z-50',
        'bg-card/95 backdrop-blur-lg',
        'rounded-xl border border-border shadow-lg',
        'p-1'
      )}
      style={menuStyle}
      data-interactive
    >
      <div className="flex items-center gap-1">
        {menuItems.map((item) => (
          <button
            key={item.action}
            onClick={() => handleAction(item.action)}
            className={cn(
              'flex flex-col items-center justify-center',
              'h-12 w-12 rounded-lg',
              'transition-colors hover:bg-muted',
              item.highlight 
                ? 'text-primary hover:bg-primary/10' 
                : 'text-foreground'
            )}
            title={item.label}
          >
            {item.icon}
            <span className={cn(
              'mt-0.5 text-[10px]',
              item.highlight ? 'text-primary' : 'text-muted-foreground'
            )}>
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* 段落预览 */}
      <div className="mt-1 border-t border-border px-2 py-1.5">
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {paragraph.content.slice(0, 100)}
          {paragraph.content.length > 100 && '...'}
        </p>
        {/* 引用数量提示 */}
        {paragraph.quoteCount > 0 && (
          <div className="mt-1 flex items-center gap-1 text-xs text-primary">
            <ExternalLink className="h-3 w-3" />
            <span>已被引用 {paragraph.quoteCount} 次</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
