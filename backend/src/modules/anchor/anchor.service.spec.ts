import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { AnchorService } from './anchor.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('AnchorService', () => {
  let service: AnchorService;
  let prismaService: PrismaService;

  // Mock data
  const mockAuthor = {
    id: 'author-123',
    username: 'testauthor',
    displayName: 'Test Author',
    avatar: 'https://example.com/avatar.jpg',
  };

  const mockWork = {
    id: 'work-123',
    title: 'Test Work',
    description: 'A test work description',
    coverImage: 'https://example.com/cover.jpg',
    status: 'PUBLISHED',
    contentType: 'NOVEL',
    author: mockAuthor,
  };

  const mockChapter = {
    id: 'chapter-123',
    title: 'Chapter 1',
    orderIndex: 0,
    status: 'PUBLISHED',
    publishedAt: new Date('2024-01-01'),
    work: mockWork,
  };

  const mockParagraph = {
    id: 'paragraph-123',
    anchorId: 'work-123:chapter-123:0',
    content: 'This is the first paragraph of the chapter.',
    orderIndex: 0,
    quoteCount: 5,
    isDeleted: false,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    chapter: mockChapter,
  };

  // Mock data for references
  const mockCardAuthor1 = {
    id: 'card-author-1',
    username: 'carduser1',
    displayName: 'Card User 1',
    avatar: 'https://example.com/avatar1.jpg',
  };

  const mockCardAuthor2 = {
    id: 'card-author-2',
    username: 'carduser2',
    displayName: null,
    avatar: null,
  };

  const mockCard1 = {
    id: 'card-1',
    content: 'This is a great quote!',
    likeCount: 10,
    commentCount: 5,
    isDeleted: false,
    author: mockCardAuthor1,
  };

  const mockCard2 = {
    id: 'card-2',
    content: 'I love this paragraph!',
    likeCount: 3,
    commentCount: 1,
    isDeleted: false,
    author: mockCardAuthor2,
  };

  const mockQuote1 = {
    id: 'quote-1',
    cardId: 'card-1',
    paragraphId: 'paragraph-123',
    originalContent: 'This is the first paragraph of the chapter.',
    contentUpdated: false,
    createdAt: new Date('2024-01-15'),
    card: mockCard1,
  };

  const mockQuote2 = {
    id: 'quote-2',
    cardId: 'card-2',
    paragraphId: 'paragraph-123',
    originalContent: 'This is the first paragraph of the chapter.',
    contentUpdated: true,
    createdAt: new Date('2024-01-10'),
    card: mockCard2,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnchorService,
        {
          provide: PrismaService,
          useValue: {
            paragraph: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
            },
            quote: {
              findMany: jest.fn(),
              count: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            card: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnchorService>(AnchorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAnchorDetail', () => {
    it('should return anchor detail when anchor exists', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraph as any);

      // Act
      const result = await service.getAnchorDetail(anchorId);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockParagraph.id);
      expect(result.anchorId).toBe(mockParagraph.anchorId);
      expect(result.content).toBe(mockParagraph.content);
      expect(result.orderIndex).toBe(mockParagraph.orderIndex);
      expect(result.quoteCount).toBe(mockParagraph.quoteCount);
      expect(result.isDeleted).toBe(mockParagraph.isDeleted);

      // Verify chapter info
      expect(result.chapter).toBeDefined();
      expect(result.chapter.id).toBe(mockChapter.id);
      expect(result.chapter.title).toBe(mockChapter.title);
      expect(result.chapter.orderIndex).toBe(mockChapter.orderIndex);
      expect(result.chapter.status).toBe(mockChapter.status);

      // Verify work info
      expect(result.work).toBeDefined();
      expect(result.work.id).toBe(mockWork.id);
      expect(result.work.title).toBe(mockWork.title);
      expect(result.work.description).toBe(mockWork.description);
      expect(result.work.coverImage).toBe(mockWork.coverImage);
      expect(result.work.status).toBe(mockWork.status);
      expect(result.work.contentType).toBe(mockWork.contentType);

      // Verify author info
      expect(result.author).toBeDefined();
      expect(result.author.id).toBe(mockAuthor.id);
      expect(result.author.username).toBe(mockAuthor.username);
      expect(result.author.displayName).toBe(mockAuthor.displayName);
      expect(result.author.avatar).toBe(mockAuthor.avatar);

      // Verify Prisma was called correctly
      expect(prismaService.paragraph.findUnique).toHaveBeenCalledWith({
        where: { anchorId },
        include: {
          chapter: {
            include: {
              work: {
                include: {
                  author: {
                    select: {
                      id: true,
                      username: true,
                      displayName: true,
                      avatar: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    it('should throw NotFoundException when anchor does not exist', async () => {
      // Arrange
      const anchorId = 'nonexistent:anchor:0';
      jest.spyOn(prismaService.paragraph, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.getAnchorDetail(anchorId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getAnchorDetail(anchorId)).rejects.toThrow(
        `锚点不存在: ${anchorId}`,
      );
    });

    it('should handle anchor with null optional fields', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      const paragraphWithNulls = {
        ...mockParagraph,
        chapter: {
          ...mockChapter,
          publishedAt: null,
          work: {
            ...mockWork,
            description: null,
            coverImage: null,
            author: {
              ...mockAuthor,
              displayName: null,
              avatar: null,
            },
          },
        },
      };
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(paragraphWithNulls as any);

      // Act
      const result = await service.getAnchorDetail(anchorId);

      // Assert
      expect(result.chapter.publishedAt).toBeNull();
      expect(result.work.description).toBeNull();
      expect(result.work.coverImage).toBeNull();
      expect(result.author.displayName).toBeNull();
      expect(result.author.avatar).toBeNull();
    });

    it('should handle deleted anchor', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      const deletedParagraph = {
        ...mockParagraph,
        isDeleted: true,
      };
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(deletedParagraph as any);

      // Act
      const result = await service.getAnchorDetail(anchorId);

      // Assert
      expect(result.isDeleted).toBe(true);
    });

    it('should handle anchor with high quote count', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      const popularParagraph = {
        ...mockParagraph,
        quoteCount: 1000,
      };
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(popularParagraph as any);

      // Act
      const result = await service.getAnchorDetail(anchorId);

      // Assert
      expect(result.quoteCount).toBe(1000);
    });
  });

  describe('getAnchorReferences', () => {
    it('should return paginated list of cards that reference the anchor', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      const query = { page: 1, limit: 20 };

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue({ id: 'paragraph-123', isDeleted: false } as any);
      jest
        .spyOn(prismaService.quote, 'findMany')
        .mockResolvedValue([mockQuote1, mockQuote2] as any);
      jest.spyOn(prismaService.quote, 'count').mockResolvedValue(2);

      // Act
      const result = await service.getAnchorReferences(anchorId, query);

      // Assert
      expect(result.cards).toHaveLength(2);
      expect(result.cards[0].id).toBe('card-1');
      expect(result.cards[0].content).toBe('This is a great quote!');
      expect(result.cards[0].author.id).toBe('card-author-1');
      expect(result.cards[0].likeCount).toBe(10);
      expect(result.cards[0].commentCount).toBe(5);
      expect(result.cards[0].originalContent).toBe(
        'This is the first paragraph of the chapter.',
      );
      expect(result.cards[0].contentUpdated).toBe(false);

      expect(result.cards[1].id).toBe('card-2');
      expect(result.cards[1].contentUpdated).toBe(true);

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(1);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should throw NotFoundException when anchor does not exist', async () => {
      // Arrange
      const anchorId = 'nonexistent:anchor:0';
      const query = { page: 1, limit: 20 };

      jest.spyOn(prismaService.paragraph, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getAnchorReferences(anchorId, query),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getAnchorReferences(anchorId, query),
      ).rejects.toThrow(`锚点不存在: ${anchorId}`);
    });

    it('should return empty list when no cards reference the anchor', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      const query = { page: 1, limit: 20 };

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue({ id: 'paragraph-123', isDeleted: false } as any);
      jest.spyOn(prismaService.quote, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.quote, 'count').mockResolvedValue(0);

      // Act
      const result = await service.getAnchorReferences(anchorId, query);

      // Assert
      expect(result.cards).toHaveLength(0);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
      expect(result.pagination.hasMore).toBe(false);
    });

    it('should handle pagination correctly', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      const query = { page: 2, limit: 1 };

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue({ id: 'paragraph-123', isDeleted: false } as any);
      jest
        .spyOn(prismaService.quote, 'findMany')
        .mockResolvedValue([mockQuote2] as any);
      jest.spyOn(prismaService.quote, 'count').mockResolvedValue(2);

      // Act
      const result = await service.getAnchorReferences(anchorId, query);

      // Assert
      expect(result.cards).toHaveLength(1);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(1);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.totalPages).toBe(2);
      expect(result.pagination.hasMore).toBe(false);

      // Verify skip was calculated correctly
      expect(prismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
        }),
      );
    });

    it('should indicate hasMore when there are more pages', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      const query = { page: 1, limit: 1 };

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue({ id: 'paragraph-123', isDeleted: false } as any);
      jest
        .spyOn(prismaService.quote, 'findMany')
        .mockResolvedValue([mockQuote1] as any);
      jest.spyOn(prismaService.quote, 'count').mockResolvedValue(2);

      // Act
      const result = await service.getAnchorReferences(anchorId, query);

      // Assert
      expect(result.pagination.hasMore).toBe(true);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should use default pagination values when not provided', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      const query = {};

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue({ id: 'paragraph-123', isDeleted: false } as any);
      jest.spyOn(prismaService.quote, 'findMany').mockResolvedValue([]);
      jest.spyOn(prismaService.quote, 'count').mockResolvedValue(0);

      // Act
      const result = await service.getAnchorReferences(anchorId, query);

      // Assert
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);

      expect(prismaService.quote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it('should handle cards with null author fields', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      const query = { page: 1, limit: 20 };

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue({ id: 'paragraph-123', isDeleted: false } as any);
      jest
        .spyOn(prismaService.quote, 'findMany')
        .mockResolvedValue([mockQuote2] as any);
      jest.spyOn(prismaService.quote, 'count').mockResolvedValue(1);

      // Act
      const result = await service.getAnchorReferences(anchorId, query);

      // Assert
      expect(result.cards[0].author.displayName).toBeNull();
      expect(result.cards[0].author.avatar).toBeNull();
    });

    it('should format createdAt as ISO string', async () => {
      // Arrange
      const anchorId = 'work-123:chapter-123:0';
      const query = { page: 1, limit: 20 };

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue({ id: 'paragraph-123', isDeleted: false } as any);
      jest
        .spyOn(prismaService.quote, 'findMany')
        .mockResolvedValue([mockQuote1] as any);
      jest.spyOn(prismaService.quote, 'count').mockResolvedValue(1);

      // Act
      const result = await service.getAnchorReferences(anchorId, query);

      // Assert
      expect(result.cards[0].createdAt).toBe(
        new Date('2024-01-15').toISOString(),
      );
    });
  });

  describe('createQuote', () => {
    const mockUserId = 'user-123';
    const mockAnchorId = 'work-123:chapter-123:0';
    const mockCardId = 'card-123';

    const mockParagraphForQuote = {
      id: 'paragraph-123',
      content: 'This is the paragraph content.',
      isDeleted: false,
      quoteCount: 5,
    };

    const mockCardForQuote = {
      id: mockCardId,
      authorId: mockUserId,
      isDeleted: false,
    };

    const mockCreatedQuote = {
      id: 'quote-new-123',
      cardId: mockCardId,
      paragraphId: 'paragraph-123',
      originalContent: 'This is the paragraph content.',
      contentUpdated: false,
      contentDeleted: false,
      createdAt: new Date('2024-01-20'),
    };

    it('should create a quote successfully', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForQuote as any);
      jest
        .spyOn(prismaService.card, 'findUnique')
        .mockResolvedValue(mockCardForQuote as any);
      jest.spyOn(prismaService.quote, 'findFirst').mockResolvedValue(null);
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn) => {
          return fn({
            quote: {
              create: jest.fn().mockResolvedValue(mockCreatedQuote),
            },
            paragraph: {
              update: jest.fn().mockResolvedValue({ quoteCount: 6 }),
            },
            card: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        });

      // Act
      const result = await service.createQuote(
        mockAnchorId,
        { cardId: mockCardId },
        mockUserId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(mockCreatedQuote.id);
      expect(result.cardId).toBe(mockCardId);
      expect(result.paragraphId).toBe('paragraph-123');
      expect(result.originalContent).toBe('This is the paragraph content.');
      expect(result.anchor.anchorId).toBe(mockAnchorId);
      expect(result.anchor.quoteCount).toBe(6);
    });

    it('should throw NotFoundException when anchor does not exist', async () => {
      // Arrange
      jest.spyOn(prismaService.paragraph, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow(`锚点不存在: ${mockAnchorId}`);
    });

    it('should throw NotFoundException when anchor is deleted', async () => {
      // Arrange
      jest.spyOn(prismaService.paragraph, 'findUnique').mockResolvedValue({
        ...mockParagraphForQuote,
        isDeleted: true,
      } as any);

      // Act & Assert
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow(`锚点已被删除: ${mockAnchorId}`);
    });

    it('should throw NotFoundException when card does not exist', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForQuote as any);
      jest.spyOn(prismaService.card, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow(`Card 不存在: ${mockCardId}`);
    });

    it('should throw NotFoundException when card is deleted', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForQuote as any);
      jest
        .spyOn(prismaService.card, 'findUnique')
        .mockResolvedValue({ ...mockCardForQuote, isDeleted: true } as any);

      // Act & Assert
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow(`Card 已被删除: ${mockCardId}`);
    });

    it('should throw ForbiddenException when card does not belong to user', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForQuote as any);
      jest.spyOn(prismaService.card, 'findUnique').mockResolvedValue({
        ...mockCardForQuote,
        authorId: 'other-user',
      } as any);

      // Act & Assert
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow('只能在自己的 Card 中创建引用');
    });

    it('should throw BadRequestException when quote already exists', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForQuote as any);
      jest
        .spyOn(prismaService.card, 'findUnique')
        .mockResolvedValue(mockCardForQuote as any);
      jest
        .spyOn(prismaService.quote, 'findFirst')
        .mockResolvedValue({ id: 'existing-quote' } as any);

      // Act & Assert
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.createQuote(mockAnchorId, { cardId: mockCardId }, mockUserId),
      ).rejects.toThrow('该 Card 已引用过此段落');
    });

    it('should store original content snapshot when creating quote', async () => {
      // Arrange
      const paragraphContent = 'Original paragraph content to be quoted.';
      jest.spyOn(prismaService.paragraph, 'findUnique').mockResolvedValue({
        ...mockParagraphForQuote,
        content: paragraphContent,
      } as any);
      jest
        .spyOn(prismaService.card, 'findUnique')
        .mockResolvedValue(mockCardForQuote as any);
      jest.spyOn(prismaService.quote, 'findFirst').mockResolvedValue(null);

      let capturedQuoteData: any;
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn) => {
          return fn({
            quote: {
              create: jest.fn().mockImplementation((data) => {
                capturedQuoteData = data;
                return {
                  ...mockCreatedQuote,
                  originalContent: data.data.originalContent,
                };
              }),
            },
            paragraph: {
              update: jest.fn().mockResolvedValue({ quoteCount: 6 }),
            },
            card: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        });

      // Act
      const result = await service.createQuote(
        mockAnchorId,
        { cardId: mockCardId },
        mockUserId,
      );

      // Assert
      expect(capturedQuoteData.data.originalContent).toBe(paragraphContent);
      expect(result.originalContent).toBe(paragraphContent);
    });

    it('should increment paragraph quoteCount', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForQuote as any);
      jest
        .spyOn(prismaService.card, 'findUnique')
        .mockResolvedValue(mockCardForQuote as any);
      jest.spyOn(prismaService.quote, 'findFirst').mockResolvedValue(null);

      let paragraphUpdateCalled = false;
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn) => {
          return fn({
            quote: {
              create: jest.fn().mockResolvedValue(mockCreatedQuote),
            },
            paragraph: {
              update: jest.fn().mockImplementation((args) => {
                paragraphUpdateCalled = true;
                expect(args.data.quoteCount).toEqual({ increment: 1 });
                return { quoteCount: 6 };
              }),
            },
            card: {
              update: jest.fn().mockResolvedValue({}),
            },
          });
        });

      // Act
      await service.createQuote(
        mockAnchorId,
        { cardId: mockCardId },
        mockUserId,
      );

      // Assert
      expect(paragraphUpdateCalled).toBe(true);
    });

    it('should increment card quoteCount', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForQuote as any);
      jest
        .spyOn(prismaService.card, 'findUnique')
        .mockResolvedValue(mockCardForQuote as any);
      jest.spyOn(prismaService.quote, 'findFirst').mockResolvedValue(null);

      let cardUpdateCalled = false;
      jest
        .spyOn(prismaService, '$transaction')
        .mockImplementation(async (fn) => {
          return fn({
            quote: {
              create: jest.fn().mockResolvedValue(mockCreatedQuote),
            },
            paragraph: {
              update: jest.fn().mockResolvedValue({ quoteCount: 6 }),
            },
            card: {
              update: jest.fn().mockImplementation((args) => {
                cardUpdateCalled = true;
                expect(args.data.quoteCount).toEqual({ increment: 1 });
                return {};
              }),
            },
          });
        });

      // Act
      await service.createQuote(
        mockAnchorId,
        { cardId: mockCardId },
        mockUserId,
      );

      // Assert
      expect(cardUpdateCalled).toBe(true);
    });
  });

  describe('checkContentUpdates', () => {
    const mockAnchorId = 'work-123:chapter-123:0';

    const mockParagraphForCheck = {
      id: 'paragraph-123',
      content: 'Updated paragraph content.',
      isDeleted: false,
    };

    const mockQuotesForCheck = [
      {
        id: 'quote-1',
        originalContent: 'Original paragraph content.',
        contentUpdated: false,
        contentDeleted: false,
      },
      {
        id: 'quote-2',
        originalContent: 'Updated paragraph content.',
        contentUpdated: false,
        contentDeleted: false,
      },
      {
        id: 'quote-3',
        originalContent: 'Original paragraph content.',
        contentUpdated: true, // Already marked as updated
        contentDeleted: false,
      },
    ];

    it('should detect and mark quotes with changed content', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForCheck as any);
      jest
        .spyOn(prismaService.quote, 'findMany')
        .mockResolvedValue(mockQuotesForCheck as any);
      jest.spyOn(prismaService.quote, 'update').mockResolvedValue({} as any);

      // Act
      const result = await service.checkContentUpdates(mockAnchorId);

      // Assert
      expect(result.anchorId).toBe(mockAnchorId);
      expect(result.isDeleted).toBe(false);
      expect(result.currentContent).toBe('Updated paragraph content.');
      expect(result.totalQuotes).toBe(3);
      expect(result.updatedQuotes).toBe(1); // Only quote-1 should be updated
      expect(result.deletedQuotes).toBe(0);

      // Verify only quote-1 was updated (content changed and not already marked)
      expect(prismaService.quote.update).toHaveBeenCalledTimes(1);
      expect(prismaService.quote.update).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
        data: { contentUpdated: true },
      });
    });

    it('should mark quotes as deleted when paragraph is deleted', async () => {
      // Arrange
      const deletedParagraph = {
        ...mockParagraphForCheck,
        isDeleted: true,
      };
      const quotesNotMarkedDeleted = [
        {
          id: 'quote-1',
          originalContent: 'Original content.',
          contentUpdated: false,
          contentDeleted: false,
        },
        {
          id: 'quote-2',
          originalContent: 'Original content.',
          contentUpdated: false,
          contentDeleted: true, // Already marked as deleted
        },
      ];

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(deletedParagraph as any);
      jest
        .spyOn(prismaService.quote, 'findMany')
        .mockResolvedValue(quotesNotMarkedDeleted as any);
      jest.spyOn(prismaService.quote, 'update').mockResolvedValue({} as any);

      // Act
      const result = await service.checkContentUpdates(mockAnchorId);

      // Assert
      expect(result.isDeleted).toBe(true);
      expect(result.currentContent).toBeNull();
      expect(result.deletedQuotes).toBe(1); // Only quote-1 should be marked deleted
      expect(result.updatedQuotes).toBe(0);

      expect(prismaService.quote.update).toHaveBeenCalledTimes(1);
      expect(prismaService.quote.update).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
        data: { contentDeleted: true },
      });
    });

    it('should throw NotFoundException when anchor does not exist', async () => {
      // Arrange
      jest.spyOn(prismaService.paragraph, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(service.checkContentUpdates(mockAnchorId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.checkContentUpdates(mockAnchorId)).rejects.toThrow(
        `锚点不存在: ${mockAnchorId}`,
      );
    });

    it('should return zero counts when no quotes exist', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForCheck as any);
      jest.spyOn(prismaService.quote, 'findMany').mockResolvedValue([]);

      // Act
      const result = await service.checkContentUpdates(mockAnchorId);

      // Assert
      expect(result.totalQuotes).toBe(0);
      expect(result.updatedQuotes).toBe(0);
      expect(result.deletedQuotes).toBe(0);
      expect(prismaService.quote.update).not.toHaveBeenCalled();
    });

    it('should not update quotes when content matches', async () => {
      // Arrange
      const matchingQuotes = [
        {
          id: 'quote-1',
          originalContent: 'Updated paragraph content.', // Same as current
          contentUpdated: false,
          contentDeleted: false,
        },
      ];

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForCheck as any);
      jest
        .spyOn(prismaService.quote, 'findMany')
        .mockResolvedValue(matchingQuotes as any);

      // Act
      const result = await service.checkContentUpdates(mockAnchorId);

      // Assert
      expect(result.updatedQuotes).toBe(0);
      expect(prismaService.quote.update).not.toHaveBeenCalled();
    });

    it('should not re-update already marked quotes', async () => {
      // Arrange
      const alreadyMarkedQuotes = [
        {
          id: 'quote-1',
          originalContent: 'Different content.',
          contentUpdated: true, // Already marked
          contentDeleted: false,
        },
      ];

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockParagraphForCheck as any);
      jest
        .spyOn(prismaService.quote, 'findMany')
        .mockResolvedValue(alreadyMarkedQuotes as any);

      // Act
      const result = await service.checkContentUpdates(mockAnchorId);

      // Assert
      expect(result.updatedQuotes).toBe(0);
      expect(prismaService.quote.update).not.toHaveBeenCalled();
    });
  });

  describe('checkContentUpdatesBatch', () => {
    it('should process multiple anchors and return summary', async () => {
      // Arrange
      const anchorIds = ['anchor-1', 'anchor-2', 'anchor-3'];

      // Mock successful checks for anchor-1 and anchor-2
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockImplementation(async ({ where }) => {
          if (where.anchorId === 'anchor-1') {
            return { id: 'p1', content: 'Content 1', isDeleted: false } as any;
          }
          if (where.anchorId === 'anchor-2') {
            return { id: 'p2', content: 'Content 2', isDeleted: false } as any;
          }
          return null; // anchor-3 not found
        });

      jest
        .spyOn(prismaService.quote, 'findMany')
        .mockImplementation(async ({ where }) => {
          if (where.paragraphId === 'p1') {
            return [
              {
                id: 'q1',
                originalContent: 'Old',
                contentUpdated: false,
                contentDeleted: false,
              },
            ] as any;
          }
          return [];
        });

      jest.spyOn(prismaService.quote, 'update').mockResolvedValue({} as any);

      // Act
      const result = await service.checkContentUpdatesBatch(anchorIds);

      // Assert
      expect(result.summary.total).toBe(3);
      expect(result.summary.successful).toBe(2);
      expect(result.summary.failed).toBe(1);
      expect(result.summary.totalUpdatedQuotes).toBe(1);

      expect(result.results[0].success).toBe(true);
      expect(result.results[0].updatedQuotes).toBe(1);
      expect(result.results[1].success).toBe(true);
      expect(result.results[2].success).toBe(false);
      expect(result.results[2].error).toContain('锚点不存在');
    });

    it('should handle empty anchor list', async () => {
      // Act
      const result = await service.checkContentUpdatesBatch([]);

      // Assert
      expect(result.summary.total).toBe(0);
      expect(result.summary.successful).toBe(0);
      expect(result.summary.failed).toBe(0);
      expect(result.results).toHaveLength(0);
    });

    it('should continue processing when some anchors fail', async () => {
      // Arrange
      const anchorIds = ['valid-anchor', 'invalid-anchor'];

      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockImplementation(async ({ where }) => {
          if (where.anchorId === 'valid-anchor') {
            return { id: 'p1', content: 'Content', isDeleted: false } as any;
          }
          return null;
        });

      jest.spyOn(prismaService.quote, 'findMany').mockResolvedValue([]);

      // Act
      const result = await service.checkContentUpdatesBatch(anchorIds);

      // Assert
      expect(result.summary.successful).toBe(1);
      expect(result.summary.failed).toBe(1);
      expect(result.results[0].success).toBe(true);
      expect(result.results[1].success).toBe(false);
    });
  });

  describe('getAnchorContext', () => {
    const mockAnchorId = 'work-123:chapter-123:5';

    const mockTargetParagraph = {
      id: 'paragraph-5',
      anchorId: mockAnchorId,
      content: 'This is the target paragraph.',
      orderIndex: 5,
      isDeleted: false,
      chapter: {
        id: 'chapter-123',
        title: 'Chapter 1: The Beginning',
        work: {
          id: 'work-123',
          title: 'Test Novel',
        },
      },
    };

    const mockBeforeParagraphs = [
      {
        anchorId: 'work-123:chapter-123:3',
        content: 'Paragraph before before.',
        orderIndex: 3,
      },
      {
        anchorId: 'work-123:chapter-123:4',
        content: 'Paragraph before.',
        orderIndex: 4,
      },
    ];

    const mockAfterParagraphs = [
      {
        anchorId: 'work-123:chapter-123:6',
        content: 'Paragraph after.',
        orderIndex: 6,
      },
      {
        anchorId: 'work-123:chapter-123:7',
        content: 'Paragraph after after.',
        orderIndex: 7,
      },
    ];

    it('should return target paragraph with surrounding context', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockTargetParagraph as any);
      jest
        .spyOn(prismaService.paragraph, 'findMany')
        .mockResolvedValueOnce(mockBeforeParagraphs as any)
        .mockResolvedValueOnce(mockAfterParagraphs as any);

      // Act
      const result = await service.getAnchorContext(mockAnchorId, {
        before: 2,
        after: 2,
      });

      // Assert
      expect(result.target).toBeDefined();
      expect(result.target.anchorId).toBe(mockAnchorId);
      expect(result.target.content).toBe('This is the target paragraph.');
      expect(result.target.orderIndex).toBe(5);

      expect(result.before).toHaveLength(2);
      expect(result.before[0].orderIndex).toBe(3);
      expect(result.before[1].orderIndex).toBe(4);

      expect(result.after).toHaveLength(2);
      expect(result.after[0].orderIndex).toBe(6);
      expect(result.after[1].orderIndex).toBe(7);

      expect(result.chapter.id).toBe('chapter-123');
      expect(result.chapter.title).toBe('Chapter 1: The Beginning');

      expect(result.work.id).toBe('work-123');
      expect(result.work.title).toBe('Test Novel');
    });

    it('should throw NotFoundException when anchor does not exist', async () => {
      // Arrange
      jest.spyOn(prismaService.paragraph, 'findUnique').mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getAnchorContext('nonexistent:anchor:0', {
          before: 1,
          after: 1,
        }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getAnchorContext('nonexistent:anchor:0', {
          before: 1,
          after: 1,
        }),
      ).rejects.toThrow('锚点不存在: nonexistent:anchor:0');
    });

    it('should use default values when query params not provided', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockTargetParagraph as any);
      jest
        .spyOn(prismaService.paragraph, 'findMany')
        .mockResolvedValue([mockBeforeParagraphs[1]] as any)
        .mockResolvedValueOnce([mockBeforeParagraphs[1]] as any)
        .mockResolvedValueOnce([mockAfterParagraphs[0]] as any);

      // Act
      const result = await service.getAnchorContext(mockAnchorId, {});

      // Assert
      expect(result.target).toBeDefined();
      // Default before=1, after=1
      expect(prismaService.paragraph.findMany).toHaveBeenCalled();
    });

    it('should return empty arrays when no surrounding paragraphs exist', async () => {
      // Arrange - first paragraph in chapter
      const firstParagraph = {
        ...mockTargetParagraph,
        orderIndex: 0,
        anchorId: 'work-123:chapter-123:0',
      };
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(firstParagraph as any);
      jest
        .spyOn(prismaService.paragraph, 'findMany')
        .mockResolvedValue([] as any);

      // Act
      const result = await service.getAnchorContext('work-123:chapter-123:0', {
        before: 2,
        after: 2,
      });

      // Assert
      expect(result.before).toHaveLength(0);
      expect(result.after).toHaveLength(0);
    });

    it('should skip before query when before=0', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockTargetParagraph as any);
      jest
        .spyOn(prismaService.paragraph, 'findMany')
        .mockResolvedValue(mockAfterParagraphs as any);

      // Act
      const result = await service.getAnchorContext(mockAnchorId, {
        before: 0,
        after: 2,
      });

      // Assert
      expect(result.before).toHaveLength(0);
      expect(result.after).toHaveLength(2);
      // findMany should only be called once (for after)
      expect(prismaService.paragraph.findMany).toHaveBeenCalledTimes(1);
    });

    it('should skip after query when after=0', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockTargetParagraph as any);
      jest
        .spyOn(prismaService.paragraph, 'findMany')
        .mockResolvedValue(mockBeforeParagraphs as any);

      // Act
      const result = await service.getAnchorContext(mockAnchorId, {
        before: 2,
        after: 0,
      });

      // Assert
      expect(result.before).toHaveLength(2);
      expect(result.after).toHaveLength(0);
      // findMany should only be called once (for before)
      expect(prismaService.paragraph.findMany).toHaveBeenCalledTimes(1);
    });

    it('should filter out deleted paragraphs from context', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockTargetParagraph as any);
      // The service queries with isDeleted: false, so mock returns only non-deleted
      jest
        .spyOn(prismaService.paragraph, 'findMany')
        .mockResolvedValueOnce([mockBeforeParagraphs[1]] as any) // Only one before (other deleted)
        .mockResolvedValueOnce(mockAfterParagraphs as any);

      // Act
      const result = await service.getAnchorContext(mockAnchorId, {
        before: 2,
        after: 2,
      });

      // Assert
      expect(result.before).toHaveLength(1);
      expect(result.after).toHaveLength(2);

      // Verify the query includes isDeleted: false
      expect(prismaService.paragraph.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isDeleted: false,
          }),
        }),
      );
    });

    it('should order paragraphs by orderIndex ascending', async () => {
      // Arrange
      jest
        .spyOn(prismaService.paragraph, 'findUnique')
        .mockResolvedValue(mockTargetParagraph as any);
      jest
        .spyOn(prismaService.paragraph, 'findMany')
        .mockResolvedValueOnce(mockBeforeParagraphs as any)
        .mockResolvedValueOnce(mockAfterParagraphs as any);

      // Act
      await service.getAnchorContext(mockAnchorId, { before: 2, after: 2 });

      // Assert
      expect(prismaService.paragraph.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { orderIndex: 'asc' },
        }),
      );
    });
  });
});
