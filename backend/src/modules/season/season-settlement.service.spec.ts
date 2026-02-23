import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { SeasonSettlementService, SettlementStatus } from './season-settlement.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { SeasonConfigService } from './season-config.service.js';
import { LeaderboardRealtimeService } from './leaderboard-realtime.service.js';
import { SeasonStatus, SeasonTier, LeaderboardCategory } from './dto/leaderboard.dto.js';

describe('SeasonSettlementService', () => {
  let service: SeasonSettlementService;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let leaderboardRealtimeService: LeaderboardRealtimeService;

  const mockSeason = {
    id: 'season-1',
    name: '第一赛季',
    description: '测试赛季',
    seasonNumber: 1,
    status: SeasonStatus.ENDED,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-03-31'),
    durationDays: 90,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockLeaderboardEntries = [
    { userId: 'user-1', score: 1000, rank: 1 },
    { userId: 'user-2', score: 800, rank: 2 },
    { userId: 'user-3', score: 600, rank: 3 },
  ];

  const mockUserRanks = [
    { userId: 'user-1', seasonId: 'season-1', tier: SeasonTier.KING, points: 1000 },
    { userId: 'user-2', seasonId: 'season-1', tier: SeasonTier.DIAMOND, points: 800 },
    { userId: 'user-3', seasonId: 'season-1', tier: SeasonTier.PLATINUM, points: 600 },
  ];

  beforeEach(async () => {
    const mockPrisma: Record<string, unknown> = {
      season: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      seasonLeaderboard: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      seasonRank: {
        findMany: jest.fn(),
        upsert: jest.fn(),
      },
      seasonReward: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      userSeasonReward: {
        create: jest.fn(),
      },
      $executeRaw: jest.fn(),
      $transaction: jest.fn((fn: (prisma: Record<string, unknown>) => Promise<unknown>) => fn(mockPrisma)),
    };

    const mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn().mockReturnValue({
        set: jest.fn().mockResolvedValue('OK'),
      }),
    };

    const mockSeasonConfig = {
      getTierByPoints: jest.fn().mockReturnValue(SeasonTier.GOLD),
      getTierConfig: jest.fn().mockReturnValue({
        displayName: '黄金',
        minPoints: 600,
        sortValue: 3,
      }),
    };

    const mockLeaderboardRealtime = {
      syncAllCategoriesToDatabase: jest.fn().mockResolvedValue({
        [LeaderboardCategory.READING]: 10,
        [LeaderboardCategory.CREATION]: 10,
        [LeaderboardCategory.SOCIAL]: 10,
        [LeaderboardCategory.OVERALL]: 10,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonSettlementService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: SeasonConfigService, useValue: mockSeasonConfig },
        { provide: LeaderboardRealtimeService, useValue: mockLeaderboardRealtime },
      ],
    }).compile();

    service = module.get<SeasonSettlementService>(SeasonSettlementService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    leaderboardRealtimeService = module.get(LeaderboardRealtimeService);
  });

  describe('getSettlementStatus', () => {
    it('should return NOT_STARTED when no status exists', async () => {
      (redisService.get as jest.Mock).mockResolvedValue(null);

      const result = await service.getSettlementStatus('season-1');

      expect(result.status).toBe(SettlementStatus.NOT_STARTED);
      expect(result.progress).toBe(0);
    });

    it('should return cached status when exists', async () => {
      const cachedStatus = {
        seasonId: 'season-1',
        status: SettlementStatus.IN_PROGRESS,
        currentStep: '正在处理...',
        totalUsers: 100,
        processedUsers: 50,
        progress: 50,
        startedAt: new Date().toISOString(),
      };
      (redisService.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedStatus));

      const result = await service.getSettlementStatus('season-1');

      expect(result.status).toBe(SettlementStatus.IN_PROGRESS);
      expect(result.progress).toBe(50);
    });
  });

  describe('validateSeasonForSettlement', () => {
    it('should throw NotFoundException when season does not exist', async () => {
      (prismaService as any).season.findUnique.mockResolvedValue(null);

      await expect(
        service.settleSeasonAsync('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when season is already settled', async () => {
      (prismaService as any).season.findUnique.mockResolvedValue({
        ...mockSeason,
        status: SeasonStatus.SETTLED,
      });
      (redisService.getClient as jest.Mock)().set.mockResolvedValue('OK');

      await expect(
        service.settleSeasonAsync('season-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when season is still active and not ended', async () => {
      const futureEndDate = new Date();
      futureEndDate.setDate(futureEndDate.getDate() + 30);
      
      (prismaService as any).season.findUnique.mockResolvedValue({
        ...mockSeason,
        status: SeasonStatus.ACTIVE,
        endDate: futureEndDate,
      });
      (redisService.getClient as jest.Mock)().set.mockResolvedValue('OK');

      await expect(
        service.settleSeasonAsync('season-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('finalizeRankings', () => {
    it('should sync rankings from Redis to database', async () => {
      (prismaService as any).season.findUnique.mockResolvedValue(mockSeason);
      (prismaService as any).seasonLeaderboard.count.mockResolvedValue(100);
      (prismaService.$executeRaw as jest.Mock).mockResolvedValue(undefined);

      const result = await service.finalizeRankings('season-1');

      expect(leaderboardRealtimeService.syncAllCategoriesToDatabase).toHaveBeenCalledWith('season-1');
      expect(result.totalUsers).toBe(100);
    });
  });

  describe('determineUserTiers', () => {
    it('should determine tiers based on rank and points', async () => {
      (prismaService as any).season.findUnique.mockResolvedValue(mockSeason);
      (prismaService as any).seasonLeaderboard.findMany.mockResolvedValue(mockLeaderboardEntries);
      (prismaService as any).seasonRank.upsert.mockResolvedValue({});

      await service.determineUserTiers('season-1');

      // Top 1 should be KING
      expect((prismaService as any).seasonRank.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_seasonId: { userId: 'user-1', seasonId: 'season-1' } },
          update: expect.objectContaining({ tier: SeasonTier.KING }),
        }),
      );
    });
  });

  describe('distributeRewards', () => {
    it('should create reward records for eligible users', async () => {
      (prismaService as any).season.findUnique.mockResolvedValue(mockSeason);
      (prismaService as any).seasonReward.findMany.mockResolvedValue([
        { id: 'reward-1', tier: SeasonTier.KING, rewardType: 'TOKENS', rewardValue: { amount: 1000 } },
      ]);
      (prismaService as any).seasonRank.findMany.mockResolvedValue(mockUserRanks);
      (prismaService as any).seasonLeaderboard.findMany.mockResolvedValue(mockLeaderboardEntries);
      (prismaService as any).userSeasonReward.create.mockResolvedValue({});

      await service.distributeRewards('season-1');

      expect((prismaService as any).userSeasonReward.create).toHaveBeenCalled();
    });
  });
});
