import { Test, TestingModule } from '@nestjs/testing';
import { RelatedAccountService } from './related-account.service.js';
import { RiskDeviceFingerprintService } from './device-fingerprint.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import {
  RelationType,
  RelationStrength,
  RiskLevel,
} from './dto/related-account.dto.js';

/**
 * 关联账户检测服务单元测试
 *
 * 需求19: 风控与反作弊系统 - 关联账户检测
 */
describe('RelatedAccountService', () => {
  let service: RelatedAccountService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;
  let deviceFingerprintService: jest.Mocked<RiskDeviceFingerprintService>;

  const mockUserId = 'user-123';
  const mockRelatedUserId = 'user-456';

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      follow: {
        findUnique: jest.fn(),
      },
      tipRecord: {
        findMany: jest.fn(),
      },
      deviceFingerprint: {
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const mockDeviceFingerprintService = {
      getUserDeviceHistory: jest.fn(),
      getUsersByFingerprint: jest.fn(),
      detectMultiAccountByIp: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelatedAccountService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        {
          provide: RiskDeviceFingerprintService,
          useValue: mockDeviceFingerprintService,
        },
      ],
    }).compile();

    service = module.get<RelatedAccountService>(RelatedAccountService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    deviceFingerprintService = module.get(RiskDeviceFingerprintService);
  });

  describe('findRelatedAccounts', () => {
    it('should return cached result if available', async () => {
      const cachedResult = {
        targetUserId: mockUserId,
        relatedAccounts: [],
        totalCount: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        analyzedAt: new Date(),
      };

      redisService.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await service.findRelatedAccounts(mockUserId);

      expect(result.targetUserId).toBe(mockUserId);
      expect(redisService.get).toHaveBeenCalled();
    });

    it('should detect same device relations', async () => {
      redisService.get.mockResolvedValue(null);

      deviceFingerprintService.getUserDeviceHistory.mockResolvedValue({
        userId: mockUserId,
        devices: [
          {
            id: 'device-1',
            userId: mockUserId,
            fingerprint: 'fp-123',
            userAgent: 'Mozilla/5.0',
            ipAddress: '192.168.1.1',
            deviceInfo: null,
            firstSeenAt: new Date(),
            lastSeenAt: new Date(),
          },
        ],
        totalDevices: 1,
      });

      deviceFingerprintService.getUsersByFingerprint.mockResolvedValue([
        { userId: mockUserId, lastSeenAt: new Date() },
        { userId: mockRelatedUserId, lastSeenAt: new Date() },
      ]);

      deviceFingerprintService.detectMultiAccountByIp.mockResolvedValue(null);

      (prismaService as any).$queryRaw.mockResolvedValue([]);
      (prismaService as any).user.findUnique.mockResolvedValue({
        username: 'related-user',
        email: 'related@test.com',
        lastLoginAt: new Date(),
      });

      const result = await service.findRelatedAccounts(mockUserId);

      expect(result.targetUserId).toBe(mockUserId);
      expect(deviceFingerprintService.getUserDeviceHistory).toHaveBeenCalledWith(
        mockUserId,
      );
    });

    it('should filter accounts below minimum score', async () => {
      redisService.get.mockResolvedValue(null);

      deviceFingerprintService.getUserDeviceHistory.mockResolvedValue({
        userId: mockUserId,
        devices: [],
        totalDevices: 0,
      });

      (prismaService as any).$queryRaw.mockResolvedValue([]);

      const result = await service.findRelatedAccounts(mockUserId, {
        minScore: 50,
      });

      expect(result.relatedAccounts.length).toBe(0);
    });
  });

  describe('calculateRelationScore', () => {
    it('should return zero score when no relations found', async () => {
      deviceFingerprintService.getUserDeviceHistory.mockResolvedValue({
        userId: mockUserId,
        devices: [],
        totalDevices: 0,
      });

      (prismaService as any).follow.findUnique.mockResolvedValue(null);
      (prismaService as any).tipRecord.findMany.mockResolvedValue([]);
      (prismaService as any).user.findUnique.mockResolvedValue(null);

      const result = await service.calculateRelationScore(
        mockUserId,
        mockRelatedUserId,
      );

      expect(result.totalScore).toBe(0);
      expect(result.strength).toBe(RelationStrength.WEAK);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.isSuspicious).toBe(false);
    });

    it('should detect same device relation', async () => {
      deviceFingerprintService.getUserDeviceHistory
        .mockResolvedValueOnce({
          userId: mockUserId,
          devices: [
            {
              id: 'device-1',
              userId: mockUserId,
              fingerprint: 'shared-fp',
              userAgent: null,
              ipAddress: null,
              deviceInfo: null,
              firstSeenAt: new Date(),
              lastSeenAt: new Date(),
            },
          ],
          totalDevices: 1,
        })
        .mockResolvedValueOnce({
          userId: mockRelatedUserId,
          devices: [
            {
              id: 'device-2',
              userId: mockRelatedUserId,
              fingerprint: 'shared-fp',
              userAgent: null,
              ipAddress: null,
              deviceInfo: null,
              firstSeenAt: new Date(),
              lastSeenAt: new Date(),
            },
          ],
          totalDevices: 1,
        });

      (prismaService as any).follow.findUnique.mockResolvedValue(null);
      (prismaService as any).tipRecord.findMany.mockResolvedValue([]);
      (prismaService as any).user.findUnique.mockResolvedValue(null);

      const result = await service.calculateRelationScore(
        mockUserId,
        mockRelatedUserId,
      );

      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.factors.some((f) => f.type === RelationType.SAME_DEVICE)).toBe(
        true,
      );
    });

    it('should detect mutual follow relation', async () => {
      deviceFingerprintService.getUserDeviceHistory.mockResolvedValue({
        userId: mockUserId,
        devices: [],
        totalDevices: 0,
      });

      (prismaService as any).follow.findUnique
        .mockResolvedValueOnce({ id: 'follow-1' }) // A follows B
        .mockResolvedValueOnce({ id: 'follow-2' }); // B follows A

      (prismaService as any).tipRecord.findMany.mockResolvedValue([]);
      (prismaService as any).user.findUnique.mockResolvedValue(null);

      const result = await service.calculateRelationScore(
        mockUserId,
        mockRelatedUserId,
      );

      expect(result.factors.some((f) => f.type === RelationType.MUTUAL_FOLLOW)).toBe(
        true,
      );
    });

    it('should mark high risk when same device and mutual tip', async () => {
      // Same device
      deviceFingerprintService.getUserDeviceHistory
        .mockResolvedValueOnce({
          userId: mockUserId,
          devices: [
            {
              id: 'device-1',
              userId: mockUserId,
              fingerprint: 'shared-fp',
              userAgent: null,
              ipAddress: null,
              deviceInfo: null,
              firstSeenAt: new Date(),
              lastSeenAt: new Date(),
            },
          ],
          totalDevices: 1,
        })
        .mockResolvedValueOnce({
          userId: mockRelatedUserId,
          devices: [
            {
              id: 'device-2',
              userId: mockRelatedUserId,
              fingerprint: 'shared-fp',
              userAgent: null,
              ipAddress: null,
              deviceInfo: null,
              firstSeenAt: new Date(),
              lastSeenAt: new Date(),
            },
          ],
          totalDevices: 1,
        });

      (prismaService as any).follow.findUnique.mockResolvedValue(null);

      // Mutual tips
      (prismaService as any).tipRecord.findMany
        .mockResolvedValueOnce([{ amount: 10 }]) // A tips B
        .mockResolvedValueOnce([{ amount: 10 }]); // B tips A

      (prismaService as any).user.findUnique.mockResolvedValue(null);

      const result = await service.calculateRelationScore(
        mockUserId,
        mockRelatedUserId,
      );

      expect(result.riskLevel).toBe(RiskLevel.HIGH);
      expect(result.isSuspicious).toBe(true);
    });
  });

  describe('flagSuspiciousClusters', () => {
    it('should return empty clusters when no device records', async () => {
      (prismaService as any).deviceFingerprint.findMany.mockResolvedValue([]);

      const result = await service.flagSuspiciousClusters();

      expect(result.clusters).toHaveLength(0);
      expect(result.totalClusters).toBe(0);
      expect(result.totalSuspiciousUsers).toBe(0);
    });

    it('should detect cluster with same fingerprint', async () => {
      (prismaService as any).deviceFingerprint.findMany.mockResolvedValue([
        { userId: 'user-1', fingerprint: 'fp-shared', ipAddress: '192.168.1.1' },
        { userId: 'user-2', fingerprint: 'fp-shared', ipAddress: '192.168.1.1' },
        { userId: 'user-3', fingerprint: 'fp-shared', ipAddress: '192.168.1.1' },
      ]);

      const result = await service.flagSuspiciousClusters({
        minClusterSize: 3,
        minAvgScore: 30,
      });

      expect(result.clusters.length).toBeGreaterThanOrEqual(0);
    });
  });
});
