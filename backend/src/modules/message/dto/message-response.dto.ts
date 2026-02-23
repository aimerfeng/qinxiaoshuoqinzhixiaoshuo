import { MessageType } from '@prisma/client';

/**
 * 消息发送者信息
 */
export interface MessageSenderDto {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 回复消息信息
 */
export interface ReplyToDto {
  id: string;
  content: string;
  sender: MessageSenderDto;
}

/**
 * 消息响应 DTO
 *
 * 需求20: 私信系统
 * - 20.1.2 发送私信 API
 */
export interface MessageResponseDto {
  id: string;
  conversationId: string;
  content: string;
  messageType: MessageType;
  sender: MessageSenderDto;
  replyTo?: ReplyToDto | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 会话参与者信息
 */
export interface ConversationParticipantDto {
  id: string;
  userId: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  joinedAt: Date;
  lastReadAt: Date | null;
}

/**
 * 会话响应 DTO
 */
export interface ConversationResponseDto {
  id: string;
  title: string | null;
  isGroup: boolean;
  lastMessageAt: Date;
  participants: ConversationParticipantDto[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建会话结果 DTO
 */
export interface CreateConversationResultDto {
  conversation: ConversationResponseDto;
  isNew: boolean;
}
