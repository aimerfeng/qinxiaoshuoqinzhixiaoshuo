import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ChapterStatus } from '@prisma/client';
import type {
  BatchImportResult,
  ImportedChapterInfo,
  FailedChapterInfo,
} from '../interfaces/batch-import.interface.js';

/**
 * 批量导入章节请求 DTO
 * Batch import chapters request DTO
 */
export class BatchImportDto {
  @IsOptional()
  @IsString({ message: '编码必须是字符串' })
  @MaxLength(20, { message: '编码名称不能超过20个字符' })
  encoding?: string;

  @IsOptional()
  @IsString({ message: '自定义模式必须是字符串' })
  @MaxLength(500, { message: '自定义模式不能超过500个字符' })
  customPattern?: string;

  @IsOptional()
  @IsBoolean({ message: 'importPreface 必须是布尔值' })
  importPreface?: boolean;

  @IsOptional()
  @IsEnum(ChapterStatus, { message: '章节状态无效，必须是 DRAFT 或 PUBLISHED' })
  status?: ChapterStatus;
}

/**
 * 批量导入章节响应 DTO
 * Batch import chapters response DTO
 */
export class BatchImportResponseDto implements BatchImportResult {
  message!: string;
  successCount!: number;
  failedCount!: number;
  totalCount!: number;
  chapters!: ImportedChapterInfo[];
  failedChapters!: FailedChapterInfo[];
  prefaceImported!: boolean;
  patternType!: string | null;
}

/**
 * 章节预览请求 DTO
 * Chapter preview request DTO
 */
export class PreviewChaptersDto {
  @IsOptional()
  @IsString({ message: '编码必须是字符串' })
  @MaxLength(20, { message: '编码名称不能超过20个字符' })
  encoding?: string;

  @IsOptional()
  @IsString({ message: '自定义模式必须是字符串' })
  @MaxLength(500, { message: '自定义模式不能超过500个字符' })
  customPattern?: string;
}

/**
 * 章节预览项
 * Chapter preview item
 */
export interface ChapterPreviewItem {
  title: string;
  sequenceNumber: number;
  contentPreview: string;
  wordCount: number;
}

/**
 * 章节预览响应 DTO
 * Chapter preview response DTO
 */
export class PreviewChaptersResponseDto {
  message!: string;
  hasChapters!: boolean;
  chapterCount!: number;
  patternType!: string | null;
  chapters!: ChapterPreviewItem[];
  hasPreface!: boolean;
  prefacePreview!: string | null;
  statistics!: {
    totalCharacters: number;
    averageChapterLength: number;
  };
}
