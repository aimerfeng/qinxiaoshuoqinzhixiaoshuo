import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NovelParserService } from './novel-parser.service.js';
import { DocxParserService } from './docx-parser.service.js';
import { ChapterDetectorService } from './chapter-detector.service.js';
import { ParagraphsService } from '../paragraphs/paragraphs.service.js';
import { ChaptersService } from '../chapters/chapters.service.js';
import { ChapterStatus } from '@prisma/client';
import type {
  BatchImportResult,
  BatchImportOptions,
  ImportedChapterInfo,
  FailedChapterInfo,
} from './interfaces/batch-import.interface.js';
import type { ChapterDetectionResult } from './interfaces/detected-chapter.interface.js';

/**
 * 支持的文件类型
 * Supported file types
 */
export const SUPPORTED_FILE_TYPES = ['txt', 'docx'] as const;
export type SupportedFileType = (typeof SUPPORTED_FILE_TYPES)[number];

/**
 * 批量章节导入服务
 * Service for batch importing chapters from uploaded files
 *
 * Features:
 * - Support TXT and DOCX file formats
 * - Auto-detect chapter patterns
 * - Batch create chapters in database
 * - Support custom chapter patterns
 * - Import preface as first chapter (optional)
 */
@Injectable()
export class BatchImportService {
  private readonly logger = new Logger(BatchImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly novelParserService: NovelParserService,
    private readonly docxParserService: DocxParserService,
    private readonly chapterDetectorService: ChapterDetectorService,
    private readonly paragraphsService: ParagraphsService,
  ) {}

