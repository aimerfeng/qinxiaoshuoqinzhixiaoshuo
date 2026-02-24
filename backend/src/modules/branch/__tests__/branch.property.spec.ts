// Feature: library-branch-system, Property 3: 分支创建授权
// **Validates: Requirements 1.4, 1.5**

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { BranchService } from '../branch.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { LibraryService } from '../../library/library.service.js';

describe('Property 3: 分支创建授权', () => {
  let service: BranchService;
  let prismaService: any;

  const mockOwnerId = 'owner-123';
  const mockOtherUserId = 'other-user-456';
  const mockLibraryId = 'library-789';
  const mockWorkId = 'work-abc';
  const mockBranchWorkId = 'branch-work-def';
  const mockBranchId = 'branch-ghi';

  beforeEach(async () => {
    const mockPrismaService = {
      library: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      libraryBranch: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      work: {
        create: jest.fn(),
      },
      chapter: {
        findUnique: jest.fn(),
      },
      paragraph: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const mockLibraryService = {
      getLibraryById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LibraryService, useValue: mockLibraryService },
      ],
    }).compile();

    service = module.get<BranchService>(BranchService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });


  describe('SHARED 库允许任何用户创建分支', () => {
    /**
     * Property 3: 分支创建授权
     * 若库类型为 SHARED，则任何认证用户都可以创建分支
     */
    it('should allow any user to create MAIN branch in SHARED library', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机用户ID
          fc.constantFrom('MAIN', 'DERIVATIVE', 'MANGA'), // 分支类型
          async (userId, branchType) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for SHARED library
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: 'Shared Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: 0, // 免费上传
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: userId,
              title: 'Test Branch',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: userId,
              workId: mockBranchWorkId,
              branchType,
              derivativeType: branchType === 'DERIVATIVE' ? 'FANFIC' : null,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: userId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: 'Test Branch',
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Should not throw for any user in SHARED library
            const createDto = {
              branchType: branchType as 'MAIN' | 'DERIVATIVE' | 'MANGA',
              derivativeType: branchType === 'DERIVATIVE' ? 'FANFIC' as const : undefined,
              title: 'Test Branch',
              wordCount: branchType === 'DERIVATIVE' ? 1000 : undefined,
              pageCount: branchType === 'MANGA' ? 10 : undefined,
            };

            const result = await service.createBranch(mockLibraryId, userId, createDto);

            expect(result).toBeDefined();
            expect(result.branch).toBeDefined();
            expect(result.branch.branchType).toBe(branchType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('ORIGINAL 库只有拥有者可创建 MAIN 分支', () => {
    /**
     * Property 3: 分支创建授权
     * 若库类型为 ORIGINAL，则只有库拥有者可以创建 MAIN 类型分支
     */
    it('should allow owner to create MAIN branch in ORIGINAL library', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (ownerId) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();

          // Setup mock for ORIGINAL library
          (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
            id: mockLibraryId,
            ownerId: ownerId, // 库拥有者
            libraryType: 'ORIGINAL',
            title: 'Original Library',
            uploadFeeType: 'PER_THOUSAND_WORDS',
            uploadFeeRate: 0, // 免费上传
          });

          // Setup mock for work creation
          (prismaService.work.create as jest.Mock).mockResolvedValue({
            id: mockBranchWorkId,
            authorId: ownerId,
            title: 'Test Branch',
          });

          // Setup mock for branch creation
          (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
            id: mockBranchId,
            libraryId: mockLibraryId,
            creatorId: ownerId,
            workId: mockBranchWorkId,
            branchType: 'MAIN',
            derivativeType: null,
            forkFromChapterId: null,
            forkFromParagraphId: null,
            likeCount: 0,
            tipAmount: 0,
            viewCount: 0,
            hotScore: 0,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            creator: {
              id: ownerId,
              username: 'owner',
              displayName: 'Owner',
              avatar: null,
            },
            work: {
              id: mockBranchWorkId,
              title: 'Test Branch',
              description: null,
              coverImage: null,
            },
          });

          // Setup mock for library update
          (prismaService.library.update as jest.Mock).mockResolvedValue({
            id: mockLibraryId,
            branchCount: 1,
          });

          // Owner should be able to create MAIN branch
          const result = await service.createBranch(mockLibraryId, ownerId, {
            branchType: 'MAIN',
            title: 'Test Branch',
          });

          expect(result).toBeDefined();
          expect(result.branch.branchType).toBe('MAIN');
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 3: 分支创建授权
     * 若库类型为 ORIGINAL，其他用户创建 MAIN 分支应被拒绝
     */
    it('should reject non-owner creating MAIN branch in ORIGINAL library', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 库拥有者ID
          fc.uuid(), // 其他用户ID
          async (ownerId, otherUserId) => {
            // 确保两个用户ID不同
            fc.pre(ownerId !== otherUserId);

            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for ORIGINAL library
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: ownerId, // 库拥有者
              libraryType: 'ORIGINAL',
              title: 'Original Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: 0, // 免费上传
            });

            // Non-owner should be rejected when creating MAIN branch
            await expect(
              service.createBranch(mockLibraryId, otherUserId, {
                branchType: 'MAIN',
                title: 'Test Branch',
              })
            ).rejects.toThrow(ForbiddenException);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 3: 分支创建授权
     * 若库类型为 ORIGINAL，其他用户可以创建 DERIVATIVE 或 MANGA 分支
     */
    it('should allow non-owner to create DERIVATIVE or MANGA branch in ORIGINAL library', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 库拥有者ID
          fc.uuid(), // 其他用户ID
          fc.constantFrom('DERIVATIVE', 'MANGA'), // 非 MAIN 分支类型
          async (ownerId, otherUserId, branchType) => {
            // 确保两个用户ID不同
            fc.pre(ownerId !== otherUserId);

            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for ORIGINAL library
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: ownerId, // 库拥有者
              libraryType: 'ORIGINAL',
              title: 'Original Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: 0, // 免费上传
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: otherUserId,
              title: 'Test Branch',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: otherUserId,
              workId: mockBranchWorkId,
              branchType,
              derivativeType: branchType === 'DERIVATIVE' ? 'FANFIC' : null,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: otherUserId,
                username: 'otheruser',
                displayName: 'Other User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: 'Test Branch',
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Non-owner should be able to create DERIVATIVE or MANGA branch
            const createDto = {
              branchType: branchType as 'DERIVATIVE' | 'MANGA',
              derivativeType: branchType === 'DERIVATIVE' ? 'FANFIC' as const : undefined,
              title: 'Test Branch',
              wordCount: branchType === 'DERIVATIVE' ? 1000 : undefined,
              pageCount: branchType === 'MANGA' ? 10 : undefined,
            };

            const result = await service.createBranch(mockLibraryId, otherUserId, createDto);

            expect(result).toBeDefined();
            expect(result.branch.branchType).toBe(branchType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('边界情况', () => {
    /**
     * Property 3: 边界情况 - 库不存在
     */
    it('should throw NotFoundException when library does not exist', async () => {
      // Setup mock for non-existent library
      (prismaService.library.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createBranch('non-existent-library', mockOwnerId, {
          branchType: 'MAIN',
          title: 'Test Branch',
        })
      ).rejects.toThrow(NotFoundException);
    });

    /**
     * Property 3: 边界情况 - 库已删除
     */
    it('should throw NotFoundException when library is deleted', async () => {
      // Setup mock for deleted library (findUnique with isDeleted: false returns null)
      (prismaService.library.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createBranch(mockLibraryId, mockOwnerId, {
          branchType: 'MAIN',
          title: 'Test Branch',
        })
      ).rejects.toThrow(NotFoundException);
    });
  });
});

// Feature: library-branch-system, Property 6: 改写分支类型必填
// **Validates: Requirements 3.1**

describe('Property 6: 改写分支类型必填', () => {
  let service: BranchService;
  let prismaService: PrismaService;

  const mockLibraryId = 'library-789';
  const mockUserId = 'user-123';
  const mockOwnerId = 'owner-456';
  const mockBranchWorkId = 'branch-work-def';
  const mockBranchId = 'branch-ghi';

  beforeEach(async () => {
    const mockPrismaService: Partial<PrismaService> = {
      library: {
        findUnique: jest.fn(),
        update: jest.fn(),
      } as any,
      libraryBranch: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      } as any,
      work: {
        create: jest.fn(),
      } as any,
      chapter: {
        findUnique: jest.fn(),
      } as any,
      paragraph: {
        findUnique: jest.fn(),
      } as any,
      $transaction: jest.fn((callback: (tx: any) => Promise<any>) =>
        callback(mockPrismaService),
      ),
    };

    const mockLibraryService = {
      getLibraryById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LibraryService, useValue: mockLibraryService },
      ],
    }).compile();

    service = module.get<BranchService>(BranchService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('DERIVATIVE 分支必须提供 derivativeType', () => {
    /**
     * Property 6: 改写分支类型必填
     * 验证 DERIVATIVE 类型分支必须提供 derivativeType
     * 若未提供 derivativeType，则请求应被拒绝
     */
    it('should reject DERIVATIVE branch without derivativeType', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机用户ID
          fc.uuid(), // 随机库拥有者ID
          async (userId, ownerId) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library (SHARED to allow any user)
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: ownerId,
              libraryType: 'SHARED',
              title: 'Test Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: 0, // 免费上传
            });

            // DERIVATIVE branch without derivativeType should throw BadRequestException
            await expect(
              service.createBranch(mockLibraryId, userId, {
                branchType: 'DERIVATIVE',
                // derivativeType is intentionally omitted
                title: 'Test Derivative Branch',
                wordCount: 1000, // 提供字数
              }),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 6: 改写分支类型必填
     * 验证 DERIVATIVE 类型分支提供 derivativeType 时成功创建
     */
    it('should accept DERIVATIVE branch with valid derivativeType', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机用户ID
          fc.uuid(), // 随机库拥有者ID
          fc.constantFrom('FANFIC', 'IF_LINE', 'ADAPTATION'), // 有效的 derivativeType
          async (userId, ownerId, derivativeType) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();
            // Setup mock for library (SHARED to allow any user)
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: ownerId,
              libraryType: 'SHARED',
              title: 'Test Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: 0, // 免费上传
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: userId,
              title: 'Test Derivative Branch',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: userId,
              workId: mockBranchWorkId,
              branchType: 'DERIVATIVE',
              derivativeType: derivativeType,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: userId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: 'Test Derivative Branch',
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // DERIVATIVE branch with derivativeType should succeed
            const result = await service.createBranch(mockLibraryId, userId, {
              branchType: 'DERIVATIVE',
              derivativeType: derivativeType as 'FANFIC' | 'IF_LINE' | 'ADAPTATION',
              title: 'Test Derivative Branch',
              wordCount: 1000, // 提供字数
            });

            expect(result).toBeDefined();
            expect(result.branch).toBeDefined();
            expect(result.branch.branchType).toBe('DERIVATIVE');
            expect(result.branch.derivativeType).toBe(derivativeType);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('非 DERIVATIVE 分支不需要 derivativeType', () => {
    /**
     * Property 6: 边界情况
     * MAIN 和 MANGA 分支不需要 derivativeType
     */
    it('should accept MAIN and MANGA branches without derivativeType', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机用户ID
          fc.constantFrom('MAIN', 'MANGA'), // 非 DERIVATIVE 分支类型
          async (userId, branchType) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library (SHARED to allow any user)
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: userId, // 用户是拥有者，可以创建 MAIN 分支
              libraryType: 'SHARED',
              title: 'Test Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: 0, // 免费上传
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: userId,
              title: 'Test Branch',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: userId,
              workId: mockBranchWorkId,
              branchType: branchType,
              derivativeType: null,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: userId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: 'Test Branch',
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // MAIN and MANGA branches should succeed without derivativeType
            // MANGA 分支需要提供 pageCount
            const result = await service.createBranch(mockLibraryId, userId, {
              branchType: branchType as 'MAIN' | 'MANGA',
              // derivativeType is intentionally omitted
              title: 'Test Branch',
              pageCount: branchType === 'MANGA' ? 10 : undefined,
            });

            expect(result).toBeDefined();
            expect(result.branch).toBeDefined();
            expect(result.branch.branchType).toBe(branchType);
            expect(result.branch.derivativeType).toBeNull();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

// Feature: library-branch-system, Property 7: 上传费用计算与分配
// **Validates: Requirements 3.2, 3.3, 3.4, 4.2**

describe('Property 7: 上传费用计算与分配', () => {
  let service: BranchService;

  beforeEach(async () => {
    const mockPrismaService: Partial<PrismaService> = {
      library: {
        findUnique: jest.fn(),
        update: jest.fn(),
      } as any,
      libraryBranch: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      } as any,
      work: {
        create: jest.fn(),
      } as any,
      chapter: {
        findUnique: jest.fn(),
      } as any,
      paragraph: {
        findUnique: jest.fn(),
      } as any,
      $transaction: jest.fn((callback: (tx: any) => Promise<any>) =>
        callback(mockPrismaService),
      ),
    };

    const mockLibraryService = {
      getLibraryById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LibraryService, useValue: mockLibraryService },
      ],
    }).compile();

    service = module.get<BranchService>(BranchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('文字分支（DERIVATIVE）费用计算', () => {
    /**
     * Property 7: 上传费用计算与分配
     * 文字分支费用 = ceil(wordCount / 1000) × uploadFeeRate
     */
    it('should calculate text branch fee as ceil(wordCount/1000) × rate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          fc.integer({ min: 0, max: 1000 }), // uploadFeeRate (分/千字)
          async (wordCount, uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'DERIVATIVE',
              'PER_THOUSAND_WORDS',
              uploadFeeRate,
              wordCount,
              undefined,
            );

            // 验证费用计算公式: ceil(wordCount / 1000) × rate
            const expectedQuantity = Math.ceil(wordCount / 1000);
            const expectedTotalFee = expectedQuantity * uploadFeeRate;

            expect(result.quantity).toBe(expectedQuantity);
            expect(result.totalFee).toBe(expectedTotalFee);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('漫画分支（MANGA）费用计算', () => {
    /**
     * Property 7: 上传费用计算与分配
     * 漫画分支费用 = pageCount × uploadFeeRate
     */
    it('should calculate manga branch fee as pageCount × rate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 500 }), // pageCount
          fc.integer({ min: 0, max: 1000 }), // uploadFeeRate (分/页)
          async (pageCount, uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'MANGA',
              'PER_PAGE',
              uploadFeeRate,
              undefined,
              pageCount,
            );

            // 验证费用计算公式: pageCount × rate
            const expectedTotalFee = pageCount * uploadFeeRate;

            expect(result.quantity).toBe(pageCount);
            expect(result.totalFee).toBe(expectedTotalFee);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('费用分配验证（70%/30%）', () => {
    /**
     * Property 7: 上传费用计算与分配
     * 库拥有者收入 = 费用 × 70%
     * 平台收入 = 费用 × 30%
     * 库拥有者收入 + 平台收入 = 总费用
     */
    it('should distribute fee as 70% owner and 30% platform', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate (确保有费用)
          async (wordCount, uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'DERIVATIVE',
              'PER_THOUSAND_WORDS',
              uploadFeeRate,
              wordCount,
              undefined,
            );

            // 验证 70%/30% 分配
            const expectedOwnerAmount = Math.floor(result.totalFee * 0.7);
            const expectedPlatformAmount = result.totalFee - expectedOwnerAmount;

            expect(result.ownerAmount).toBe(expectedOwnerAmount);
            expect(result.platformAmount).toBe(expectedPlatformAmount);

            // 验证总和等于总费用
            expect(result.ownerAmount + result.platformAmount).toBe(result.totalFee);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7: 漫画分支费用分配验证
     */
    it('should distribute manga fee as 70% owner and 30% platform', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 500 }), // pageCount
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate (确保有费用)
          async (pageCount, uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'MANGA',
              'PER_PAGE',
              uploadFeeRate,
              undefined,
              pageCount,
            );

            // 验证 70%/30% 分配
            const expectedOwnerAmount = Math.floor(result.totalFee * 0.7);
            const expectedPlatformAmount = result.totalFee - expectedOwnerAmount;

            expect(result.ownerAmount).toBe(expectedOwnerAmount);
            expect(result.platformAmount).toBe(expectedPlatformAmount);

            // 验证总和等于总费用
            expect(result.ownerAmount + result.platformAmount).toBe(result.totalFee);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('边界情况', () => {
    /**
     * Property 7: 边界情况 - 费率为0时费用为0
     */
    it('should return zero fee when rate is zero', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          async (wordCount) => {
            const result = service.calculateUploadFee(
              'DERIVATIVE',
              'PER_THOUSAND_WORDS',
              0, // 费率为0
              wordCount,
              undefined,
            );

            expect(result.totalFee).toBe(0);
            expect(result.ownerAmount).toBe(0);
            expect(result.platformAmount).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7: 边界情况 - MAIN 分支不收取费用
     */
    it('should return zero fee for MAIN branch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }), // uploadFeeRate
          async (uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'MAIN',
              'PER_THOUSAND_WORDS',
              uploadFeeRate,
              1000, // wordCount
              undefined,
            );

            // MAIN 分支不收取上传费用
            expect(result.totalFee).toBe(0);
            expect(result.ownerAmount).toBe(0);
            expect(result.platformAmount).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7: 边界情况 - 字数为0时的处理
     */
    it('should handle wordCount of 0 for DERIVATIVE branch', async () => {
      const result = service.calculateUploadFee(
        'DERIVATIVE',
        'PER_THOUSAND_WORDS',
        100, // uploadFeeRate
        0, // wordCount = 0
        undefined,
      );

      // ceil(0 / 1000) = 0, 所以费用为 0
      expect(result.quantity).toBe(0);
      expect(result.totalFee).toBe(0);
      expect(result.ownerAmount).toBe(0);
      expect(result.platformAmount).toBe(0);
    });

    /**
     * Property 7: 边界情况 - 小于1000字时向上取整
     */
    it('should ceil wordCount to at least 1 unit for small content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999 }), // wordCount < 1000
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate
          async (wordCount, uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'DERIVATIVE',
              'PER_THOUSAND_WORDS',
              uploadFeeRate,
              wordCount,
              undefined,
            );

            // ceil(1-999 / 1000) = 1
            expect(result.quantity).toBe(1);
            expect(result.totalFee).toBe(uploadFeeRate);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});



// Feature: library-branch-system, Property 7: 上传费用计算与分配
// **Validates: Requirements 3.2, 3.3, 3.4, 4.2**

describe('Property 7: 上传费用计算与分配', () => {
  let service: BranchService;

  beforeEach(async () => {
    const mockPrismaService: Partial<PrismaService> = {
      library: {
        findUnique: jest.fn(),
        update: jest.fn(),
      } as any,
      libraryBranch: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      } as any,
      work: {
        create: jest.fn(),
      } as any,
      chapter: {
        findUnique: jest.fn(),
      } as any,
      paragraph: {
        findUnique: jest.fn(),
      } as any,
      $transaction: jest.fn((callback: (tx: any) => Promise<any>) =>
        callback(mockPrismaService),
      ),
    };

    const mockLibraryService = {
      getLibraryById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LibraryService, useValue: mockLibraryService },
      ],
    }).compile();

    service = module.get<BranchService>(BranchService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('文字分支（DERIVATIVE）费用计算', () => {
    /**
     * Property 7: 上传费用计算与分配
     * 文字分支费用 = ceil(wordCount / 1000) × uploadFeeRate
     */
    it('should calculate text branch fee as ceil(wordCount/1000) × rate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          fc.integer({ min: 0, max: 1000 }), // uploadFeeRate (分/千字)
          async (wordCount, uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'DERIVATIVE',
              'PER_THOUSAND_WORDS',
              uploadFeeRate,
              wordCount,
              undefined,
            );

            // 验证费用计算公式: ceil(wordCount / 1000) × rate
            const expectedQuantity = Math.ceil(wordCount / 1000);
            const expectedTotalFee = expectedQuantity * uploadFeeRate;

            expect(result.quantity).toBe(expectedQuantity);
            expect(result.totalFee).toBe(expectedTotalFee);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('漫画分支（MANGA）费用计算', () => {
    /**
     * Property 7: 上传费用计算与分配
     * 漫画分支费用 = pageCount × uploadFeeRate
     */
    it('should calculate manga branch fee as pageCount × rate', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 500 }), // pageCount
          fc.integer({ min: 0, max: 1000 }), // uploadFeeRate (分/页)
          async (pageCount, uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'MANGA',
              'PER_PAGE',
              uploadFeeRate,
              undefined,
              pageCount,
            );

            // 验证费用计算公式: pageCount × rate
            const expectedTotalFee = pageCount * uploadFeeRate;

            expect(result.quantity).toBe(pageCount);
            expect(result.totalFee).toBe(expectedTotalFee);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('费用分配验证（70%/30%）', () => {
    /**
     * Property 7: 上传费用计算与分配
     * 库拥有者收入 = 费用 × 70%
     * 平台收入 = 费用 × 30%
     * 库拥有者收入 + 平台收入 = 总费用
     */
    it('should distribute fee as 70% owner and 30% platform', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate (确保有费用)
          async (wordCount, uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'DERIVATIVE',
              'PER_THOUSAND_WORDS',
              uploadFeeRate,
              wordCount,
              undefined,
            );

            // 验证 70%/30% 分配
            const expectedOwnerAmount = Math.floor(result.totalFee * 0.7);
            const expectedPlatformAmount = result.totalFee - expectedOwnerAmount;

            expect(result.ownerAmount).toBe(expectedOwnerAmount);
            expect(result.platformAmount).toBe(expectedPlatformAmount);

            // 验证总和等于总费用
            expect(result.ownerAmount + result.platformAmount).toBe(result.totalFee);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7: 漫画分支费用分配验证
     */
    it('should distribute manga fee as 70% owner and 30% platform', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 500 }), // pageCount
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate (确保有费用)
          async (pageCount, uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'MANGA',
              'PER_PAGE',
              uploadFeeRate,
              undefined,
              pageCount,
            );

            // 验证 70%/30% 分配
            const expectedOwnerAmount = Math.floor(result.totalFee * 0.7);
            const expectedPlatformAmount = result.totalFee - expectedOwnerAmount;

            expect(result.ownerAmount).toBe(expectedOwnerAmount);
            expect(result.platformAmount).toBe(expectedPlatformAmount);

            // 验证总和等于总费用
            expect(result.ownerAmount + result.platformAmount).toBe(result.totalFee);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('边界情况', () => {
    /**
     * Property 7: 边界情况 - 费率为0时费用为0
     */
    it('should return zero fee when rate is zero', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          async (wordCount) => {
            const result = service.calculateUploadFee(
              'DERIVATIVE',
              'PER_THOUSAND_WORDS',
              0, // 费率为0
              wordCount,
              undefined,
            );

            expect(result.totalFee).toBe(0);
            expect(result.ownerAmount).toBe(0);
            expect(result.platformAmount).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7: 边界情况 - MAIN 分支不收取费用
     */
    it('should return zero fee for MAIN branch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }), // uploadFeeRate
          async (uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'MAIN',
              'PER_THOUSAND_WORDS',
              uploadFeeRate,
              1000, // wordCount
              undefined,
            );

            // MAIN 分支不收取上传费用
            expect(result.totalFee).toBe(0);
            expect(result.ownerAmount).toBe(0);
            expect(result.platformAmount).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7: 边界情况 - 字数为0时的处理
     */
    it('should handle wordCount of 0 for DERIVATIVE branch', () => {
      const result = service.calculateUploadFee(
        'DERIVATIVE',
        'PER_THOUSAND_WORDS',
        100, // uploadFeeRate
        0, // wordCount = 0
        undefined,
      );

      // ceil(0 / 1000) = 0, 所以费用为 0
      expect(result.quantity).toBe(0);
      expect(result.totalFee).toBe(0);
      expect(result.ownerAmount).toBe(0);
      expect(result.platformAmount).toBe(0);
    });

    /**
     * Property 7: 边界情况 - 小于1000字时向上取整
     */
    it('should ceil wordCount to at least 1 unit for small content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999 }), // wordCount < 1000
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate
          async (wordCount, uploadFeeRate) => {
            const result = service.calculateUploadFee(
              'DERIVATIVE',
              'PER_THOUSAND_WORDS',
              uploadFeeRate,
              wordCount,
              undefined,
            );

            // ceil(1-999 / 1000) = 1
            expect(result.quantity).toBe(1);
            expect(result.totalFee).toBe(uploadFeeRate);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

// Feature: library-branch-system, Property 8: 余额不足拒绝创建
// **Validates: Requirements 3.5**

describe('Property 8: 余额不足拒绝创建', () => {
  let service: BranchService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockLibraryId = 'library-789';
  const mockUserId = 'user-123';
  const mockOwnerId = 'owner-456';
  const mockBranchWorkId = 'branch-work-def';
  const mockBranchId = 'branch-ghi';
  const mockWalletId = 'wallet-xyz';

  beforeEach(async () => {
    const mockPrismaService = {
      library: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      libraryBranch: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      work: {
        create: jest.fn(),
      },
      chapter: {
        findUnique: jest.fn(),
      },
      paragraph: {
        findUnique: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
      },
      branchTransaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const mockLibraryService = {
      getLibraryById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LibraryService, useValue: mockLibraryService },
      ],
    }).compile();

    service = module.get<BranchService>(BranchService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('余额不足时拒绝创建分支', () => {
    /**
     * Property 8: 余额不足拒绝创建
     * 当用户余额小于计算出的上传费用时，分支创建请求应被拒绝
     */
    it('should reject branch creation when balance < fee', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate (确保有费用)
          fc.integer({ min: 0, max: 100000 }), // userBalance
          async (wordCount, uploadFeeRate, userBalance) => {
            // 计算预期费用
            const expectedQuantity = Math.ceil(wordCount / 1000);
            const expectedFee = expectedQuantity * uploadFeeRate;

            // 只测试余额不足的情况
            fc.pre(userBalance < expectedFee);

            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: 'Test Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: uploadFeeRate,
            });

            // Setup mock for wallet with insufficient balance
            (prismaService.wallet.findUnique as jest.Mock).mockResolvedValue({
              id: mockWalletId,
              userId: mockUserId,
              balance: userBalance,
            });

            // Should throw BadRequestException when balance < fee
            await expect(
              service.createBranch(mockLibraryId, mockUserId, {
                branchType: 'DERIVATIVE',
                derivativeType: 'FANFIC',
                title: 'Test Branch',
                wordCount: wordCount,
              }),
            ).rejects.toThrow(BadRequestException);

            // Verify wallet was checked
            expect(prismaService.wallet.findUnique).toHaveBeenCalledWith({
              where: { userId: mockUserId },
              select: { id: true, balance: true },
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 8: 余额不足拒绝创建（漫画分支）
     * 验证漫画分支在余额不足时也被拒绝
     */
    it('should reject MANGA branch creation when balance < fee', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 500 }), // pageCount
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate (确保有费用)
          fc.integer({ min: 0, max: 100000 }), // userBalance
          async (pageCount, uploadFeeRate, userBalance) => {
            // 计算预期费用
            const expectedFee = pageCount * uploadFeeRate;

            // 只测试余额不足的情况
            fc.pre(userBalance < expectedFee);

            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: 'Test Library',
              uploadFeeType: 'PER_PAGE',
              uploadFeeRate: uploadFeeRate,
            });

            // Setup mock for wallet with insufficient balance
            (prismaService.wallet.findUnique as jest.Mock).mockResolvedValue({
              id: mockWalletId,
              userId: mockUserId,
              balance: userBalance,
            });

            // Should throw BadRequestException when balance < fee
            await expect(
              service.createBranch(mockLibraryId, mockUserId, {
                branchType: 'MANGA',
                title: 'Test Manga Branch',
                pageCount: pageCount,
              }),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('余额充足时允许创建分支', () => {
    /**
     * Property 8: 余额充足时成功创建
     * 当用户余额 >= 计算出的上传费用时，分支创建应成功
     */
    it('should allow branch creation when balance >= fee', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate
          fc.integer({ min: 0, max: 1000000 }), // extraBalance (额外余额)
          async (wordCount, uploadFeeRate, extraBalance) => {
            // 计算预期费用
            const expectedQuantity = Math.ceil(wordCount / 1000);
            const expectedFee = expectedQuantity * uploadFeeRate;

            // 确保余额充足
            const userBalance = expectedFee + extraBalance;

            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: 'Test Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: uploadFeeRate,
            });

            // Setup mock for wallet with sufficient balance
            (prismaService.wallet.findUnique as jest.Mock).mockResolvedValue({
              id: mockWalletId,
              userId: mockUserId,
              balance: userBalance,
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: mockUserId,
              title: 'Test Branch',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: mockUserId,
              workId: mockBranchWorkId,
              branchType: 'DERIVATIVE',
              derivativeType: 'FANFIC',
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: mockUserId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: 'Test Branch',
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Setup mock for wallet update (deduct fee)
            (prismaService.wallet.update as jest.Mock).mockResolvedValue({
              id: mockWalletId,
              userId: mockUserId,
              balance: userBalance - expectedFee,
            });

            // Setup mock for wallet upsert (owner wallet)
            (prismaService.wallet as any).upsert = jest.fn().mockResolvedValue({
              id: 'owner-wallet-id',
              userId: mockOwnerId,
              balance: Math.floor(expectedFee * 0.7),
            });

            // Setup mock for transaction creation
            (prismaService.transaction.create as jest.Mock).mockResolvedValue({
              id: 'transaction-id',
              walletId: mockWalletId,
              type: 'TIP_SENT',
              amount: -expectedFee,
            });

            // Setup mock for branch transaction creation
            (prismaService.branchTransaction.create as jest.Mock).mockResolvedValue({
              id: 'branch-transaction-id',
              branchId: mockBranchId,
              userId: mockUserId,
              transactionType: 'UPLOAD_FEE',
              totalAmount: expectedFee,
            });

            // Should succeed when balance >= fee
            const result = await service.createBranch(mockLibraryId, mockUserId, {
              branchType: 'DERIVATIVE',
              derivativeType: 'FANFIC',
              title: 'Test Branch',
              wordCount: wordCount,
            });

            expect(result).toBeDefined();
            expect(result.branch).toBeDefined();
            expect(result.branch.branchType).toBe('DERIVATIVE');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 8: 余额刚好等于费用时成功创建
     * 边界情况：当用户余额恰好等于费用时，应该成功
     */
    it('should allow branch creation when balance equals fee exactly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate
          async (wordCount, uploadFeeRate) => {
            // 计算预期费用
            const expectedQuantity = Math.ceil(wordCount / 1000);
            const expectedFee = expectedQuantity * uploadFeeRate;

            // 余额恰好等于费用
            const userBalance = expectedFee;

            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: 'Test Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: uploadFeeRate,
            });

            // Setup mock for wallet with exact balance
            (prismaService.wallet.findUnique as jest.Mock).mockResolvedValue({
              id: mockWalletId,
              userId: mockUserId,
              balance: userBalance,
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: mockUserId,
              title: 'Test Branch',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: mockUserId,
              workId: mockBranchWorkId,
              branchType: 'DERIVATIVE',
              derivativeType: 'FANFIC',
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: mockUserId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: 'Test Branch',
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Setup mock for wallet update (deduct fee)
            (prismaService.wallet.update as jest.Mock).mockResolvedValue({
              id: mockWalletId,
              userId: mockUserId,
              balance: 0, // Balance becomes 0 after deduction
            });

            // Setup mock for wallet upsert (owner wallet)
            (prismaService.wallet as any).upsert = jest.fn().mockResolvedValue({
              id: 'owner-wallet-id',
              userId: mockOwnerId,
              balance: Math.floor(expectedFee * 0.7),
            });

            // Setup mock for transaction creation
            (prismaService.transaction.create as jest.Mock).mockResolvedValue({
              id: 'transaction-id',
              walletId: mockWalletId,
              type: 'TIP_SENT',
              amount: -expectedFee,
            });

            // Setup mock for branch transaction creation
            (prismaService.branchTransaction.create as jest.Mock).mockResolvedValue({
              id: 'branch-transaction-id',
              branchId: mockBranchId,
              userId: mockUserId,
              transactionType: 'UPLOAD_FEE',
              totalAmount: expectedFee,
            });

            // Should succeed when balance == fee
            const result = await service.createBranch(mockLibraryId, mockUserId, {
              branchType: 'DERIVATIVE',
              derivativeType: 'FANFIC',
              title: 'Test Branch',
              wordCount: wordCount,
            });

            expect(result).toBeDefined();
            expect(result.branch).toBeDefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('边界情况', () => {
    /**
     * Property 8: 边界情况 - 费用为0时不检查余额
     * 当费率为0时，不需要检查余额
     */
    it('should not check balance when fee is zero', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          async (wordCount) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library with zero fee rate
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: 'Test Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: 0, // 免费
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: mockUserId,
              title: 'Test Branch',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: mockUserId,
              workId: mockBranchWorkId,
              branchType: 'DERIVATIVE',
              derivativeType: 'FANFIC',
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: mockUserId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: 'Test Branch',
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Should succeed without checking wallet when fee is 0
            const result = await service.createBranch(mockLibraryId, mockUserId, {
              branchType: 'DERIVATIVE',
              derivativeType: 'FANFIC',
              title: 'Test Branch',
              wordCount: wordCount,
            });

            expect(result).toBeDefined();
            // Wallet should not be checked when fee is 0
            expect(prismaService.wallet.findUnique).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 8: 边界情况 - 钱包不存在时拒绝创建
     */
    it('should reject when wallet does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 100000 }), // wordCount
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate (确保有费用)
          async (wordCount, uploadFeeRate) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: 'Test Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: uploadFeeRate,
            });

            // Setup mock for wallet not found
            (prismaService.wallet.findUnique as jest.Mock).mockResolvedValue(null);

            // Should throw BadRequestException when wallet doesn't exist
            await expect(
              service.createBranch(mockLibraryId, mockUserId, {
                branchType: 'DERIVATIVE',
                derivativeType: 'FANFIC',
                title: 'Test Branch',
                wordCount: wordCount,
              }),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 8: 边界情况 - MAIN 分支不检查余额
     * MAIN 分支不收取上传费用，因此不检查余额
     */
    it('should not check balance for MAIN branch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 1000 }), // uploadFeeRate
          async (uploadFeeRate) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library (user is owner to allow MAIN branch)
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockUserId, // User is owner
              libraryType: 'ORIGINAL',
              title: 'Test Library',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: uploadFeeRate,
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: mockUserId,
              title: 'Test Branch',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: mockUserId,
              workId: mockBranchWorkId,
              branchType: 'MAIN',
              derivativeType: null,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: mockUserId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: 'Test Branch',
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Should succeed without checking wallet for MAIN branch
            const result = await service.createBranch(mockLibraryId, mockUserId, {
              branchType: 'MAIN',
              title: 'Test Branch',
            });

            expect(result).toBeDefined();
            // Wallet should not be checked for MAIN branch
            expect(prismaService.wallet.findUnique).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});


// Feature: library-branch-system, Property 9: 漫画分支同步创建作品
// **Validates: Requirements 4.3, 4.4, 8.6**

describe('Property 9: 漫画分支同步创建作品', () => {
  let service: BranchService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockLibraryId = 'library-789';
  const mockUserId = 'user-123';
  const mockOwnerId = 'owner-456';
  const mockBranchWorkId = 'branch-work-def';
  const mockBranchId = 'branch-ghi';
  const mockChapterId = 'chapter-xyz';
  const mockWalletId = 'wallet-xyz';

  beforeEach(async () => {
    const mockPrismaService = {
      library: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      libraryBranch: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      work: {
        create: jest.fn(),
      },
      chapter: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      paragraph: {
        findUnique: jest.fn(),
      },
      mangaPage: {
        createMany: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
      },
      branchTransaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const mockLibraryService = {
      getLibraryById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LibraryService, useValue: mockLibraryService },
      ],
    }).compile();

    service = module.get<BranchService>(BranchService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('漫画分支创建 Work 实体', () => {
    /**
     * Property 9: 漫画分支同步创建作品
     * 验证漫画分支创建后同步创建 Work，contentType=MANGA
     */
    it('should create Work with contentType=MANGA for manga branch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机用户ID
          fc.string({ minLength: 1, maxLength: 100 }), // 标题
          async (userId, title) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library (免费上传)
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: '原作小说',
              uploadFeeType: 'PER_PAGE',
              uploadFeeRate: 0, // 免费上传
            });

            // Setup mock for work creation - capture the data
            let createdWorkData: any = null;
            (prismaService.work.create as jest.Mock).mockImplementation(({ data }) => {
              createdWorkData = data;
              return Promise.resolve({
                id: mockBranchWorkId,
                authorId: data.authorId,
                title: data.title,
                description: data.description,
                contentType: data.contentType,
              });
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: userId,
              workId: mockBranchWorkId,
              branchType: 'MANGA',
              derivativeType: null,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: userId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: title,
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Create manga branch
            await service.createBranch(mockLibraryId, userId, {
              branchType: 'MANGA',
              title: title,
              pageCount: 10,
            });

            // Verify Work was created with contentType=MANGA
            expect(prismaService.work.create).toHaveBeenCalled();
            expect(createdWorkData).toBeDefined();
            expect(createdWorkData.contentType).toBe('MANGA');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('漫画分支 Work 描述包含原作引用', () => {
    /**
     * Property 9: 漫画分支同步创建作品
     * 验证 Work description 包含"改编自[原作名称]"
     */
    it('should include adaptation note in Work description', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机用户ID
          fc.string({ minLength: 1, maxLength: 50 }), // 原作标题
          fc.string({ minLength: 1, maxLength: 100 }), // 分支标题
          fc.option(fc.string({ minLength: 1, maxLength: 200 })), // 可选描述
          async (userId, originalTitle, branchTitle, optionalDescription) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: originalTitle, // 原作标题
              uploadFeeType: 'PER_PAGE',
              uploadFeeRate: 0, // 免费上传
            });

            // Setup mock for work creation - capture the data
            let createdWorkData: any = null;
            (prismaService.work.create as jest.Mock).mockImplementation(({ data }) => {
              createdWorkData = data;
              return Promise.resolve({
                id: mockBranchWorkId,
                authorId: data.authorId,
                title: data.title,
                description: data.description,
                contentType: data.contentType,
              });
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: userId,
              workId: mockBranchWorkId,
              branchType: 'MANGA',
              derivativeType: null,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: userId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: branchTitle,
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Create manga branch with optional description
            await service.createBranch(mockLibraryId, userId, {
              branchType: 'MANGA',
              title: branchTitle,
              description: optionalDescription ?? undefined,
              pageCount: 10,
            });

            // Verify Work description contains adaptation note
            expect(prismaService.work.create).toHaveBeenCalled();
            expect(createdWorkData).toBeDefined();
            expect(createdWorkData.description).toContain(`改编自《${originalTitle}》`);

            // If optional description was provided, it should also be included
            if (optionalDescription) {
              expect(createdWorkData.description).toContain(optionalDescription);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('漫画分支同步创建 MangaPage 实体', () => {
    /**
     * Property 9: 漫画分支同步创建作品
     * 验证提供 pageUrls 时创建 MangaPage 实体
     */
    it('should create MangaPage entities when pageUrls provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机用户ID
          fc.string({ minLength: 1, maxLength: 100 }), // 标题
          fc.array(fc.webUrl(), { minLength: 1, maxLength: 20 }), // 页面URL数组
          async (userId, title, pageUrls) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library (免费上传)
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: '原作小说',
              uploadFeeType: 'PER_PAGE',
              uploadFeeRate: 0, // 免费上传
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: userId,
              title: title,
              contentType: 'MANGA',
            });

            // Setup mock for chapter creation
            (prismaService.chapter.create as jest.Mock).mockResolvedValue({
              id: mockChapterId,
              workId: mockBranchWorkId,
              title: '第1话',
            });

            // Setup mock for MangaPage creation - capture the data
            let createdMangaPages: any = null;
            (prismaService.mangaPage.createMany as jest.Mock).mockImplementation(({ data }) => {
              createdMangaPages = data;
              return Promise.resolve({ count: data.length });
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: userId,
              workId: mockBranchWorkId,
              branchType: 'MANGA',
              derivativeType: null,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: userId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: title,
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Create manga branch with pageUrls
            await service.createBranch(mockLibraryId, userId, {
              branchType: 'MANGA',
              title: title,
              pageCount: pageUrls.length,
              pageUrls: pageUrls,
            });

            // Verify Chapter was created
            expect(prismaService.chapter.create).toHaveBeenCalled();

            // Verify MangaPage entities were created
            expect(prismaService.mangaPage.createMany).toHaveBeenCalled();
            expect(createdMangaPages).toBeDefined();
            expect(createdMangaPages.length).toBe(pageUrls.length);

            // Verify each MangaPage has correct data
            createdMangaPages.forEach((page: any, index: number) => {
              expect(page.chapterId).toBe(mockChapterId);
              expect(page.imageUrl).toBe(pageUrls[index]);
              expect(page.orderIndex).toBe(index);
            });
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 9: 边界情况 - 不提供 pageUrls 时不创建 MangaPage
     */
    it('should not create MangaPage when pageUrls not provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机用户ID
          fc.string({ minLength: 1, maxLength: 100 }), // 标题
          async (userId, title) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library (免费上传)
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: '原作小说',
              uploadFeeType: 'PER_PAGE',
              uploadFeeRate: 0, // 免费上传
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: userId,
              title: title,
              contentType: 'MANGA',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: userId,
              workId: mockBranchWorkId,
              branchType: 'MANGA',
              derivativeType: null,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: userId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: title,
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Create manga branch without pageUrls
            await service.createBranch(mockLibraryId, userId, {
              branchType: 'MANGA',
              title: title,
              pageCount: 10,
              // pageUrls not provided
            });

            // Verify Chapter was NOT created
            expect(prismaService.chapter.create).not.toHaveBeenCalled();

            // Verify MangaPage was NOT created
            expect(prismaService.mangaPage.createMany).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 9: 边界情况 - 空 pageUrls 数组时不创建 MangaPage
     * 注意：pageCount 仍需要 > 0 才能通过验证，但空 pageUrls 不会创建 MangaPage
     */
    it('should not create MangaPage when pageUrls is empty array', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机用户ID
          fc.string({ minLength: 1, maxLength: 100 }), // 标题
          fc.integer({ min: 1, max: 100 }), // pageCount 必须 > 0
          async (userId, title, pageCount) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library (免费上传)
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
              libraryType: 'SHARED',
              title: '原作小说',
              uploadFeeType: 'PER_PAGE',
              uploadFeeRate: 0, // 免费上传
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: userId,
              title: title,
              contentType: 'MANGA',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: userId,
              workId: mockBranchWorkId,
              branchType: 'MANGA',
              derivativeType: null,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: userId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: title,
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Create manga branch with empty pageUrls but valid pageCount
            await service.createBranch(mockLibraryId, userId, {
              branchType: 'MANGA',
              title: title,
              pageCount: pageCount, // 有效的 pageCount
              pageUrls: [], // Empty array
            });

            // Verify Chapter was NOT created
            expect(prismaService.chapter.create).not.toHaveBeenCalled();

            // Verify MangaPage was NOT created
            expect(prismaService.mangaPage.createMany).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('非漫画分支不创建 MangaPage', () => {
    /**
     * Property 9: 边界情况 - MAIN 和 DERIVATIVE 分支不创建 MangaPage
     */
    it('should not create MangaPage for non-MANGA branches', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机用户ID
          fc.constantFrom('MAIN', 'DERIVATIVE'), // 非漫画分支类型
          fc.string({ minLength: 1, maxLength: 100 }), // 标题
          async (userId, branchType, title) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for library (免费上传)
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: userId, // 用户是拥有者，可以创建 MAIN 分支
              libraryType: 'SHARED',
              title: '原作小说',
              uploadFeeType: 'PER_THOUSAND_WORDS',
              uploadFeeRate: 0, // 免费上传
            });

            // Setup mock for work creation
            (prismaService.work.create as jest.Mock).mockResolvedValue({
              id: mockBranchWorkId,
              authorId: userId,
              title: title,
              contentType: 'NOVEL',
            });

            // Setup mock for branch creation
            (prismaService.libraryBranch.create as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              libraryId: mockLibraryId,
              creatorId: userId,
              workId: mockBranchWorkId,
              branchType: branchType,
              derivativeType: branchType === 'DERIVATIVE' ? 'FANFIC' : null,
              forkFromChapterId: null,
              forkFromParagraphId: null,
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              hotScore: 0,
              isDeleted: false,
              createdAt: new Date(),
              updatedAt: new Date(),
              creator: {
                id: userId,
                username: 'testuser',
                displayName: 'Test User',
                avatar: null,
              },
              work: {
                id: mockBranchWorkId,
                title: title,
                description: null,
                coverImage: null,
              },
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 1,
            });

            // Create non-MANGA branch
            await service.createBranch(mockLibraryId, userId, {
              branchType: branchType as 'MAIN' | 'DERIVATIVE',
              derivativeType: branchType === 'DERIVATIVE' ? 'FANFIC' : undefined,
              title: title,
              wordCount: branchType === 'DERIVATIVE' ? 1000 : undefined,
            });

            // Verify Chapter was NOT created for manga
            expect(prismaService.chapter.create).not.toHaveBeenCalled();

            // Verify MangaPage was NOT created
            expect(prismaService.mangaPage.createMany).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});


// Feature: library-branch-system, Property 5: 软删除保留元数据
// **Validates: Requirements 2.4**

describe('Property 5: 软删除保留元数据', () => {
  let service: BranchService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockLibraryId = 'library-789';
  const mockOwnerId = 'owner-456';
  const mockBranchId = 'branch-ghi';
  const mockWorkId = 'work-abc';

  beforeEach(async () => {
    const mockPrismaService = {
      library: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      libraryBranch: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      work: {
        create: jest.fn(),
      },
      chapter: {
        findUnique: jest.fn(),
      },
      paragraph: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
    };

    const mockLibraryService = {
      getLibraryById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: LibraryService, useValue: mockLibraryService },
      ],
    }).compile();

    service = module.get<BranchService>(BranchService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('软删除后 isDeleted=true', () => {
    /**
     * Property 5: 软删除保留元数据
     * 验证删除后 isDeleted=true
     */
    it('should set isDeleted=true after soft delete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // 随机分支创作者ID
          fc.constantFrom('MAIN', 'DERIVATIVE', 'MANGA'), // 分支类型
          async (creatorId, branchType) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for branch findUnique
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              creatorId: creatorId,
              libraryId: mockLibraryId,
              isDeleted: false,
              branchType: branchType,
              library: {
                id: mockLibraryId,
                ownerId: mockOwnerId,
              },
            });

            // Capture the update data
            let updateData: any = null;
            (prismaService.libraryBranch.update as jest.Mock).mockImplementation(({ data }) => {
              updateData = data;
              return Promise.resolve({
                id: mockBranchId,
                isDeleted: true,
              });
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 0,
            });

            // Delete branch (by creator)
            await service.deleteBranch(mockBranchId, creatorId);

            // Verify isDeleted was set to true
            expect(prismaService.libraryBranch.update).toHaveBeenCalled();
            expect(updateData).toBeDefined();
            expect(updateData.isDeleted).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('软删除保留所有元数据字段', () => {
    /**
     * Property 5: 软删除保留元数据
     * 验证删除后所有其他元数据字段（creatorId, libraryId, branchType, derivativeType,
     * forkFromChapterId, forkFromParagraphId, likeCount, tipAmount, viewCount, hotScore）保持不变
     */
    it('should preserve all metadata fields after soft delete', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // creatorId
          fc.uuid(), // libraryId
          fc.constantFrom('MAIN', 'DERIVATIVE', 'MANGA'), // branchType
          fc.option(fc.constantFrom('FANFIC', 'IF_LINE', 'ADAPTATION')), // derivativeType
          fc.option(fc.uuid()), // forkFromChapterId
          fc.option(fc.uuid()), // forkFromParagraphId
          fc.integer({ min: 0, max: 10000 }), // likeCount
          fc.integer({ min: 0, max: 1000000 }), // tipAmount
          fc.integer({ min: 0, max: 1000000 }), // viewCount
          fc.float({ min: 0, max: 100000 }), // hotScore
          async (
            creatorId,
            libraryId,
            branchType,
            derivativeType,
            forkFromChapterId,
            forkFromParagraphId,
            likeCount,
            tipAmount,
            viewCount,
            hotScore,
          ) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Original branch metadata
            const originalBranch = {
              id: mockBranchId,
              creatorId: creatorId,
              libraryId: libraryId,
              workId: mockWorkId,
              branchType: branchType,
              derivativeType: derivativeType ?? null,
              forkFromChapterId: forkFromChapterId ?? null,
              forkFromParagraphId: forkFromParagraphId ?? null,
              likeCount: likeCount,
              tipAmount: tipAmount,
              viewCount: viewCount,
              hotScore: hotScore,
              isDeleted: false,
              createdAt: new Date('2024-01-01'),
              updatedAt: new Date('2024-01-01'),
              library: {
                id: libraryId,
                ownerId: creatorId, // Creator is also owner for simplicity
              },
            };

            // Setup mock for branch findUnique
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue(originalBranch);

            // Capture the update call to verify only isDeleted is changed
            let updateCall: any = null;
            (prismaService.libraryBranch.update as jest.Mock).mockImplementation((args) => {
              updateCall = args;
              return Promise.resolve({
                ...originalBranch,
                isDeleted: true,
              });
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: libraryId,
              branchCount: 0,
            });

            // Delete branch
            await service.deleteBranch(mockBranchId, creatorId);

            // Verify update was called
            expect(prismaService.libraryBranch.update).toHaveBeenCalled();
            expect(updateCall).toBeDefined();

            // Verify ONLY isDeleted is in the update data
            // This ensures other metadata fields are NOT modified
            const updateData = updateCall.data;
            expect(Object.keys(updateData)).toEqual(['isDeleted']);
            expect(updateData.isDeleted).toBe(true);

            // Verify the update does NOT include any other metadata fields
            expect(updateData.creatorId).toBeUndefined();
            expect(updateData.libraryId).toBeUndefined();
            expect(updateData.branchType).toBeUndefined();
            expect(updateData.derivativeType).toBeUndefined();
            expect(updateData.forkFromChapterId).toBeUndefined();
            expect(updateData.forkFromParagraphId).toBeUndefined();
            expect(updateData.likeCount).toBeUndefined();
            expect(updateData.tipAmount).toBeUndefined();
            expect(updateData.viewCount).toBeUndefined();
            expect(updateData.hotScore).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('权限验证', () => {
    /**
     * Property 5: 边界情况 - 分支创作者可以删除自己的分支
     */
    it('should allow branch creator to delete their branch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // creatorId
          fc.uuid(), // ownerId (different from creator)
          async (creatorId, ownerId) => {
            // 确保创作者和拥有者不同
            fc.pre(creatorId !== ownerId);

            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for branch findUnique
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              creatorId: creatorId,
              libraryId: mockLibraryId,
              isDeleted: false,
              library: {
                id: mockLibraryId,
                ownerId: ownerId, // Different from creator
              },
            });

            // Setup mock for branch update
            (prismaService.libraryBranch.update as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              isDeleted: true,
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 0,
            });

            // Creator should be able to delete their branch
            const result = await service.deleteBranch(mockBranchId, creatorId);

            expect(result).toBeDefined();
            expect(result.message).toBe('分支删除成功');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 5: 边界情况 - 库拥有者可以删除任何分支
     */
    it('should allow library owner to delete any branch', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // creatorId
          fc.uuid(), // ownerId (different from creator)
          async (creatorId, ownerId) => {
            // 确保创作者和拥有者不同
            fc.pre(creatorId !== ownerId);

            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for branch findUnique
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              creatorId: creatorId, // Different from owner
              libraryId: mockLibraryId,
              isDeleted: false,
              library: {
                id: mockLibraryId,
                ownerId: ownerId,
              },
            });

            // Setup mock for branch update
            (prismaService.libraryBranch.update as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              isDeleted: true,
            });

            // Setup mock for library update
            (prismaService.library.update as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              branchCount: 0,
            });

            // Owner should be able to delete any branch
            const result = await service.deleteBranch(mockBranchId, ownerId);

            expect(result).toBeDefined();
            expect(result.message).toBe('分支删除成功');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 5: 边界情况 - 非创作者非拥有者无法删除分支
     */
    it('should reject deletion by non-creator and non-owner', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // creatorId
          fc.uuid(), // ownerId
          fc.uuid(), // randomUserId
          async (creatorId, ownerId, randomUserId) => {
            // 确保三个用户ID都不同
            fc.pre(creatorId !== ownerId && creatorId !== randomUserId && ownerId !== randomUserId);

            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for branch findUnique
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              creatorId: creatorId,
              libraryId: mockLibraryId,
              isDeleted: false,
              library: {
                id: mockLibraryId,
                ownerId: ownerId,
              },
            });

            // Random user should not be able to delete
            await expect(
              service.deleteBranch(mockBranchId, randomUserId),
            ).rejects.toThrow(ForbiddenException);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('边界情况', () => {
    /**
     * Property 5: 边界情况 - 分支不存在时抛出 NotFoundException
     */
    it('should throw NotFoundException when branch does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // userId
          async (userId) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for branch not found
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue(null);

            // Should throw NotFoundException
            await expect(
              service.deleteBranch('non-existent-branch', userId),
            ).rejects.toThrow(NotFoundException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 5: 边界情况 - 已删除的分支再次删除时抛出 BadRequestException
     */
    it('should throw BadRequestException when branch is already deleted', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // creatorId
          async (creatorId) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for already deleted branch
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              creatorId: creatorId,
              libraryId: mockLibraryId,
              isDeleted: true, // Already deleted
              library: {
                id: mockLibraryId,
                ownerId: creatorId,
              },
            });

            // Should throw BadRequestException
            await expect(
              service.deleteBranch(mockBranchId, creatorId),
            ).rejects.toThrow(BadRequestException);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 5: 边界情况 - 删除后库的分支计数减少
     */
    it('should decrement library branch count after deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(), // creatorId
          fc.integer({ min: 1, max: 1000 }), // initialBranchCount
          async (creatorId, initialBranchCount) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();

            // Setup mock for branch findUnique
            (prismaService.libraryBranch.findUnique as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              creatorId: creatorId,
              libraryId: mockLibraryId,
              isDeleted: false,
              library: {
                id: mockLibraryId,
                ownerId: creatorId,
              },
            });

            // Setup mock for branch update
            (prismaService.libraryBranch.update as jest.Mock).mockResolvedValue({
              id: mockBranchId,
              isDeleted: true,
            });

            // Capture library update call
            let libraryUpdateCall: any = null;
            (prismaService.library.update as jest.Mock).mockImplementation((args) => {
              libraryUpdateCall = args;
              return Promise.resolve({
                id: mockLibraryId,
                branchCount: initialBranchCount - 1,
              });
            });

            // Delete branch
            await service.deleteBranch(mockBranchId, creatorId);

            // Verify library branchCount was decremented
            expect(prismaService.library.update).toHaveBeenCalled();
            expect(libraryUpdateCall).toBeDefined();
            expect(libraryUpdateCall.data.branchCount).toEqual({ decrement: 1 });
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
