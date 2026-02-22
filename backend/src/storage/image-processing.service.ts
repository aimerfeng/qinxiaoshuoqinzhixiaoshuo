import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import sharp, { Sharp, ResizeOptions, WebpOptions } from 'sharp';

/**
 * 图片类型定义
 */
export type ImageType = 'avatar' | 'cover' | 'content';

/**
 * 缩略图尺寸配置
 */
export interface ThumbnailSize {
  width: number;
  height: number | null; // null 表示保持宽高比
  suffix: string;
}

/**
 * 图片处理选项
 */
export interface ImageProcessingOptions {
  quality?: number; // 压缩质量 1-100
  format?: 'webp' | 'jpeg' | 'png' | 'original';
  maxWidth?: number;
  maxHeight?: number;
  fit?: ResizeOptions['fit'];
}

/**
 * 处理后的图片结果
 */
export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

/**
 * 缩略图生成结果
 */
export interface ThumbnailResult {
  suffix: string;
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

/**
 * 图片处理服务
 * 使用 Sharp.js 进行图片压缩和缩略图生成
 */
@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  /**
   * 各类型图片的缩略图尺寸配置
   */
  private readonly thumbnailConfigs: Record<ImageType, ThumbnailSize[]> = {
    avatar: [
      { width: 64, height: 64, suffix: '_64' },
      { width: 128, height: 128, suffix: '_128' },
      { width: 256, height: 256, suffix: '_256' },
    ],
    cover: [
      { width: 200, height: 300, suffix: '_sm' },
      { width: 400, height: 600, suffix: '_md' },
    ],
    content: [
      { width: 800, height: null, suffix: '_800' }, // 保持宽高比，最大宽度800px
    ],
  };

  /**
   * 默认压缩配置
   */
  private readonly defaultOptions: Record<ImageType, ImageProcessingOptions> = {
    avatar: {
      quality: 85,
      format: 'webp',
      fit: 'cover',
    },
    cover: {
      quality: 80,
      format: 'webp',
      fit: 'cover',
    },
    content: {
      quality: 85,
      format: 'webp',
      fit: 'inside',
    },
  };

