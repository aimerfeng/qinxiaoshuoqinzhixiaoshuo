import type { MangaPageUploadResultDto } from './manga-upload.dto.js';

/**
 * 压缩包上传响应
 */
export interface ArchiveUploadResponseDto {
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

  /** 跳过的文件数（非图片） */
  skippedFiles: number;

  /** 跳过的文件名列表 */
  skippedFileNames: string[];

  /** 压缩包内总文件数 */
  totalFilesInArchive: number;
}

/**
 * 压缩包预览响应
 */
export interface ArchivePreviewResponseDto {
  /** 响应消息 */
  message: string;

  /** 图片文件列表 */
  images: ArchiveImagePreviewDto[];

  /** 图片数量 */
  imageCount: number;

  /** 跳过的文件数 */
  skippedFiles: number;

  /** 跳过的文件名列表 */
  skippedFileNames: string[];

  /** 压缩包内总文件数 */
  totalFiles: number;
}

/**
 * 压缩包内图片预览
 */
export interface ArchiveImagePreviewDto {
  /** 文件名 */
  filename: string;

  /** 原始路径 */
  originalPath: string;

  /** 文件大小 */
  size: number;

  /** 排序索引 */
  orderIndex: number;
}
