'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  AlertTriangle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  ExternalLink,
  Quote as QuoteIcon
} from 'lucide-react';
import type { QuoteInfo } from '@/types/plaza';
import { anchorService, type AnchorContextResponse } from '@/services/anchor';
import { cn } from '@/utils/cn';

interface QuotePreviewProps {
  quote: QuoteInfo;
  className?: string;
  /** 是否显示展开上下文按钮 */
  showExpandContext?: boolean;
  /** 是否显示跳转提示 */
  showJumpHint?: boolean;
  /** 是否紧凑模式（用于评论列表等场景） */
  compact?: boolean;
  /** 自定义点击处理（覆盖默认跳转行为） */
  onNavigate?: (anchorId: string, workId: string, chapterId: string) => void;
}

/**
 * 引用预览组件
 * 
 * 需求3验收标准4: WHEN Card 包含 Anchor_ID 引用被发布到 Plaza THEN System SHALL 渲染原文预览并提供跳转链接
 * 需求3验收标准5: WHEN 用户点击 Card 中的引用链接 THEN System SHALL 导航到 Reader 并定位到对应 Paragraph
 * 需求3验收标准6: WHEN 被引用的 Paragraph 内容更新 THEN System SHALL 在 Card 中标记"内容已更新"提示
 * 需求3验收标准7: IF 被引用的 Paragraph 被删除 THEN System SHALL 在 Card 中显示"原文已不存在"提示
 */