  /**
   * 批量导入章节
   * Batch import chapters from uploaded file
   *
   * @param workId - Work ID to import chapters into
   * @param authorId - Author ID (must be work owner)
   * @param file - Uploaded file buffer
   * @param filename - Original filename
   * @param options - Import options
   * @returns BatchImportResult with import statistics
   */
  async batchImportChapters(
    workId: string,
    authorId: string,
    file: Buffer,
    filename: string,
    options: BatchImportOptions = {},
  ): Promise<BatchImportResult> {
    // Verify work exists and belongs to the author
    const work = await this.prisma.work.findUnique({
      where: { id: workId, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    if (work.authorId !== authorId) {
      throw new ForbiddenException('无权为此作品导入章节');
    }

    // Determine file type
    const fileType = this.getFileType(filename);
    this.logger.debug(`Processing file: ${filename}, type: ${fileType}`);

    // Parse file content
    const rawContent = await this.parseFile(file, fileType, options.encoding);

    // Detect chapters
    const detectionResult = this.detectChapters(
      rawContent,
      options.customPattern,
    );

    if (!detectionResult.hasChapters && detectionResult.chapters.length === 0) {
      throw new BadRequestException(
        '无法从文件中检测到章节，请检查文件格式或使用自定义章节模式',
      );
    }

    // Import chapters to database
    return this.importChaptersToDatabase(
      workId,
      authorId,
      detectionResult,
      options,
    );
  }

  /**
   * 预览章节检测结果
   * Preview chapter detection result without importing
   *
   * @param file - Uploaded file buffer
   * @param filename - Original filename
   * @param encoding - Optional encoding
   * @param customPattern - Optional custom pattern
   * @returns Chapter detection preview
   */
  async previewChapters(
    file: Buffer,
    filename: string,
    encoding?: string,
    customPattern?: string,
  ): Promise<{
    hasChapters: boolean;
    chapterCount: number;
    patternType: string | null;
    chapters: Array<{
      title: string;
      sequenceNumber: number;
      contentPreview: string;
      wordCount: number;
    }>;
    hasPreface: boolean;
    prefacePreview: string | null;
    statistics: {
      totalCharacters: number;
      averageChapterLength: number;
    };
  }> {
    const fileType = this.getFileType(filename);
    const rawContent = await this.parseFile(file, fileType, encoding);

    let detectionResult: ChapterDetectionResult;
    if (customPattern) {
      detectionResult =
        this.chapterDetectorService.detectChaptersWithCustomPattern(
          rawContent,
          customPattern,
        );
    } else {
      detectionResult = this.chapterDetectorService.previewChapters(
        rawContent,
        200,
      );
    }

    const statistics =
      this.chapterDetectorService.getChapterStatistics(detectionResult);

    return {
      hasChapters: detectionResult.hasChapters,
      chapterCount: detectionResult.chapterCount,
      patternType: detectionResult.primaryPatternType,
      chapters: detectionResult.chapters.map((ch) => ({
        title: ch.title,
        sequenceNumber: ch.sequenceNumber,
        contentPreview:
          ch.content.length > 200
            ? ch.content.substring(0, 200) + '...'
            : ch.content,
        wordCount: ChaptersService.calculateWordCount(ch.content),
      })),
      hasPreface: detectionResult.preface !== null,
      prefacePreview: detectionResult.preface
        ? detectionResult.preface.length > 200
          ? detectionResult.preface.substring(0, 200) + '...'
          : detectionResult.preface
        : null,
      statistics: {
        totalCharacters: statistics.totalCharacters,
        averageChapterLength: statistics.averageChapterLength,
      },
    };
  }

  /**
   * 获取文件类型
   * Get file type from filename
   */
  private getFileType(filename: string): SupportedFileType {
    const ext = filename.toLowerCase().split('.').pop();

    if (ext === 'txt') {
      return 'txt';
    }

    if (ext === 'docx') {
      return 'docx';
    }

    throw new BadRequestException(
      `不支持的文件格式: ${ext}。支持的格式: ${SUPPORTED_FILE_TYPES.join(', ')}`,
    );
  }

  /**
   * 解析文件内容
   * Parse file content based on file type
   */
  private async parseFile(
    file: Buffer,
    fileType: SupportedFileType,
    encoding?: string,
  ): Promise<string> {
    if (fileType === 'txt') {
      const result = this.novelParserService.parseTxtFile(file, encoding);
      return result.rawContent;
    }

    if (fileType === 'docx') {
      const result = await this.docxParserService.parseDocxFile(file);
      return result.rawContent;
    }

    throw new BadRequestException(`不支持的文件类型: ${fileType}`);
  }

  /**
   * 检测章节
   * Detect chapters from content
   */
  private detectChapters(
    content: string,
    customPattern?: string,
  ): ChapterDetectionResult {
    if (customPattern) {
      return this.chapterDetectorService.detectChaptersWithCustomPattern(
        content,
        customPattern,
      );
    }

    return this.chapterDetectorService.detectChapters(content);
  }

  /**
   * 导入章节到数据库
   * Import chapters to database
   */
  private async importChaptersToDatabase(
    workId: string,
    authorId: string,
    detectionResult: ChapterDetectionResult,
    options: BatchImportOptions,
  ): Promise<BatchImportResult> {
    const importedChapters: ImportedChapterInfo[] = [];
    const failedChapters: FailedChapterInfo[] = [];
    let prefaceImported = false;

    const chapterStatus =
      options.status === 'PUBLISHED'
        ? ChapterStatus.PUBLISHED
        : ChapterStatus.DRAFT;

    try {
      // Get the current max orderIndex for the work
      const lastChapter = await this.prisma.chapter.findFirst({
        where: { workId, isDeleted: false },
        orderBy: { orderIndex: 'desc' },
        select: { orderIndex: true },
      });

      let currentOrderIndex =
        lastChapter !== null ? lastChapter.orderIndex + 1 : 0;

      // Import preface as first chapter if requested
      if (options.importPreface && detectionResult.preface) {
        try {
          const prefaceChapter = await this.createChapter(
            workId,
            authorId,
            '前言',
            detectionResult.preface,
            currentOrderIndex,
            chapterStatus,
          );

          importedChapters.push(prefaceChapter);
          prefaceImported = true;
          currentOrderIndex++;

          this.logger.debug(
            `Preface imported as chapter at index ${prefaceChapter.orderIndex}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          failedChapters.push({
            title: '前言',
            sequenceNumber: 0,
            reason: errorMessage,
          });
          this.logger.warn(`Failed to import preface: ${errorMessage}`);
        }
      }

      // Import detected chapters
      for (const chapter of detectionResult.chapters) {
        try {
          const importedChapter = await this.createChapter(
            workId,
            authorId,
            chapter.title,
            chapter.content,
            currentOrderIndex,
            chapterStatus,
          );

          importedChapters.push(importedChapter);
          currentOrderIndex++;

          this.logger.debug(
            `Chapter imported: "${chapter.title}" at index ${importedChapter.orderIndex}`,
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          failedChapters.push({
            title: chapter.title,
            sequenceNumber: chapter.sequenceNumber,
            reason: errorMessage,
          });
          this.logger.warn(
            `Failed to import chapter "${chapter.title}": ${errorMessage}`,
          );
        }
      }

      const totalCount =
        detectionResult.chapters.length +
        (options.importPreface && detectionResult.preface ? 1 : 0);

      this.logger.log(
        `Batch import completed for work ${workId}: ${importedChapters.length}/${totalCount} chapters imported`,
      );

      return {
        successCount: importedChapters.length,
        failedCount: failedChapters.length,
        totalCount,
        chapters: importedChapters,
        failedChapters,
        prefaceImported,
        patternType: detectionResult.primaryPatternType,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Batch import failed: ${errorMessage}`);
      throw new InternalServerErrorException('批量导入章节失败');
    }
  }

  /**
   * 创建单个章节
   * Create a single chapter
   */
  private async createChapter(
    workId: string,
    authorId: string,
    title: string,
    content: string,
    orderIndex: number,
    status: ChapterStatus,
  ): Promise<ImportedChapterInfo> {
    const wordCount = ChaptersService.calculateWordCount(content);

    const chapter = await (this.prisma as any).$transaction(async (tx: any) => {
      // Create the chapter
      const newChapter = await tx.chapter.create({
        data: {
          workId,
          authorId,
          title,
          content,
          orderIndex,
          wordCount,
          status,
          version: 1,
          publishedAt: status === ChapterStatus.PUBLISHED ? new Date() : null,
        },
      });

      // Update work's total word count
      await tx.work.update({
        where: { id: workId },
        data: {
          wordCount: { increment: wordCount },
        },
      });

      return newChapter;
    });

    // If chapter is published, create paragraphs and anchors
    if (status === ChapterStatus.PUBLISHED) {
      await this.paragraphsService.createParagraphsForChapter(
        workId,
        chapter.id,
        content,
      );
    }

    return {
      id: chapter.id,
      title: chapter.title,
      orderIndex: chapter.orderIndex,
      wordCount: chapter.wordCount,
    };
  }

  /**
   * 获取支持的文件类型列表
   * Get list of supported file types
   */
  getSupportedFileTypes(): readonly string[] {
    return SUPPORTED_FILE_TYPES;
  }
}
