import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsInt,
  IsUrl,
  MaxLength,
  MinLength,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChapterStatus } from '@prisma/client';

/**
 * 漫画页面 DTO
 * 用于创建/更新漫画章节时的页面数据
 */
export class MangaPageDto {
  @IsString({ message: '图片URL必须是字符串' })
  @IsUrl({}, { message: '图片URL格式无效' })
  imageUrl!: string;

  @IsOptional()
  @IsString({ message: '缩略图URL必须是字符串' })
  @IsUrl({}, { message: '缩略图URL格式无效' })
  thumbnailUrl?: string;

  @IsOptional()
  @IsInt({ message: '图片宽度必须是整数' })
  @Min(1, { message: '图片宽度必须大于0' })
  width?: number;

  @IsOptional()
  @IsInt({ message: '图片高度必须是整数' })
  @Min(1, { message: '图片高度必须大于0' })
  height?: number;

  @IsOptional()
  @IsInt({ message: '文件大小必须是整数' })
  @Min(0, { message: '文件大小不能为负数' })
  fileSize?: number;
}

/**
 * 创建漫画章节 DTO
 * 漫画章节包含图片列表而非文本内容
 */
export class CreateMangaChapterDto {
  @IsString({ message: '标题必须是字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(200, { message: '标题不能超过200个字符' })
  title!: string;

  @IsArray({ message: '页面列表必须是数组' })
  @ArrayMinSize(1, { message: '漫画章节至少需要一页' })
  @ValidateNested({ each: true })
  @Type(() => MangaPageDto)
  pages!: MangaPageDto[];

  @IsOptional()
  @IsEnum(ChapterStatus, { message: '章节状态无效，必须是 DRAFT 或 PUBLISHED' })
  status?: ChapterStatus;
}

/**
 * 更新漫画章节 DTO
 */
export class UpdateMangaChapterDto {
  @IsOptional()
  @IsString({ message: '标题必须是字符串' })
  @MinLength(1, { message: '标题不能为空' })
  @MaxLength(200, { message: '标题不能超过200个字符' })
  title?: string;

  @IsOptional()
  @IsArray({ message: '页面列表必须是数组' })
  @ArrayMinSize(1, { message: '漫画章节至少需要一页' })
  @ValidateNested({ each: true })
  @Type(() => MangaPageDto)
  pages?: MangaPageDto[];

  @IsOptional()
  @IsEnum(ChapterStatus, { message: '章节状态无效，必须是 DRAFT 或 PUBLISHED' })
  status?: ChapterStatus;
}

/**
 * 漫画页面响应 DTO
 */
export interface MangaPageResponseDto {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  orderIndex: number;
  width: number | null;
  height: number | null;
  fileSize: number | null;
}

/**
 * 漫画章节响应 DTO
 */
export interface MangaChapterResponseDto {
  id: string;
  workId: string;
  title: string;
  orderIndex: number;
  pageCount: number;
  status: ChapterStatus;
  version: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  pages: MangaPageResponseDto[];
}

/**
 * 创建漫画章节响应 DTO
 */
export interface CreateMangaChapterResponseDto {
  message: string;
  chapter: MangaChapterResponseDto;
}

/**
 * 更新漫画章节响应 DTO
 */
export interface UpdateMangaChapterResponseDto {
  message: string;
  chapter: MangaChapterResponseDto;
  previousVersion: number;
}

/**
 * 漫画章节列表项 DTO（不含页面详情）
 */
export interface MangaChapterListItemDto {
  id: string;
  workId: string;
  title: string;
  orderIndex: number;
  pageCount: number;
  status: ChapterStatus;
  version: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  thumbnailUrl: string | null; // 第一页的缩略图
}

/**
 * 漫画章节列表响应 DTO
 */
export interface MangaChapterListResponseDto {
  message: string;
  chapters: MangaChapterListItemDto[];
  total: number;
}
