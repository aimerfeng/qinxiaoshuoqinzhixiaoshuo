import { IsString, IsOptional, IsInt, Min, MaxLength } from 'class-validator';

/**
 * 创建或更新草稿 DTO
 *
 * 需求6验收标准3: WHEN Creator 在 Editor 中输入内容 THEN System SHALL 实时自动保存草稿
 * 需求6验收标准9: WHILE Editor 处于编辑状态 THEN System SHALL 每30秒自动保存一次草稿
 */
export class CreateDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsString()
  content!: string;

  @IsOptional()
  @IsString()
  workId?: string;

  @IsOptional()
  @IsString()
  chapterId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  cursorPosition?: number;
}

/**
 * 草稿响应 DTO
 */
export interface DraftResponseDto {
  id: string;
  title: string | null;
  content: string;
  workId: string | null;
  chapterId: string | null;
  cursorPosition: number | null;
  wordCount: number;
  lastSavedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 草稿列表项 DTO
 */
export interface DraftListItemDto {
  id: string;
  title: string | null;
  contentPreview: string; // 内容预览（前100字）
  workId: string | null;
  workTitle: string | null;
  chapterId: string | null;
  chapterTitle: string | null;
  wordCount: number;
  lastSavedAt: Date;
  createdAt: Date;
}

/**
 * 草稿列表响应 DTO
 */
export interface DraftListResponseDto {
  drafts: DraftListItemDto[];
  total: number;
}
