/**
 * Storage Module Exports
 * 存储模块导出
 */

// Services
export { S3Service } from './s3.service.js';
export { UploadService } from './upload.service.js';
export type {
  UploadType,
  UploadResult,
  ImageUploadResult,
  ThumbnailUploadResult,
  FileInput,
} from './upload.service.js';
export { ImageProcessingService } from './image-processing.service.js';
export type {
  ImageType,
  ThumbnailSize,
  ImageProcessingOptions,
  ProcessedImage,
  ThumbnailResult,
} from './image-processing.service.js';

// Module
export { StorageModule } from './storage.module.js';
