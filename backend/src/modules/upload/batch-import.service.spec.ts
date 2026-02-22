import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { BatchImportService } from './batch-import.service.js';
import { NovelParserService } from './novel-parser.service.js';
import { DocxParserService } from './docx-parser.service.js';
import { ChapterDetectorService } from './chapter-detector.service.js';
import { ParagraphsService } from '../paragraphs/paragraphs.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ChapterStatus } from '@prisma/client';

describe('BatchImportService', () => {
  let service: BatchImportService;
  let prismaService: jest.Mocked<PrismaService>;
  let novelParserService: jest.Mocked<NovelParserService>;
  let docxParserService: jest.Mocked<DocxParserService>;
  let chapterDetectorService: jest.Mocked<ChapterDetectorService>;
  let paragraphsService: jest.Mocked<ParagraphsService>;

  const mockWorkId = '123e4567-e89b-12d3-a456-426614174000';
  const mockAuthorId = '123e4567-e89b-12d3-a456-426614174001';

  beforeEach(async () => {
    const mockPrismaService = {
      work: {
        findUnique: jest.fn(),
      },
      chapter: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const mockNovelParserService = {
      parseTxtFile: jest.fn(),
    };

    const mockDocxParserService = {
      parseDocxFile: jest.fn(),
    };

    const mockChapterDetectorService = {
      detectChapters: jest.fn(),
      detectChaptersWithCustomPattern: jest.fn(),
      previewChapters: jest.fn(),
      getChapterStatistics: jest.fn(),
    };

    const mockParagraphsService = {
      createParagraphsForChapter: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchImportService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NovelParserService, useValue: mockNovelParserService },
        { provide: DocxParserService, useValue: mockDocxParserService },
        {
          provide: ChapterDetectorService,
          useValue: mockChapterDetectorService,
        },
        { provide: ParagraphsService, useValue: mockParagraphsService },
      ],
    }).compile();

    service = module.get<BatchImportService>(BatchImportService);
    prismaService = module.get(PrismaService);
    novelParserService = module.get(NovelParserService);
    docxParserService = module.get(DocxParserService);
    chapterDetectorService = module.get(ChapterDetectorService);
    paragraphsService = module.get(ParagraphsService);
  });

  describe('batchImportChapters', () => {
    const mockTxtContent = `第一章 开始

这是第一章的内容。

第二章 继续

这是第二章的内容。`;

    const mockDetectionResult = {
      chapters: [
        {
          title: '第一章 开始',
          content: '这是第一章的内容。',
          startIndex: 0,
          endIndex: 50,
          sequenceNumber: 1,
          patternType: 'chinese_chapter' as const,
        },
        {
          title: '第二章 继续',
          content: '这是第二章的内容。',
          startIndex: 51,
          endIndex: 100,
          sequenceNumber: 2,
          patternType: 'chinese_chapter' as const,
        },
      ],
      hasChapters: true,
      chapterCount: 2,
      primaryPatternType: 'chinese_chapter' as const,
      preface: null,
    };

    it('should throw NotFoundException when work does not exist', async () => {
      prismaService.work.findUnique.mockResolvedValue(null);

      await expect(
        service.batchImportChapters(
          mockWorkId,
          mockAuthorId,
          Buffer.from(mockTxtContent),
          'test.txt',
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      prismaService.work.findUnique.mockResolvedValue({
        id: mockWorkId,
        authorId: 'different-author-id',
      });

      await expect(
        service.batchImportChapters(
          mockWorkId,
          mockAuthorId,
          Buffer.from(mockTxtContent),
          'test.txt',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for unsupported file format', async () => {
      prismaService.work.findUnique.mockResolvedValue({
        id: mockWorkId,
        authorId: mockAuthorId,
      });

      await expect(
        service.batchImportChapters(
          mockWorkId,
          mockAuthorId,
          Buffer.from(mockTxtContent),
          'test.pdf',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully import chapters from TXT file', async () => {
      prismaService.work.findUnique.mockResolvedValue({
        id: mockWorkId,
        authorId: mockAuthorId,
      });

      novelParserService.parseTxtFile.mockReturnValue({
        rawContent: mockTxtContent,
        encoding: 'UTF-8',
        fileSize: mockTxtContent.length,
      });

      chapterDetectorService.detectChapters.mockReturnValue(
        mockDetectionResult,
      );

      prismaService.chapter.findFirst.mockResolvedValue(null);

      let chapterIndex = 0;
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          chapter: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: `chapter-${chapterIndex++}`,
              title: data.title,
              orderIndex: data.orderIndex,
              wordCount: data.wordCount,
            })),
          },
          work: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.batchImportChapters(
        mockWorkId,
        mockAuthorId,
        Buffer.from(mockTxtContent),
        'test.txt',
      );

      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.totalCount).toBe(2);
      expect(result.chapters).toHaveLength(2);
      expect(result.patternType).toBe('chinese_chapter');
    });

    it('should import preface when importPreface option is true', async () => {
      const detectionWithPreface = {
        ...mockDetectionResult,
        preface: '这是前言内容。',
      };

      prismaService.work.findUnique.mockResolvedValue({
        id: mockWorkId,
        authorId: mockAuthorId,
      });

      novelParserService.parseTxtFile.mockReturnValue({
        rawContent: mockTxtContent,
        encoding: 'UTF-8',
        fileSize: mockTxtContent.length,
      });

      chapterDetectorService.detectChapters.mockReturnValue(
        detectionWithPreface,
      );

      prismaService.chapter.findFirst.mockResolvedValue(null);

      let chapterIndex = 0;
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const mockTx = {
          chapter: {
            create: jest.fn().mockImplementation(({ data }) => ({
              id: `chapter-${chapterIndex++}`,
              title: data.title,
              orderIndex: data.orderIndex,
              wordCount: data.wordCount,
            })),
          },
          work: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.batchImportChapters(
        mockWorkId,
        mockAuthorId,
        Buffer.from(mockTxtContent),
        'test.txt',
        { importPreface: true },
      );

      expect(result.successCount).toBe(3);
      expect(result.prefaceImported).toBe(true);
      expect(result.chapters[0].title).toBe('前言');
    });
  });

  describe('previewChapters', () => {
    const mockTxtContent = `第一章 开始

这是第一章的内容。

第二章 继续

这是第二章的内容。`;

    it('should preview chapters from TXT file', async () => {
      novelParserService.parseTxtFile.mockReturnValue({
        rawContent: mockTxtContent,
        encoding: 'UTF-8',
        fileSize: mockTxtContent.length,
      });

      chapterDetectorService.previewChapters.mockReturnValue({
        chapters: [
          {
            title: '第一章 开始',
            content: '这是第一章的内容。',
            startIndex: 0,
            endIndex: 50,
            sequenceNumber: 1,
            patternType: 'chinese_chapter' as const,
          },
        ],
        hasChapters: true,
        chapterCount: 1,
        primaryPatternType: 'chinese_chapter' as const,
        preface: null,
      });

      chapterDetectorService.getChapterStatistics.mockReturnValue({
        totalChapters: 1,
        totalCharacters: 100,
        averageChapterLength: 100,
        shortestChapter: null,
        longestChapter: null,
        hasPreface: false,
        prefaceLength: 0,
      });

      const result = await service.previewChapters(
        Buffer.from(mockTxtContent),
        'test.txt',
      );

      expect(result.hasChapters).toBe(true);
      expect(result.chapterCount).toBe(1);
      expect(result.chapters).toHaveLength(1);
    });

    it('should use custom pattern when provided', async () => {
      novelParserService.parseTxtFile.mockReturnValue({
        rawContent: mockTxtContent,
        encoding: 'UTF-8',
        fileSize: mockTxtContent.length,
      });

      chapterDetectorService.detectChaptersWithCustomPattern.mockReturnValue({
        chapters: [],
        hasChapters: false,
        chapterCount: 0,
        primaryPatternType: 'custom' as const,
        preface: null,
      });

      chapterDetectorService.getChapterStatistics.mockReturnValue({
        totalChapters: 0,
        totalCharacters: 0,
        averageChapterLength: 0,
        shortestChapter: null,
        longestChapter: null,
        hasPreface: false,
        prefaceLength: 0,
      });

      await service.previewChapters(
        Buffer.from(mockTxtContent),
        'test.txt',
        undefined,
        '^Chapter \\d+',
      );

      expect(
        chapterDetectorService.detectChaptersWithCustomPattern,
      ).toHaveBeenCalledWith(mockTxtContent, '^Chapter \\d+');
    });
  });

  describe('getSupportedFileTypes', () => {
    it('should return supported file types', () => {
      const types = service.getSupportedFileTypes();
      expect(types).toContain('txt');
      expect(types).toContain('docx');
    });
  });
});
