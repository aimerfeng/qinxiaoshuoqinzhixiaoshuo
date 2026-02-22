// 广场模块类型定义

export interface UserBrief {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

export interface QuoteInfo {
  anchorId: string;
  paragraphContent: string;
  workTitle: string;
  chapterTitle: string;
  isValid: boolean;
  contentUpdated: boolean;
}

export interface CardEngagement {
  predictedViralScore: number;
  trendingRank?: number;
}

export interface CardItem {
  id: string;
  author: UserBrief;
  content: string;
  quote: QuoteInfo | null;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked: boolean;
  isSaved: boolean;
  createdAt: string;
  engagement: CardEngagement;
}

export interface FeedMeta {
  feedType: string;
  refreshedAt: string;
  personalizationScore: number;
}

export interface FeedResponse {
  cards: CardItem[];
  nextCursor: string | null;
  meta: FeedMeta;
}

export interface Comment {
  id: string;
  author: UserBrief;
  content: string;
  likeCount: number;
  isLiked: boolean;
  replyTo: UserBrief | null;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
  replyCount?: number;
}

export interface CommentsResponse {
  comments: Comment[];
  nextCursor: string | null;
  hotComments: Comment[];
}

export interface RepliesResponse {
  replies: Comment[];
  nextCursor: string | null;
}

export type FeedType = 'recommend' | 'following' | 'trending';

export interface CreateCardRequest {
  content: string;
  quoteAnchorId?: string;
  mood?: string;
  tags?: string[];
}

export interface CreateCommentRequest {
  content: string;
  parentCommentId?: string;
  mentionedUsers?: string[];
}

export interface LikeResponse {
  message: string;
  likeCount: number;
  isLiked: boolean;
}
