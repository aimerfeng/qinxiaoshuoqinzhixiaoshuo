import {
  IsString,
  IsOptional,
  IsEnum,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ChapterStatus } from '@prisma/client';

/**
 * 更新章节 DTO
 * 需求2验收标准3: WHEN Creator 编辑已发布章节 THEN System SHALL 创建新版本快照并保留历史记录
 */
export class UpdateChapterDto {
  @IsOptional()
  @IsString({ message: '标题必须是字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(200, { message: '标题不能超过200个字符' })
  title?: string;

  @IsOptional()
  @IsString({ message: '内容必须是字符串' })
  @MinLength(1, { message: '内容不能为空' })
  content?: string;

  @IsOptional()
  @IsEnum(ChapterStatus, {
    message: '章节状态无效，必须是 DRAFT、PUBLISHED 或 SCHEDULED',
  })
  status?: ChapterStatus;
}
