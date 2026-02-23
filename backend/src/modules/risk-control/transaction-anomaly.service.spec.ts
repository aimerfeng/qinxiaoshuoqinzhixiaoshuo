import { Test, TestingModule } from '@nestjs/testing';
import { TransactionAnomalyService } from './transaction-anomaly.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { RiskLevel } from './dto/related-account.dto.js';
import { AnomalyType } from './dto/transaction-anomaly.dto.js';

describe('TransactionAnomalyService', () => {
  let service: TransactionAnomalyService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  // Mock data
  const mockUserId = 'user-123';
  const mockNewUserId = 'new-user-456';
  const mockOldDate = new Date('2024-01-01');
  const mockRecentDate = new Date();

  beforeEach(async () => {
    const mockPrismaService = {
      tipRecord: {
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionAnomalyService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<TransactionAnomalyService>(TransactionAnomalyService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectAnomalies', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        userId: mockUserId,
        anomalies: [],
        totalAnomalies: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        overallRiskLevel: RiskLevel.LOW,
        analyzedAt: new Date(),
      };

      redisService.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.detectAnomalies(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(redisService.get).toHaveBeenCalled();
    });

    it('should detect anomalies for user with no transactions', async () => {
      redisService.get.mockResolvedValue(null);
      (prismaService as any).user.findUnique.mockResolvedValue({
        createdAt: mockOldDate,
      });
      (prismaService as any).tipRecord.findMany.mockResolvedValue([]);

      const result = await service.detectAnomalies(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.totalAnomalies).toBe(0);
      expect(result.overallRiskLevel).toBe(RiskLevel.LOW);
    });

    it('should cache the result after analysis', async () => {
      redisService.get.mockResolvedValue(null);
      (prismaService as any).user.findUnique.mockResolvedValue({
        createdAt: mockOldDate,
      });
      (prismaService as any).tipRecord.findMany.mockResolvedValue([]);

      await service.detectAnomalies(mockUserId);

      expect(redisService.set).toHaveBeenCalled();
    });
  });

  describe('detectConcentratedReceipts', () => {
    it('should detect concentrated receipts for new account', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 3); // 3 days ago

      (prismaService as any).user.findUnique.mockResolvedValue({
        createdAt: recentDate,
      });

      // Mock 15 tips from 8 different senders
      const mockTips = Array.from({ length: 15 }, (_, i) => ({
        id: `tip-${i}`,
        fromUserId: `sender-${i % 8}`,
        amount: 10,
      }));

      (prismaService as any).tipRecord.findMany.mockResolvedValue(mockTips);

      const result = await service.detectConcentratedReceipts(mockNewUserId);

      expect(result.isNewAccount).toBe(true);
      expect(result.isSuspicious).toBe(true);
      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.transactionCount).toBe(15);
      expect(result.uniqueSenders).toBe(8);
    });

    it('should not flag old account with many receipts', async () => {
      (prismaService as any).user.findUnique.mockResolvedValue({
        createdAt: mockOldDate,
      });

      const mockTips = Array.from({ length: 20 }, (_, i) => ({
        id: `tip-${i}`,
        fromUserId: `sender-${i % 10}`,
        amount: 10,
      }));

      (prismaService as any).tipRecord.findMany.mockResolvedValue(mockTips);

      const result = await service.detectConcentratedReceipts(mockUserId);

      expect(result.isNewAccount).toBe(false);
      expect(result.isSuspicious).toBe(false);
    });

    it('should return empty result for non-existent user', async () => {
      (prismaService as any).user.findUnique.mockResolvedValue(null);

      const result = await service.detectConcentratedReceipts('non-existent');

      expect(result.isSuspicious).toBe(false);
      expect(result.transactionCount).toBe(0);
    });
  });


  describe('detectCircularTransfers', () => {
    it('should detect circular transfer pattern', async () => {
      // Create a circular pattern: A -> B -> C -> A with same amount
      // Need multiple transactions to meet the minimum threshold
      const mockTips = [
        { id: 'tip-1', fromUserId: 'user-A', toUserId: 'user-B', amount: 50, createdAt: new Date() },
        { id: 'tip-2', fromUserId: 'user-B', toUserId: 'user-C', amount: 50, createdAt: new Date() },
        { id: 'tip-3', fromUserId: 'user-C', toUserId: 'user-A', amount: 50, createdAt: new Date() },
        { id: 'tip-4', fromUserId: 'user-A', toUserId: 'user-B', amount: 50, createdAt: new Date() },
        { id: 'tip-5', fromUserId: 'user-B', toUserId: 'user-C', amount: 50, createdAt: new Date() },
        { id: 'tip-6', fromUserId: 'user-C', toUserId: 'user-A', amount: 50, createdAt: new Date() },
      ];

      (prismaService as any).tipRecord.findMany.mockResolvedValue(mockTips);

      const result = await service.detectCircularTransfers();

      expect(result.detected).toBe(true);
      expect(result.totalCycles).toBeGreaterThan(0);
    });

    it('should not detect circular pattern when amounts differ', async () => {
      const mockTips = [
        { id: 'tip-1', fromUserId: 'user-A', toUserId: 'user-B', amount: 50, createdAt: new Date() },
        { id: 'tip-2', fromUserId: 'user-B', toUserId: 'user-C', amount: 30, createdAt: new Date() },
        { id: 'tip-3', fromUserId: 'user-C', toUserId: 'user-A', amount: 20, createdAt: new Date() },
      ];

      (prismaService as any).tipRecord.findMany.mockResolvedValue(mockTips);

      const result = await service.detectCircularTransfers();

      // Different amounts should not form a cycle
      expect(result.cycles.length).toBe(0);
    });

    it('should return empty result when no transactions', async () => {
      (prismaService as any).tipRecord.findMany.mockResolvedValue([]);

      const result = await service.detectCircularTransfers();

      expect(result.detected).toBe(false);
      expect(result.totalCycles).toBe(0);
    });
  });

  describe('analyzeTransactionPattern', () => {
    it('should analyze transaction pattern correctly', async () => {
      const mockSentTips = [
        { id: 'tip-1', toUserId: 'user-B', amount: 20, createdAt: new Date() },
        { id: 'tip-2', toUserId: 'user-C', amount: 30, createdAt: new Date() },
      ];

      const mockReceivedTips = [
        { id: 'tip-3', fromUserId: 'user-D', amount: 50, createdAt: new Date() },
      ];

      (prismaService as any).tipRecord.findMany
        .mockResolvedValueOnce(mockSentTips)
        .mockResolvedValueOnce(mockReceivedTips);

      const result = await service.analyzeTransactionPattern(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.pattern.totalTransactions).toBe(3);
      expect(result.pattern.totalSent).toBe(50);
      expect(result.pattern.totalReceived).toBe(50);
      expect(result.pattern.uniqueRecipients).toBe(2);
      expect(result.pattern.uniqueSenders).toBe(1);
    });

    it('should detect high frequency anomaly', async () => {
      // Create many transactions to trigger high frequency detection
      const mockSentTips = Array.from({ length: 50 }, (_, i) => ({
        id: `tip-${i}`,
        toUserId: `user-${i % 5}`,
        amount: 5,
        createdAt: new Date(),
      }));

      (prismaService as any).tipRecord.findMany
        .mockResolvedValueOnce(mockSentTips)
        .mockResolvedValueOnce([]);

      const result = await service.analyzeTransactionPattern(mockUserId, {
        daysToAnalyze: 3,
      });

      expect(result.pattern.transactionFrequency).toBeGreaterThan(10);
      expect(result.anomalies.length).toBeGreaterThan(0);
    });

    it('should return empty pattern for user with no transactions', async () => {
      (prismaService as any).tipRecord.findMany.mockResolvedValue([]);

      const result = await service.analyzeTransactionPattern(mockUserId);

      expect(result.pattern.totalTransactions).toBe(0);
      expect(result.riskScore).toBe(0);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
    });
  });

  describe('flagSuspiciousTransactions', () => {
    it('should flag transactions with unusual hours', async () => {
      // Create transaction at 3 AM
      const unusualHourDate = new Date();
      unusualHourDate.setHours(3, 0, 0, 0);

      const mockTips = [
        {
          id: 'tip-1',
          fromUserId: 'user-A',
          toUserId: 'user-B',
          amount: 50,
          createdAt: unusualHourDate,
        },
      ];

      (prismaService as any).tipRecord.findMany.mockResolvedValue(mockTips);

      const result = await service.flagSuspiciousTransactions({
        minRiskScore: 10,
      });

      // Should flag the unusual hour transaction
      const flaggedTx = result.transactions.find((t) =>
        t.anomalyTypes.includes(AnomalyType.UNUSUAL_HOURS),
      );
      expect(flaggedTx).toBeDefined();
    });

    it('should flag high frequency transactions between same users', async () => {
      // Create 10 transactions between same users
      const mockTips = Array.from({ length: 10 }, (_, i) => ({
        id: `tip-${i}`,
        fromUserId: 'user-A',
        toUserId: 'user-B',
        amount: 10,
        createdAt: new Date(),
      }));

      (prismaService as any).tipRecord.findMany.mockResolvedValue(mockTips);

      const result = await service.flagSuspiciousTransactions({
        minRiskScore: 20,
      });

      // Should flag one-way high frequency
      const flaggedTx = result.transactions.find((t) =>
        t.anomalyTypes.includes(AnomalyType.ONE_WAY_HIGH_FREQUENCY),
      );
      expect(flaggedTx).toBeDefined();
    });

    it('should return empty result when no suspicious transactions', async () => {
      const mockTips = [
        {
          id: 'tip-1',
          fromUserId: 'user-A',
          toUserId: 'user-B',
          amount: 100,
          createdAt: new Date(),
        },
      ];

      (prismaService as any).tipRecord.findMany.mockResolvedValue(mockTips);

      const result = await service.flagSuspiciousTransactions({
        minRiskScore: 100, // Very high threshold
      });

      expect(result.totalFlagged).toBe(0);
    });

    it('should sort flagged transactions by risk score', async () => {
      // Create transactions with different risk levels
      const normalDate = new Date();
      normalDate.setHours(14, 0, 0, 0);

      const unusualDate = new Date();
      unusualDate.setHours(3, 0, 0, 0);

      const mockTips = [
        // Normal transaction
        { id: 'tip-1', fromUserId: 'user-A', toUserId: 'user-B', amount: 100, createdAt: normalDate },
        // Unusual hour + small amount
        { id: 'tip-2', fromUserId: 'user-C', toUserId: 'user-D', amount: 5, createdAt: unusualDate },
      ];

      (prismaService as any).tipRecord.findMany.mockResolvedValue(mockTips);

      const result = await service.flagSuspiciousTransactions({
        minRiskScore: 10,
      });

      if (result.transactions.length >= 2) {
        // Higher risk should come first
        expect(result.transactions[0].riskScore).toBeGreaterThanOrEqual(
          result.transactions[1].riskScore,
        );
      }
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully in detectAnomalies', async () => {
      redisService.get.mockResolvedValue(null);
      (prismaService as any).user.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.detectAnomalies(mockUserId);

      // Should return a valid result even on error
      expect(result.userId).toBe(mockUserId);
      expect(result.anomalies).toBeDefined();
    });

    it('should handle database errors gracefully in detectCircularTransfers', async () => {
      (prismaService as any).tipRecord.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.detectCircularTransfers();

      expect(result.detected).toBe(false);
      expect(result.cycles).toEqual([]);
    });

    it('should handle database errors gracefully in flagSuspiciousTransactions', async () => {
      (prismaService as any).tipRecord.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.flagSuspiciousTransactions();

      expect(result.totalFlagged).toBe(0);
      expect(result.transactions).toEqual([]);
    });
  });
});
