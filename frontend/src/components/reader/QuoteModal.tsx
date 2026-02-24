'use client';

import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { X, Quote, Send, BookOpen, Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/utils/cn';
import { useQuoteStore, type QuotedParagraph } from '@/store/quote';
import { useAuthStore } from '@/store/auth';
import { plazaService } from '@/services/plaza';
import { toast } from '@/components/ui';
import { useRouter } from 'next/navigation';

interface QuoteModalProps {
  paragraph: QuotedParagraph;
  onClose: () => void;
}

/**
 * 引用到广场弹窗
 *
 * 需求3验收标准3: WHEN 用户执行引用操作 THEN System SHALL 创建包含 Anchor_ID 引用的 Card 草稿
 * 任务7.2.1: 段落选择引用交互
 * 任务7.2.2: 引用 Card 创建流程
 */
export function QuoteModal({ paragraph, onClose }: QuoteModalProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const { quoteComment, setQuoteComment, setSubmitting, isSubmitting } = useQuoteStore();
  const [error, setError] = useState<string | null>(null);

  // 创建引用 Card
  const createCardMutation = useMutation({
    mutationFn: async () => {
      if (!isAuthenticated) {
        throw new Error('请先登录后再引用');
      }

      // 创建 Card 并关联引用
      // 后端 PlazaService.createCard 会自动创建 Quote 记录
      // 如果用户没有输入评论，使用默认的引用文本
      const cardContent = quoteComment.trim() || `📖 ${paragraph.content.slice(0, 100)}${paragraph.content.length > 100 ? '...' : ''}`;
      return plazaService.createCard({
        content: cardContent,
        quoteAnchorId: paragraph.anchorId,
      });
    },
    onSuccess: (card) => {
      // 重置提交状态
      setSubmitting(false);
      
      // 刷新广场数据
      queryClient.invalidateQueries({ queryKey: ['plaza', 'feed'] });
      
      // 显示成功提示
      toast.success('引用发布成功！');
      
      // 关闭弹窗
      onClose();
      
      // 跳转到广场查看新创建的 Card
      router.push(`/plaza?highlight=${card.id}`);
    },
    onError: (err: Error) => {
      setError(err.message);
      setSubmitting(false);
      toast.error(err.message || '发布失败，请重试');
    },
  });

  // 处理提交
  const handleSubmit = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    createCardMutation.mutate();
  }, [createCardMutation, setSubmitting]);

  // 处理关闭
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  // 处理背景点击
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }, [handleClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          'w-full max-w-lg',
          'bg-card rounded-2xl shadow-xl',
          'border border-border',
          'overflow-hidden'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">引用到广场</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className={cn(
              'p-2 rounded-full transition-colors',
              'hover:bg-muted',
              'text-muted-foreground hover:text-foreground',
              isSubmitting && 'opacity-50 cursor-not-allowed'
            )}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {/* 引用预览 */}
          <div className={cn(
            'p-4 rounded-xl',
            'bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5',
            'border-l-4 border-primary'
          )}>
            {/* 来源信息 */}
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <BookOpen className="h-3 w-3" />
              <span>{paragraph.workTitle}</span>
              <span>·</span>
              <span>{paragraph.chapterTitle}</span>
            </div>
            
            {/* 段落内容 */}
            <p className="text-foreground leading-relaxed line-clamp-4">
              {paragraph.content}
            </p>
          </div>

          {/* 评论输入 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              添加你的想法（可选）
            </label>
            <textarea
              value={quoteComment}
              onChange={(e) => setQuoteComment(e.target.value)}
              placeholder="分享你对这段内容的感想..."
              disabled={isSubmitting}
              className={cn(
                'w-full h-24 px-4 py-3 rounded-xl',
                'bg-muted/50 border border-border',
                'text-foreground placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
                'resize-none transition-colors',
                isSubmitting && 'opacity-50 cursor-not-allowed'
              )}
              maxLength={500}
            />
            <div className="flex justify-end mt-1">
              <span className={cn(
                'text-xs',
                quoteComment.length > 450 ? 'text-warning' : 'text-muted-foreground'
              )}>
                {quoteComment.length}/500
              </span>
            </div>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* 未登录提示 */}
          {!isAuthenticated && (
            <div className="p-3 rounded-lg bg-warning/10 text-warning text-sm">
              请先登录后再引用到广场
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border bg-muted/30">
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className={cn(
              'px-4 py-2 rounded-lg',
              'text-muted-foreground hover:text-foreground',
              'hover:bg-muted transition-colors',
              isSubmitting && 'opacity-50 cursor-not-allowed'
            )}
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isAuthenticated}
            className={cn(
              'flex items-center gap-2 px-6 py-2 rounded-lg',
              'bg-primary text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>发布中...</span>
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>发布到广场</span>
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
