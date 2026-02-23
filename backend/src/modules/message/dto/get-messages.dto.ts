import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageResponseDto } from './message-response.dto';

/**
 * 分页方向枚举
 */
export enum PaginationDirection {
  BEFORE = 'before',
  AFTER = 'after',
}

/**
 * 获取消息历史 DTO
 *
 * 需求20: 私信系统
 * - 20.1.4 消息历史 API
 *
 * 支持游标分页，用于无限滚动加载
 */
export class GetMessagesDto {
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(PaginationDirection, { message: '无效的分页方向' })
  direction?: PaginationDirection = PaginationDirection.BEFORE;
}

/**
 * 消息列表响应 DTO
 *
 * 需求20: 私信系统
 * - 20.1.4 消息历史 API
 */
export interface MessageListResponseDto {
  messages: MessageResponseDto[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
}
