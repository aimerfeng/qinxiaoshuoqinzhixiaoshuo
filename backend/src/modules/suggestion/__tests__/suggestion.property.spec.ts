// Feature: library-branch-system, Property 10: 修订建议类型支持
// **Validates: Requirements 5.3, 5.4, 5.5**

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SuggestionService } from '../suggestion.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

describe('Property 10: 修订建议类型支持', () => {
  let service: SuggestionService;
  let prismaService: any;

  const mockParagraphId = 'paragraph-123';
  const mockBranchId = 'branch-456';
  const mockSuggesterId = 'suggester-789';
  const mockSuggestionId = 'suggestion-abc';
  const mockWorkId = 'work-def';
  const mockLibraryWorkId = 'library-work-ghi';
  const mockChapterId = 'chapter-jkl';

  beforeEach(async () => {
    const mockPrismaService = {
      paragraph: {
        findUnique: jest.fn(),
      },
      libraryBranch: {
        findUnique: jest.fn(),
      },
      contentSuggestion: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SuggestionService>(SuggestionService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  /**
   * 设置通用的 mock 数据
   */
  const setupMocks = (suggestionType: string, suggestedContent?: string, imageUrl?: string) => {
    // Mock paragraph exists
    (prismaService.paragraph.findUnique as jest.Mock).mockResolvedValue({
      id: mockParagraphId,
      chapterId: mockChapterId,
      isDeleted: false,
      chapter: {
        id: mockChapterId,
        workId: mockWorkId,
        status: 'PUBLISHED',
      },
    });

    // Mock branch exists
    (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
      id: mockBranchId,
      workId: mockWorkId,
      isDeleted: false,
      library: {
        id: 'library-123',
        workId: mockLibraryWorkId,
      },
    });

    // Mock suggestion creation
    (prismaService.contentSuggestion.create as jest.Mock).mockResolvedValue({
      id: mockSuggestionId,
      branchId: mockBranchId,
      paragraphId: mockParagraphId,
      suggesterId: mockSuggesterId,
      suggestionType,
      status: 'PENDING',
      suggestedContent: suggestedContent || null,
      imageUrl: imageUrl || null,
      rewardAmount: 0,
      reviewedAt: null,
      reviewNote: null,
      cardId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      suggester: {
        id: mockSuggesterId,
        username: 'testuser',
        displayName: 'Test User',
        avatar: null,
      },
    });
  };

  describe('MODIFY 类型建议创建', () => {
    /**
     * Property 10: 修订建议类型支持
     * 验证 MODIFY 类型建议能正确创建和存储
     * MODIFY 类型需要提供 suggestedContent
     */
    it('should create MODIFY suggestion with suggestedContent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机段落ID
          fc.uuid(), // 随机建议者ID
          fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]+.{0,999}$/).filter(s => s.trim().length > 0), // 随机建议内容（非空白）
          async (paragraphId, suggesterId, suggestedContent) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();
            setupMocks('MODIFY', suggestedContent);

            const result = await service.createSuggestion(
              paragraphId,
              suggesterId,
              {
                branchId: mockBranchId,
                suggestionType: 'MODIFY' as any,
                suggestedContent,
              },
            );

            expect(result).toBeDefined();
            expect(result.suggestion).toBeDefined();
            expect(result.suggestion.suggestionType).toBe('MODIFY');
            expect(result.suggestion.status).toBe('PENDING');
            expect(result.suggestion.suggestedContent).toBe(suggestedContent);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('INSERT_BEFORE 类型建议创建', () => {
    /**
     * Property 10: 修订建议类型支持
     * 验证 INSERT_BEFORE 类型建议能正确创建和存储
     * INSERT_BEFORE 类型需要提供 suggestedContent
     */
    it('should create INSERT_BEFORE suggestion with suggestedContent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机段落ID
          fc.uuid(), // 随机建议者ID
          fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]+.{0,999}$/).filter(s => s.trim().length > 0), // 随机建议内容（非空白）
          async (paragraphId, suggesterId, suggestedContent) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();
            setupMocks('INSERT_BEFORE', suggestedContent);

            const result = await service.createSuggestion(
              paragraphId,
              suggesterId,
              {
                branchId: mockBranchId,
                suggestionType: 'INSERT_BEFORE' as any,
                suggestedContent,
              },
            );

            expect(result).toBeDefined();
            expect(result.suggestion).toBeDefined();
            expect(result.suggestion.suggestionType).toBe('INSERT_BEFORE');
            expect(result.suggestion.status).toBe('PENDING');
            expect(result.suggestion.suggestedContent).toBe(suggestedContent);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('INSERT_AFTER 类型建议创建', () => {
    /**
     * Property 10: 修订建议类型支持
     * 验证 INSERT_AFTER 类型建议能正确创建和存储
     * INSERT_AFTER 类型需要提供 suggestedContent
     */
    it('should create INSERT_AFTER suggestion with suggestedContent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机段落ID
          fc.uuid(), // 随机建议者ID
          fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]+.{0,999}$/).filter(s => s.trim().length > 0), // 随机建议内容（非空白）
          async (paragraphId, suggesterId, suggestedContent) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();
            setupMocks('INSERT_AFTER', suggestedContent);

            const result = await service.createSuggestion(
              paragraphId,
              suggesterId,
              {
                branchId: mockBranchId,
                suggestionType: 'INSERT_AFTER' as any,
                suggestedContent,
              },
            );

            expect(result).toBeDefined();
            expect(result.suggestion).toBeDefined();
            expect(result.suggestion.suggestionType).toBe('INSERT_AFTER');
            expect(result.suggestion.status).toBe('PENDING');
            expect(result.suggestion.suggestedContent).toBe(suggestedContent);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('ADD_IMAGE 类型建议创建', () => {
    /**
     * Property 10: 修订建议类型支持
     * 验证 ADD_IMAGE 类型建议能正确创建和存储
     * ADD_IMAGE 类型需要提供 imageUrl
     */
    it('should create ADD_IMAGE suggestion with imageUrl', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机段落ID
          fc.uuid(), // 随机建议者ID
          fc.webUrl(), // 随机图片URL
          async (paragraphId, suggesterId, imageUrl) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();
            setupMocks('ADD_IMAGE', undefined, imageUrl);

            const result = await service.createSuggestion(
              paragraphId,
              suggesterId,
              {
                branchId: mockBranchId,
                suggestionType: 'ADD_IMAGE' as any,
                imageUrl,
              },
            );

            expect(result).toBeDefined();
            expect(result.suggestion).toBeDefined();
            expect(result.suggestion.suggestionType).toBe('ADD_IMAGE');
            expect(result.suggestion.status).toBe('PENDING');
            expect(result.suggestion.imageUrl).toBe(imageUrl);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('所有类型都以 PENDING 状态存储', () => {
    /**
     * Property 10: 修订建议类型支持
     * 验证所有四种建议类型创建后状态都是 PENDING
     */
    it('should store all suggestion types with PENDING status', async () => {
      // 生成非空白字符串的生成器
      const nonEmptyStringArb = fc.stringMatching(/^[a-zA-Z0-9\u4e00-\u9fa5]+$/, { minLength: 1, maxLength: 500 });

      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机段落ID
          fc.uuid(), // 随机建议者ID
          fc.constantFrom('MODIFY', 'INSERT_BEFORE', 'INSERT_AFTER', 'ADD_IMAGE'), // 所有建议类型
          nonEmptyStringArb, // 随机非空白内容
          async (paragraphId, suggesterId, suggestionType, content) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            const isImageType = suggestionType === 'ADD_IMAGE';
            const suggestedContent = isImageType ? undefined : content;
            const imageUrl = isImageType ? `https://example.com/${content}.jpg` : undefined;

            setupMocks(suggestionType, suggestedContent, imageUrl);

            const result = await service.createSuggestion(
              paragraphId,
              suggesterId,
              {
                branchId: mockBranchId,
                suggestionType: suggestionType as any,
                suggestedContent,
                imageUrl,
              },
            );

            expect(result).toBeDefined();
            expect(result.suggestion).toBeDefined();
            expect(result.suggestion.suggestionType).toBe(suggestionType);
            // 验证所有类型都以 PENDING 状态存储
            expect(result.suggestion.status).toBe('PENDING');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('验证：ADD_IMAGE 类型必须提供 imageUrl', () => {
    /**
     * Property 10: 修订建议类型支持 - 验证规则
     * ADD_IMAGE 类型不提供 imageUrl 应该失败
     */
    it('should reject ADD_IMAGE suggestion without imageUrl', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机段落ID
          fc.uuid(), // 随机建议者ID
          async (paragraphId, suggesterId) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Mock paragraph exists
            (prismaService.paragraph.findUnique as jest.Mock).mockResolvedValue({
              id: paragraphId,
              chapterId: mockChapterId,
              isDeleted: false,
              chapter: {
                id: mockChapterId,
                workId: mockWorkId,
                status: 'PUBLISHED',
              },
            });

            // Mock branch exists
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              workId: mockWorkId,
              isDeleted: false,
              library: {
                id: 'library-123',
                workId: mockLibraryWorkId,
              },
            });

            // ADD_IMAGE without imageUrl should throw BadRequestException
            await expect(
              service.createSuggestion(paragraphId, suggesterId, {
                branchId: mockBranchId,
                suggestionType: 'ADD_IMAGE' as any,
                // imageUrl is intentionally omitted
              }),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10: 修订建议类型支持 - 验证规则
     * ADD_IMAGE 类型提供空字符串 imageUrl 应该失败
     */
    it('should reject ADD_IMAGE suggestion with empty imageUrl', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机段落ID
          fc.uuid(), // 随机建议者ID
          fc.constantFrom('', '   ', '\t', '\n'), // 空或空白字符串
          async (paragraphId, suggesterId, emptyImageUrl) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Mock paragraph exists
            (prismaService.paragraph.findUnique as jest.Mock).mockResolvedValue({
              id: paragraphId,
              chapterId: mockChapterId,
              isDeleted: false,
              chapter: {
                id: mockChapterId,
                workId: mockWorkId,
                status: 'PUBLISHED',
              },
            });

            // Mock branch exists
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              workId: mockWorkId,
              isDeleted: false,
              library: {
                id: 'library-123',
                workId: mockLibraryWorkId,
              },
            });

            // ADD_IMAGE with empty imageUrl should throw BadRequestException
            await expect(
              service.createSuggestion(paragraphId, suggesterId, {
                branchId: mockBranchId,
                suggestionType: 'ADD_IMAGE' as any,
                imageUrl: emptyImageUrl,
              }),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('验证：MODIFY/INSERT 类型必须提供 suggestedContent', () => {
    /**
     * Property 10: 修订建议类型支持 - 验证规则
     * MODIFY/INSERT_BEFORE/INSERT_AFTER 类型不提供 suggestedContent 应该失败
     */
    it('should reject MODIFY/INSERT suggestions without suggestedContent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机段落ID
          fc.uuid(), // 随机建议者ID
          fc.constantFrom('MODIFY', 'INSERT_BEFORE', 'INSERT_AFTER'), // 需要 suggestedContent 的类型
          async (paragraphId, suggesterId, suggestionType) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Mock paragraph exists
            (prismaService.paragraph.findUnique as jest.Mock).mockResolvedValue({
              id: paragraphId,
              chapterId: mockChapterId,
              isDeleted: false,
              chapter: {
                id: mockChapterId,
                workId: mockWorkId,
                status: 'PUBLISHED',
              },
            });

            // Mock branch exists
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              workId: mockWorkId,
              isDeleted: false,
              library: {
                id: 'library-123',
                workId: mockLibraryWorkId,
              },
            });

            // MODIFY/INSERT without suggestedContent should throw BadRequestException
            await expect(
              service.createSuggestion(paragraphId, suggesterId, {
                branchId: mockBranchId,
                suggestionType: suggestionType as any,
                // suggestedContent is intentionally omitted
              }),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10: 修订建议类型支持 - 验证规则
     * MODIFY/INSERT_BEFORE/INSERT_AFTER 类型提供空字符串 suggestedContent 应该失败
     */
    it('should reject MODIFY/INSERT suggestions with empty suggestedContent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机段落ID
          fc.uuid(), // 随机建议者ID
          fc.constantFrom('MODIFY', 'INSERT_BEFORE', 'INSERT_AFTER'), // 需要 suggestedContent 的类型
          fc.constantFrom('', '   ', '\t', '\n'), // 空或空白字符串
          async (paragraphId, suggesterId, suggestionType, emptyContent) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Mock paragraph exists
            (prismaService.paragraph.findUnique as jest.Mock).mockResolvedValue({
              id: paragraphId,
              chapterId: mockChapterId,
              isDeleted: false,
              chapter: {
                id: mockChapterId,
                workId: mockWorkId,
                status: 'PUBLISHED',
              },
            });

            // Mock branch exists
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              workId: mockWorkId,
              isDeleted: false,
              library: {
                id: 'library-123',
                workId: mockLibraryWorkId,
              },
            });

            // MODIFY/INSERT with empty suggestedContent should throw BadRequestException
            await expect(
              service.createSuggestion(paragraphId, suggesterId, {
                branchId: mockBranchId,
                suggestionType: suggestionType as any,
                suggestedContent: emptyContent,
              }),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('边界情况', () => {
    /**
     * Property 10: 边界情况 - 段落不存在
     */
    it('should throw NotFoundException when paragraph does not exist', async () => {
      // Mock paragraph not found
      (prismaService.paragraph.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createSuggestion(mockParagraphId, mockSuggesterId, {
          branchId: mockBranchId,
          suggestionType: 'MODIFY' as any,
          suggestedContent: 'Test content',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * Property 10: 边界情况 - 分支不存在
     */
    it('should throw NotFoundException when branch does not exist', async () => {
      // Mock paragraph exists
      (prismaService.paragraph.findUnique as jest.Mock).mockResolvedValue({
        id: mockParagraphId,
        chapterId: mockChapterId,
        isDeleted: false,
        chapter: {
          id: mockChapterId,
          workId: mockWorkId,
          status: 'PUBLISHED',
        },
      });

      // Mock branch not found
      (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createSuggestion(mockParagraphId, mockSuggesterId, {
          branchId: mockBranchId,
          suggestionType: 'MODIFY' as any,
          suggestedContent: 'Test content',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * Property 10: 边界情况 - 段落已删除
     */
    it('should throw BadRequestException when paragraph is deleted', async () => {
      // Mock deleted paragraph
      (prismaService.paragraph.findUnique as jest.Mock).mockResolvedValue({
        id: mockParagraphId,
        chapterId: mockChapterId,
        isDeleted: true, // 已删除
        chapter: {
          id: mockChapterId,
          workId: mockWorkId,
          status: 'PUBLISHED',
        },
      });

      await expect(
        service.createSuggestion(mockParagraphId, mockSuggesterId, {
          branchId: mockBranchId,
          suggestionType: 'MODIFY' as any,
          suggestedContent: 'Test content',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    /**
     * Property 10: 边界情况 - 分支已删除
     */
    it('should throw BadRequestException when branch is deleted', async () => {
      // Mock paragraph exists
      (prismaService.paragraph.findUnique as jest.Mock).mockResolvedValue({
        id: mockParagraphId,
        chapterId: mockChapterId,
        isDeleted: false,
        chapter: {
          id: mockChapterId,
          workId: mockWorkId,
          status: 'PUBLISHED',
        },
      });

      // Mock deleted branch
      (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
        id: mockBranchId,
        workId: mockWorkId,
        isDeleted: true, // 已删除
        library: {
          id: 'library-123',
          workId: mockLibraryWorkId,
        },
      });

      await expect(
        service.createSuggestion(mockParagraphId, mockSuggesterId, {
          branchId: mockBranchId,
          suggestionType: 'MODIFY' as any,
          suggestedContent: 'Test content',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});


// Feature: library-branch-system, Property 11: 建议采纳奖励与动态
// **Validates: Requirements 5.7, 5.8, 8.3, 8.5**

describe('Property 11: 建议采纳奖励与动态', () => {
  let service: SuggestionService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockSuggestionId = 'suggestion-123';
  const mockBranchId = 'branch-456';
  const mockSuggesterId = 'suggester-789';
  const mockReviewerId = 'reviewer-abc';
  const mockParagraphId = 'paragraph-def';
  const mockLibraryId = 'library-ghi';
  const mockCardId = 'card-jkl';

  beforeEach(async () => {
    const mockPrismaService = {
      contentSuggestion: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      card: {
        create: jest.fn(),
      },
      contributionRecord: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuggestionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SuggestionService>(SuggestionService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 创建 mock 建议数据
   */
  const createMockSuggestion = (overrides: Record<string, any> = {}) => ({
    id: mockSuggestionId,
    branchId: mockBranchId,
    paragraphId: mockParagraphId,
    suggesterId: mockSuggesterId,
    suggestionType: 'MODIFY',
    status: 'PENDING',
    suggestedContent: 'Test content',
    imageUrl: null,
    rewardAmount: 0,
    reviewedAt: null,
    reviewNote: null,
    cardId: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    branch: {
      id: mockBranchId,
      creatorId: mockReviewerId,
      isDeleted: false,
      library: {
        id: mockLibraryId,
        title: 'Test Library',
      },
    },
    suggester: {
      id: mockSuggesterId,
      username: 'testuser',
      displayName: 'Test User',
      avatar: null,
    },
    paragraph: {
      id: mockParagraphId,
      content: 'Original paragraph content',
    },
    ...overrides,
  });

  /**
   * 设置事务 mock
   */
  const setupTransactionMock = (
    rewardAmount: number,
    publishCard: boolean,
    cardId: string | null,
  ) => {
    (prismaService.$transaction as jest.Mock).mockImplementation(
      async (callback: (tx: any) => Promise<any>) => {
        const txMock = {
          card: {
            create: jest.fn().mockResolvedValue({
              id: cardId || mockCardId,
              authorId: mockReviewerId,
              content: 'Test card content',
            }),
          },
          contentSuggestion: {
            update: jest.fn().mockResolvedValue({
              id: mockSuggestionId,
              branchId: mockBranchId,
              paragraphId: mockParagraphId,
              suggesterId: mockSuggesterId,
              suggestionType: 'MODIFY',
              status: 'ACCEPTED',
              suggestedContent: 'Test content',
              imageUrl: null,
              rewardAmount,
              reviewedAt: new Date(),
              reviewNote: null,
              cardId: publishCard ? (cardId || mockCardId) : null,
              createdAt: new Date(),
              updatedAt: new Date(),
              suggester: {
                id: mockSuggesterId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
            }),
          },
          contributionRecord: {
            create: jest.fn().mockResolvedValue({
              id: 'contribution-123',
              userId: mockSuggesterId,
              type: 'SUGGESTION_ACCEPTED',
              points: rewardAmount,
              referenceId: mockSuggestionId,
              referenceType: 'ContentSuggestion',
              description: `修订建议被采纳，获得 ${rewardAmount} 积分`,
            }),
          },
        };
        return callback(txMock);
      },
    );
  };

  describe('采纳建议创建 ContributionRecord', () => {
    /**
     * Property 11: 建议采纳奖励与动态
     * 验证采纳后创建 ContributionRecord
     * 当 rewardAmount > 0 时，应创建 ContributionRecord 记录
     */
    it('should create ContributionRecord when accepting suggestion with rewardAmount > 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // 随机奖励积分 (1-10000)
          async (rewardAmount) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            const mockSuggestion = createMockSuggestion();
            (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

            let contributionRecordCreated = false;
            let createdContributionData: any = null;

            (prismaService.$transaction as jest.Mock).mockImplementation(
              async (callback: (tx: any) => Promise<any>) => {
                const txMock = {
                  card: {
                    create: jest.fn(),
                  },
                  contentSuggestion: {
                    update: jest.fn().mockResolvedValue({
                      ...mockSuggestion,
                      status: 'ACCEPTED',
                      rewardAmount,
                      reviewedAt: new Date(),
                    }),
                  },
                  contributionRecord: {
                    create: jest.fn().mockImplementation((data: any) => {
                      contributionRecordCreated = true;
                      createdContributionData = data.data;
                      return Promise.resolve({
                        id: 'contribution-123',
                        ...data.data,
                      });
                    }),
                  },
                };
                return callback(txMock);
              },
            );

            await service.acceptSuggestion(mockSuggestionId, mockReviewerId, {
              rewardAmount,
              publishCard: false,
            });

            // 验证 ContributionRecord 被创建
            expect(contributionRecordCreated).toBe(true);
            expect(createdContributionData).toBeDefined();
            expect(createdContributionData.userId).toBe(mockSuggesterId);
            expect(createdContributionData.type).toBe('SUGGESTION_ACCEPTED');
            expect(createdContributionData.points).toBe(rewardAmount);
            expect(createdContributionData.referenceId).toBe(mockSuggestionId);
            expect(createdContributionData.referenceType).toBe('ContentSuggestion');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 11: 建议采纳奖励与动态
     * 验证 rewardAmount = 0 时不创建 ContributionRecord
     */
    it('should NOT create ContributionRecord when rewardAmount is 0', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(), // 随机 publishCard 值
          async (publishCard) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            const mockSuggestion = createMockSuggestion();
            (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

            let contributionRecordCreated = false;

            (prismaService.$transaction as jest.Mock).mockImplementation(
              async (callback: (tx: any) => Promise<any>) => {
                const txMock = {
                  card: {
                    create: jest.fn().mockResolvedValue({
                      id: mockCardId,
                      authorId: mockReviewerId,
                      content: 'Test card content',
                    }),
                  },
                  contentSuggestion: {
                    update: jest.fn().mockResolvedValue({
                      ...mockSuggestion,
                      status: 'ACCEPTED',
                      rewardAmount: 0,
                      reviewedAt: new Date(),
                      cardId: publishCard ? mockCardId : null,
                    }),
                  },
                  contributionRecord: {
                    create: jest.fn().mockImplementation(() => {
                      contributionRecordCreated = true;
                      return Promise.resolve({});
                    }),
                  },
                };
                return callback(txMock);
              },
            );

            await service.acceptSuggestion(mockSuggestionId, mockReviewerId, {
              rewardAmount: 0,
              publishCard,
            });

            // 验证 ContributionRecord 未被创建
            expect(contributionRecordCreated).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('采纳建议创建 Card', () => {
    /**
     * Property 11: 建议采纳奖励与动态
     * 验证 publishCard=true 时创建 Card
     */
    it('should create Card when publishCard is true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10000 }), // 随机奖励积分
          fc.option(fc.string({ minLength: 1, maxLength: 500 }), { nil: undefined }), // 可选的卡片内容
          async (rewardAmount, cardContent) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            const mockSuggestion = createMockSuggestion();
            (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

            let cardCreated = false;
            let createdCardData: any = null;

            (prismaService.$transaction as jest.Mock).mockImplementation(
              async (callback: (tx: any) => Promise<any>) => {
                const txMock = {
                  card: {
                    create: jest.fn().mockImplementation((data: any) => {
                      cardCreated = true;
                      createdCardData = data.data;
                      return Promise.resolve({
                        id: mockCardId,
                        ...data.data,
                      });
                    }),
                  },
                  contentSuggestion: {
                    update: jest.fn().mockResolvedValue({
                      ...mockSuggestion,
                      status: 'ACCEPTED',
                      rewardAmount,
                      reviewedAt: new Date(),
                      cardId: mockCardId,
                    }),
                  },
                  contributionRecord: {
                    create: jest.fn().mockResolvedValue({}),
                  },
                };
                return callback(txMock);
              },
            );

            await service.acceptSuggestion(mockSuggestionId, mockReviewerId, {
              rewardAmount,
              publishCard: true,
              cardContent,
            });

            // 验证 Card 被创建
            expect(cardCreated).toBe(true);
            expect(createdCardData).toBeDefined();
            expect(createdCardData.authorId).toBe(mockReviewerId);
            // 验证卡片内容（如果提供了自定义内容则使用自定义内容，否则使用默认内容）
            if (cardContent) {
              expect(createdCardData.content).toBe(cardContent);
            } else {
              expect(createdCardData.content).toContain('采纳了来自');
              expect(createdCardData.content).toContain(mockSuggestion.suggester.username);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 11: 建议采纳奖励与动态
     * 验证 publishCard=false 时不创建 Card
     */
    it('should NOT create Card when publishCard is false', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10000 }), // 随机奖励积分
          async (rewardAmount) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            const mockSuggestion = createMockSuggestion();
            (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

            let cardCreated = false;

            (prismaService.$transaction as jest.Mock).mockImplementation(
              async (callback: (tx: any) => Promise<any>) => {
                const txMock = {
                  card: {
                    create: jest.fn().mockImplementation(() => {
                      cardCreated = true;
                      return Promise.resolve({});
                    }),
                  },
                  contentSuggestion: {
                    update: jest.fn().mockResolvedValue({
                      ...mockSuggestion,
                      status: 'ACCEPTED',
                      rewardAmount,
                      reviewedAt: new Date(),
                      cardId: null,
                    }),
                  },
                  contributionRecord: {
                    create: jest.fn().mockResolvedValue({}),
                  },
                };
                return callback(txMock);
              },
            );

            await service.acceptSuggestion(mockSuggestionId, mockReviewerId, {
              rewardAmount,
              publishCard: false,
            });

            // 验证 Card 未被创建
            expect(cardCreated).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Card 与 Suggestion 关联', () => {
    /**
     * Property 11: 建议采纳奖励与动态
     * 验证 Card 通过 cardId 关联到 suggestion
     */
    it('should link Card to suggestion via cardId when publishCard is true', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机生成的 cardId
          fc.integer({ min: 0, max: 10000 }), // 随机奖励积分
          async (generatedCardId, rewardAmount) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            const mockSuggestion = createMockSuggestion();
            (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

            let updatedSuggestionCardId: string | null = null;

            (prismaService.$transaction as jest.Mock).mockImplementation(
              async (callback: (tx: any) => Promise<any>) => {
                const txMock = {
                  card: {
                    create: jest.fn().mockResolvedValue({
                      id: generatedCardId,
                      authorId: mockReviewerId,
                      content: 'Test card content',
                    }),
                  },
                  contentSuggestion: {
                    update: jest.fn().mockImplementation((args: any) => {
                      updatedSuggestionCardId = args.data.cardId;
                      return Promise.resolve({
                        ...mockSuggestion,
                        status: 'ACCEPTED',
                        rewardAmount,
                        reviewedAt: new Date(),
                        cardId: args.data.cardId,
                      });
                    }),
                  },
                  contributionRecord: {
                    create: jest.fn().mockResolvedValue({}),
                  },
                };
                return callback(txMock);
              },
            );

            await service.acceptSuggestion(mockSuggestionId, mockReviewerId, {
              rewardAmount,
              publishCard: true,
            });

            // 验证 suggestion 的 cardId 被正确设置为创建的 Card 的 id
            expect(updatedSuggestionCardId).toBe(generatedCardId);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('权限验证：只有分支创作者可以采纳建议', () => {
    /**
     * Property 11: 建议采纳奖励与动态
     * 验证只有分支创作者可以采纳建议（ForbiddenException for others）
     */
    it('should throw ForbiddenException when non-creator tries to accept suggestion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机非创作者ID
          fc.integer({ min: 0, max: 10000 }), // 随机奖励积分
          fc.boolean(), // 随机 publishCard 值
          async (nonCreatorId, rewardAmount, publishCard) => {
            // 确保 nonCreatorId 不等于 mockReviewerId（分支创作者）
            if (nonCreatorId === mockReviewerId) {
              return; // 跳过这个测试用例
            }

            // Reset mocks for each iteration
            jest.clearAllMocks();

            const mockSuggestion = createMockSuggestion();
            (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

            // 非分支创作者尝试采纳建议应该抛出 ForbiddenException
            await expect(
              service.acceptSuggestion(mockSuggestionId, nonCreatorId, {
                rewardAmount,
                publishCard,
              }),
            ).rejects.toThrow(ForbiddenException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('状态验证：不能采纳已处理的建议', () => {
    /**
     * Property 11: 建议采纳奖励与动态
     * 验证不能采纳已处理的建议（BadRequestException）
     */
    it('should throw BadRequestException when trying to accept already processed suggestion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('ACCEPTED', 'REJECTED'), // 已处理的状态
          fc.integer({ min: 0, max: 10000 }), // 随机奖励积分
          fc.boolean(), // 随机 publishCard 值
          async (processedStatus, rewardAmount, publishCard) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            const mockSuggestion = createMockSuggestion({
              status: processedStatus,
            });
            (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

            // 尝试采纳已处理的建议应该抛出 BadRequestException
            await expect(
              service.acceptSuggestion(mockSuggestionId, mockReviewerId, {
                rewardAmount,
                publishCard,
              }),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('ContributionRecord 类型和积分验证', () => {
    /**
     * Property 11: 建议采纳奖励与动态
     * 验证 ContributionRecord 有正确的 type (SUGGESTION_ACCEPTED) 和 points
     */
    it('should create ContributionRecord with correct type and points', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10000 }), // 随机奖励积分
          async (rewardAmount) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            const mockSuggestion = createMockSuggestion();
            (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

            let createdContributionData: any = null;

            (prismaService.$transaction as jest.Mock).mockImplementation(
              async (callback: (tx: any) => Promise<any>) => {
                const txMock = {
                  card: {
                    create: jest.fn(),
                  },
                  contentSuggestion: {
                    update: jest.fn().mockResolvedValue({
                      ...mockSuggestion,
                      status: 'ACCEPTED',
                      rewardAmount,
                      reviewedAt: new Date(),
                    }),
                  },
                  contributionRecord: {
                    create: jest.fn().mockImplementation((data: any) => {
                      createdContributionData = data.data;
                      return Promise.resolve({
                        id: 'contribution-123',
                        ...data.data,
                      });
                    }),
                  },
                };
                return callback(txMock);
              },
            );

            await service.acceptSuggestion(mockSuggestionId, mockReviewerId, {
              rewardAmount,
              publishCard: false,
            });

            // 验证 ContributionRecord 的 type 和 points
            expect(createdContributionData).toBeDefined();
            expect(createdContributionData.type).toBe('SUGGESTION_ACCEPTED');
            expect(createdContributionData.points).toBe(rewardAmount);
            // 验证 points 与 rewardAmount 完全一致
            expect(createdContributionData.points).toStrictEqual(rewardAmount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('边界情况', () => {
    /**
     * Property 11: 边界情况 - 建议不存在
     */
    it('should throw NotFoundException when suggestion does not exist', async () => {
      (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.acceptSuggestion(mockSuggestionId, mockReviewerId, {
          rewardAmount: 100,
          publishCard: false,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * Property 11: 边界情况 - 建议已删除
     */
    it('should throw BadRequestException when suggestion is deleted', async () => {
      const mockSuggestion = createMockSuggestion({
        isDeleted: true,
      });
      (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

      await expect(
        service.acceptSuggestion(mockSuggestionId, mockReviewerId, {
          rewardAmount: 100,
          publishCard: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    /**
     * Property 11: 边界情况 - 分支已删除
     */
    it('should throw BadRequestException when branch is deleted', async () => {
      const mockSuggestion = createMockSuggestion({
        branch: {
          id: mockBranchId,
          creatorId: mockReviewerId,
          isDeleted: true, // 分支已删除
          library: {
            id: mockLibraryId,
            title: 'Test Library',
          },
        },
      });
      (prismaService.contentSuggestion.findUnique as jest.Mock).mockResolvedValue(mockSuggestion);

      await expect(
        service.acceptSuggestion(mockSuggestionId, mockReviewerId, {
          rewardAmount: 100,
          publishCard: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
