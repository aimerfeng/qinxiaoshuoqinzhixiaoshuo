import { Test, TestingModule } from '@nestjs/testing';
import { WorksService } from './works.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ContentType, WorkStatus, ChapterStatus } from '@prisma/client';
import {
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

describe('WorksService', () => {
  let service: WorksService;

  const mockAuthorId = 'test-author-id';
  const mockWorkId = 'test-work-id';

  const mockAuthor = {
    id: mockAuthorId,
    username: 'testuser',
    displayName: 'Test User',
    avatar: null,
  };

  const mockWork = {
    id: mockWorkId,
    authorId: mockAuthorId,
    title: '测试作品',
    description: '这是一个测试作品',
    coverImage: null,
    contentType: ContentType.NOVEL,
    status: WorkStatus.DRAFT,
    wordCount: 0,
    viewCount: 0,
    likeCount: 0,
    quoteCount: 0,
    isDeleted: false,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockAuthor,
    tags: [],
    chapters: [],
  };

  const mockPrismaService = {
    $transaction: jest.fn(),
    work: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    tag: {
      upsert: jest.fn(),
    },
    workTag: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<WorksService>(WorksService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWork', () => {
    it('should create a work successfully without tags', async () => {
      const createWorkDto = {
        title: '测试作品',
        description: '这是一个测试作品',
        type: ContentType.NOVEL,
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              create: jest.fn().mockResolvedValue(mockWork),
              findUnique: jest.fn().mockResolvedValue(mockWork),
            },
            tag: {
              upsert: jest.fn(),
            },
            workTag: {
              create: jest.fn(),
            },
          });
        },
      );

      const result = await service.createWork(mockAuthorId, createWorkDto);

      expect(result).toBeDefined();
      expect(result.message).toBe('作品创建成功');
      expect(result.work).toBeDefined();
      expect(result.work.title).toBe('测试作品');
      expect(result.work.author.id).toBe(mockAuthorId);
    });

    it('should create a work successfully with tags', async () => {
      const createWorkDto = {
        title: '测试作品',
        description: '这是一个测试作品',
        type: ContentType.NOVEL,
        tags: ['奇幻', '冒险'],
      };

      const mockTag1 = {
        id: 'tag-1',
        name: '奇幻',
        slug: '奇幻',
        usageCount: 1,
      };
      const mockTag2 = {
        id: 'tag-2',
        name: '冒险',
        slug: '冒险',
        usageCount: 1,
      };

      const mockWorkWithTags = {
        ...mockWork,
        tags: [{ tag: mockTag1 }, { tag: mockTag2 }],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              create: jest.fn().mockResolvedValue(mockWork),
              findUnique: jest.fn().mockResolvedValue(mockWorkWithTags),
            },
            tag: {
              upsert: jest
                .fn()
                .mockResolvedValueOnce(mockTag1)
                .mockResolvedValueOnce(mockTag2),
            },
            workTag: {
              create: jest.fn(),
            },
          });
        },
      );

      const result = await service.createWork(mockAuthorId, createWorkDto);

      expect(result).toBeDefined();
      expect(result.message).toBe('作品创建成功');
      expect(result.work.tags).toContain('奇幻');
      expect(result.work.tags).toContain('冒险');
    });

    it('should create a manga work', async () => {
      const createWorkDto = {
        title: '测试漫画',
        type: ContentType.MANGA,
      };

      const mockMangaWork = {
        ...mockWork,
        title: '测试漫画',
        contentType: ContentType.MANGA,
        readingDirection: 'RTL',
        pageCount: 0,
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              create: jest.fn().mockResolvedValue(mockMangaWork),
              findUnique: jest.fn().mockResolvedValue(mockMangaWork),
            },
            tag: {
              upsert: jest.fn(),
            },
            workTag: {
              create: jest.fn(),
            },
          });
        },
      );

      const result = await service.createWork(mockAuthorId, createWorkDto);

      expect(result).toBeDefined();
      expect(result.work.type).toBe(ContentType.MANGA);
      expect(result.work.readingDirection).toBe('RTL');
    });

    it('should create a manga work with custom reading direction', async () => {
      const createWorkDto = {
        title: '韩漫测试',
        type: ContentType.MANGA,
        readingDirection: 'LTR' as const,
      };

      const mockMangaWork = {
        ...mockWork,
        title: '韩漫测试',
        contentType: ContentType.MANGA,
        readingDirection: 'LTR',
        pageCount: 0,
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              create: jest.fn().mockResolvedValue(mockMangaWork),
              findUnique: jest.fn().mockResolvedValue(mockMangaWork),
            },
            tag: {
              upsert: jest.fn(),
            },
            workTag: {
              create: jest.fn(),
            },
          });
        },
      );

      const result = await service.createWork(mockAuthorId, createWorkDto);

      expect(result).toBeDefined();
      expect(result.work.type).toBe(ContentType.MANGA);
      expect(result.work.readingDirection).toBe('LTR');
    });

    it('should throw BadRequestException when setting readingDirection for novel', async () => {
      const createWorkDto = {
        title: '测试小说',
        type: ContentType.NOVEL,
        readingDirection: 'RTL' as const,
      };

      await expect(
        service.createWork(mockAuthorId, createWorkDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      const createWorkDto = {
        title: '测试作品',
        type: ContentType.NOVEL,
      };

      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.createWork(mockAuthorId, createWorkDto),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle empty tags array', async () => {
      const createWorkDto = {
        title: '测试作品',
        type: ContentType.NOVEL,
        tags: [],
      };

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              create: jest.fn().mockResolvedValue(mockWork),
              findUnique: jest.fn().mockResolvedValue(mockWork),
            },
            tag: {
              upsert: jest.fn(),
            },
            workTag: {
              create: jest.fn(),
            },
          });
        },
      );

      const result = await service.createWork(mockAuthorId, createWorkDto);

      expect(result).toBeDefined();
      expect(result.work.tags).toEqual([]);
    });

    it('should normalize tag names to lowercase', async () => {
      const createWorkDto = {
        title: '测试作品',
        type: ContentType.NOVEL,
        tags: ['Fantasy', 'ADVENTURE'],
      };

      const mockTag1 = {
        id: 'tag-1',
        name: 'fantasy',
        slug: 'fantasy',
        usageCount: 1,
      };
      const mockTag2 = {
        id: 'tag-2',
        name: 'adventure',
        slug: 'adventure',
        usageCount: 1,
      };

      const mockWorkWithTags = {
        ...mockWork,
        tags: [{ tag: mockTag1 }, { tag: mockTag2 }],
      };

      const capturedTagNames: string[] = [];

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              create: jest.fn().mockResolvedValue(mockWork),
              findUnique: jest.fn().mockResolvedValue(mockWorkWithTags),
            },
            tag: {
              upsert: jest.fn().mockImplementation(({ where }) => {
                capturedTagNames.push(where.name);
                return where.name === 'fantasy' ? mockTag1 : mockTag2;
              }),
            },
            workTag: {
              create: jest.fn(),
            },
          });
        },
      );

      await service.createWork(mockAuthorId, createWorkDto);

      expect(capturedTagNames).toContain('fantasy');
      expect(capturedTagNames).toContain('adventure');
    });
  });

  describe('getWorkById', () => {
    const mockPublishedWork = {
      ...mockWork,
      status: WorkStatus.PUBLISHED,
      publishedAt: new Date(),
      chapters: [
        {
          id: 'chapter-1',
          title: '第一章',
          orderIndex: 0,
          wordCount: 1500,
          status: ChapterStatus.PUBLISHED,
          publishedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'chapter-2',
          title: '第二章',
          orderIndex: 1,
          wordCount: 2000,
          status: ChapterStatus.DRAFT,
          publishedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      tags: [{ tag: { name: '奇幻' } }, { tag: { name: '冒险' } }],
    };

    it('should return published work detail for unauthenticated user', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockPublishedWork);

      const result = await service.getWorkById(mockWorkId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockWorkId);
      expect(result.title).toBe('测试作品');
      expect(result.author.id).toBe(mockAuthorId);
      expect(result.tags).toEqual(['奇幻', '冒险']);
      expect(result.chapters).toHaveLength(2);
      expect(result.chapters[0].title).toBe('第一章');
      expect(result.chapters[1].title).toBe('第二章');
      expect(result.stats.chapterCount).toBe(2);
      expect(result.stats.viewCount).toBe(0);
    });

    it('should return published work detail for authenticated non-author', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockPublishedWork);

      const result = await service.getWorkById(mockWorkId, 'other-user-id');

      expect(result).toBeDefined();
      expect(result.id).toBe(mockWorkId);
    });

    it('should return draft work detail for the author', async () => {
      const draftWork = {
        ...mockPublishedWork,
        status: WorkStatus.DRAFT,
        publishedAt: null,
      };
      mockPrismaService.work.findUnique.mockResolvedValue(draftWork);

      const result = await service.getWorkById(mockWorkId, mockAuthorId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockWorkId);
      expect(result.status).toBe(WorkStatus.DRAFT);
    });

    it('should throw ForbiddenException for draft work accessed by non-author', async () => {
      const draftWork = { ...mockPublishedWork, status: WorkStatus.DRAFT };
      mockPrismaService.work.findUnique.mockResolvedValue(draftWork);

      await expect(
        service.getWorkById(mockWorkId, 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for draft work accessed by unauthenticated user', async () => {
      const draftWork = { ...mockPublishedWork, status: WorkStatus.DRAFT };
      mockPrismaService.work.findUnique.mockResolvedValue(draftWork);

      await expect(service.getWorkById(mockWorkId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when work does not exist', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(null);

      await expect(service.getWorkById('nonexistent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return work with empty chapters list', async () => {
      const workNoChapters = { ...mockPublishedWork, chapters: [] };
      mockPrismaService.work.findUnique.mockResolvedValue(workNoChapters);

      const result = await service.getWorkById(mockWorkId);

      expect(result.chapters).toEqual([]);
      expect(result.stats.chapterCount).toBe(0);
    });

    it('should return work with empty tags', async () => {
      const workNoTags = { ...mockPublishedWork, tags: [] };
      mockPrismaService.work.findUnique.mockResolvedValue(workNoTags);

      const result = await service.getWorkById(mockWorkId);

      expect(result.tags).toEqual([]);
    });

    it('should include correct stats in response', async () => {
      const workWithStats = {
        ...mockPublishedWork,
        wordCount: 50000,
        viewCount: 1234,
        likeCount: 56,
        quoteCount: 12,
      };
      mockPrismaService.work.findUnique.mockResolvedValue(workWithStats);

      const result = await service.getWorkById(mockWorkId);

      expect(result.stats.wordCount).toBe(50000);
      expect(result.stats.viewCount).toBe(1234);
      expect(result.stats.likeCount).toBe(56);
      expect(result.stats.quoteCount).toBe(12);
      expect(result.stats.chapterCount).toBe(2);
    });
  });

  describe('updateWork', () => {
    const mockExistingWork = {
      id: mockWorkId,
      authorId: mockAuthorId,
      status: WorkStatus.DRAFT,
    };

    const mockUpdatedWork = {
      ...mockWork,
      title: '更新后的标题',
      description: '更新后的简介',
      author: mockAuthor,
      tags: [],
    };

    it('should update work title successfully', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              update: jest.fn().mockResolvedValue(mockUpdatedWork),
              findUnique: jest.fn().mockResolvedValue(mockUpdatedWork),
            },
            tag: { upsert: jest.fn() },
            workTag: { create: jest.fn(), deleteMany: jest.fn() },
          });
        },
      );

      const result = await service.updateWork(mockWorkId, mockAuthorId, {
        title: '更新后的标题',
      });

      expect(result).toBeDefined();
      expect(result.message).toBe('作品更新成功');
      expect(result.work.title).toBe('更新后的标题');
    });

    it('should update work description and coverImage', async () => {
      const updatedWork = {
        ...mockUpdatedWork,
        description: '新简介',
        coverImage: 'https://example.com/cover.jpg',
      };

      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              update: jest.fn().mockResolvedValue(updatedWork),
              findUnique: jest.fn().mockResolvedValue(updatedWork),
            },
            tag: { upsert: jest.fn() },
            workTag: { create: jest.fn(), deleteMany: jest.fn() },
          });
        },
      );

      const result = await service.updateWork(mockWorkId, mockAuthorId, {
        description: '新简介',
        coverImage: 'https://example.com/cover.jpg',
      });

      expect(result).toBeDefined();
      expect(result.work.description).toBe('新简介');
      expect(result.work.coverImage).toBe('https://example.com/cover.jpg');
    });

    it('should update tags by replacing existing ones', async () => {
      const mockTag = {
        id: 'tag-new',
        name: '新标签',
        slug: '新标签',
        usageCount: 1,
      };
      const updatedWork = {
        ...mockUpdatedWork,
        tags: [{ tag: mockTag }],
      };

      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);

      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockTagUpsert = jest.fn().mockResolvedValue(mockTag);
      const mockWorkTagCreate = jest.fn().mockResolvedValue({});

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              update: jest.fn(),
              findUnique: jest.fn().mockResolvedValue(updatedWork),
            },
            tag: { upsert: mockTagUpsert },
            workTag: { create: mockWorkTagCreate, deleteMany: mockDeleteMany },
          });
        },
      );

      const result = await service.updateWork(mockWorkId, mockAuthorId, {
        tags: ['新标签'],
      });

      expect(result).toBeDefined();
      expect(result.work.tags).toContain('新标签');
    });

    it('should publish work (DRAFT -> PUBLISHED)', async () => {
      const publishedWork = {
        ...mockUpdatedWork,
        status: WorkStatus.PUBLISHED,
        publishedAt: new Date(),
      };

      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              update: jest.fn().mockResolvedValue(publishedWork),
              findUnique: jest.fn().mockResolvedValue(publishedWork),
            },
            tag: { upsert: jest.fn() },
            workTag: { create: jest.fn(), deleteMany: jest.fn() },
          });
        },
      );

      const result = await service.updateWork(mockWorkId, mockAuthorId, {
        status: WorkStatus.PUBLISHED,
      });

      expect(result).toBeDefined();
      expect(result.work.status).toBe(WorkStatus.PUBLISHED);
    });

    it('should throw NotFoundException when work does not exist', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(null);

      await expect(
        service.updateWork(mockWorkId, mockAuthorId, { title: '新标题' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-author tries to update', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);

      await expect(
        service.updateWork(mockWorkId, 'other-user-id', { title: '新标题' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const completedWork = {
        ...mockExistingWork,
        status: WorkStatus.COMPLETED,
      };
      mockPrismaService.work.findUnique.mockResolvedValue(completedWork);

      await expect(
        service.updateWork(mockWorkId, mockAuthorId, {
          status: WorkStatus.DRAFT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for ABANDONED to PUBLISHED transition', async () => {
      const abandonedWork = {
        ...mockExistingWork,
        status: WorkStatus.ABANDONED,
      };
      mockPrismaService.work.findUnique.mockResolvedValue(abandonedWork);

      await expect(
        service.updateWork(mockWorkId, mockAuthorId, {
          status: WorkStatus.PUBLISHED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow same status without error', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              update: jest.fn().mockResolvedValue(mockUpdatedWork),
              findUnique: jest.fn().mockResolvedValue(mockUpdatedWork),
            },
            tag: { upsert: jest.fn() },
            workTag: { create: jest.fn(), deleteMany: jest.fn() },
          });
        },
      );

      const result = await service.updateWork(mockWorkId, mockAuthorId, {
        status: WorkStatus.DRAFT,
      });

      expect(result).toBeDefined();
    });

    it('should clear tags when empty array is provided', async () => {
      const workNoTags = { ...mockUpdatedWork, tags: [] };

      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);

      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 2 });

      mockPrismaService.$transaction.mockImplementation(
        async (callback: any) => {
          return callback({
            work: {
              update: jest.fn(),
              findUnique: jest.fn().mockResolvedValue(workNoTags),
            },
            tag: { upsert: jest.fn() },
            workTag: { create: jest.fn(), deleteMany: mockDeleteMany },
          });
        },
      );

      const result = await service.updateWork(mockWorkId, mockAuthorId, {
        tags: [],
      });

      expect(result).toBeDefined();
      expect(result.work.tags).toEqual([]);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);
      mockPrismaService.$transaction.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.updateWork(mockWorkId, mockAuthorId, { title: '新标题' }),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('deleteWork', () => {
    const mockExistingWork = {
      id: mockWorkId,
      authorId: mockAuthorId,
      isDeleted: false,
    };

    it('should soft-delete a work successfully', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);
      mockPrismaService.work.update.mockResolvedValue({
        ...mockExistingWork,
        isDeleted: true,
      });

      const result = await service.deleteWork(mockWorkId, mockAuthorId);

      expect(result).toBeDefined();
      expect(result.message).toBe('作品删除成功');
      expect(mockPrismaService.work.update).toHaveBeenCalledWith({
        where: { id: mockWorkId },
        data: { isDeleted: true },
      });
    });

    it('should throw NotFoundException when work does not exist', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteWork(mockWorkId, mockAuthorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when work is already deleted', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue({
        ...mockExistingWork,
        isDeleted: true,
      });

      await expect(
        service.deleteWork(mockWorkId, mockAuthorId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when non-author tries to delete', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);

      await expect(
        service.deleteWork(mockWorkId, 'other-user-id'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw InternalServerErrorException on database error during update', async () => {
      mockPrismaService.work.findUnique.mockResolvedValue(mockExistingWork);
      mockPrismaService.work.update.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.deleteWork(mockWorkId, mockAuthorId),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('listWorks', () => {
    const mockPublishedWork1 = {
      ...mockWork,
      id: 'work-1',
      title: '作品一',
      status: WorkStatus.PUBLISHED,
      contentType: ContentType.NOVEL,
      publishedAt: new Date('2024-01-01'),
      viewCount: 100,
      likeCount: 10,
      author: mockAuthor,
      tags: [{ tag: { name: '奇幻' } }],
    };

    const mockPublishedWork2 = {
      ...mockWork,
      id: 'work-2',
      title: '作品二',
      status: WorkStatus.PUBLISHED,
      contentType: ContentType.MANGA,
      publishedAt: new Date('2024-02-01'),
      viewCount: 200,
      likeCount: 20,
      author: mockAuthor,
      tags: [{ tag: { name: '冒险' } }],
    };

    it('should return paginated list of published works by default', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([
        mockPublishedWork1,
        mockPublishedWork2,
      ]);
      mockPrismaService.work.count.mockResolvedValue(2);

      const result = await service.listWorks({});

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.hasNextPage).toBe(false);
      expect(result.meta.hasPreviousPage).toBe(false);

      // Verify only published works are queried
      expect(mockPrismaService.work.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
            status: WorkStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([mockPublishedWork1]);
      mockPrismaService.work.count.mockResolvedValue(5);

      const result = await service.listWorks({ page: 2, limit: 2 });

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(2);
      expect(result.meta.total).toBe(5);
      expect(result.meta.totalPages).toBe(3);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);

      expect(mockPrismaService.work.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 2,
          take: 2,
        }),
      );
    });

    it('should filter by contentType', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([mockPublishedWork1]);
      mockPrismaService.work.count.mockResolvedValue(1);

      await service.listWorks({ contentType: ContentType.NOVEL });

      expect(mockPrismaService.work.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contentType: ContentType.NOVEL,
          }),
        }),
      );
    });

    it('should filter by tag (normalized to lowercase)', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([mockPublishedWork1]);
      mockPrismaService.work.count.mockResolvedValue(1);

      await service.listWorks({ tag: '奇幻' });

      expect(mockPrismaService.work.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tags: {
              some: {
                tag: { name: '奇幻' },
              },
            },
          }),
        }),
      );
    });

    it('should filter by authorId and show only published for non-author', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([mockPublishedWork1]);
      mockPrismaService.work.count.mockResolvedValue(1);

      await service.listWorks({ authorId: mockAuthorId }, 'other-user-id');

      expect(mockPrismaService.work.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: mockAuthorId,
            status: WorkStatus.PUBLISHED,
          }),
        }),
      );
    });

    it('should allow author to see all their own works (no status filter)', async () => {
      const draftWork = {
        ...mockWork,
        status: WorkStatus.DRAFT,
        author: mockAuthor,
        tags: [],
      };
      mockPrismaService.work.findMany.mockResolvedValue([
        mockPublishedWork1,
        draftWork,
      ]);
      mockPrismaService.work.count.mockResolvedValue(2);

      await service.listWorks({ authorId: mockAuthorId }, mockAuthorId);

      const calledWith = mockPrismaService.work.findMany.mock.calls[0][0];
      expect(calledWith.where.authorId).toBe(mockAuthorId);
      // Should NOT have status filter when author views own works without specifying status
      expect(calledWith.where.status).toBeUndefined();
    });

    it('should allow author to filter own works by status', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([]);
      mockPrismaService.work.count.mockResolvedValue(0);

      await service.listWorks(
        { authorId: mockAuthorId, status: WorkStatus.DRAFT },
        mockAuthorId,
      );

      expect(mockPrismaService.work.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            authorId: mockAuthorId,
            status: WorkStatus.DRAFT,
          }),
        }),
      );
    });

    it('should sort by specified field and order', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([
        mockPublishedWork2,
        mockPublishedWork1,
      ]);
      mockPrismaService.work.count.mockResolvedValue(2);

      await service.listWorks({ sortBy: 'viewCount', sortOrder: 'desc' });

      expect(mockPrismaService.work.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { viewCount: 'desc' },
        }),
      );
    });

    it('should default to sorting by createdAt desc', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([]);
      mockPrismaService.work.count.mockResolvedValue(0);

      await service.listWorks({});

      expect(mockPrismaService.work.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('should return empty list when no works match', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([]);
      mockPrismaService.work.count.mockResolvedValue(0);

      const result = await service.listWorks({});

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
      expect(result.meta.hasNextPage).toBe(false);
    });

    it('should format work responses correctly', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([mockPublishedWork1]);
      mockPrismaService.work.count.mockResolvedValue(1);

      const result = await service.listWorks({});

      expect(result.data[0]).toMatchObject({
        id: 'work-1',
        title: '作品一',
        type: ContentType.NOVEL,
        status: WorkStatus.PUBLISHED,
        tags: ['奇幻'],
        author: expect.objectContaining({ id: mockAuthorId }),
        stats: expect.objectContaining({
          viewCount: 100,
          likeCount: 10,
        }),
      });
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.work.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.listWorks({})).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should ignore status param for unauthenticated users', async () => {
      mockPrismaService.work.findMany.mockResolvedValue([]);
      mockPrismaService.work.count.mockResolvedValue(0);

      await service.listWorks({ status: WorkStatus.DRAFT });

      // Should still enforce PUBLISHED status for unauthenticated users
      expect(mockPrismaService.work.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: WorkStatus.PUBLISHED,
          }),
        }),
      );
    });
  });
});
