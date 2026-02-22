import { apiRequest } from '@/lib/api';

/**
 * 锚点详情响应
 */
export interface AnchorDetail {
  id: string;
  anchorId: string;
  content: string;
  orderIndex: number;
  quoteCount: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  chapter: {
    id: string;
    title: string;
    orderIndex: number;
    status: string;
    publishedAt: string | null;
  };
  work: {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
    status: string;
    contentType: string;
  };
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

/**
 * 引用卡片信息
 */
export interface ReferenceCard {
  id: string;
  content: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  likeCount: number;
  commentCount: number;
  originalContent: string;
  contentUpdated: boolean;
  createdAt: string;
}

/**
 * 锚点引用列表响应
 */
export interface AnchorReferencesResponse {
  cards: ReferenceCard[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * 上下文段落
 */
export interface ContextParagraph {
  anchorId: string;
  content: string;
  orderIndex: number;
}

/**
 * 锚点上下文响应
 */
export interface AnchorContextResponse {
  target: ContextParagraph;
  before: ContextParagraph[];
  after: ContextParagraph[];
  chapter: {
    id: string;
    title: string;
  };
  work: {
    id: string;
    title: string;
  };
}

/**
 * 创建引用请求
 */
export interface CreateQuoteRequest {
  cardId: string;
}

/**
 * 创建引用响应
 */
export interface CreateQuoteResponse {
  id: string;
  cardId: string;
  paragraphId: string;
  originalContent: string;
  createdAt: string;
  anchor: {
    anchorId: string;
    quoteCount: number;
  };
}

/**
 * 锚点服务
 * 
 * 需求3: 段落锚点精准引用体系（Anchor Network）
 */
export const anchorService = {
  /**
   * 获取锚点详情
   * 
   * 需求3验收标准8: WHEN 用户查看 Paragraph 详情 THEN System SHALL 显示该段落被引用的次数和引用列表
   * 
   * @param anchorId 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index})
   */
  getAnchorDetail: async (anchorId: string): Promise<AnchorDetail> => {
    return apiRequest<AnchorDetail>('get', `/anchors/${encodeURIComponent(anchorId)}`);
  },

  /**
   * 获取锚点引用列表
   * 
   * 需求3验收标准8: WHEN 用户查看 Paragraph 详情 THEN System SHALL 显示该段落被引用的次数和引用列表
   * 
   * @param anchorId 锚点ID
   * @param page 页码
   * @param limit 每页数量
   */
  getAnchorReferences: async (
    anchorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<AnchorReferencesResponse> => {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    
    return apiRequest<AnchorReferencesResponse>(
      'get',
      `/anchors/${encodeURIComponent(anchorId)}/references?${params.toString()}`
    );
  },

  /**
   * 获取锚点上下文
   * 
   * 返回目标段落及其周围段落的上下文信息，用于引用预览时展示更多上下文。
   * 
   * @param anchorId 锚点ID
   * @param before 目标段落之前的段落数量 (默认: 1, 最大: 10)
   * @param after 目标段落之后的段落数量 (默认: 1, 最大: 10)
   */
  getAnchorContext: async (
    anchorId: string,
    before: number = 1,
    after: number = 1
  ): Promise<AnchorContextResponse> => {
    const params = new URLSearchParams();
    params.append('before', before.toString());
    params.append('after', after.toString());
    
    return apiRequest<AnchorContextResponse>(
      'get',
      `/anchors/${encodeURIComponent(anchorId)}/context?${params.toString()}`
    );
  },

  /**
   * 创建引用记录
   * 
   * 当用户在 Card 中引用某个段落时，创建 Quote 记录。
   * 注意：通常在创建 Card 时通过 quoteAnchorId 参数一起创建引用，
   * 此 API 用于向已存在的 Card 添加引用。
   * 
   * 需求3验收标准3: WHEN 用户执行引用操作 THEN System SHALL 创建包含 Anchor_ID 引用的 Card 草稿
   * 需求3验收标准4: WHEN Card 包含 Anchor_ID 引用被发布到 Plaza THEN System SHALL 渲染原文预览并提供跳转链接
   * 
   * @param anchorId 锚点ID
   * @param cardId 要添加引用的 Card ID
   */
  createQuote: async (
    anchorId: string,
    cardId: string
  ): Promise<CreateQuoteResponse> => {
    return apiRequest<CreateQuoteResponse>(
      'post',
      `/anchors/${encodeURIComponent(anchorId)}/quote`,
      { cardId }
    );
  },
};
