import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as mammoth from 'mammoth';
import type { ParsedNovelContent } from './interfaces/parsed-novel-content.interface.js';

/**
 * DOCX 文件解析服务
 * Service for parsing uploaded DOCX files for novel import
 *
 * Features:
 * - Extract text content from DOCX files
 * - Preserve paragraph structure with double newlines
 * - Strip formatting (bold, italic, etc.) - plain text only
 * - Ignore images (text-only extraction)
 */
@Injectable()
export class DocxParserService {
  private readonly logger = new Logger(DocxParserService.name);

  /**
   * 解析 DOCX 文件
   * Parse a DOCX file buffer into text content
   *
   * @param buffer - File buffer to parse
   * @returns ParsedNovelContent with raw content and file size
   * @throws BadRequestException if file is empty or parsing fails
   */
  async parseDocxFile(buffer: Buffer): Promise<ParsedNovelContent> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('File is empty');
    }

    const fileSize = buffer.length;
    this.logger.debug(`Parsing DOCX file, size: ${fileSize} bytes`);

    try {
      // Use mammoth to extract raw text from DOCX
      // extractRawText ignores formatting and returns plain text
      const result = await mammoth.extractRawText({ buffer });

      if (result.messages && result.messages.length > 0) {
        // Log any warnings from mammoth
        result.messages.forEach((msg) => {
          this.logger.warn(`Mammoth warning: ${msg.message}`);
        });
      }

      let rawContent = result.value;

      if (!rawContent || rawContent.trim().length === 0) {
        throw new BadRequestException('File content is empty after parsing');
      }

      // Normalize line endings and ensure paragraph breaks are double newlines
      rawContent = this.normalizeContent(rawContent);

      this.logger.log(
        `Successfully parsed DOCX file: ${fileSize} bytes, content length: ${rawContent.length} chars`,
      );

      return {
        rawContent,
        encoding: 'UTF-8', // DOCX files are always UTF-8 internally
        fileSize,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Failed to parse DOCX file:`, error);
      throw new BadRequestException(
        'Failed to parse DOCX file. Please ensure the file is a valid DOCX document.',
      );
    }
  }

  /**
   * 标准化内容格式
   * Normalize content format
   *
   * - Normalize line endings to \n
   * - Ensure paragraph breaks are double newlines
   * - Trim excessive whitespace
   *
   * @param content - Raw content from mammoth
   * @returns Normalized content
   */
  private normalizeContent(content: string): string {
    // Normalize line endings (CRLF -> LF)
    let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // mammoth.extractRawText already separates paragraphs with newlines
    // We need to ensure double newlines between paragraphs for consistency
    // First, collapse multiple newlines to double newlines
    normalized = normalized.replace(/\n{3,}/g, '\n\n');

    // Trim leading/trailing whitespace from each line while preserving structure
    normalized = normalized
      .split('\n')
      .map((line) => line.trim())
      .join('\n');

    // Remove leading/trailing whitespace from the entire content
    normalized = normalized.trim();

    return normalized;
  }
}
