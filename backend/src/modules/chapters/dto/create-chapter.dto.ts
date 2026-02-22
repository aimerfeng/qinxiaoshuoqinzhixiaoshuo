import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ChapterStatus } from '@prisma/client';

/**
 * 创建章节 DTO
 * 需求2验收标准2: WHEN Creator 发布章节到 Main_Branch THEN System SHALL 为每个 Paragraph 自动生成 Anchor_ID
 * 需求2验收标准6: WHILE 作品处于草稿状态 THEN System SHALL 仅对 Creator 可见
 */
export class CreateChapterDto {
  @IsString({ message: '标题必须是字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(200, { message: '标题不能超过200个字符' })
  title!: string;

  @IsString({ message: '内容必须是字符串' })
  @MinLength(1, { message: '内容不能为空' })
  content!: string;

  @IsOptional()
  @IsEnum(ChapterStatus, { message: '章节状态无效，必须是 DRAFT 或 PUBLISHED' })
  status?: ChapterStatus;
}
