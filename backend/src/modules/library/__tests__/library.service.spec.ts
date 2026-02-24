import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { LibraryService } from '../library.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { LibrarySortBy, SortOrder } from '../dto/get-libraries-query.dto.js';

/**
 * LibraryService 单元测试
 * 
 * 测试场景：
 * - 创建小说库成功场景
 * - 创建小说库缺少必填字段
 * - 更新设置时 ownerCutPercent 边界值
 * 
 * _Requirements: 1.1, 1.2_
 */
describe('LibraryService', () => {
  let service: LibraryService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let prismaService: any;

  const mockOwnerId = 'owner-123';
  const mockLibraryId = 'library-456';
  const mockWorkId = 'work-789';

  const mockOwner = {
    id: mockOwnerId,
    username: 'testuser',
    displayName: 'Test User',
    avatar: null,
  };

  const mockWork = {
    id: mockWorkId,
    authorId: mockOwnerId,
    title: 'Test Work',
  };

  const mockLibrary = {
    id: mockLibraryId,
    ownerId: mockOwnerId,
    workId: mockWorkId,
    title: 'Test Library',
    description: '这是一个测试小说库',
    coverImage: 'https://example.com/cover.jpg',
    libraryType: 'ORIGINAL',
    ownerCutPercent: 10,
    uploadFeeType: 'PER_THOUSAND_WORDS',
    uploadFeeRate: 100,
    hotScore: 0,
    branchCount: 0,
    totalTipAmount: 0,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    owner: mockOwner,
  };

  const mockPrismaService = {
    library: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    work: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LibraryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LibraryService>(LibraryService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLibrary', () => {
    describe('成功场景', () => {
      it('should create a library successfully with all fields', async () => {
        // Setup mocks
        mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
        mockPrismaService.library.findUnique.mockResolvedValue(null);
        mockPrismaService.library.create.mockResolvedValue(mockLibrary);

        const createDto = {
          workId: mockWorkId,
          title: 'Test Library',
          description: '这是一个测试小说库',
          coverImage: 'https://example.com/cover.jpg',
          libraryType: 'ORIGINAL' as const,
          ownerCutPercent: 10,
          uploadFeeType: 'PER_THOUSAND_WORDS' as const,
          uploadFeeRate: 100,
        };

        const result = await service.createLibrary(mockOwnerId, createDto);

        expect(result).toBeDefined();
        expect(result.message).toBe('小说库创建成功');
        expect(result.library).toBeDefined();
        expect(result.library.id).toBe(mockLibraryId);
        expect(result.library.title).toBe('Test Library');
        expect(result.library.description).toBe('这是一个测试小说库');
        expect(result.library.coverImage).toBe('https://example.com/cover.jpg');
        expect(result.library.libraryType).toBe('ORIGINAL');
        expect(result.library.settings.ownerCutPercent).toBe(10);
        expect(result.library.settings.uploadFeeType).toBe('PER_THOUSAND_WORDS');
        expect(result.library.settings.uploadFeeRate).toBe(100);
        expect(result.library.owner.id).toBe(mockOwnerId);
      });

      it('should create a library with minimal required fields', async () => {
        const minimalLibrary = {
          ...mockLibrary,
          description: null,
          coverImage: null,
          ownerCutPercent: 0,
          uploadFeeRate: 0,
        };

        mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
        mockPrismaService.library.findUnique.mockResolvedValue(null);
        mockPrismaService.library.create.mockResolvedValue(minimalLibrary);

        const createDto = {
          workId: mockWorkId,
          title: 'Minimal Library',
          libraryType: 'SHARED' as const,
        };

        const result = await service.createLibrary(mockOwnerId, createDto);

        expect(result).toBeDefined();
        expect(result.message).toBe('小说库创建成功');
        expect(result.library.settings.ownerCutPercent).toBe(0);
      });

      it('should create a SHARED library type', async () => {
        const sharedLibrary = {
          ...mockLibrary,
          libraryType: 'SHARED',
        };

        mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
        mockPrismaService.library.findUnique.mockResolvedValue(null);
        mockPrismaService.library.create.mockResolvedValue(sharedLibrary);

        const createDto = {
          workId: mockWorkId,
          title: 'Shared Library',
          libraryType: 'SHARED' as const,
        };

        const result = await service.createLibrary(mockOwnerId, createDto);

        expect(result.library.libraryType).toBe('SHARED');
      });

      it('should create a library with PER_PAGE upload fee type', async () => {
        const perPageLibrary = {
          ...mockLibrary,
          uploadFeeType: 'PER_PAGE',
          uploadFeeRate: 50,
        };

        mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
        mockPrismaService.library.findUnique.mockResolvedValue(null);
        mockPrismaService.library.create.mockResolvedValue(perPageLibrary);

        const createDto = {
          workId: mockWorkId,
          title: 'Manga Library',
          libraryType: 'ORIGINAL' as const,
          uploadFeeType: 'PER_PAGE' as const,
          uploadFeeRate: 50,
        };

        const result = await service.createLibrary(mockOwnerId, createDto);

        expect(result.library.settings.uploadFeeType).toBe('PER_PAGE');
        expect(result.library.settings.uploadFeeRate).toBe(50);
      });
    });

    describe('缺少必填字段', () => {
      it('should throw NotFoundException when work does not exist', async () => {
        mockPrismaService.work.findUnique.mockResolvedValue(null);

        const createDto = {
          workId: 'nonexistent-work-id',
          title: 'Test Library',
          libraryType: 'ORIGINAL' as const,
        };

        await expect(
          service.createLibrary(mockOwnerId, createDto)
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when user is not the work author', async () => {
        const otherUserWork = {
          ...mockWork,
          authorId: 'other-user-id',
        };
        mockPrismaService.work.findUnique.mockResolvedValue(otherUserWork);

        const createDto = {
          workId: mockWorkId,
          title: 'Test Library',
          libraryType: 'ORIGINAL' as const,
        };

        await expect(
          service.createLibrary(mockOwnerId, createDto)
        ).rejects.toThrow(ForbiddenException);
      });

      it('should throw BadRequestException when work already has a library', async () => {
        mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
        mockPrismaService.library.findUnique.mockResolvedValue(mockLibrary);

        const createDto = {
          workId: mockWorkId,
          title: 'Test Library',
          libraryType: 'ORIGINAL' as const,
        };

        await expect(
          service.createLibrary(mockOwnerId, createDto)
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw InternalServerErrorException on database error', async () => {
        mockPrismaService.work.findUnique.mockResolvedValue(mockWork);
        mockPrismaService.library.findUnique.mockResolvedValue(null);
        mockPrismaService.library.create.mockRejectedValue(new Error('Database error'));

        const createDto = {
          workId: mockWorkId,
          title: 'Test Library',
          libraryType: 'ORIGINAL' as const,
        };

        await expect(
          service.createLibrary(mockOwnerId, createDto)
        ).rejects.toThrow(InternalServerErrorException);
      });
    });

    describe('ownerCutPercent 验证', () => {
      it('should throw BadRequestException when ownerCutPercent is negative', async () => {
        const createDto = {
          workId: mockWorkId,
          title: 'Test Library',
          libraryType: 'ORIGINAL' as const,
          ownerCutPercent: -1,
        };

        await expect(
          service.createLibrary(mockOwnerId, createDto)
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException when ownerCutPercent exceeds 30', async () => {
        const createDto = {
          workId: mockWorkId,
          title: 'Test Library',
          libraryType: 'ORIGINAL' as const,
          ownerCutPercent: 31,
        };

        await expect(
          service.createLibrary(mockOwnerId, createDto)
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('updateLibrarySettings', () => {
    describe('ownerCutPercent 边界值测试', () => {
      it('should accept ownerCutPercent = 0 (lower boundary)', async () => {
        const updatedLibrary = {
          ...mockLibrary,
          ownerCutPercent: 0,
        };

        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });
        mockPrismaService.library.update.mockResolvedValue(updatedLibrary);

        const result = await service.updateLibrarySettings(
          mockLibraryId,
          mockOwnerId,
          { ownerCutPercent: 0 }
        );

        expect(result.library.settings.ownerCutPercent).toBe(0);
      });

      it('should accept ownerCutPercent = 30 (upper boundary)', async () => {
        const updatedLibrary = {
          ...mockLibrary,
          ownerCutPercent: 30,
        };

        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });
        mockPrismaService.library.update.mockResolvedValue(updatedLibrary);

        const result = await service.updateLibrarySettings(
          mockLibraryId,
          mockOwnerId,
          { ownerCutPercent: 30 }
        );

        expect(result.library.settings.ownerCutPercent).toBe(30);
      });

      it('should accept ownerCutPercent = 15 (middle value)', async () => {
        const updatedLibrary = {
          ...mockLibrary,
          ownerCutPercent: 15,
        };

        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });
        mockPrismaService.library.update.mockResolvedValue(updatedLibrary);

        const result = await service.updateLibrarySettings(
          mockLibraryId,
          mockOwnerId,
          { ownerCutPercent: 15 }
        );

        expect(result.library.settings.ownerCutPercent).toBe(15);
      });

      it('should reject ownerCutPercent = -1 (below lower boundary)', async () => {
        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });

        await expect(
          service.updateLibrarySettings(
            mockLibraryId,
            mockOwnerId,
            { ownerCutPercent: -1 }
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject ownerCutPercent = 31 (above upper boundary)', async () => {
        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });

        await expect(
          service.updateLibrarySettings(
            mockLibraryId,
            mockOwnerId,
            { ownerCutPercent: 31 }
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject ownerCutPercent = -100 (far below boundary)', async () => {
        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });

        await expect(
          service.updateLibrarySettings(
            mockLibraryId,
            mockOwnerId,
            { ownerCutPercent: -100 }
          )
        ).rejects.toThrow(BadRequestException);
      });

      it('should reject ownerCutPercent = 100 (far above boundary)', async () => {
        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });

        await expect(
          service.updateLibrarySettings(
            mockLibraryId,
            mockOwnerId,
            { ownerCutPercent: 100 }
          )
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('权限验证', () => {
      it('should throw NotFoundException when library does not exist', async () => {
        mockPrismaService.library.findUnique.mockResolvedValue(null);

        await expect(
          service.updateLibrarySettings(
            'nonexistent-library-id',
            mockOwnerId,
            { ownerCutPercent: 10 }
          )
        ).rejects.toThrow(NotFoundException);
      });

      it('should throw ForbiddenException when user is not the library owner', async () => {
        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: 'other-owner-id',
        });

        await expect(
          service.updateLibrarySettings(
            mockLibraryId,
            mockOwnerId,
            { ownerCutPercent: 10 }
          )
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('其他设置更新', () => {
      it('should update uploadFeeType successfully', async () => {
        const updatedLibrary = {
          ...mockLibrary,
          uploadFeeType: 'PER_PAGE',
        };

        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });
        mockPrismaService.library.update.mockResolvedValue(updatedLibrary);

        const result = await service.updateLibrarySettings(
          mockLibraryId,
          mockOwnerId,
          { uploadFeeType: 'PER_PAGE' }
        );

        expect(result.library.settings.uploadFeeType).toBe('PER_PAGE');
      });

      it('should update uploadFeeRate successfully', async () => {
        const updatedLibrary = {
          ...mockLibrary,
          uploadFeeRate: 200,
        };

        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });
        mockPrismaService.library.update.mockResolvedValue(updatedLibrary);

        const result = await service.updateLibrarySettings(
          mockLibraryId,
          mockOwnerId,
          { uploadFeeRate: 200 }
        );

        expect(result.library.settings.uploadFeeRate).toBe(200);
      });

      it('should update multiple settings at once', async () => {
        const updatedLibrary = {
          ...mockLibrary,
          ownerCutPercent: 20,
          uploadFeeType: 'PER_PAGE',
          uploadFeeRate: 150,
        };

        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });
        mockPrismaService.library.update.mockResolvedValue(updatedLibrary);

        const result = await service.updateLibrarySettings(
          mockLibraryId,
          mockOwnerId,
          {
            ownerCutPercent: 20,
            uploadFeeType: 'PER_PAGE',
            uploadFeeRate: 150,
          }
        );

        expect(result.library.settings.ownerCutPercent).toBe(20);
        expect(result.library.settings.uploadFeeType).toBe('PER_PAGE');
        expect(result.library.settings.uploadFeeRate).toBe(150);
      });

      it('should throw InternalServerErrorException on database error during update', async () => {
        mockPrismaService.library.findUnique.mockResolvedValue({
          id: mockLibraryId,
          ownerId: mockOwnerId,
        });
        mockPrismaService.library.update.mockRejectedValue(new Error('Database error'));

        await expect(
          service.updateLibrarySettings(
            mockLibraryId,
            mockOwnerId,
            { ownerCutPercent: 10 }
          )
        ).rejects.toThrow(InternalServerErrorException);
      });
    });
  });

  describe('getLibraryById', () => {
    it('should return library detail successfully', async () => {
      const libraryWithWork = {
        ...mockLibrary,
        work: {
          id: mockWorkId,
          title: 'Test Work',
          description: 'Work description',
          coverImage: 'https://example.com/work-cover.jpg',
        },
      };

      mockPrismaService.library.findUnique.mockResolvedValue(libraryWithWork);

      const result = await service.getLibraryById(mockLibraryId);

      expect(result).toBeDefined();
      expect(result.id).toBe(mockLibraryId);
      expect(result.title).toBe('Test Library');
      expect(result.work).toBeDefined();
      expect(result.work.id).toBe(mockWorkId);
    });

    it('should throw NotFoundException when library does not exist', async () => {
      mockPrismaService.library.findUnique.mockResolvedValue(null);

      await expect(
        service.getLibraryById('nonexistent-library-id')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getLibraries', () => {
    it('should return paginated list of libraries', async () => {
      const libraries = [mockLibrary];

      mockPrismaService.library.findMany.mockResolvedValue(libraries);
      mockPrismaService.library.count.mockResolvedValue(1);

      const result = await service.getLibraries({});

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by libraryType', async () => {
      mockPrismaService.library.findMany.mockResolvedValue([]);
      mockPrismaService.library.count.mockResolvedValue(0);

      await service.getLibraries({ libraryType: 'SHARED' });

      expect(mockPrismaService.library.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            libraryType: 'SHARED',
          }),
        })
      );
    });

    it('should filter by ownerId', async () => {
      mockPrismaService.library.findMany.mockResolvedValue([]);
      mockPrismaService.library.count.mockResolvedValue(0);

      await service.getLibraries({ ownerId: mockOwnerId });

      expect(mockPrismaService.library.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            ownerId: mockOwnerId,
          }),
        })
      );
    });

    it('should sort by hotScore descending', async () => {
      mockPrismaService.library.findMany.mockResolvedValue([]);
      mockPrismaService.library.count.mockResolvedValue(0);

      await service.getLibraries({ sortBy: LibrarySortBy.HOT_SCORE, sortOrder: SortOrder.DESC });

      expect(mockPrismaService.library.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { hotScore: 'desc' },
        }),
      );
    });

    it('should apply pagination correctly', async () => {
      mockPrismaService.library.findMany.mockResolvedValue([]);
      mockPrismaService.library.count.mockResolvedValue(50);

      const result = await service.getLibraries({ page: 2, limit: 10 });

      expect(mockPrismaService.library.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(5);
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPreviousPage).toBe(true);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      mockPrismaService.library.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getLibraries({})).rejects.toThrow(
        InternalServerErrorException
      );
    });
  });
});
