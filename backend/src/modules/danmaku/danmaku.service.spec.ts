import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DanmakuService } from './danmaku.service';
import { SensitiveWordService } from './sensitive-word.service';
import { PrismaService } from '../../prisma/prisma.service';

// 定义 DanmakuType 枚举（与 Prisma 生成的一致）
enum DanmakuType {
  SCROLL = 'SCROLL',
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
}

describe('DanmakuService', () => {
  let service: DanmakuService;
  let prismaService: PrismaService;
  let sensitiveWordService: SensitiveWordService;

  const mockPrismaService = {
    paragraph: {
      findUnique: jest.fn(),
    },
    danmaku: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockSensitiveWordService = {
    containsSensitiveWord: jest.fn(),
    findSensitiveWords: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DanmakuService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SensitiveWordService, useValue: mockSensitiveWordService },
      ],
    }).compile();

    service = module.get<DanmakuService>(DanmakuService);
    prismaService = module.get<PrismaService>(PrismaService);
    sensitiveWordService =
      module.get<SensitiveWordService>(SensitiveWordService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-123';
    const createDto = {
      anchorId: 'work-1:chapter-1:0',
      content: '这是一条弹幕',
      color: '#FF0000',
      type: DanmakuType.SCROLL,
    };

    it('should create a danmaku successfully', async () => {
      mockSensitiveWordService.containsSensitiveWord.mockReturnValue(false);
      mockPrismaService.paragraph.findUnique.mockResolvedValue({
        id: 'para-1',
      });
      mockPrismaService.danmaku.create.mockResolvedValue({
        id: 'danmaku-1',
        ...createDto,
        authorId: userId,
        fontSize: 24,
        likeCount: 0,
        isDeleted: false,
        createdAt: new Date(),
        author: { id: userId, displayName: 'Test User', username: 'testuser' },
      });

      const result = await service.create(userId, createDto);

      expect(result).toBeDefined();
      expect(result.id).toBe('danmaku-1');
      expect(result.content).toBe(createDto.content);
      expect(mockPrismaService.danmaku.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for sensitive content', async () => {
      mockSensitiveWordService.containsSensitiveWord.mockReturnValue(true);
      mockSensitiveWordService.findSensitiveWords.mockReturnValue(['违禁词']);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException for non-existent paragraph', async () => {
      mockSensitiveWordService.containsSensitiveWord.mockReturnValue(false);
      mockPrismaService.paragraph.findUnique.mockResolvedValue(null);

      await expect(service.create(userId, createDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAnchorId', () => {
    const anchorId = 'work-1:chapter-1:0';

    it('should return danmaku list for anchor', async () => {
      const mockDanmakus = [
        {
          id: 'danmaku-1',
          anchorId,
          content: '弹幕1',
          author: { id: 'user-1', displayName: 'User 1' },
        },
        {
          id: 'danmaku-2',
          anchorId,
          content: '弹幕2',
          author: { id: 'user-2', displayName: 'User 2' },
        },
      ];

      mockPrismaService.danmaku.findMany.mockResolvedValue(mockDanmakus);
      mockPrismaService.danmaku.count.mockResolvedValue(2);

      const result = await service.findByAnchorId(anchorId);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.anchorId).toBe(anchorId);
    });
  });

  describe('delete', () => {
    const userId = 'user-123';
    const danmakuId = 'danmaku-1';

    it('should delete own danmaku successfully', async () => {
      mockPrismaService.danmaku.findUnique.mockResolvedValue({
        id: danmakuId,
        authorId: userId,
      });
      mockPrismaService.danmaku.update.mockResolvedValue({});

      await expect(service.delete(userId, danmakuId)).resolves.not.toThrow();
      expect(mockPrismaService.danmaku.update).toHaveBeenCalledWith({
        where: { id: danmakuId },
        data: { isDeleted: true },
      });
    });

    it('should throw NotFoundException for non-existent danmaku', async () => {
      mockPrismaService.danmaku.findUnique.mockResolvedValue(null);

      await expect(service.delete(userId, danmakuId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when deleting others danmaku', async () => {
      mockPrismaService.danmaku.findUnique.mockResolvedValue({
        id: danmakuId,
        authorId: 'other-user',
      });

      await expect(service.delete(userId, danmakuId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