  /**
   * 压缩图片
   * @param input 输入图片 Buffer
   * @param options 处理选项
   */
  async compressImage(
    input: Buffer,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessedImage> {
    const {
      quality = 85,
      format = 'webp',
      maxWidth,
      maxHeight,
      fit = 'inside',
    } = options;

    this.logger.debug(
      `Compressing image: quality=${quality}, format=${format}`,
    );

    try {
      let pipeline: Sharp = sharp(input);

      // 获取原始图片信息
      const metadata = await pipeline.metadata();
      this.logger.debug(
        `Original image: ${metadata.width}x${metadata.height}, format=${metadata.format}`,
      );

      // 如果指定了最大尺寸，进行缩放
      if (maxWidth || maxHeight) {
        pipeline = pipeline.resize({
          width: maxWidth,
          height: maxHeight,
          fit,
          withoutEnlargement: true, // 不放大小图
        });
      }

      // 应用输出格式
      pipeline = this.applyOutputFormat(pipeline, format, quality);

      const outputBuffer = await pipeline.toBuffer();
      const outputMetadata = await sharp(outputBuffer).metadata();

      const result: ProcessedImage = {
        buffer: outputBuffer,
        width: outputMetadata.width || 0,
        height: outputMetadata.height || 0,
        format: format === 'original' ? metadata.format || 'unknown' : format,
        size: outputBuffer.length,
      };

      this.logger.debug(
        `Compressed image: ${result.width}x${result.height}, size=${result.size} bytes`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Failed to compress image: ${error}`);
      throw new BadRequestException('Failed to process image');
    }
  }

  /**
   * 处理图片并生成缩略图
   * @param input 输入图片 Buffer
   * @param imageType 图片类型
   * @param customOptions 自定义选项（覆盖默认配置）
   */
  async processImage(
    input: Buffer,
    imageType: ImageType,
    customOptions?: Partial<ImageProcessingOptions>,
  ): Promise<{
    original: ProcessedImage;
    thumbnails: ThumbnailResult[];
  }> {
    const options = {
      ...this.defaultOptions[imageType],
      ...customOptions,
    };

    this.logger.debug(`Processing ${imageType} image`);

    // 压缩原图
    const original = await this.compressImage(input, options);

    // 生成缩略图
    const thumbnails = await this.generateThumbnails(input, imageType, options);

    return { original, thumbnails };
  }

  /**
   * 生成多个尺寸的缩略图
   * @param input 输入图片 Buffer
   * @param imageType 图片类型
   * @param options 处理选项
   */
  async generateThumbnails(
    input: Buffer,
    imageType: ImageType,
    options: ImageProcessingOptions = {},
  ): Promise<ThumbnailResult[]> {
    const sizes = this.thumbnailConfigs[imageType];
    if (!sizes || sizes.length === 0) {
      return [];
    }

    const { quality = 85, format = 'webp' } = options;

    this.logger.debug(`Generating ${sizes.length} thumbnails for ${imageType}`);

    const results: ThumbnailResult[] = [];

    for (const size of sizes) {
      try {
        const thumbnail = await this.generateSingleThumbnail(
          input,
          size,
          quality,
          format,
          imageType,
        );
        results.push(thumbnail);
      } catch (error) {
        this.logger.error(
          `Failed to generate thumbnail ${size.suffix}: ${error}`,
        );
        // 继续处理其他尺寸
      }
    }

    return results;
  }

  /**
   * 生成单个缩略图
   */
  private async generateSingleThumbnail(
    input: Buffer,
    size: ThumbnailSize,
    quality: number,
    format: ImageProcessingOptions['format'],
    imageType: ImageType,
  ): Promise<ThumbnailResult> {
    let pipeline: Sharp = sharp(input);

    // 根据图片类型选择合适的缩放策略
    const fit = this.getFitStrategy(imageType, size);

    pipeline = pipeline.resize({
      width: size.width,
      height: size.height || undefined,
      fit,
      withoutEnlargement: true,
    });

    // 应用输出格式
    pipeline = this.applyOutputFormat(pipeline, format || 'webp', quality);

    const outputBuffer = await pipeline.toBuffer();
    const metadata = await sharp(outputBuffer).metadata();

    return {
      suffix: size.suffix,
      buffer: outputBuffer,
      width: metadata.width || size.width,
      height: metadata.height || size.height || 0,
      format:
        format === 'original' ? metadata.format || 'unknown' : format || 'webp',
      size: outputBuffer.length,
    };
  }

  /**
   * 根据图片类型获取缩放策略
   */
  private getFitStrategy(
    imageType: ImageType,
    size: ThumbnailSize,
  ): ResizeOptions['fit'] {
    // 头像和封面使用 cover（裁剪填充）
    if (imageType === 'avatar' || imageType === 'cover') {
      return 'cover';
    }
    // 内容图片使用 inside（保持宽高比，不超出边界）
    if (size.height === null) {
      return 'inside';
    }
    return 'inside';
  }

  /**
   * 应用输出格式
   */
  private applyOutputFormat(
    pipeline: Sharp,
    format: ImageProcessingOptions['format'],
    quality: number,
  ): Sharp {
    const webpOptions: WebpOptions = {
      quality,
      effort: 4, // 压缩努力程度 0-6
    };

    switch (format) {
      case 'webp':
        return pipeline.webp(webpOptions);
      case 'jpeg':
        return pipeline.jpeg({ quality, mozjpeg: true });
      case 'png':
        return pipeline.png({ quality, compressionLevel: 9 });
      case 'original':
      default:
        // 保持原格式，但仍应用质量设置
        return pipeline;
    }
  }

  /**
   * 获取图片元数据
   * @param input 输入图片 Buffer
   */
  async getImageMetadata(input: Buffer): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
  }> {
    try {
      const metadata = await sharp(input).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: input.length,
        hasAlpha: metadata.hasAlpha || false,
      };
    } catch (error) {
      this.logger.error(`Failed to get image metadata: ${error}`);
      throw new BadRequestException('Invalid image file');
    }
  }

  /**
   * 验证图片是否有效
   * @param input 输入图片 Buffer
   */
  async validateImage(input: Buffer): Promise<boolean> {
    try {
      const metadata = await sharp(input).metadata();
      return !!(metadata.width && metadata.height);
    } catch {
      return false;
    }
  }

  /**
   * 获取指定图片类型的缩略图配置
   * @param imageType 图片类型
   */
  getThumbnailSizes(imageType: ImageType): ThumbnailSize[] {
    return [...(this.thumbnailConfigs[imageType] || [])];
  }

  /**
   * 获取指定图片类型的默认处理选项
   * @param imageType 图片类型
   */
  getDefaultOptions(imageType: ImageType): ImageProcessingOptions {
    return { ...this.defaultOptions[imageType] };
  }

  /**
   * 旋转图片（根据 EXIF 信息自动旋转）
   * @param input 输入图片 Buffer
   */
  async autoRotate(input: Buffer): Promise<Buffer> {
    try {
      return await sharp(input).rotate().toBuffer();
    } catch (error) {
      this.logger.error(`Failed to auto-rotate image: ${error}`);
      throw new BadRequestException('Failed to process image');
    }
  }

  /**
   * 转换图片格式
   * @param input 输入图片 Buffer
   * @param targetFormat 目标格式
   * @param quality 质量
   */
  async convertFormat(
    input: Buffer,
    targetFormat: 'webp' | 'jpeg' | 'png',
    quality = 85,
  ): Promise<ProcessedImage> {
    return this.compressImage(input, {
      format: targetFormat,
      quality,
    });
  }
}
