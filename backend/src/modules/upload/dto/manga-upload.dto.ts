import { IsNumber, IsArray, IsOptional, Min, IsUUID } from 'class-validator';

/**
 * 单张漫画页面上传结果
 */
export interface MangaPageUploadResultDto {
  /** 原始文件名 */
  originalName: string;

  /** 图片 URL */
  imageUrl: string;

  /** 缩略图 URL */
  thumbnailUrl: string | null;

  /** 图片宽度 */
  width: number | null;

  /** 图片高度 */
  height: number | null;

  /** 文件大小（字节） */
  fileSize: number;

  /** 排序索引 */
  orderIndex: number;
}

/**
 * 批量上传漫画页面响应
 */
export interface BatchMangaUploadResponseDto {
  /** 响应消息 */
  message: string;

  /** 上传成功的页面列表 */
  pages: MangaPageUploadResultDto[];

  /** 成功数量 */
  successCount: number;

  /** 失败数量 */
  failedCount: number;

  /** 失败的文件名列表 */
  failedFiles: string[];
}

/**
 * 单张图片上传请求（用于追加页面）
 */
export class AddMangaPageDto {
  @IsUUID()
  chapterId!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  orderIndex?: number;
}

/**
 * 批量添加页面到章节请求
 */
export class BatchAddMangaPagesDto {
  @IsUUID()
  chapterId!: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  startIndex?: number;
}

/**
 * 重新排序页面请求
 */
export class ReorderMangaPagesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  pageIds!: string[];
}

/**
 * 重新排序页面响应
 */
export interface ReorderMangaPagesResponseDto {
  message: string;
  updatedCount: number;
}

/**
 * 删除页面响应
 */
export interface DeleteMangaPageResponseDto {
  message: string;
}

/**
 * 替换页面请求
 */
export class ReplaceMangaPageDto {
  @IsUUID()
  pageId!: string;
}

/**
 * 替换页面响应
 */
export interface ReplaceMangaPageResponseDto {
  message: string;
  page: MangaPageUploadResultDto;
}
