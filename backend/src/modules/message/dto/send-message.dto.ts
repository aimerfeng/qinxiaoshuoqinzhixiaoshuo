import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { MessageType } from '@prisma/client';

/**
 * 发送消息 DTO
 *
 * 需求20: 私信系统
 * - 20.1.2 发送私信 API
 */
export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: '会话ID不能为空' })
  conversationId!: string;

  @IsString()
  @IsNotEmpty({ message: '消息内容不能为空' })
  @MaxLength(500, { message: '消息内容不能超过500字符' })
  content!: string;

  @IsOptional()
  @IsEnum(MessageType, { message: '无效的消息类型' })
  messageType?: MessageType;

  @IsOptional()
  @IsString()
  replyToId?: string;
}
