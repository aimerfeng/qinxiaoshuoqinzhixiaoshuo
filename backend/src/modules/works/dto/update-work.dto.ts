import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';
import { WorkStatus } from '@prisma/client';
import { WorkCategory, ReadingDirection } from './create-work.dto.js';

/**
 * 更新作品 DTO
 * 需求2验收标准7: WHEN Creator 设置作品元信息 THEN System SHALL 保存标题、简介、封面、标签等信息
 *
 * 所有字段均为可选，仅更新提供的字段
 * 支持更新漫画特有字段（readingDirection）
 */
export class UpdateWorkDto {
  @IsOptional()
  @IsString({ message: '标题必须是字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(100, { message: '标题不能超过100个字符' })
  title?: string;

  @IsOptional()
  @IsString({ message: '简介必须是字符串' })
  @MaxLength(2000, { message: '简介不能超过2000个字符' })
  description?: string;

  @IsOptional()
  @IsEnum(WorkCategory, { message: '作品分类无效' })
  category?: WorkCategory;

  @IsOptional()
  @IsArray({ message: '标签必须是数组' })
  @IsString({ each: true, message: '每个标签必须是字符串' })
  @ArrayMaxSize(10, { message: '标签数量不能超过10个' })
  tags?: string[];

  @IsOptional()
  @IsString({ message: '封面图片URL必须是字符串' })
  @MaxLength(500, { message: '封面图片URL不能超过500个字符' })
  coverImage?: string;

  @IsOptional()
  @IsEnum(WorkStatus, { message: '作品状态无效' })
  status?: WorkStatus;

  /**
   * 阅读方向（漫画专用）
   * - LTR: 从左到右（西方漫画、韩漫、Webtoon）
   * - RTL: 从右到左（日漫）
   * 仅对漫画类型作品有效
   */
  @IsOptional()
  @IsEnum(ReadingDirection, {
    message: '阅读方向无效，必须是 LTR 或 RTL',
  })
  readingDirection?: ReadingDirection;
}

/**
 * 更新作品响应 DTO
 */
export interface UpdateWorkResponseDto {
  message: string;
  work: import('./work-response.dto.js').WorkResponseDto;
}
