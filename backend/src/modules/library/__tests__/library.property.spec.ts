// Feature: library-branch-system, Property 2: 库拥有者抽成比例验证
// **Validates: Requirements 1.2**

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LibraryService } from '../library.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

describe('Property 2: 库拥有者抽成比例验证', () => {
  let service: LibraryService;
  let prismaService: any;

  const mockOwnerId = 'owner-123';
  const mockLibraryId = 'library-456';
  const mockWorkId = 'work-789';

  beforeEach(async () => {
    const mockPrismaService = {
      library: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      work: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLibrary - ownerCutPercent validation', () => {
    /**
     * Property 2: 库拥有者抽成比例验证
     * For any ownerCutPercent 值，当值在 [0, 30] 范围内时应被接受
     */
    it('should accept ownerCutPercent in [0, 30] range', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 0, max: 30 }), async (percent) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();
          
          // Setup mocks for successful creation
          (prismaService.work.findUnique as jest.Mock).mockResolvedValue({
            id: mockWorkId,
            authorId: mockOwnerId,
            title: 'Test Work',
          });
          (prismaService.library.findUnique as jest.Mock).mockResolvedValue(null);
          (prismaService.library.create as jest.Mock).mockResolvedValue({
            id: mockLibraryId,
            ownerId: mockOwnerId,
            workId: mockWorkId,
            title: 'Test Library',
            description: null,
            coverImage: null,
            libraryType: 'ORIGINAL',
            ownerCutPercent: percent,
            uploadFeeType: 'PER_THOUSAND_WORDS',
            uploadFeeRate: 0,
            hotScore: 0,
            branchCount: 0,
            totalTipAmount: 0,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            owner: {
              id: mockOwnerId,
              username: 'testuser',
              displayName: 'Test User',
              avatar: null,
            },
          });

          // Should not throw for valid percent values
          const result = await service.createLibrary(mockOwnerId, {
            workId: mockWorkId,
            title: 'Test Library',
            libraryType: 'ORIGINAL',
            ownerCutPercent: percent,
          });

          expect(result).toBeDefined();
          expect(result.library.settings.ownerCutPercent).toBe(percent);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 2: 库拥有者抽成比例验证
     * For any ownerCutPercent 值，当值超出 [0, 30] 范围时应被拒绝并返回验证错误
     */
    it('should reject ownerCutPercent outside [0, 30] range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.integer({ min: -100, max: -1 }),
            fc.integer({ min: 31, max: 100 })
          ),
          async (percent) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();
            
            // Should throw BadRequestException for invalid percent values
            await expect(
              service.createLibrary(mockOwnerId, {
                workId: mockWorkId,
                title: 'Test Library',
                libraryType: 'ORIGINAL',
                ownerCutPercent: percent,
              })
            ).rejects.toThrow(BadRequestException);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('updateLibrarySettings - ownerCutPercent validation', () => {
    /**
     * Property 2: 库拥有者抽成比例验证
     * For any ownerCutPercent 值，当值在 [0, 30] 范围内时应被接受
     */
    it('should accept ownerCutPercent in [0, 30] range when updating settings', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 0, max: 30 }), async (percent) => {
          // Reset mocks for each iteration
          jest.clearAllMocks();
          
          // Setup mocks for successful update
          (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
            id: mockLibraryId,
            ownerId: mockOwnerId,
          });
          (prismaService.library.update as jest.Mock).mockResolvedValue({
            id: mockLibraryId,
            ownerId: mockOwnerId,
            workId: mockWorkId,
            title: 'Test Library',
            description: null,
            coverImage: null,
            libraryType: 'ORIGINAL',
            ownerCutPercent: percent,
            uploadFeeType: 'PER_THOUSAND_WORDS',
            uploadFeeRate: 0,
            hotScore: 0,
            branchCount: 0,
            totalTipAmount: 0,
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            owner: {
              id: mockOwnerId,
              username: 'testuser',
              displayName: 'Test User',
              avatar: null,
            },
          });

          // Should not throw for valid percent values
          const result = await service.updateLibrarySettings(
            mockLibraryId,
            mockOwnerId,
            { ownerCutPercent: percent }
          );

          expect(result).toBeDefined();
          expect(result.library.settings.ownerCutPercent).toBe(percent);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 2: 库拥有者抽成比例验证
     * For any ownerCutPercent 值，当值超出 [0, 30] 范围时应被拒绝并返回验证错误
     */
    it('should reject ownerCutPercent outside [0, 30] range when updating settings', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.integer({ min: -100, max: -1 }),
            fc.integer({ min: 31, max: 100 })
          ),
          async (percent) => {
            // Reset mocks for each iteration
            jest.clearAllMocks();
            
            // Setup mock for existing library
            (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
              id: mockLibraryId,
              ownerId: mockOwnerId,
            });

            // Should throw BadRequestException for invalid percent values
            await expect(
              service.updateLibrarySettings(
                mockLibraryId,
                mockOwnerId,
                { ownerCutPercent: percent }
              )
            ).rejects.toThrow(BadRequestException);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('boundary values', () => {
    /**
     * Property 2: 边界值测试
     * 验证边界值 0 和 30 被正确接受
     */
    it('should accept boundary values 0 and 30', async () => {
      const boundaryValues = [0, 30];

      for (const percent of boundaryValues) {
        // Reset mocks for each iteration
        jest.clearAllMocks();
        
        // Setup mocks
        (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });
        (prismaService.library.update as jest.Mock).mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
          workId: mockWorkId,
          title: 'Test Library',
          description: null,
          coverImage: null,
          libraryType: 'ORIGINAL',
          ownerCutPercent: percent,
          uploadFeeType: 'PER_THOUSAND_WORDS',
          uploadFeeRate: 0,
          hotScore: 0,
          branchCount: 0,
          totalTipAmount: 0,
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          owner: {
            id: mockOwnerId,
            username: 'testuser',
            displayName: 'Test User',
            avatar: null,
          },
        });

        const result = await service.updateLibrarySettings(
          mockLibraryId,
          mockOwnerId,
          { ownerCutPercent: percent }
        );

        expect(result.library.settings.ownerCutPercent).toBe(percent);
      }
    });

    /**
     * Property 2: 边界值测试
     * 验证边界外的值 -1 和 31 被正确拒绝
     */
    it('should reject values just outside boundaries (-1 and 31)', async () => {
      const invalidValues = [-1, 31];

      for (const percent of invalidValues) {
        // Reset mocks for each iteration
        jest.clearAllMocks();
        
        // Setup mock for existing library
        (prismaService.library.findUnique as jest.Mock).mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });

        await expect(
          service.updateLibrarySettings(
            mockLibraryId,
            mockOwnerId,
            { ownerCutPercent: percent }
          )
        ).rejects.toThrow(BadRequestException);
      }
    });
  });
});
