import { create } from 'zustand';
import type { Paragraph } from '@/types/reader';

/**
 * 引用状态管理
 * 
 * 需求3验收标准2: WHEN 用户在 Reader 中选择 Paragraph THEN System SHALL 显示引用操作选项
 * 需求3验收标准3: WHEN 用户执行引用操作 THEN System SHALL 创建包含 Anchor_ID 引用的 Card 草稿
 * 任务7.2.1: 段落选择引用交互
 */

/** 引用的段落信息 */
export interface QuotedParagraph {
  id: string;
  anchorId: string;
  content: string;
  workId: string;
  workTitle: string;
  chapterId: string;
  chapterTitle: string;
}

/** 引用状态 */
interface QuoteState {
  /** 当前选中的段落 */
  selectedParagraph: Paragraph | null;
  /** 准备引用的段落（包含完整上下文信息） */
  quotedParagraph: QuotedParagraph | null;
  /** 引用弹窗是否打开 */
  isQuoteModalOpen: boolean;
  /** 引用评论内容 */
  quoteComment: string;
  /** 是否正在提交引用 */
  isSubmitting: boolean;
  
  // Actions
  /** 选择段落 */
  selectParagraph: (paragraph: Paragraph | null) => void;
  /** 设置准备引用的段落 */
  setQuotedParagraph: (paragraph: QuotedParagraph | null) => void;
  /** 打开引用弹窗 */
  openQuoteModal: (paragraph: QuotedParagraph) => void;
  /** 关闭引用弹窗 */
  closeQuoteModal: () => void;
  /** 设置引用评论 */
  setQuoteComment: (comment: string) => void;
  /** 设置提交状态 */
  setSubmitting: (isSubmitting: boolean) => void;
  /** 重置状态 */
  reset: () => void;
}

const initialState = {
  selectedParagraph: null,
  quotedParagraph: null,
  isQuoteModalOpen: false,
  quoteComment: '',
  isSubmitting: false,
};

export const useQuoteStore = create<QuoteState>((set) => ({
  ...initialState,

  selectParagraph: (paragraph) => 
    set({ selectedParagraph: paragraph }),

  setQuotedParagraph: (paragraph) => 
    set({ quotedParagraph: paragraph }),

  openQuoteModal: (paragraph) => 
    set({ 
      quotedParagraph: paragraph, 
      isQuoteModalOpen: true,
      quoteComment: '',
    }),

  closeQuoteModal: () => 
    set({ 
      isQuoteModalOpen: false,
      quoteComment: '',
      isSubmitting: false,
    }),

  setQuoteComment: (comment) => 
    set({ quoteComment: comment }),

  setSubmitting: (isSubmitting) => 
    set({ isSubmitting }),

  reset: () => set(initialState),
}));
