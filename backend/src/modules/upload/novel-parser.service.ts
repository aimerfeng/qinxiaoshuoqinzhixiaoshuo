import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as iconv from 'iconv-lite';
import type { ParsedNovelContent } from './interfaces/parsed-novel-content.interface.js';

/**
 * 支持的编码列表
 * Supported encodings for TXT file parsing
 */
export const SUPPORTED_ENCODINGS = ['UTF-8', 'GBK', 'GB2312'] as const;
export type SupportedEncoding = (typeof SUPPORTED_ENCODINGS)[number];

/**
 * 小说解析服务
 * Service for parsing uploaded TXT files for novel import
 *
 * Features:
 * - Support for common encodings: UTF-8, GBK, GB2312
 * - Auto-detect encoding if not specified
 * - Parse content into raw text
 */
@Injectable()
export class NovelParserService {
  private readonly logger = new Logger(NovelParserService.name);

  /**
   * UTF-8 BOM 标记
   */
  private readonly UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

  /**
   * 解析 TXT 文件
   * Parse a TXT file buffer into text content
   *
   * @param buffer - File buffer to parse
   * @param encoding - Optional encoding to use (auto-detect if not specified)
   * @returns ParsedNovelContent with raw content, encoding, and file size
   * @throws BadRequestException if file is empty or encoding conversion fails
   */
  parseTxtFile(buffer: Buffer, encoding?: string): ParsedNovelContent {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }

    const fileSize = buffer.length;
    this.logger.debug(`Parsing TXT file, size: ${fileSize} bytes`);

    // Determine encoding
    const detectedEncoding = encoding || this.detectEncoding(buffer);
    this.logger.debug(`Using encoding: ${detectedEncoding}`);

    // Decode content
    const rawContent = this.decodeBuffer(buffer, detectedEncoding);

    if (!rawContent || rawContent.trim().length === 0) {
      throw new BadRequestException('File content is empty after decoding');
    }

    this.logger.log(
      `Successfully parsed TXT file: ${fileSize} bytes, encoding: ${detectedEncoding}, content length: ${rawContent.length} chars`,
    );

