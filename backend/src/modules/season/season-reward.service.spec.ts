import { Test, TestingModule } from '@nestjs/testing';
import { SeasonRewardService } from './season-reward.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SeasonService } from './season.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UserSeasonRewardStatus, SeasonRewardType } from './dto/reward.dto.js';
import { SeasonTier, SeasonStatus } from './dto/leaderboard.dto.js';

/**
 * 赛季奖励服务单元测试
 * 需求25.1.12: 赛季奖励领取 API
 */
describe('SeasonRewardService', () => {
  let service: SeasonRewardService;
  let prismaService: any;
  let seasonService: any;

  const mockUserId = 'user-123';
  const mockSeasonId = 'season-456';
  const mockRewardId = 'reward-789';

  const mockSeason = {
    id: mockSeasonId,
    name: '第一赛季',
    description: '测试赛季',
    seasonNumber: 1,
    status: SeasonStatus.SETTLED,
    startDate: '2024-01-01T00:00:00.000Z',
    endDate: '2024-03-31T23:59:59.000Z',
    durationDays: 90,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockSeasonReward = {
    id: 'sr-001',
    seasonId: mockSeasonId,
    tier: SeasonTier.GOLD,
    rewardType: SeasonRewardType.TOKENS,
    rewardValue: { amount: 50 },
    description: '黄金段位奖励 - 50零芥子代币',
    sortOrder: 0,
    createdAt: new Date(),
  };

  const mockUserSeasonReward = {
    id: mockRewardId,
    userId: mockUserId,
    seasonId: mockSeasonId,
    rewardId: mockSeasonReward.id,
    status: UserSeasonRewardStatus.PENDING,
    claimedAt: null,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
    createdAt: new Date(),
    updatedAt: new Date(),
    seasonReward: mockSeasonReward,
  };

  beforeEach(async () => {
    prismaService = {
      userSeasonReward: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      seasonRank: {
        findUnique: jest.fn(),
      },
      seasonReward: {
        findMany: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
      },
    };

    seasonService = {
      getSeasonById: jest.fn().mockResolvedValue(mockSeason),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonRewardService,
        { provide: PrismaService, useValue: prismaService },
        { provide: SeasonService, useValue: seasonService },
      ],
    }).compile();

    service = module.get<SeasonRewardService>(SeasonRewardService);
  });

  describe('getUserRewards', () => {
    it('应该返回用户的赛季奖励列表', async () => {
      prismaService.userSeasonReward.findMany.mockResolvedValue([
        mockUserSeasonReward,
      ]);

      const result = await service.getUserRewards(mockUserId, mockSeasonId);

      expect(result.season).toEqual(mockSeason);
      expect(result.rewards).toHaveLength(1);
      expect(result.rewards[0].id).toBe(mockRewardId);
      expect(result.rewards[0].status).toBe(UserSeasonRewardStatus.PENDING);
    });

    it('应该返回空列表当用户没有奖励时', async () => {
      prismaService.userSeasonReward.findMany.mockResolvedValue([]);

      const result = await service.getUserRewards(mockUserId, mockSeasonId);

      expect(result.rewards).toHaveLength(0);
    });
  });


  describe('claimReward', () => {
    it('应该成功领取待领取的奖励', async () => {
      const mockWallet = {
        id: 'wallet-001',
        userId: mockUserId,
        balance: 100,
      };

      prismaService.userSeasonReward.findFirst.mockResolvedValue(
        mockUserSeasonReward,
      );
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet);
      prismaService.wallet.update.mockResolvedValue({
        ...mockWallet,
        balance: 150,
      });
      prismaService.transaction.create.mockResolvedValue({});
      prismaService.userSeasonReward.update.mockResolvedValue({
        ...mockUserSeasonReward,
        status: UserSeasonRewardStatus.CLAIMED,
        claimedAt: new Date(),
      });

      const result = await service.claimReward(
        mockUserId,
        mockSeasonId,
        mockRewardId,
      );

      expect(result.reward.status).toBe(UserSeasonRewardStatus.CLAIMED);
      expect(result.claimedReward.type).toBe(SeasonRewardType.TOKENS);
      expect(result.claimedReward.value).toEqual({ amount: 50 });
    });

    it('应该抛出错误当奖励不存在时', async () => {
      prismaService.userSeasonReward.findFirst.mockResolvedValue(null);

      await expect(
        service.claimReward(mockUserId, mockSeasonId, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('应该抛出错误当奖励已领取时', async () => {
      prismaService.userSeasonReward.findFirst.mockResolvedValue({
        ...mockUserSeasonReward,
        status: UserSeasonRewardStatus.CLAIMED,
      });

      await expect(
        service.claimReward(mockUserId, mockSeasonId, mockRewardId),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该抛出错误当奖励已过期时', async () => {
      prismaService.userSeasonReward.findFirst.mockResolvedValue({
        ...mockUserSeasonReward,
        status: UserSeasonRewardStatus.EXPIRED,
      });

      await expect(
        service.claimReward(mockUserId, mockSeasonId, mockRewardId),
      ).rejects.toThrow(BadRequestException);
    });

    it('应该检测并更新过期的奖励', async () => {
      const expiredReward = {
        ...mockUserSeasonReward,
        expiresAt: new Date(Date.now() - 1000), // 已过期
      };

      prismaService.userSeasonReward.findFirst.mockResolvedValue(expiredReward);
      prismaService.userSeasonReward.update.mockResolvedValue({
        ...expiredReward,
        status: UserSeasonRewardStatus.EXPIRED,
      });

      await expect(
        service.claimReward(mockUserId, mockSeasonId, mockRewardId),
      ).rejects.toThrow(BadRequestException);

      expect(prismaService.userSeasonReward.update).toHaveBeenCalledWith({
        where: { id: mockRewardId },
        data: expect.objectContaining({
          status: UserSeasonRewardStatus.EXPIRED,
        }),
      });
    });
  });

  describe('claimAllRewards', () => {
    it('应该批量领取所有待领取的奖励', async () => {
      const mockWallet = {
        id: 'wallet-001',
        userId: mockUserId,
        balance: 100,
      };

      const pendingRewards = [
        mockUserSeasonReward,
        {
          ...mockUserSeasonReward,
          id: 'reward-002',
          seasonReward: {
            ...mockSeasonReward,
            id: 'sr-002',
            rewardValue: { amount: 30 },
          },
        },
      ];

      prismaService.userSeasonReward.findMany.mockResolvedValue(pendingRewards);
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet);
      prismaService.wallet.update.mockResolvedValue(mockWallet);
      prismaService.transaction.create.mockResolvedValue({});
      prismaService.userSeasonReward.update.mockImplementation(
        ({ where }: any) => {
          const reward = pendingRewards.find((r) => r.id === where.id);
          return Promise.resolve({
            ...reward,
            status: UserSeasonRewardStatus.CLAIMED,
            claimedAt: new Date(),
          });
        },
      );

      const result = await service.claimAllRewards(mockUserId, mockSeasonId);

      expect(result.claimedRewards).toHaveLength(2);
      expect(result.failedRewards).toHaveLength(0);
      expect(result.summary.successCount).toBe(2);
      expect(result.summary.totalTokens).toBe(80); // 50 + 30
    });

    it('应该返回空结果当没有待领取奖励时', async () => {
      prismaService.userSeasonReward.findMany.mockResolvedValue([]);

      const result = await service.claimAllRewards(mockUserId, mockSeasonId);

      expect(result.claimedRewards).toHaveLength(0);
      expect(result.summary.totalRequested).toBe(0);
    });

    it('应该跳过已过期的奖励', async () => {
      const mockWallet = {
        id: 'wallet-001',
        userId: mockUserId,
        balance: 100,
      };

      const pendingRewards = [
        mockUserSeasonReward,
        {
          ...mockUserSeasonReward,
          id: 'reward-expired',
          expiresAt: new Date(Date.now() - 1000), // 已过期
        },
      ];

      prismaService.userSeasonReward.findMany.mockResolvedValue(pendingRewards);
      prismaService.wallet.findUnique.mockResolvedValue(mockWallet);
      prismaService.wallet.update.mockResolvedValue(mockWallet);
      prismaService.transaction.create.mockResolvedValue({});
      prismaService.userSeasonReward.update.mockImplementation(
        ({ where, data }: any) => {
          if (data.status === UserSeasonRewardStatus.EXPIRED) {
            return Promise.resolve({
              ...pendingRewards.find((r) => r.id === where.id),
              status: UserSeasonRewardStatus.EXPIRED,
            });
          }
          return Promise.resolve({
            ...pendingRewards.find((r) => r.id === where.id),
            status: UserSeasonRewardStatus.CLAIMED,
            claimedAt: new Date(),
          });
        },
      );

      const result = await service.claimAllRewards(mockUserId, mockSeasonId);

      expect(result.claimedRewards).toHaveLength(1);
      expect(result.failedRewards).toHaveLength(1);
      expect(result.failedRewards[0].reason).toBe('奖励已过期');
    });
  });

  describe('getUserRewardsSummary', () => {
    it('应该返回用户奖励汇总信息', async () => {
      prismaService.seasonRank.findUnique.mockResolvedValue({
        tier: SeasonTier.GOLD,
      });
      prismaService.userSeasonReward.findMany.mockResolvedValue([
        mockUserSeasonReward,
        {
          ...mockUserSeasonReward,
          id: 'reward-claimed',
          status: UserSeasonRewardStatus.CLAIMED,
        },
      ]);
      prismaService.seasonReward.findMany.mockResolvedValue([mockSeasonReward]);

      const result = await service.getUserRewardsSummary(
        mockUserId,
        mockSeasonId,
      );

      expect(result.summary.currentTier).toBe(SeasonTier.GOLD);
      expect(result.summary.pendingCount).toBe(1);
      expect(result.summary.claimedCount).toBe(1);
    });
  });
});
