import { Test, TestingModule } from '@nestjs/testing';
import { CreatorService } from './creator.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * 创作者控制台服务测试
 *
 * 需求6: 创作者控制台
 * 测试草稿自动保存 API
 */
describe('CreatorService', () => {
  let service: CreatorService;
  let prisma: PrismaService;

  // Mock PrismaService
  const mockPrismaService = {
    draft: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    work: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      aggregate: jest.fn(),
    },
    chapter: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    paragraph: {
      findMany: jest.fn(),
    },
    card: {
      findMany: jest.fn(),
    },
    like: {
      count: jest.fn(),
    },
    quote: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    comment: {
      count: jest.fn(),
    },
    readingProgress: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CreatorService>(CreatorService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('createOrUpdateDraft', () => {
    const userId = 'test-user-id';
    const mockDraft = {
      id: 'draft-id',
      userId,
      title: '测试草稿',
      content: '这是测试内容',
      workId: null,
      chapterId: null,
      cursorPosition: 10,
      wordCount: 5,
      isDeleted: false,
      lastSavedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a new draft when no existing draft found', async () => {
      // Arrange
      mockPrismaService.draft.findFirst.mockResolvedValue(null);
      mockPrismaService.draft.create.mockResolvedValue(mockDraft);

      // Act
      const result = await service.createOrUpdateDraft(userId, {
        title: '测试草稿',
        content: '这是测试内容',
        cursorPosition: 10,
      });

      // Assert
      expect(mockPrismaService.draft.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          workId: null,
          chapterId: null,
          isDeleted: false,
        },
      });
      expect(mockPrismaService.draft.create).toHaveBeenCalled();
      expect(result.id).toBe(mockDraft.id);
      expect(result.title).toBe(mockDraft.title);
      expect(result.content).toBe(mockDraft.content);
    });

    it('should update existing draft when found', async () => {
      // Arrange
      mockPrismaService.draft.findFirst.mockResolvedValue(mockDraft);
      mockPrismaService.draft.update.mockResolvedValue({
        ...mockDraft,
        content: '更新后的内容',
      });

      // Act
      const result = await service.createOrUpdateDraft(userId, {
        title: '测试草稿',
        content: '更新后的内容',
        cursorPosition: 20,
      });

      // Assert
      expect(mockPrismaService.draft.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.draft.update).toHaveBeenCalledWith({
        where: { id: mockDraft.id },
        data: expect.objectContaining({
          content: '更新后的内容',
          cursorPosition: 20,
        }),
      });
      expect(result.content).toBe('更新后的内容');
    });

    it('should create draft with workId and chapterId', async () => {
      // Arrange
      const workId = 'work-id';
      const chapterId = 'chapter-id';
      const draftWithWork = {
        ...mockDraft,
        workId,
        chapterId,
      };
      mockPrismaService.draft.findFirst.mockResolvedValue(null);
      mockPrismaService.draft.create.mockResolvedValue(draftWithWork);

      // Act
      const result = await service.createOrUpdateDraft(userId, {
        title: '章节草稿',
        content: '章节内容',
        workId,
        chapterId,
      });

      // Assert
      expect(mockPrismaService.draft.findFirst).toHaveBeenCalledWith({
        where: {
          userId,
          workId,
          chapterId,
          isDeleted: false,
        },
      });
      expect(result.workId).toBe(workId);
      expect(result.chapterId).toBe(chapterId);
    });
  });

  describe('getDraftList', () => {
    const userId = 'test-user-id';

    it('should return empty list when no drafts exist', async () => {
      // Arrange
      mockPrismaService.draft.findMany.mockResolvedValue([]);

      // Act
      const result = await service.getDraftList(userId);

      // Assert
      expect(result.drafts).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return drafts with work and chapter titles', async () => {
      // Arrange
      const mockDrafts = [
        {
          id: 'draft-1',
          userId,
          title: '草稿1',
          content: '内容1',
          workId: 'work-1',
          chapterId: 'chapter-1',
          cursorPosition: null,
          wordCount: 10,
          isDeleted: false,
          lastSavedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockPrismaService.draft.findMany.mockResolvedValue(mockDrafts);
      mockPrismaService.work.findMany.mockResolvedValue([
        { id: 'work-1', title: '作品1' },
      ]);
      mockPrismaService.chapter.findMany.mockResolvedValue([
        { id: 'chapter-1', title: '章节1' },
      ]);

      // Act
      const result = await service.getDraftList(userId);

      // Assert
      expect(result.drafts).toHaveLength(1);
      expect(result.drafts[0].workTitle).toBe('作品1');
      expect(result.drafts[0].chapterTitle).toBe('章节1');
      expect(result.total).toBe(1);
    });
  });

  describe('getDraft', () => {
    const userId = 'test-user-id';
    const draftId = 'draft-id';

    it('should return draft when found', async () => {
      // Arrange
      const mockDraft = {
        id: draftId,
        userId,
        title: '测试草稿',
        content: '内容',
        workId: null,
        chapterId: null,
        cursorPosition: 5,
        wordCount: 2,
        isDeleted: false,
        lastSavedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrismaService.draft.findFirst.mockResolvedValue(mockDraft);

      // Act
      const result = await service.getDraft(draftId, userId);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe(draftId);
      expect(result?.content).toBe('内容');
    });

    it('should return null when draft not found', async () => {
      // Arrange
      mockPrismaService.draft.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.getDraft(draftId, userId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('deleteDraft', () => {
    const userId = 'test-user-id';
    const draftId = 'draft-id';

    it('should soft delete draft and return true', async () => {
      // Arrange
      const mockDraft = {
        id: draftId,
        userId,
        isDeleted: false,
      };
      mockPrismaService.draft.findFirst.mockResolvedValue(mockDraft);
      mockPrismaService.draft.update.mockResolvedValue({
        ...mockDraft,
        isDeleted: true,
      });

      // Act
      const result = await service.deleteDraft(draftId, userId);

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.draft.update).toHaveBeenCalledWith({
        where: { id: draftId },
        data: { isDeleted: true },
      });
    });

    it('should return false when draft not found', async () => {
      // Arrange
      mockPrismaService.draft.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.deleteDraft(draftId, userId);

      // Assert
      expect(result).toBe(false);
      expect(mockPrismaService.draft.update).not.toHaveBeenCalled();
    });
  });
});
