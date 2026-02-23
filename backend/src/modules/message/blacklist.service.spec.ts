import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BlacklistService } from './blacklist.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('BlacklistService', () => {
  let service: BlacklistService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    userBlacklist: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlacklistService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BlacklistService>(BlacklistService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isBlocked', () => {
    it('should return true if user is blocked', async () => {
      mockPrismaService.userBlacklist.findUnique.mockResolvedValue({
        id: 'blacklist-1',
        userId: 'user-1',
        blockedUserId: 'user-2',
      });

      const result = await service.isBlocked('user-1', 'user-2');

      expect(result).toBe(true);
      expect(mockPrismaService.userBlacklist.findUnique).toHaveBeenCalledWith({
        where: {
          userId_blockedUserId: {
            userId: 'user-1',
            blockedUserId: 'user-2',
          },
        },
      });
    });

    it('should return false if user is not blocked', async () => {
      mockPrismaService.userBlacklist.findUnique.mockResolvedValue(null);

      const result = await service.isBlocked('user-1', 'user-2');

      expect(result).toBe(false);
    });
  });

  describe('isBlockedBidirectional', () => {
    it('should return blocked by self when user1 blocked user2', async () => {
      mockPrismaService.userBlacklist.findUnique.mockResolvedValueOnce({
        id: 'blacklist-1',
        userId: 'user-1',
        blockedUserId: 'user-2',
      });

      const result = await service.isBlockedBidirectional('user-1', 'user-2');

      expect(result).toEqual({
        isBlocked: true,
        blockedBy: 'self',
        message: '无法发送消息，您已将对方拉黑',
      });
    });

    it('should return blocked by target when user2 blocked user1', async () => {
      // First call returns null (user1 didn't block user2)
      // Second call returns the block record (user2 blocked user1)
      mockPrismaService.userBlacklist.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'blacklist-2',
          userId: 'user-2',
          blockedUserId: 'user-1',
        });

      const result = await service.isBlockedBidirectional('user-1', 'user-2');

      expect(result).toEqual({
        isBlocked: true,
        blockedBy: 'target',
        message: '无法发送消息，您已被对方拉黑',
      });
    });

    it('should return not blocked when no blacklist exists', async () => {
      // Both calls return null
      mockPrismaService.userBlacklist.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.isBlockedBidirectional('user-1', 'user-2');

      expect(result).toEqual({
        isBlocked: false,
        blockedBy: null,
        message: null,
      });
    });
  });

  describe('blockUser', () => {
    const mockTargetUser = {
      id: 'user-2',
      username: 'targetuser',
      displayName: 'Target User',
      avatar: 'avatar.jpg',
      isActive: true,
    };

    it('should block a user successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTargetUser);
      mockPrismaService.userBlacklist.findUnique.mockResolvedValue(null);
      mockPrismaService.userBlacklist.create.mockResolvedValue({
        id: 'blacklist-1',
        userId: 'user-1',
        blockedUserId: 'user-2',
        reason: 'spam',
        createdAt: new Date(),
      });

      const result = await service.blockUser('user-1', 'user-2', 'spam');

      expect(result).toMatchObject({
        id: 'blacklist-1',
        blockedUserId: 'user-2',
        reason: 'spam',
      });
      expect(mockPrismaService.userBlacklist.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          blockedUserId: 'user-2',
          reason: 'spam',
        },
      });
    });

    it('should throw BadRequestException when blocking self', async () => {
      await expect(service.blockUser('user-1', 'user-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.blockUser('user-1', 'user-1')).rejects.toThrow(
        '不能拉黑自己',
      );
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.blockUser('user-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.blockUser('user-1', 'user-2')).rejects.toThrow(
        '用户不存在',
      );
    });

    it('should throw BadRequestException when target user is inactive', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockTargetUser,
        isActive: false,
      });

      await expect(service.blockUser('user-1', 'user-2')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.blockUser('user-1', 'user-2')).rejects.toThrow(
        '该用户已被禁用',
      );
    });

    it('should throw ConflictException when user is already blocked', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockTargetUser);
      mockPrismaService.userBlacklist.findUnique.mockResolvedValue({
        id: 'existing-blacklist',
      });

      await expect(service.blockUser('user-1', 'user-2')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('unblockUser', () => {
    it('should unblock a user successfully', async () => {
      mockPrismaService.userBlacklist.findUnique.mockResolvedValue({
        id: 'blacklist-1',
        userId: 'user-1',
        blockedUserId: 'user-2',
      });
      mockPrismaService.userBlacklist.delete.mockResolvedValue({});

      await expect(
        service.unblockUser('user-1', 'user-2'),
      ).resolves.not.toThrow();

      expect(mockPrismaService.userBlacklist.delete).toHaveBeenCalledWith({
        where: {
          userId_blockedUserId: {
            userId: 'user-1',
            blockedUserId: 'user-2',
          },
        },
      });
    });

    it('should throw NotFoundException when blacklist entry does not exist', async () => {
      mockPrismaService.userBlacklist.findUnique.mockResolvedValue(null);

      await expect(service.unblockUser('user-1', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.unblockUser('user-1', 'user-2')).rejects.toThrow(
        '您没有拉黑该用户',
      );
    });
  });

  describe('getBlockedUsers', () => {
    it('should return paginated list of blocked users', async () => {
      const mockBlockedUsers = [
        {
          id: 'blacklist-1',
          userId: 'user-1',
          blockedUserId: 'user-2',
          reason: 'spam',
          createdAt: new Date(),
          blockedUser: {
            id: 'user-2',
            username: 'blockeduser',
            displayName: 'Blocked User',
            avatar: 'avatar.jpg',
          },
        },
      ];

      mockPrismaService.userBlacklist.count.mockResolvedValue(1);
      mockPrismaService.userBlacklist.findMany.mockResolvedValue(
        mockBlockedUsers,
      );

      const result = await service.getBlockedUsers('user-1', 1, 20);

      expect(result).toMatchObject({
        total: 1,
        page: 1,
        limit: 20,
        hasMore: false,
      });
      expect(result.users).toHaveLength(1);
      expect(result.users[0].blockedUserId).toBe('user-2');
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.userBlacklist.count.mockResolvedValue(25);
      mockPrismaService.userBlacklist.findMany.mockResolvedValue(
        Array(20).fill({
          id: 'blacklist-1',
          userId: 'user-1',
          blockedUserId: 'user-2',
          reason: null,
          createdAt: new Date(),
          blockedUser: {
            id: 'user-2',
            username: 'blockeduser',
            displayName: null,
            avatar: null,
          },
        }),
      );

      const result = await service.getBlockedUsers('user-1', 1, 20);

      expect(result.hasMore).toBe(true);
      expect(result.total).toBe(25);
    });
  });

  describe('checkIsBlocked', () => {
    it('should return isBlocked true when user is blocked', async () => {
      mockPrismaService.userBlacklist.findUnique.mockResolvedValue({
        id: 'blacklist-1',
      });

      const result = await service.checkIsBlocked('user-1', 'user-2');

      expect(result).toEqual({ isBlocked: true });
    });

    it('should return isBlocked false when user is not blocked', async () => {
      mockPrismaService.userBlacklist.findUnique.mockResolvedValue(null);

      const result = await service.checkIsBlocked('user-1', 'user-2');

      expect(result).toEqual({ isBlocked: false });
    });
  });
});