export function QuotePreview({ 
  quote, 
  className,
  showExpandContext = true,
  showJumpHint = true,
  compact = false,
  onNavigate
}: QuotePreviewProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [contextData, setContextData] = useState<AnchorContextResponse | null>(null);
  const [isLoadingContext, setIsLoadingContext] = useState(false);
  const [contextError, setContextError] = useState<string | null>(null);

  /**
   * 解析 anchorId 获取 workId 和 chapterId
   * anchorId 格式: {work_id}:{chapter_id}:{paragraph_index}
   */
  const parseAnchorId = useCallback((anchorId: string) => {
    const parts = anchorId.split(':');
    if (parts.length >= 2) {
      return {
        workId: parts[0],
        chapterId: parts[1],
        paragraphIndex: parts[2] || '0'
      };
    }
    return null;
  }, []);

  /**
   * 处理点击跳转到原文
   */
  const handleClick = useCallback(() => {
    if (!quote.isValid) return;
    
    const parsed = parseAnchorId(quote.anchorId);
    if (!parsed) return;

    if (onNavigate) {
      onNavigate(quote.anchorId, parsed.workId, parsed.chapterId);
    } else {
      // 默认跳转到阅读器，带上锚点参数
      router.push(`/read/${parsed.workId}/${parsed.chapterId}?anchor=${quote.anchorId}`);
    }
  }, [quote.anchorId, quote.isValid, parseAnchorId, onNavigate, router]);

  /**
   * 加载上下文段落
   */
  const loadContext = useCallback(async () => {
    if (contextData || isLoadingContext || !quote.isValid) return;

    setIsLoadingContext(true);
    setContextError(null);

    try {
      const data = await anchorService.getAnchorContext(quote.anchorId, 1, 1);
      setContextData(data);
    } catch (error) {
      console.error('加载上下文失败:', error);
      setContextError('无法加载上下文');
    } finally {
      setIsLoadingContext(false);
    }
  }, [quote.anchorId, quote.isValid, contextData, isLoadingContext]);

  /**
   * 切换展开/收起上下文
   */
  const toggleExpand = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isExpanded && !contextData) {
      await loadContext();
    }
    setIsExpanded(!isExpanded);
  }, [isExpanded, contextData, loadContext]);

  // 紧凑模式的渲染
  if (compact) {
    return (
      <div
        onClick={handleClick}
        className={cn(
          'relative rounded-lg p-2 border-l-2 transition-all text-sm',
          quote.isValid
            ? 'bg-indigo-50/50 border-indigo-300 cursor-pointer hover:bg-indigo-50'
            : 'bg-gray-50 border-gray-300 cursor-not-allowed opacity-70',
          className,
        )}
      >
        <div className="flex items-center gap-2">
          <QuoteIcon className="w-3 h-3 text-indigo-400 flex-shrink-0" />
          <span className="text-gray-600 truncate">
            {quote.workTitle}
            {quote.chapterTitle && ` · ${quote.chapterTitle}`}
          </span>
          {!quote.isValid && (
            <span className="text-xs text-gray-400">(已删除)</span>
          )}
          {quote.contentUpdated && quote.isValid && (
            <span className="text-xs text-amber-600">(已更新)</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout
      className={cn(
        'relative rounded-xl border-l-4 transition-all overflow-hidden',
        quote.isValid
          ? 'bg-gradient-to-r from-indigo-50/80 to-purple-50/50 border-indigo-400'
          : 'bg-gray-50 border-gray-300',
        className,
      )}
    >
      {/* 主内容区域 - 可点击跳转 */}
      <motion.div
        whileHover={quote.isValid ? { scale: 1.005 } : {}}
        onClick={handleClick}
        className={cn(
          'p-4',
          quote.isValid ? 'cursor-pointer' : 'cursor-not-allowed'
        )}
      >
        {/* 状态徽章 */}
        <div className="absolute top-2 right-2 flex items-center gap-2">
          {!quote.isValid && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-1 bg-gray-200 rounded-full text-xs text-gray-600"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>原文已不存在</span>
            </motion.div>
          )}
          
          {quote.contentUpdated && quote.isValid && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-1 bg-amber-100 rounded-full text-xs text-amber-700"
            >
              <RefreshCw className="w-3 h-3" />
              <span>内容已更新</span>
            </motion.div>
          )}
        </div>

        {/* 引用内容 */}
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          
          <div className="flex-1 min-w-0 pr-20">
            {/* 作品信息 */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm font-medium text-indigo-600 truncate max-w-[200px]">
                {quote.workTitle}
              </span>
              {quote.chapterTitle && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-sm text-gray-500 truncate max-w-[150px]">
                    {quote.chapterTitle}
                  </span>
                </>
              )}
            </div>
            
            {/* 段落内容 */}
            <p
              className={cn(
                'text-sm leading-relaxed',
                quote.isValid ? 'text-gray-700' : 'text-gray-400 line-through',
                !isExpanded && 'line-clamp-3'
              )}
            >
              "{quote.paragraphContent}"
            </p>
          </div>
        </div>

        {/* 底部操作区 */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-indigo-100/50">
          {/* 展开上下文按钮 */}
          {showExpandContext && quote.isValid && (
            <button
              onClick={toggleExpand}
              disabled={isLoadingContext}
              className={cn(
                'flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors',
                isLoadingContext && 'opacity-50 cursor-wait'
              )}
            >
              {isLoadingContext ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw className="w-3 h-3" />
                </motion.div>
              ) : isExpanded ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
              <span>{isExpanded ? '收起上下文' : '查看上下文'}</span>
            </button>
          )}

          {/* 跳转提示 */}
          {showJumpHint && quote.isValid && (
            <div className="flex items-center gap-1 text-xs text-indigo-400">
              <span>点击跳转原文</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          )}

          {/* 无效状态下的占位 */}
          {!quote.isValid && (
            <span className="text-xs text-gray-400">原文内容已被删除</span>
          )}
        </div>
      </motion.div>

      {/* 展开的上下文区域 */}
      <AnimatePresence>
        {isExpanded && quote.isValid && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 border-t border-indigo-100/50 bg-white/30">
              {contextError ? (
                <p className="text-sm text-red-500 text-center py-2">{contextError}</p>
              ) : contextData ? (
                <div className="space-y-3">
                  {/* 前文 */}
                  {contextData.before.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-gray-400 font-medium">前文</span>
                      {contextData.before.map((para) => (
                        <p 
                          key={para.anchorId} 
                          className="text-sm text-gray-500 leading-relaxed pl-3 border-l-2 border-gray-200"
                        >
                          {para.content}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* 当前段落（高亮） */}
                  <div className="space-y-2">
                    <span className="text-xs text-indigo-500 font-medium">引用段落</span>
                    <p className="text-sm text-gray-700 leading-relaxed pl-3 border-l-2 border-indigo-400 bg-indigo-50/50 py-2 rounded-r">
                      {contextData.target.content}
                    </p>
                  </div>

                  {/* 后文 */}
                  {contextData.after.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-xs text-gray-400 font-medium">后文</span>
                      {contextData.after.map((para) => (
                        <p 
                          key={para.anchorId} 
                          className="text-sm text-gray-500 leading-relaxed pl-3 border-l-2 border-gray-200"
                        >
                          {para.content}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-4">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="w-5 h-5 text-indigo-400" />
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
