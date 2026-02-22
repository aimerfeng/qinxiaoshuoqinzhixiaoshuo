import { Test, TestingModule } from '@nestjs/testing';
import { ReaderService } from './reader.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { ChapterStatus, ContentType, PageMode } from '@prisma/client';

describe('ReaderService', () => {
  let service: ReaderService;
  let mockPrismaService: any;

  const mockWorkId = '550e8400-e29b-41d4-a716-446655440001';
  const mockChapterId = '550e8400-e29b-41d4-a716-446655440002';
  const mockUserId = '550e8400-e29b-41d4-a716-446655440003';
  const mockAuthorId = '550e8400-e29b-41d4-a716-446655440004';

  beforeEach(async () => {
    mockPrismaService = {
      chapter: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      work: {
        findUnique: jest.fn(),
      },
      readingProgress: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      readingSettings: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReaderService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReaderService>(ReaderService);
  });

  describe('getChapterContent', () => {
    const mockChapter = {
      id: mockChapterId,
      workId: mockWorkId,
      title: '第一章',
      content: '这是章节内容',
      orderIndex: 0,
      wordCount: 100,
      viewCount: 10,
      status: ChapterStatus.PUBLISHED,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      work: {
        id: mockWorkId,
        title: '测试作品',
        authorId: mockAuthorId,
        contentType: ContentType.NOVEL,
        readingDirection: null,
        status: 'PUBLISHED',
        author: {
          id: mockAuthorId,
          displayName: '测试作者',
          username: 'testauthor',
        },
      },
      paragraphs: [
        {
          id: 'para-1',
          anchorId: `${mockWorkId}:${mockChapterId}:0`,
          content: '第一段内容',
          orderIndex: 0,
          quoteCount: 0,
        },
      ],
      mangaPages: [],
    };

    it('should return chapter content for published chapter', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(mockChapter);
      mockPrismaService.chapter.findFirst.mockResolvedValue(null);
      mockPrismaService.chapter.update.mockResolvedValue(mockChapter);

      const result = await service.getChapterContent(mockWorkId, mockChapterId);

      expect(result.message).toBe('获取章节内容成功');
      expect(result.chapter.id).toBe(mockChapterId);
      expect(result.work.title).toBe('测试作品');
      expect(result.paragraphs).toHaveLength(1);
      expect(mockPrismaService.chapter.update).toHaveBeenCalledWith({
        where: { id: mockChapterId },
        data: { viewCount: { increment: 1 } },
      });
    });

    it('should throw NotFoundException for non-existent chapter', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(null);

      await expect(
        service.getChapterContent(mockWorkId, mockChapterId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for chapter not belonging to work', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue({
        ...mockChapter,
        workId: 'different-work-id',
      });

      await expect(
        service.getChapterContent(mockWorkId, mockChapterId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for draft chapter when not author', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue({
        ...mockChapter,
        status: ChapterStatus.DRAFT,
      });

      await expect(
        service.getChapterContent(mockWorkId, mockChapterId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return draft chapter content for author', async () => {
      const draftChapter = {
        ...mockChapter,
        status: ChapterStatus.DRAFT,
      };
      mockPrismaService.chapter.findUnique.mockResolvedValue(draftChapter);
      mockPrismaService.chapter.findFirst.mockResolvedValue(null);
      mockPrismaService.chapter.update.mockResolvedValue(draftChapter);

      const result = await service.getChapterContent(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
      );

      expect(result.message).toBe('获取章节内容成功');
      expect(result.chapter.status).toBe(ChapterStatus.DRAFT);
    });

    it('should include reading progress for logged-in user', async () => {
      const mockProgress = {
        paragraphIndex: 5,
        scrollPosition: 100.5,
        readPercentage: 50,
        lastReadAt: new Date(),
      };
      mockPrismaService.chapter.findUnique.mockResolvedValue(mockChapter);
      mockPrismaService.chapter.findFirst.mockResolvedValue(null);
      mockPrismaService.chapter.update.mockResolvedValue(mockChapter);
      mockPrismaService.readingProgress.findUnique.mockResolvedValue(
        mockProgress,
      );

      const result = await service.getChapterContent(
        mockWorkId,
        mockChapterId,
        mockUserId,
      );

      expect(result.readingProgress).toEqual(mockProgress);
    });
  });

  describe('saveReadingProgress', () => {
    const mockSaveProgressDto = {
      chapterId: mockChapterId,
      paragraphIndex: 10,
      scrollPosition: 200.5,
      readPercentage: 75,
    };

    it('should save reading progress successfully', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue({
        id: mockChapterId,
        workId: mockWorkId,
        status: ChapterStatus.PUBLISHED,
      });
      mockPrismaService.readingProgress.upsert.mockResolvedValue({
        id: 'progress-1',
        userId: mockUserId,
        chapterId: mockChapterId,
        paragraphIndex: 10,
        scrollPosition: 200.5,
        readPercentage: 75,
        lastReadAt: new Date(),
      });

      const result = await service.saveReadingProgress(
        mockUserId,
        mockWorkId,
        mockSaveProgressDto,
      );

      expect(result.message).toBe('阅读进度保存成功');
      expect(result.progress.paragraphIndex).toBe(10);
      expect(result.progress.readPercentage).toBe(75);
    });

    it('should throw NotFoundException for non-existent chapter', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(null);

      await expect(
        service.saveReadingProgress(
          mockUserId,
          mockWorkId,
          mockSaveProgressDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for draft chapter', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue({
        id: mockChapterId,
        workId: mockWorkId,
        status: ChapterStatus.DRAFT,
      });

      await expect(
        service.saveReadingProgress(
          mockUserId,
          mockWorkId,
          mockSaveProgressDto,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('saveReadingSettings', () => {
    const mockSaveSettingsDto = {
      fontSize: 18,
      lineHeight: 2.0,
      nightMode: true,
    };

    it('should save reading settings successfully', async () => {
      const mockSettings = {
        id: 'settings-1',
        userId: mockUserId,
        fontSize: 18,
        lineHeight: 2.0,
        fontFamily: 'system',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        pageMode: PageMode.SCROLL,
        nightMode: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.readingSettings.upsert.mockResolvedValue(mockSettings);

      const result = await service.saveReadingSettings(
        mockUserId,
        mockSaveSettingsDto,
      );

      expect(result.message).toBe('阅读设置保存成功');
      expect(result.settings.fontSize).toBe(18);
      expect(result.settings.nightMode).toBe(true);
    });
  });

  describe('getReadingSettings', () => {
    it('should return existing settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        userId: mockUserId,
        fontSize: 16,
        lineHeight: 1.8,
        fontFamily: 'system',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        pageMode: PageMode.SCROLL,
        nightMode: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.readingSettings.findUnique.mockResolvedValue(
        mockSettings,
      );

      const result = await service.getReadingSettings(mockUserId);

      expect(result.message).toBe('获取阅读设置成功');
      expect(result.settings.fontSize).toBe(16);
    });

    it('should create default settings if not exist', async () => {
      const defaultSettings = {
        id: 'settings-1',
        userId: mockUserId,
        fontSize: 16,
        lineHeight: 1.8,
        fontFamily: 'system',
        backgroundColor: '#ffffff',
        textColor: '#1f2937',
        pageMode: PageMode.SCROLL,
        nightMode: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.readingSettings.findUnique.mockResolvedValue(null);
      mockPrismaService.readingSettings.create.mockResolvedValue(
        defaultSettings,
      );

      const result = await service.getReadingSettings(mockUserId);

      expect(result.message).toBe('获取阅读设置成功');
      expect(mockPrismaService.readingSettings.create).toHaveBeenCalled();
    });
  });

  describe('getAdjacentChapters', () => {
    const mockChapter = {
      id: mockChapterId,
      workId: mockWorkId,
      title: '第二章',
      orderIndex: 1,
      wordCount: 100,
      status: ChapterStatus.PUBLISHED,
      publishedAt: new Date(),
      work: { authorId: mockAuthorId },
    };

    it('should return adjacent chapters info', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(mockChapter);
      mockPrismaService.chapter.findFirst
        .mockResolvedValueOnce({
          id: 'prev-chapter',
          title: '第一章',
          orderIndex: 0,
          wordCount: 80,
          status: ChapterStatus.PUBLISHED,
          publishedAt: new Date(),
        })
        .mockResolvedValueOnce({
          id: 'next-chapter',
          title: '第三章',
          orderIndex: 2,
          wordCount: 120,
          status: ChapterStatus.PUBLISHED,
          publishedAt: new Date(),
        });
      mockPrismaService.chapter.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(2);

      const result = await service.getAdjacentChapters(
        mockWorkId,
        mockChapterId,
      );

      expect(result.message).toBe('获取相邻章节信息成功');
      expect(result.currentChapter.title).toBe('第二章');
      expect(result.prevChapter?.title).toBe('第一章');
      expect(result.nextChapter?.title).toBe('第三章');
      expect(result.totalChapters).toBe(5);
      expect(result.currentPosition).toBe(2);
    });

    it('should return null for prev/next when at boundaries', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue({
        ...mockChapter,
        orderIndex: 0,
      });
      mockPrismaService.chapter.findFirst.mockResolvedValue(null);
      mockPrismaService.chapter.count
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1);

      const result = await service.getAdjacentChapters(
        mockWorkId,
        mockChapterId,
      );

      expect(result.prevChapter).toBeNull();
      expect(result.nextChapter).toBeNull();
    });
  });

  describe('getChapterList', () => {
    it('should return chapter list for work', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue({
        id: mockWorkId,
        title: '测试作品',
        authorId: mockAuthorId,
        contentType: ContentType.NOVEL,
      });
      mockPrismaService.chapter.findMany.mockResolvedValue([
        {
          id: 'chapter-1',
          title: '第一章',
          orderIndex: 0,
          wordCount: 100,
          status: ChapterStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        {
          id: 'chapter-2',
          title: '第二章',
          orderIndex: 1,
          wordCount: 120,
          status: ChapterStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      ]);

      const result = await service.getChapterList(mockWorkId);

      expect(result.message).toBe('获取章节目录成功');
      expect(result.chapters).toHaveLength(2);
      expect(result.totalChapters).toBe(2);
    });

    it('should throw NotFoundException for non-existent work', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(null);

      await expect(service.getChapterList(mockWorkId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
