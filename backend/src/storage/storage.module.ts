import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service.js';
import { UploadService } from './upload.service.js';
import { ImageProcessingService } from './image-processing.service.js';

/**
 * 存储模块
 * 全局模块，提供 S3 兼容的文件存储服务
 * 支持 MinIO（本地开发）和 AWS S3（生产环境）
 * 包含图片处理服务（压缩、缩略图生成）
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [S3Service, UploadService, ImageProcessingService],
  exports: [S3Service, UploadService, ImageProcessingService],
})
export class StorageModule {}
