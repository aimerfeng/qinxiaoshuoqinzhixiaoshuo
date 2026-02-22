import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import AdmZip from 'adm-zip';
import * as path from 'path';

/**
 * 解析后的图片文件
 */
export interface ExtractedImage {
  /** 文件名（不含路径） */
  filename: string;
  /** 原始路径（压缩包内） */
  originalPath: string;
  /** 文件内容 */
  buffer: Buffer;
  /** MIME 类型 */
  mimetype: string;
  /** 文件大小 */
  size: number;
  /** 排序索引（基于文件名） */
  orderIndex: number;
}

/**
 * 压缩包解析结果
 */
export interface ArchiveParseResult {
  /** 解析出的图片列表 */
  images: ExtractedImage[];
  /** 总文件数 */
  totalFiles: number;
  /** 跳过的文件数（非图片） */
  skippedFiles: number;
  /** 跳过的文件名列表 */
  skippedFileNames: string[];
}

/**
 * 支持的压缩包格式
 */
export type SupportedArchiveType = 'zip' | 'cbz';

/**
 * 支持的图片格式
 */
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/**
 * 图片 MIME 类型映射
 */
const MIME_TYPE_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

/**
 * 压缩包解析服务
 * 支持 ZIP 和 CBZ（漫画压缩包）格式
 *
 * 任务 3.5.4: 压缩包解析（ZIP/RAR）
 */
@Injectable()
export class ArchiveParserService {
  private readonly logger = new Logger(ArchiveParserService.name);

  /**
   * 解析压缩包并提取图片
   * @param buffer 压缩包文件内容
   * @param filename 原始文件名（用于判断格式）
   */
  async parseArchive(
    buffer: Buffer,
    filename: string,
  ): Promise<ArchiveParseResult> {
    const ext = path.extname(filename).toLowerCase();

    if (ext === '.zip' || ext === '.cbz') {
      return this.parseZipArchive(buffer);
    }

    throw new BadRequestException(`不支持的压缩包格式: ${ext}，支持 ZIP、CBZ`);
  }

  /**
   * 解析 ZIP/CBZ 压缩包
   */
  private async parseZipArchive(buffer: Buffer): Promise<ArchiveParseResult> {
    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      const images: ExtractedImage[] = [];
      const skippedFileNames: string[] = [];
      let totalFiles = 0;

      for (const entry of entries) {
        // 跳过目录
        if (entry.isDirectory) {
          continue;
        }

        totalFiles++;
        const entryName = entry.entryName;
        const ext = path.extname(entryName).toLowerCase();

        // 检查是否是支持的图片格式
        if (!SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
          skippedFileNames.push(entryName);
          continue;
        }

        // 跳过隐藏文件和系统文件
        const basename = path.basename(entryName);
        if (basename.startsWith('.') || basename.startsWith('__MACOSX')) {
          skippedFileNames.push(entryName);
          continue;
        }

        const imageBuffer = entry.getData();
        const mimetype = MIME_TYPE_MAP[ext] || 'application/octet-stream';

        images.push({
          filename: basename,
          originalPath: entryName,
          buffer: imageBuffer,
          mimetype,
          size: imageBuffer.length,
          orderIndex: 0, // 稍后排序
        });
      }

      // 按文件名自然排序
      images.sort((a, b) =>
        a.originalPath.localeCompare(b.originalPath, undefined, {
          numeric: true,
          sensitivity: 'base',
        }),
      );

      // 设置排序索引
      images.forEach((img, index) => {
        img.orderIndex = index;
      });

      this.logger.log(
        `Parsed ZIP archive: ${images.length} images, ${skippedFileNames.length} skipped`,
      );

      return {
        images,
        totalFiles,
        skippedFiles: skippedFileNames.length,
        skippedFileNames,
      };
    } catch (error) {
      this.logger.error(`Failed to parse ZIP archive: ${error}`);
      throw new BadRequestException('无法解析压缩包，请确保文件格式正确');
    }
  }

  /**
   * 验证压缩包文件
   * @param buffer 文件内容
   * @param filename 文件名
   */
  validateArchive(buffer: Buffer, filename: string): void {
    const ext = path.extname(filename).toLowerCase();

    if (ext !== '.zip' && ext !== '.cbz') {
      throw new BadRequestException(
        `不支持的压缩包格式: ${ext}，支持 ZIP、CBZ`,
      );
    }

    // 检查文件大小（最大 500MB）
    const maxSize = 500 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new BadRequestException(
        `压缩包大小超过限制: ${(buffer.length / 1024 / 1024).toFixed(2)}MB，最大 500MB`,
      );
    }

    // 检查 ZIP 文件头
    if (buffer.length < 4) {
      throw new BadRequestException('无效的压缩包文件');
    }

    // ZIP 文件魔数: PK (0x50 0x4B)
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      throw new BadRequestException('无效的 ZIP 文件格式');
    }
  }

  /**
   * 获取支持的压缩包格式列表
   */
  getSupportedFormats(): string[] {
    return ['zip', 'cbz'];
  }

  /**
   * 获取支持的图片格式列表
   */
  getSupportedImageFormats(): string[] {
    return SUPPORTED_IMAGE_EXTENSIONS.map((ext) => ext.slice(1));
  }
}
