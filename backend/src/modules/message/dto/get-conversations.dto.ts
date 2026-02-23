import {
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 获取会话列表 DTO
 *
 * 需求20: 私信系统
 * - 20.1.3 会话列表 API
 */
export class GetConversationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

/**
 * 最后消息预览信息
 */
export interface LastMessagePreviewDto {
  id: string;
  content: string;
  sender: {
    id: string;
    username: string;
    displayName: string | null;
  };
  createdAt: Date;
}

/**
 * 会话参与者简要信息
 */
export interface ConversationParticipantSummaryDto {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 会话列表项 DTO
 */
export interface ConversationListItemDto {
  id: string;
  title: string | null;
  isGroup: boolean;
  lastMessage: LastMessagePreviewDto | null;
  unreadCount: number;
  participants: ConversationParticipantSummaryDto[];
  lastMessageAt: Date;
  createdAt: Date;
}

/**
 * 会话列表响应 DTO
 */
export interface ConversationListResponseDto {
  conversations: ConversationListItemDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
