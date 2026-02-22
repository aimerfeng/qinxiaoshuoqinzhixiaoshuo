import { apiRequest } from '@/lib/api';
import type {
  FeedResponse,
  FeedType,
  CardItem,
  CommentsResponse,
  RepliesResponse,
  CreateCardRequest,
  CreateCommentRequest,
  LikeResponse,
  Comment,
} from '@/types/plaza';

export const plazaService = {
  /**
   * 获取信息流
   */
  getFeed: async (
    type: FeedType = 'recommend',
    cursor?: string,
    limit: number = 20,
  ): Promise<FeedResponse> => {
    const params = new URLSearchParams();
    params.append('type', type);
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    
    return apiRequest<FeedResponse>('get', `/plaza/feed?${params.toString()}`);
  },

  /**
   * 创建 Card
   */
  createCard: async (data: CreateCardRequest): Promise<CardItem> => {
    return apiRequest<CardItem>('post', '/plaza/cards', data);
  },

  /**
   * 获取单个 Card
   */
  getCard: async (cardId: string): Promise<CardItem> => {
    return apiRequest<CardItem>('get', `/plaza/cards/${cardId}`);
  },

  /**
   * 更新 Card
   */
  updateCard: async (cardId: string, content: string): Promise<CardItem> => {
    return apiRequest<CardItem>('put', `/plaza/cards/${cardId}`, { content });
  },

  /**
   * 删除 Card
   */
  deleteCard: async (cardId: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('delete', `/plaza/cards/${cardId}`);
  },

  /**
   * 获取用户的 Card 列表
   */
  getUserCards: async (
    userId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<{ cards: CardItem[]; nextCursor: string | null }> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    
    return apiRequest<{ cards: CardItem[]; nextCursor: string | null }>(
      'get',
      `/plaza/users/${userId}/cards?${params.toString()}`,
    );
  },

  /**
   * 点赞 Card
   */
  likeCard: async (cardId: string): Promise<LikeResponse> => {
    return apiRequest<LikeResponse>('post', `/plaza/cards/${cardId}/like`);
  },

  /**
   * 取消点赞 Card
   */
  unlikeCard: async (cardId: string): Promise<LikeResponse> => {
    return apiRequest<LikeResponse>('delete', `/plaza/cards/${cardId}/like`);
  },

  /**
   * 获取 Card 的评论列表
   */
  getComments: async (
    cardId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<CommentsResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    
    return apiRequest<CommentsResponse>(
      'get',
      `/plaza/cards/${cardId}/comments?${params.toString()}`,
    );
  },

  /**
   * 创建评论
   */
  createComment: async (
    cardId: string,
    data: CreateCommentRequest,
  ): Promise<Comment> => {
    return apiRequest<Comment>('post', `/plaza/cards/${cardId}/comments`, data);
  },

  /**
   * 获取评论的回复列表
   */
  getReplies: async (
    commentId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<RepliesResponse> => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', limit.toString());
    
    return apiRequest<RepliesResponse>(
      'get',
      `/plaza/comments/${commentId}/replies?${params.toString()}`,
    );
  },

  /**
   * 更新评论
   */
  updateComment: async (commentId: string, content: string): Promise<Comment> => {
    return apiRequest<Comment>('put', `/plaza/comments/${commentId}`, { content });
  },

  /**
   * 删除评论
   */
  deleteComment: async (commentId: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('delete', `/plaza/comments/${commentId}`);
  },

  /**
   * 点赞评论
   */
  likeComment: async (commentId: string): Promise<LikeResponse> => {
    return apiRequest<LikeResponse>('post', `/plaza/comments/${commentId}/like`);
  },

  /**
   * 取消点赞评论
   */
  unlikeComment: async (commentId: string): Promise<LikeResponse> => {
    return apiRequest<LikeResponse>('delete', `/plaza/comments/${commentId}/like`);
  },
};
