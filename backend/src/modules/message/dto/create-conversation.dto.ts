import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ArrayMinSize,
  MaxLength,
} from 'class-validator';

/**
 * 创建会话 DTO
 *
 * 需求20: 私信系统
 * - 20.1.2 发送私信 API
 */
export class CreateConversationDto {
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要一个参与者' })
  @IsString({ each: true })
  participantIds!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '会话标题不能超过50字符' })
  title?: string;

  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;
}

/**
 * 发送直接消息 DTO
 */
export class SendDirectMessageDto {
  @IsString()
  @IsNotEmpty({ message: '消息内容不能为空' })
  @MaxLength(500, { message: '消息内容不能超过500字符' })
  content!: string;
}
