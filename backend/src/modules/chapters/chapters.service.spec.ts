import { Test, TestingModule } from '@nestjs/testing';
import { ChaptersService } from './chapters.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ParagraphsService } from '../paragraphs/paragraphs.service.js';
import { ChapterStatus } from '@prisma/client';
import {
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

describe('ChaptersService', () => {
  let service: ChaptersService;

  const mockAuthorId = 'test-author-id';
  const mockWorkId = 'test-work-id';
  const mockChapterId = 'test-chapter-id';

  const mockWork = {
    id: mockWorkId,
    authorId: mockAuthorId,
  };

  const mockChapter = {
    id: mockChapterId,
    workId: mockWorkId,
    authorId: mockAuthorId,
    title: '第一章 开始',
    content: '这是第一章的内容。故事从这里开始。',
    orderIndex: 0,
    wordCount: 14,
    status: ChapterStatus.DRAFT,
    version: 1,
    publishedAt: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    work: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    chapter: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockParagraphsService = {
    createParagraphsForChapter: jest.fn().mockResolvedValue(0),
    deleteParagraphsForChapter: jest.fn().mockResolvedValue(0),
    parseChapterContent: jest.fn().mockReturnValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChaptersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ParagraphsService,
          useValue: mockParagraphsService,
        },
      ],
    }).compile();

    service = module.get<ChaptersService>(ChaptersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateWordCount', () => {
    it('should count Chinese characters correctly', () => {
      expect(ChaptersService.calculateWordCount('你好世界')).toBe(4);
    });

    it('should count English words correctly', () => {
      expect(ChaptersService.calculateWordCount('hello world')).toBe(2);
    });

    it('should count mixed Chinese and English correctly', () => {
      expect(ChaptersService.calculateWordCount('你好 hello 世界 world')).toBe(
        6,
      );
    });

    it('should return 0 for empty string', () => {
      expect(ChaptersService.calculateWordCount('')).toBe(0);
    });

    it('should return 0 for whitespace-only string', () => {
      expect(ChaptersService.calculateWordCount('   ')).toBe(0);
    });

    it('should strip HTML tags before counting', () => {
      expect(
        ChaptersService.calculateWordCount('<p>你好</p><br/><b>world</b>'),
      ).toBe(3);
    });

    it('should handle numbers as words', () => {
      expect(ChaptersService.calculateWordCount('第1章 chapter2')).toBe(4);
    });
  });

  describe('createChapter', () => {
    it('should create a chapter successfully with default DRAFT status', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapter: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue(mockChapter),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      const result = await service.createChapter(mockWorkId, mockAuthorId, {
        title: '第一章 开始',
        content: '这是第一章的内容。故事从这里开始。',
      });

      expect(result).toBeDefined();
      expect(result.message).toBe('章节创建成功');
      expect(result.chapter).toBeDefined();
      expect(result.chapter.title).toBe('第一章 开始');
      expect(result.chapter.status).toBe(ChapterStatus.DRAFT);
      expect(result.chapter.workId).toBe(mockWorkId);
    });

    it('should create a chapter with PUBLISHED status and set publishedAt', async () => {
      const publishedChapter = {
        ...mockChapter,
        status: ChapterStatus.PUBLISHED,
        publishedAt: new Date(),
      };

      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapter: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue(publishedChapter),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      const result = await service.createChapter(mockWorkId, mockAuthorId, {
        title: '第一章 开始',
        content: '这是第一章的内容。故事从这里开始。',
        status: ChapterStatus.PUBLISHED,
      });

      expect(result.chapter.status).toBe(ChapterStatus.PUBLISHED);
      expect(result.chapter.publishedAt).not.toBeNull();
    });

    it('should auto-assign orderIndex as 0 for first chapter', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);

      let capturedCreateData: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapter: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockImplementation((args: any) => {
                capturedCreateData = args.data;
                return { ...mockChapter, orderIndex: args.data.orderIndex };
              }),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      await service.createChapter(mockWorkId, mockAuthorId, {
        title: '第一章',
        content: '内容',
      });

      expect(capturedCreateData.orderIndex).toBe(0);
    });

    it('should auto-assign next orderIndex when chapters exist', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);

      let capturedCreateData: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapter: {
              findFirst: jest.fn().mockResolvedValue({ orderIndex: 2 }),
              create: jest.fn().mockImplementation((args: any) => {
                capturedCreateData = args.data;
                return { ...mockChapter, orderIndex: args.data.orderIndex };
              }),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      await service.createChapter(mockWorkId, mockAuthorId, {
        title: '第四章',
        content: '内容',
      });

      expect(capturedCreateData.orderIndex).toBe(3);
    });

    it('should auto-calculate wordCount from content', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);

      let capturedCreateData: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapter: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockImplementation((args: any) => {
                capturedCreateData = args.data;
                return { ...mockChapter, wordCount: args.data.wordCount };
              }),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      await service.createChapter(mockWorkId, mockAuthorId, {
        title: '测试章节',
        content: '你好世界 hello world',
      });

      // 4 Chinese chars + 2 English words = 6
      expect(capturedCreateData.wordCount).toBe(6);
    });

    it('should update work total word count', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);

      let capturedWorkUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapter: {
              findFirst: jest.fn().mockResolvedValue(null),
              create: jest.fn().mockResolvedValue(mockChapter),
            },
            work: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedWorkUpdate = args;
                return {};
              }),
            },
          });
        },
      );

      await service.createChapter(mockWorkId, mockAuthorId, {
        title: '测试',
        content: '你好世界',
      });

      expect(capturedWorkUpdate).toBeDefined();
      expect(capturedWorkUpdate.where.id).toBe(mockWorkId);
      expect(capturedWorkUpdate.data.wordCount.increment).toBe(4);
    });

    it('should throw NotFoundException when work does not exist', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(null);

      await expect(
        service.createChapter(mockWorkId, mockAuthorId, {
          title: '章节',
          content: '内容',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);

      await expect(
        service.createChapter(mockWorkId, 'other-user-id', {
          title: '章节',
          content: '内容',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createChapter(mockWorkId, mockAuthorId, {
          title: '章节',
          content: '内容',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should re-throw NotFoundException from within transaction', async () => {
      // Simulate work being deleted between check and transaction
      mockPrismaService.work.findUnique.mockResolvedValue(null);

      await expect(
        service.createChapter(mockWorkId, mockAuthorId, {
          title: '章节',
          content: '内容',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateChapter', () => {
    const mockChapterWithWork = {
      ...mockChapter,
      work: {
        id: mockWorkId,
        authorId: mockAuthorId,
        wordCount: 100,
      },
    };

    beforeEach(() => {
      // Reset mock for chapter.findUnique
      mockPrismaService.chapter = {
        ...mockPrismaService.chapter,
        findUnique: jest.fn(),
        update: jest.fn(),
      };
      mockPrismaService.chapterVersion = {
        create: jest.fn(),
      };
    });

    it('should update chapter title successfully and create version', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );

      const updatedChapter = {
        ...mockChapter,
        title: '新标题',
        version: 2,
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockResolvedValue({}),
            },
            chapter: {
              update: jest.fn().mockResolvedValue(updatedChapter),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      const result = await service.updateChapter(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
        { title: '新标题' },
      );

      expect(result.message).toBe('章节更新成功');
      expect(result.chapter.title).toBe('新标题');
      expect(result.chapter.version).toBe(2);
      expect(result.previousVersion).toBe(1);
    });

    it('should update chapter content and recalculate wordCount', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );

      const newContent = '这是新的内容，比原来更长一些。';
      const newWordCount = ChaptersService.calculateWordCount(newContent);

      const updatedChapter = {
        ...mockChapter,
        content: newContent,
        wordCount: newWordCount,
        version: 2,
      };

      let capturedChapterUpdate: any = null;
      let capturedWorkUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockResolvedValue({}),
            },
            chapter: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedChapterUpdate = args;
                return updatedChapter;
              }),
            },
            work: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedWorkUpdate = args;
                return {};
              }),
            },
          });
        },
      );

      const result = await service.updateChapter(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
        { content: newContent },
      );

      expect(result.chapter.content).toBe(newContent);
      expect(capturedChapterUpdate.data.wordCount).toBe(newWordCount);
      // Work wordCount should be updated with the difference
      expect(capturedWorkUpdate.data.wordCount.increment).toBe(
        newWordCount - mockChapter.wordCount,
      );
    });

    it('should create version snapshot before updating', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );

      let capturedVersionCreate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockImplementation((args: any) => {
                capturedVersionCreate = args;
                return {};
              }),
            },
            chapter: {
              update: jest.fn().mockResolvedValue({
                ...mockChapter,
                title: '新标题',
                version: 2,
              }),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      await service.updateChapter(mockWorkId, mockChapterId, mockAuthorId, {
        title: '新标题',
      });

      expect(capturedVersionCreate).toBeDefined();
      expect(capturedVersionCreate.data.chapterId).toBe(mockChapterId);
      expect(capturedVersionCreate.data.version).toBe(mockChapter.version);
      expect(capturedVersionCreate.data.title).toBe(mockChapter.title);
      expect(capturedVersionCreate.data.content).toBe(mockChapter.content);
      expect(capturedVersionCreate.data.wordCount).toBe(mockChapter.wordCount);
    });

    it('should return no changes message when no actual changes', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );

      const result = await service.updateChapter(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
        { title: mockChapter.title }, // Same title as existing
      );

      expect(result.message).toBe('章节无变更');
      expect(result.previousVersion).toBe(mockChapter.version);
      // Transaction should not be called
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should set publishedAt when status changes to PUBLISHED', async () => {
      const draftChapter = {
        ...mockChapterWithWork,
        status: ChapterStatus.DRAFT,
        publishedAt: null,
      };
      mockPrismaService.chapter.findUnique.mockResolvedValue(draftChapter);

      let capturedChapterUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockResolvedValue({}),
            },
            chapter: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedChapterUpdate = args;
                return {
                  ...draftChapter,
                  status: ChapterStatus.PUBLISHED,
                  publishedAt: new Date(),
                  version: 2,
                };
              }),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      await service.updateChapter(mockWorkId, mockChapterId, mockAuthorId, {
        status: ChapterStatus.PUBLISHED,
      });

      expect(capturedChapterUpdate.data.status).toBe(ChapterStatus.PUBLISHED);
      expect(capturedChapterUpdate.data.publishedAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException when chapter does not exist', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(null);

      await expect(
        service.updateChapter(mockWorkId, mockChapterId, mockAuthorId, {
          title: '新标题',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when chapter does not belong to work', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue({
        ...mockChapterWithWork,
        workId: 'different-work-id',
      });

      await expect(
        service.updateChapter(mockWorkId, mockChapterId, mockAuthorId, {
          title: '新标题',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );

      await expect(
        service.updateChapter(mockWorkId, mockChapterId, 'other-user-id', {
          title: '新标题',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.updateChapter(mockWorkId, mockChapterId, mockAuthorId, {
          title: '新标题',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should increment version number correctly', async () => {
      const chapterV3 = {
        ...mockChapterWithWork,
        version: 3,
      };
      mockPrismaService.chapter.findUnique.mockResolvedValue(chapterV3);

      let capturedChapterUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockResolvedValue({}),
            },
            chapter: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedChapterUpdate = args;
                return { ...chapterV3, title: '新标题', version: 4 };
              }),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      const result = await service.updateChapter(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
        { title: '新标题' },
      );

      expect(capturedChapterUpdate.data.version).toBe(4);
      expect(result.previousVersion).toBe(3);
    });

    it('should not update work wordCount when content is unchanged', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );

      let workUpdateCalled = false;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockResolvedValue({}),
            },
            chapter: {
              update: jest.fn().mockResolvedValue({
                ...mockChapter,
                title: '新标题',
                version: 2,
              }),
            },
            work: {
              update: jest.fn().mockImplementation(() => {
                workUpdateCalled = true;
                return {};
              }),
            },
          });
        },
      );

      await service.updateChapter(mockWorkId, mockChapterId, mockAuthorId, {
        title: '新标题', // Only title change, no content change
      });

      // Work update should not be called since wordCount diff is 0
      expect(workUpdateCalled).toBe(false);
    });
  });

  describe('deleteChapter', () => {
    const mockChapterWithWork = {
      ...mockChapter,
      work: {
        id: mockWorkId,
        authorId: mockAuthorId,
      },
    };

    beforeEach(() => {
      mockPrismaService.chapter = {
        ...mockPrismaService.chapter,
        findUnique: jest.fn(),
        update: jest.fn(),
      };
    });

    it('should soft delete chapter successfully', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );

      let capturedChapterUpdate: any = null;
      let capturedWorkUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapter: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedChapterUpdate = args;
                return { ...mockChapter, isDeleted: true };
              }),
            },
            work: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedWorkUpdate = args;
                return {};
              }),
            },
          });
        },
      );

      const result = await service.deleteChapter(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
      );

      expect(result.message).toBe('章节删除成功');
      expect(capturedChapterUpdate.where.id).toBe(mockChapterId);
      expect(capturedChapterUpdate.data.isDeleted).toBe(true);
    });

    it('should decrement work wordCount when deleting chapter', async () => {
      const chapterWithWordCount = {
        ...mockChapterWithWork,
        wordCount: 500,
      };
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        chapterWithWordCount,
      );

      let capturedWorkUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapter: {
              update: jest.fn().mockResolvedValue({
                ...chapterWithWordCount,
                isDeleted: true,
              }),
            },
            work: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedWorkUpdate = args;
                return {};
              }),
            },
          });
        },
      );

      await service.deleteChapter(mockWorkId, mockChapterId, mockAuthorId);

      expect(capturedWorkUpdate).toBeDefined();
      expect(capturedWorkUpdate.where.id).toBe(mockWorkId);
      expect(capturedWorkUpdate.data.wordCount.decrement).toBe(500);
    });

    it('should throw NotFoundException when chapter does not exist', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteChapter(mockWorkId, mockChapterId, mockAuthorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when chapter is already deleted', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue({
        ...mockChapterWithWork,
        isDeleted: true,
      });

      await expect(
        service.deleteChapter(mockWorkId, mockChapterId, mockAuthorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when chapter does not belong to work', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue({
        ...mockChapterWithWork,
        workId: 'different-work-id',
      });

      await expect(
        service.deleteChapter(mockWorkId, mockChapterId, mockAuthorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );

      await expect(
        service.deleteChapter(mockWorkId, mockChapterId, 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.deleteChapter(mockWorkId, mockChapterId, mockAuthorId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('reorderChapters', () => {
    const mockChapterId1 = 'chapter-id-1';
    const mockChapterId2 = 'chapter-id-2';
    const mockChapterId3 = 'chapter-id-3';

    beforeEach(() => {
      mockPrismaService.chapter = {
        ...mockPrismaService.chapter,
        findMany: jest.fn(),
        update: jest.fn(),
      };
    });

    it('should reorder chapters successfully', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
      mockPrismaService.chapter.findMany.mockResolvedValue([
        { id: mockChapterId1 },
        { id: mockChapterId2 },
        { id: mockChapterId3 },
      ]);

      const updateCalls: any[] = [];

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapter: {
              update: jest.fn().mockImplementation((args: any) => {
                updateCalls.push(args);
                return {};
              }),
            },
          });
        },
      );

      const result = await service.reorderChapters(mockWorkId, mockAuthorId, {
        chapterIds: [mockChapterId3, mockChapterId1, mockChapterId2],
      });

      expect(result.message).toBe('章节排序成功');
      expect(result.updatedCount).toBe(3);
      expect(updateCalls).toHaveLength(3);
      expect(updateCalls[0].where.id).toBe(mockChapterId3);
      expect(updateCalls[0].data.orderIndex).toBe(0);
      expect(updateCalls[1].where.id).toBe(mockChapterId1);
      expect(updateCalls[1].data.orderIndex).toBe(1);
      expect(updateCalls[2].where.id).toBe(mockChapterId2);
      expect(updateCalls[2].data.orderIndex).toBe(2);
    });

    it('should throw NotFoundException when work does not exist', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(null);

      await expect(
        service.reorderChapters(mockWorkId, mockAuthorId, {
          chapterIds: [mockChapterId1, mockChapterId2],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);

      await expect(
        service.reorderChapters(mockWorkId, 'other-user-id', {
          chapterIds: [mockChapterId1, mockChapterId2],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when some chapters do not exist', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
      mockPrismaService.chapter.findMany.mockResolvedValue([
        { id: mockChapterId1 },
        // mockChapterId2 is missing
      ]);

      await expect(
        service.reorderChapters(mockWorkId, mockAuthorId, {
          chapterIds: [mockChapterId1, mockChapterId2],
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when duplicate chapter IDs provided', async () => {
      // Duplicate check happens before database query, so no need to mock findMany
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);

      await expect(
        service.reorderChapters(mockWorkId, mockAuthorId, {
          chapterIds: [mockChapterId1, mockChapterId2, mockChapterId1], // duplicate mockChapterId1
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
      mockPrismaService.chapter.findMany.mockResolvedValue([
        { id: mockChapterId1 },
        { id: mockChapterId2 },
      ]);
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.reorderChapters(mockWorkId, mockAuthorId, {
          chapterIds: [mockChapterId1, mockChapterId2],
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle single chapter reorder', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
      mockPrismaService.chapter.findMany.mockResolvedValue([
        { id: mockChapterId1 },
      ]);

      const updateCalls: any[] = [];

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapter: {
              update: jest.fn().mockImplementation((args: any) => {
                updateCalls.push(args);
                return {};
              }),
            },
          });
        },
      );

      const result = await service.reorderChapters(mockWorkId, mockAuthorId, {
        chapterIds: [mockChapterId1],
      });

      expect(result.message).toBe('章节排序成功');
      expect(result.updatedCount).toBe(1);
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0].data.orderIndex).toBe(0);
    });
  });

  describe('rollbackChapterVersion', () => {
    const mockChapterWithWork = {
      ...mockChapter,
      version: 3,
      work: {
        id: mockWorkId,
        authorId: mockAuthorId,
        wordCount: 100,
      },
    };

    const mockTargetVersion = {
      version: 1,
      title: '原始标题',
      content: '原始内容',
      wordCount: 4,
    };

    beforeEach(() => {
      mockPrismaService.chapter = {
        ...mockPrismaService.chapter,
        findUnique: jest.fn(),
        update: jest.fn(),
      };
      mockPrismaService.chapterVersion = {
        findUnique: jest.fn(),
        create: jest.fn(),
      };
    });

    it('should rollback chapter to target version successfully', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );
      mockPrismaService.chapterVersion.findUnique.mockResolvedValue(
        mockTargetVersion,
      );

      let capturedVersionCreate: any = null;
      let capturedChapterUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockImplementation((args: any) => {
                capturedVersionCreate = args;
                return {};
              }),
            },
            chapter: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedChapterUpdate = args;
                return {
                  ...mockChapterWithWork,
                  title: mockTargetVersion.title,
                  content: mockTargetVersion.content,
                  wordCount: mockTargetVersion.wordCount,
                  version: 4,
                };
              }),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      const result = await service.rollbackChapterVersion(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
        { targetVersion: 1 },
      );

      expect(result.message).toBe('章节回滚成功');
      expect(result.chapterId).toBe(mockChapterId);
      expect(result.previousVersion).toBe(3);
      expect(result.newVersion).toBe(4);
      expect(result.targetVersion).toBe(1);
      expect(result.title).toBe(mockTargetVersion.title);
      expect(result.wordCount).toBe(mockTargetVersion.wordCount);
    });

    it('should save current content as version snapshot before rollback', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );
      mockPrismaService.chapterVersion.findUnique.mockResolvedValue(
        mockTargetVersion,
      );

      let capturedVersionCreate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockImplementation((args: any) => {
                capturedVersionCreate = args;
                return {};
              }),
            },
            chapter: {
              update: jest.fn().mockResolvedValue({
                ...mockChapterWithWork,
                version: 4,
              }),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      await service.rollbackChapterVersion(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
        { targetVersion: 1 },
      );

      expect(capturedVersionCreate).toBeDefined();
      expect(capturedVersionCreate.data.chapterId).toBe(mockChapterId);
      expect(capturedVersionCreate.data.version).toBe(
        mockChapterWithWork.version,
      );
      expect(capturedVersionCreate.data.title).toBe(mockChapterWithWork.title);
      expect(capturedVersionCreate.data.content).toBe(
        mockChapterWithWork.content,
      );
      expect(capturedVersionCreate.data.wordCount).toBe(
        mockChapterWithWork.wordCount,
      );
    });

    it('should restore content from target version', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );
      mockPrismaService.chapterVersion.findUnique.mockResolvedValue(
        mockTargetVersion,
      );

      let capturedChapterUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockResolvedValue({}),
            },
            chapter: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedChapterUpdate = args;
                return {
                  ...mockChapterWithWork,
                  version: 4,
                };
              }),
            },
            work: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        },
      );

      await service.rollbackChapterVersion(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
        { targetVersion: 1 },
      );

      expect(capturedChapterUpdate.data.title).toBe(mockTargetVersion.title);
      expect(capturedChapterUpdate.data.content).toBe(
        mockTargetVersion.content,
      );
      expect(capturedChapterUpdate.data.wordCount).toBe(
        mockTargetVersion.wordCount,
      );
      expect(capturedChapterUpdate.data.version).toBe(4);
    });

    it('should update work wordCount when content changes', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );
      mockPrismaService.chapterVersion.findUnique.mockResolvedValue(
        mockTargetVersion,
      );

      let capturedWorkUpdate: any = null;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockResolvedValue({}),
            },
            chapter: {
              update: jest.fn().mockResolvedValue({
                ...mockChapterWithWork,
                version: 4,
              }),
            },
            work: {
              update: jest.fn().mockImplementation((args: any) => {
                capturedWorkUpdate = args;
                return {};
              }),
            },
          });
        },
      );

      await service.rollbackChapterVersion(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
        { targetVersion: 1 },
      );

      expect(capturedWorkUpdate).toBeDefined();
      expect(capturedWorkUpdate.data.wordCount.increment).toBe(
        mockTargetVersion.wordCount - mockChapterWithWork.wordCount,
      );
    });

    it('should throw NotFoundException when chapter does not exist', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(null);

      await expect(
        service.rollbackChapterVersion(
          mockWorkId,
          mockChapterId,
          mockAuthorId,
          {
            targetVersion: 1,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when chapter does not belong to work', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue({
        ...mockChapterWithWork,
        workId: 'different-work-id',
      });

      await expect(
        service.rollbackChapterVersion(
          mockWorkId,
          mockChapterId,
          mockAuthorId,
          {
            targetVersion: 1,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );

      await expect(
        service.rollbackChapterVersion(
          mockWorkId,
          mockChapterId,
          'other-user-id',
          {
            targetVersion: 1,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when trying to rollback to current version', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );

      await expect(
        service.rollbackChapterVersion(
          mockWorkId,
          mockChapterId,
          mockAuthorId,
          {
            targetVersion: 3, // Same as current version
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when target version does not exist', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );
      mockPrismaService.chapterVersion.findUnique.mockResolvedValue(null);

      await expect(
        service.rollbackChapterVersion(
          mockWorkId,
          mockChapterId,
          mockAuthorId,
          {
            targetVersion: 99,
          },
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );
      mockPrismaService.chapterVersion.findUnique.mockResolvedValue(
        mockTargetVersion,
      );
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.rollbackChapterVersion(
          mockWorkId,
          mockChapterId,
          mockAuthorId,
          {
            targetVersion: 1,
          },
        ),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should not update work wordCount when wordCount is unchanged', async () => {
      const sameWordCountVersion = {
        ...mockTargetVersion,
        wordCount: mockChapterWithWork.wordCount, // Same wordCount
      };
      mockPrismaService.chapter.findUnique.mockResolvedValue(
        mockChapterWithWork,
      );
      mockPrismaService.chapterVersion.findUnique.mockResolvedValue(
        sameWordCountVersion,
      );

      let workUpdateCalled = false;

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            chapterVersion: {
              create: jest.fn().mockResolvedValue({}),
            },
            chapter: {
              update: jest.fn().mockResolvedValue({
                ...mockChapterWithWork,
                version: 4,
              }),
            },
            work: {
              update: jest.fn().mockImplementation(() => {
                workUpdateCalled = true;
                return {};
              }),
            },
          });
        },
      );

      await service.rollbackChapterVersion(
        mockWorkId,
        mockChapterId,
        mockAuthorId,
        { targetVersion: 1 },
      );

      expect(workUpdateCalled).toBe(false);
    });
  });
});
