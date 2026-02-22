import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { S3Service } from './s3.service.js';
import {
  ImageProcessingService,
  type ImageType,
} from './image-processing.service.js';

/**
 * 上传类型定义
 */
export type UploadType =
  | 'avatar'
  | 'cover'
  | 'content'
  | 'attachment'
  | 'chapter-image';

/**
 * 上传类型配置
 */
interface UploadTypeConfig {
  maxSize: number; // 最大文件大小（字节）
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  pathPrefix: string;
}

/**
 * 上传结果
 */
export interface UploadResult {
  key: string;
  url: string;
  publicUrl: string;
  size: number;
  contentType: string;
}

/**
 * 带缩略图的上传结果
 */
export interface ImageUploadResult extends UploadResult {
  thumbnails: ThumbnailUploadResult[];
  originalWidth: number;
  originalHeight: number;
}

/**
 * 缩略图上传结果
 */
export interface ThumbnailUploadResult {
  key: string;
  url: string;
  publicUrl: string;
  width: number;
  height: number;
  size: number;
  suffix: string;
}

/**
 * 文件输入类型
 */
export interface FileInput {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
}

/**
 * 文件上传服务
 * 处理各种类型的文件上传，包括头像、封面、内容图片和附件
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  /**
   * 上传类型配置映射
   */
  private readonly uploadConfigs: Record<UploadType, UploadTypeConfig> = {
    avatar: {
      maxSize: 2 * 1024 * 1024, // 2MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      pathPrefix: 'avatars',
    },
    cover: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
      pathPrefix: 'covers',
    },
    content: {
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      pathPrefix: 'content',
    },
    attachment: {
      maxSize: 20 * 1024 * 1024, // 20MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed',
      ],
      allowedExtensions: [
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.pdf',
        '.doc',
        '.docx',
        '.txt',
        '.zip',
        '.rar',
      ],
      pathPrefix: 'attachments',
    },
    'chapter-image': {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      pathPrefix: 'chapter-images',
    },
  };

  constructor(
    private readonly s3Service: S3Service,
    private readonly imageProcessingService: ImageProcessingService,
  ) {}

  /**
   * 上传用户头像（带图片处理和缩略图生成）
   * @param userId 用户ID
   * @param file 文件信息
   */
  async uploadAvatar(
    userId: string,
    file: FileInput,
  ): Promise<ImageUploadResult> {
    this.validateFile(file, 'avatar');
    return this.uploadImageWithThumbnails(userId, file, 'avatar');
  }

  /**
   * 上传作品封面（带图片处理和缩略图生成）
   * @param workId 作品ID
   * @param file 文件信息
   */
  async uploadCover(
    workId: string,
    file: FileInput,
  ): Promise<ImageUploadResult> {
    this.validateFile(file, 'cover');
    return this.uploadImageWithThumbnails(workId, file, 'cover');
  }

  /**
   * 上传章节内容图片（带图片处理和缩略图生成）
   * @param chapterId 章节ID
   * @param file 文件信息
   */
  async uploadContentImage(
    chapterId: string,
    file: FileInput,
  ): Promise<ImageUploadResult> {
    this.validateFile(file, 'content');
    return this.uploadImageWithThumbnails(chapterId, file, 'content');
  }

  /**
   * 上传编辑器章节图片（用于创作者控制台编辑器）
   * 存储在 chapter-images 目录，最大 5MB
   * @param userId 用户ID
   * @param file 文件信息
   */
  async uploadChapterImage(
    userId: string,
    file: FileInput,
  ): Promise<UploadResult> {
    this.validateFile(file, 'chapter-image');
    const key = this.generateFilePath(
      'chapter-image',
      userId,
      file.originalname,
    );
    return this.uploadFile(key, file);
  }

  /**
   * 上传图片并生成缩略图
   * @param id 关联ID（用户ID、作品ID或章节ID）
   * @param file 文件信息
   * @param imageType 图片类型
   */
  private async uploadImageWithThumbnails(
    id: string,
    file: FileInput,
    imageType: ImageType,
  ): Promise<ImageUploadResult> {
    this.logger.debug(`Processing ${imageType} image for ${id}`);

    // 验证图片有效性
    const isValid = await this.imageProcessingService.validateImage(
      file.buffer,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid image file');
    }

    // 获取原始图片元数据
    const originalMetadata = await this.imageProcessingService.getImageMetadata(
      file.buffer,
    );

    // 处理图片（压缩 + 生成缩略图）
    const { original, thumbnails } =
      await this.imageProcessingService.processImage(file.buffer, imageType);

    // 生成文件路径（使用 webp 扩展名）
    const baseKey = this.generateImageBasePath(
      imageType as UploadType,
      id,
      file.originalname,
    );
    const originalKey = `${baseKey}.webp`;

    // 上传压缩后的原图
    const { key: uploadedKey, url } = await this.s3Service.uploadFile(
      originalKey,
      original.buffer,
      'image/webp',
      {
        originalName: file.originalname,
        originalFormat: originalMetadata.format,
        originalWidth: String(originalMetadata.width),
        originalHeight: String(originalMetadata.height),
        uploadedAt: new Date().toISOString(),
      },
    );

    const publicUrl = this.s3Service.getPublicUrl(uploadedKey);

    // 上传缩略图
    const thumbnailResults: ThumbnailUploadResult[] = [];
    for (const thumbnail of thumbnails) {
      const thumbnailKey = `${baseKey}${thumbnail.suffix}.webp`;
      const { key: thumbKey, url: thumbUrl } = await this.s3Service.uploadFile(
        thumbnailKey,
        thumbnail.buffer,
        'image/webp',
      );

      thumbnailResults.push({
        key: thumbKey,
        url: thumbUrl,
        publicUrl: this.s3Service.getPublicUrl(thumbKey),
        width: thumbnail.width,
        height: thumbnail.height,
        size: thumbnail.size,
        suffix: thumbnail.suffix,
      });
    }

    this.logger.log(
      `Image uploaded: ${uploadedKey} with ${thumbnailResults.length} thumbnails`,
    );

    return {
      key: uploadedKey,
      url,
      publicUrl,
      size: original.size,
      contentType: 'image/webp',
      thumbnails: thumbnailResults,
      originalWidth: originalMetadata.width,
      originalHeight: originalMetadata.height,
    };
  }

  /**
   * 上传原始图片（不进行处理）
   * @param userId 用户ID
   * @param file 文件信息
   * @param type 上传类型
   */
  async uploadRawImage(
    userId: string,
    file: FileInput,
    type: UploadType = 'content',
  ): Promise<UploadResult> {
    this.validateFile(file, type);
    const key = this.generateFilePath(type, userId, file.originalname);
    return this.uploadFile(key, file);
  }

  /**
   * 上传通用附件
   * @param userId 用户ID
   * @param file 文件信息
   */
  async uploadAttachment(
    userId: string,
    file: FileInput,
  ): Promise<UploadResult> {
    this.validateFile(file, 'attachment');
    const key = this.generateAttachmentPath(userId, file.originalname);
    return this.uploadFile(key, file);
  }

  /**
   * 通过URL删除文件
   * @param fileUrl 文件URL
   */
  async deleteFile(fileUrl: string): Promise<void> {
    const key = this.extractKeyFromUrl(fileUrl);
    if (!key) {
      throw new BadRequestException('Invalid file URL');
    }
    await this.s3Service.deleteFile(key);
    this.logger.log(`File deleted: ${key}`);
  }

  /**
   * 删除图片及其所有缩略图
   * @param fileUrl 原图URL
   * @param imageType 图片类型（用于确定缩略图后缀）
   */
  async deleteImageWithThumbnails(
    fileUrl: string,
    imageType: ImageType,
  ): Promise<void> {
    const key = this.extractKeyFromUrl(fileUrl);
    if (!key) {
      throw new BadRequestException('Invalid file URL');
    }

    // 删除原图
    await this.s3Service.deleteFile(key);
    this.logger.log(`Original image deleted: ${key}`);

    // 获取缩略图后缀并删除
    const thumbnailSizes =
      this.imageProcessingService.getThumbnailSizes(imageType);
    const baseKey = key.replace(/\.webp$/, '');

    for (const size of thumbnailSizes) {
      const thumbnailKey = `${baseKey}${size.suffix}.webp`;
      try {
        await this.s3Service.deleteFile(thumbnailKey);
        this.logger.log(`Thumbnail deleted: ${thumbnailKey}`);
      } catch (error) {
        // 缩略图可能不存在，忽略错误
        this.logger.debug(
          `Thumbnail not found or already deleted: ${thumbnailKey}`,
        );
      }
    }
  }

  /**
   * 验证文件是否符合指定类型的要求
   * @param file 文件信息
   * @param type 上传类型
   */
  validateFile(file: FileInput, type: UploadType): void {
    const config = this.uploadConfigs[type];

    if (!config) {
      throw new BadRequestException(`Unknown upload type: ${type}`);
    }

    // 验证文件大小
    if (file.size > config.maxSize) {
      const maxSizeMB = config.maxSize / (1024 * 1024);
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${maxSizeMB}MB for ${type}`,
      );
    }

    // 验证 MIME 类型
    if (!config.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type "${file.mimetype}" is not allowed for ${type}. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
      );
    }

    // 验证文件扩展名
    const extension = this.getFileExtension(file.originalname).toLowerCase();
    if (!config.allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `File extension "${extension}" is not allowed for ${type}. Allowed extensions: ${config.allowedExtensions.join(', ')}`,
      );
    }
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return this.s3Service.isAvailable();
  }

  /**
   * 获取上传类型配置
   * @param type 上传类型
   */
  getUploadConfig(type: UploadType): UploadTypeConfig {
    return { ...this.uploadConfigs[type] };
  }

  /**
   * 上传文件到S3
   */
  private async uploadFile(
    key: string,
    file: FileInput,
  ): Promise<UploadResult> {
    const { key: uploadedKey, url } = await this.s3Service.uploadFile(
      key,
      file.buffer,
      file.mimetype,
      {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    );

    const publicUrl = this.s3Service.getPublicUrl(uploadedKey);

    this.logger.log(`File uploaded: ${uploadedKey} (${file.size} bytes)`);

    return {
      key: uploadedKey,
      url,
      publicUrl,
      size: file.size,
      contentType: file.mimetype,
    };
  }

  /**
   * 生成图片基础路径（不含扩展名）
   * 格式: {prefix}/{id}/{timestamp}_{sanitizedFilename}
   */
  private generateImageBasePath(
    type: UploadType,
    id: string,
    originalName: string,
  ): string {
    const config = this.uploadConfigs[type];
    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFilenameWithoutExt(originalName);
    return `${config.pathPrefix}/${id}/${timestamp}_${sanitizedName}`;
  }

  /**
   * 清理文件名（不含扩展名）
   */
  private sanitizeFilenameWithoutExt(filename: string): string {
    const extension = this.getFileExtension(filename);
    const nameWithoutExt = filename.slice(
      0,
      filename.length - extension.length,
    );

    const sanitized = nameWithoutExt
      .replace(/[^\w\u4e00-\u9fa5.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 100);

    return sanitized || 'image';
  }

  /**
   * 生成文件路径
   * 格式: {prefix}/{id}/{timestamp}_{sanitizedFilename}
   */
  private generateFilePath(
    type: UploadType,
    id: string,
    originalName: string,
  ): string {
    const config = this.uploadConfigs[type];
    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFilename(originalName);
    return `${config.pathPrefix}/${id}/${timestamp}_${sanitizedName}`;
  }

  /**
   * 生成附件文件路径
   * 格式: attachments/{userId}/{year}/{month}/{timestamp}_{sanitizedFilename}
   */
  private generateAttachmentPath(userId: string, originalName: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const timestamp = Date.now();
    const sanitizedName = this.sanitizeFilename(originalName);
    return `attachments/${userId}/${year}/${month}/${timestamp}_${sanitizedName}`;
  }

  /**
   * 清理文件名，移除不安全字符
   */
  private sanitizeFilename(filename: string): string {
    // 获取扩展名
    const extension = this.getFileExtension(filename);
    // 获取不带扩展名的文件名
    const nameWithoutExt = filename.slice(
      0,
      filename.length - extension.length,
    );

    // 清理文件名：只保留字母、数字、中文、下划线和连字符
    const sanitized = nameWithoutExt
      .replace(/[^\w\u4e00-\u9fa5.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 100); // 限制长度

    // 如果清理后为空，使用默认名称
    const finalName = sanitized || 'file';

    return `${finalName}${extension.toLowerCase()}`;
  }

  /**
   * 获取文件扩展名
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
      return '';
    }
    return filename.slice(lastDotIndex);
  }

  /**
   * 从URL中提取文件key
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // 移除开头的斜杠和bucket名称（如果存在）
      const bucket = this.s3Service.getBucket();
      let key = pathname.startsWith('/') ? pathname.slice(1) : pathname;

      // 如果路径以bucket名称开头，移除它
      if (key.startsWith(`${bucket}/`)) {
        key = key.slice(bucket.length + 1);
      }

      return key || null;
    } catch {
      // 如果不是有效URL，尝试直接作为key使用
      return url.startsWith('/') ? url.slice(1) : url;
    }
  }
}
