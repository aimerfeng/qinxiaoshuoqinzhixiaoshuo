import { useCallback } from 'react';
import { useQuoteStore, type QuotedParagraph } from '@/store/quote';
import type { Paragraph } from '@/types/reader';

/**
 * 引用选择 Hook
 * 
 * 需求3验收标准2: WHEN 用户在 Reader 中选择 Paragraph THEN System SHALL 显示引用操作选项
 * 任务7.2.1: 段落选择引用交互
 */

interface UseQuoteSelectionOptions {
  /** 作品ID */
  workId: string;
  /** 作品标题 */
  workTitle: string;
  /** 章节ID */
  chapterId: string;
  /** 章节标题 */
  chapterTitle: string;
}

interface UseQuoteSelectionReturn {
  /** 当前选中的段落 */
  selectedParagraph: Paragraph | null;
  /** 准备引用的段落 */
  quotedParagraph: QuotedParagraph | null;
  /** 引用弹窗是否打开 */
  isQuoteModalOpen: boolean;
  /** 引用评论内容 */
  quoteComment: string;
  /** 是否正在提交 */
  isSubmitting: boolean;
  /** 选择段落 */
  selectParagraph: (paragraph: Paragraph | null) => void;
  /** 开始引用流程 */
  startQuote: (paragraph: Paragraph) => void;
  /** 关闭引用弹窗 */
  closeQuoteModal: () => void;
  /** 设置引用评论 */
  setQuoteComment: (comment: string) => void;
  /** 清除选择 */
  clearSelection: () => void;
}

export function useQuoteSelection(options: UseQuoteSelectionOptions): UseQuoteSelectionReturn {
  const { workId, workTitle, chapterId, chapterTitle } = options;
  
  const {
    selectedParagraph,
    quotedParagraph,
    isQuoteModalOpen,
    quoteComment,
    isSubmitting,
    selectParagraph: setSelectedParagraph,
    openQuoteModal,
    closeQuoteModal,
    setQuoteComment,
    reset,
  } = useQuoteStore();

  /**
   * 选择段落
   */
  const selectParagraph = useCallback((paragraph: Paragraph | null) => {
    setSelectedParagraph(paragraph);
  }, [setSelectedParagraph]);

  /**
   * 开始引用流程
   * 将段落信息与作品/章节上下文组合，打开引用弹窗
   */
  const startQuote = useCallback((paragraph: Paragraph) => {
    const quotedParagraph: QuotedParagraph = {
      id: paragraph.id,
      anchorId: paragraph.anchorId,
      content: paragraph.content,
      workId,
      workTitle,
      chapterId,
      chapterTitle,
    };
    openQuoteModal(quotedParagraph);
  }, [workId, workTitle, chapterId, chapterTitle, openQuoteModal]);

  /**
   * 清除选择
   */
  const clearSelection = useCallback(() => {
    reset();
  }, [reset]);

  return {
    selectedParagraph,
    quotedParagraph,
    isQuoteModalOpen,
    quoteComment,
    isSubmitting,
    selectParagraph,
    startQuote,
    closeQuoteModal,
    setQuoteComment,
    clearSelection,
  };
}