    return {
      rawContent,
      encoding: detectedEncoding,
      fileSize,
    };
  }

  /**
   * 检测文件编码
   * Auto-detect file encoding
   *
   * Strategy:
   * 1. Check for UTF-8 BOM
   * 2. Try UTF-8 decoding and validate
   * 3. Fall back to GBK/GB2312 for Chinese content
   *
   * @param buffer - File buffer to analyze
   * @returns Detected encoding string
   */
  detectEncoding(buffer: Buffer): string {
    // Check for UTF-8 BOM
    if (this.hasUtf8Bom(buffer)) {
      this.logger.debug('Detected UTF-8 BOM');
      return 'UTF-8';
    }

    // Try UTF-8 first
    if (this.isValidUtf8(buffer)) {
      this.logger.debug('Content is valid UTF-8');
      return 'UTF-8';
    }

    // Fall back to GBK for Chinese content
    this.logger.debug('Falling back to GBK encoding');
    return 'GBK';
  }

  /**
   * 检查是否有 UTF-8 BOM
   * Check if buffer starts with UTF-8 BOM
   */
  private hasUtf8Bom(buffer: Buffer): boolean {
    if (buffer.length < 3) {
      return false;
    }
    return (
      buffer[0] === this.UTF8_BOM[0] &&
      buffer[1] === this.UTF8_BOM[1] &&
      buffer[2] === this.UTF8_BOM[2]
    );
  }

  /**
   * 验证是否为有效的 UTF-8 编码
   * Validate if buffer contains valid UTF-8 content
   *
   * Checks for:
   * - Valid UTF-8 byte sequences
   * - No replacement characters after decoding
   */
  private isValidUtf8(buffer: Buffer): boolean {
    try {
      // Remove BOM if present
      const contentBuffer = this.hasUtf8Bom(buffer) ? buffer.slice(3) : buffer;

      // Decode as UTF-8
      const decoded = contentBuffer.toString('utf8');

      // Check for replacement character (indicates invalid UTF-8)
      // The replacement character (U+FFFD) appears when invalid bytes are encountered
      if (decoded.includes('\uFFFD')) {
        return false;
      }

      // Additional validation: check for common invalid patterns
      // UTF-8 should not have isolated high bytes that don't form valid sequences
      return this.validateUtf8Sequences(contentBuffer);
    } catch {
      return false;
    }
  }

  /**
   * 验证 UTF-8 字节序列
   * Validate UTF-8 byte sequences
   */
  private validateUtf8Sequences(buffer: Buffer): boolean {
    let i = 0;
    while (i < buffer.length) {
      const byte = buffer[i];

      if (byte <= 0x7f) {
        // ASCII character (0xxxxxxx)
        i++;
      } else if ((byte & 0xe0) === 0xc0) {
        // 2-byte sequence (110xxxxx 10xxxxxx)
        if (i + 1 >= buffer.length || (buffer[i + 1] & 0xc0) !== 0x80) {
          return false;
        }
        // Check for overlong encoding
        if ((byte & 0x1e) === 0) {
          return false;
        }
        i += 2;
      } else if ((byte & 0xf0) === 0xe0) {
        // 3-byte sequence (1110xxxx 10xxxxxx 10xxxxxx)
        if (
          i + 2 >= buffer.length ||
          (buffer[i + 1] & 0xc0) !== 0x80 ||
          (buffer[i + 2] & 0xc0) !== 0x80
        ) {
          return false;
        }
        // Check for overlong encoding
        if (byte === 0xe0 && (buffer[i + 1] & 0x20) === 0) {
          return false;
        }
        i += 3;
      } else if ((byte & 0xf8) === 0xf0) {
        // 4-byte sequence (11110xxx 10xxxxxx 10xxxxxx 10xxxxxx)
        if (
          i + 3 >= buffer.length ||
          (buffer[i + 1] & 0xc0) !== 0x80 ||
          (buffer[i + 2] & 0xc0) !== 0x80 ||
          (buffer[i + 3] & 0xc0) !== 0x80
        ) {
          return false;
        }
        // Check for overlong encoding
        if (byte === 0xf0 && (buffer[i + 1] & 0x30) === 0) {
          return false;
        }
        i += 4;
      } else {
        // Invalid UTF-8 start byte
        return false;
      }
    }
    return true;
  }

  /**
   * 解码 Buffer 为字符串
   * Decode buffer to string using specified encoding
   *
   * @param buffer - Buffer to decode
   * @param encoding - Encoding to use
   * @returns Decoded string
   */
  private decodeBuffer(buffer: Buffer, encoding: string): string {
    // Remove UTF-8 BOM if present
    let contentBuffer = buffer;
    if (encoding.toUpperCase() === 'UTF-8' && this.hasUtf8Bom(buffer)) {
      contentBuffer = buffer.slice(3);
    }

    // Normalize encoding name
    const normalizedEncoding = this.normalizeEncoding(encoding);

    // Use iconv-lite for decoding
    if (!iconv.encodingExists(normalizedEncoding)) {
      this.logger.warn(
        `Encoding ${normalizedEncoding} not supported, falling back to UTF-8`,
      );
      return contentBuffer.toString('utf8');
    }

    try {
      return iconv.decode(contentBuffer, normalizedEncoding);
    } catch (error) {
      this.logger.error(`Failed to decode with ${normalizedEncoding}:`, error);
      throw new BadRequestException(
        `Failed to decode file with encoding: ${encoding}`,
      );
    }
  }

  /**
   * 标准化编码名称
   * Normalize encoding name for iconv-lite
   */
  private normalizeEncoding(encoding: string): string {
    const normalized = encoding.toUpperCase().replace(/-/g, '');

    // Map common encoding names
    const encodingMap: Record<string, string> = {
      UTF8: 'utf8',
      GBK: 'gbk',
      GB2312: 'gb2312',
      GB18030: 'gb18030',
      BIG5: 'big5',
    };

    return encodingMap[normalized] || encoding.toLowerCase();
  }

  /**
   * 验证编码是否支持
   * Check if encoding is supported
   */
  isEncodingSupported(encoding: string): boolean {
    const normalized = this.normalizeEncoding(encoding);
    return iconv.encodingExists(normalized);
  }

  /**
   * 获取支持的编码列表
   * Get list of supported encodings
   */
  getSupportedEncodings(): readonly string[] {
    return SUPPORTED_ENCODINGS;
  }
}
