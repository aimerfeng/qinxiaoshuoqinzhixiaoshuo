import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { PunishmentService } from './punishment.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { RiskAlertService } from './risk-alert.service.js';
import {
  PunishmentType,
  PunishmentStatus,
  PUNISHMENT_TYPE_DEFAULTS,
} from './dto/punishment.dto.js';
import { AlertStatus } from './dto/risk-alert.dto.js';

describe('PunishmentService', () => {
  let service: PunishmentService;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let riskAlertService: RiskAlertService;

  const mockPrismaService = {
    userPunishment: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockRiskAlertService = {
    getAlertById: jest.fn(),
    updateAlertStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PunishmentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: RiskAlertService, useValue: mockRiskAlertService },
      ],
    }).compile();

    service = module.get<PunishmentService>(PunishmentService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
    riskAlertService = module.get<RiskAlertService>(RiskAlertService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('createPunishment', () => {
    const mockUserId = 'user-123';
    const mockAdminId = 'admin-456';

    it('should create a warning punishment', async () => {
      const mockPunishment = {
        id: 'punishment-1',
        userId: mockUserId,
        type: PunishmentType.WARNING,
        status: PunishmentStatus.ACTIVE,
        reason: 'Test warning',
        isPermanent: false,
        expiresAt: null,
        createdBy: mockAdminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.userPunishment.create.mockResolvedValue(mockPunishment);

      const result = await service.createPunishment({
        userId: mockUserId,
        type: PunishmentType.WARNING,
        reason: 'Test warning',
        createdBy: mockAdminId,
      });

      expect(result.id).toBe('punishment-1');
      expect(result.type).toBe(PunishmentType.WARNING);
      expect(result.status).toBe(PunishmentStatus.ACTIVE);
      expect(mockPrismaService.userPunishment.create).toHaveBeenCalled();
      expect(mockRedisService.del).toHaveBeenCalled();
    });

    it('should create a mute punishment with duration', async () => {
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      const mockPunishment = {
        id: 'punishment-2',
        userId: mockUserId,
        type: PunishmentType.MUTE,
        status: PunishmentStatus.ACTIVE,
        reason: 'Spam behavior',
        isPermanent: false,
        expiresAt,
        createdBy: mockAdminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.userPunishment.create.mockResolvedValue(mockPunishment);

      const result = await service.createPunishment({
        userId: mockUserId,
        type: PunishmentType.MUTE,
        reason: 'Spam behavior',
        durationMinutes: 60,
        createdBy: mockAdminId,
      });

      expect(result.type).toBe(PunishmentType.MUTE);
      expect(result.isPermanent).toBe(false);
      expect(result.expiresAt).toBeDefined();
    });

    it('should create a permanent ban', async () => {
      const mockPunishment = {
        id: 'punishment-3',
        userId: mockUserId,
        type: PunishmentType.ACCOUNT_BAN,
        status: PunishmentStatus.ACTIVE,
        reason: 'Severe violation',
        isPermanent: true,
        expiresAt: null,
        createdBy: mockAdminId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.userPunishment.create.mockResolvedValue(mockPunishment);

      const result = await service.createPunishment({
        userId: mockUserId,
        type: PunishmentType.ACCOUNT_BAN,
        reason: 'Severe violation',
        createdBy: mockAdminId,
      });

      expect(result.type).toBe(PunishmentType.ACCOUNT_BAN);
      expect(result.isPermanent).toBe(true);
    });
  });

  describe('getPunishments', () => {
    const mockUserId = 'user-123';

    it('should return user punishments with pagination', async () => {
      const mockPunishments = [
        {
          id: 'p1',
          userId: mockUserId,
          type: PunishmentType.WARNING,
          status: PunishmentStatus.ACTIVE,
          reason: 'Warning 1',
          isPermanent: false,
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'p2',
          userId: mockUserId,
          type: PunishmentType.MUTE,
          status: PunishmentStatus.EXPIRED,
          reason: 'Mute 1',
          isPermanent: false,
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.userPunishment.findMany.mockResolvedValue(mockPunishments);
      mockPrismaService.userPunishment.count.mockResolvedValue(2);

      const result = await service.getPunishments(mockUserId, { limit: 10, offset: 0 });

      expect(result.punishments).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('should filter by type', async () => {
      mockPrismaService.userPunishment.findMany.mockResolvedValue([]);
      mockPrismaService.userPunishment.count.mockResolvedValue(0);

      await service.getPunishments(mockUserId, { type: PunishmentType.MUTE });

      expect(mockPrismaService.userPunishment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUserId,
            type: PunishmentType.MUTE,
          }),
        }),
      );
    });
  });

  describe('getActivePunishments', () => {
    const mockUserId = 'user-123';

    it('should return cached active punishments', async () => {
      const cachedPunishments = [
        {
          id: 'p1',
          userId: mockUserId,
          type: PunishmentType.MUTE,
          status: PunishmentStatus.ACTIVE,
          reason: 'Test',
          isPermanent: false,
          expiresAt: new Date(Date.now() + 3600000),
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedPunishments));

      const result = await service.getActivePunishments(mockUserId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.userPunishment.findMany).not.toHaveBeenCalled();
    });

    it('should query database when cache miss', async () => {
      const mockPunishments = [
        {
          id: 'p1',
          userId: mockUserId,
          type: PunishmentType.MUTE,
          status: PunishmentStatus.ACTIVE,
          reason: 'Test',
          isPermanent: false,
          expiresAt: new Date(Date.now() + 3600000),
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.userPunishment.findMany.mockResolvedValue(mockPunishments);

      const result = await service.getActivePunishments(mockUserId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.userPunishment.findMany).toHaveBeenCalled();
      expect(mockRedisService.set).toHaveBeenCalled();
    });
  });

  describe('revokePunishment', () => {
    it('should revoke an active punishment', async () => {
      const mockPunishment = {
        id: 'p1',
        userId: 'user-123',
        type: PunishmentType.MUTE,
        status: PunishmentStatus.ACTIVE,
        reason: 'Test',
        isPermanent: false,
        createdBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const revokedPunishment = {
        ...mockPunishment,
        status: PunishmentStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy: 'admin-2',
        revokeReason: 'Appeal approved',
      };

      mockPrismaService.userPunishment.findUnique.mockResolvedValue(mockPunishment);
      mockPrismaService.userPunishment.update.mockResolvedValue(revokedPunishment);

      const result = await service.revokePunishment('p1', {
        reason: 'Appeal approved',
        revokedBy: 'admin-2',
      });

      expect(result.status).toBe(PunishmentStatus.REVOKED);
      expect(result.revokeReason).toBe('Appeal approved');
    });

    it('should throw NotFoundException for non-existent punishment', async () => {
      mockPrismaService.userPunishment.findUnique.mockResolvedValue(null);

      await expect(
        service.revokePunishment('non-existent', {
          reason: 'Test',
          revokedBy: 'admin-1',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for non-active punishment', async () => {
      const mockPunishment = {
        id: 'p1',
        status: PunishmentStatus.EXPIRED,
      };

      mockPrismaService.userPunishment.findUnique.mockResolvedValue(mockPunishment);

      await expect(
        service.revokePunishment('p1', {
          reason: 'Test',
          revokedBy: 'admin-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkPunishment', () => {
    const mockUserId = 'user-123';

    it('should return hasPunishment: false when no punishment exists', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.userPunishment.findMany.mockResolvedValue([]);

      const result = await service.checkPunishment(mockUserId, PunishmentType.MUTE);

      expect(result.hasPunishment).toBe(false);
      expect(result.punishment).toBeUndefined();
    });

    it('should return punishment with remaining time', async () => {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
      const mockPunishments = [
        {
          id: 'p1',
          userId: mockUserId,
          type: PunishmentType.MUTE,
          status: PunishmentStatus.ACTIVE,
          reason: 'Test',
          isPermanent: false,
          expiresAt,
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.userPunishment.findMany.mockResolvedValue(mockPunishments);

      const result = await service.checkPunishment(mockUserId, PunishmentType.MUTE);

      expect(result.hasPunishment).toBe(true);
      expect(result.punishment).toBeDefined();
      expect(result.remainingMinutes).toBeGreaterThan(0);
      expect(result.remainingMinutes).toBeLessThanOrEqual(30);
    });
  });

  describe('isUserMuted', () => {
    it('should return true when user is muted', async () => {
      const mockPunishments = [
        {
          id: 'p1',
          userId: 'user-123',
          type: PunishmentType.MUTE,
          status: PunishmentStatus.ACTIVE,
          reason: 'Test',
          isPermanent: false,
          expiresAt: new Date(Date.now() + 3600000),
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.userPunishment.findMany.mockResolvedValue(mockPunishments);

      const result = await service.isUserMuted('user-123');

      expect(result).toBe(true);
    });

    it('should return false when user is not muted', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.userPunishment.findMany.mockResolvedValue([]);

      const result = await service.isUserMuted('user-123');

      expect(result).toBe(false);
    });
  });

  describe('isUserBanned', () => {
    it('should return true when user is banned', async () => {
      const mockPunishments = [
        {
          id: 'p1',
          userId: 'user-123',
          type: PunishmentType.ACCOUNT_BAN,
          status: PunishmentStatus.ACTIVE,
          reason: 'Severe violation',
          isPermanent: true,
          expiresAt: null,
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.userPunishment.findMany.mockResolvedValue(mockPunishments);

      const result = await service.isUserBanned('user-123');

      expect(result).toBe(true);
    });
  });

  describe('executePunishment', () => {
    it('should create punishment from alert', async () => {
      const mockAlert = {
        id: 'alert-1',
        title: 'Suspicious activity',
        description: 'Multiple account detected',
        affectedUserIds: ['user-123'],
      };

      const mockPunishment = {
        id: 'p1',
        userId: 'user-123',
        type: PunishmentType.MUTE,
        status: PunishmentStatus.ACTIVE,
        reason: '基于风控告警: Suspicious activity',
        alertId: 'alert-1',
        isPermanent: false,
        expiresAt: new Date(Date.now() + 3600000),
        createdBy: 'admin-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRiskAlertService.getAlertById.mockResolvedValue(mockAlert);
      mockPrismaService.userPunishment.create.mockResolvedValue(mockPunishment);
      mockRiskAlertService.updateAlertStatus.mockResolvedValue({});

      const result = await service.executePunishment({
        alertId: 'alert-1',
        type: PunishmentType.MUTE,
        durationMinutes: 60,
        createdBy: 'admin-1',
      });

      expect(result.alertId).toBe('alert-1');
      expect(mockRiskAlertService.updateAlertStatus).toHaveBeenCalledWith(
        'alert-1',
        AlertStatus.RESOLVED,
        expect.any(String),
        'admin-1',
      );
    });

    it('should throw BadRequestException when alert has no affected users', async () => {
      const mockAlert = {
        id: 'alert-1',
        title: 'Test',
        affectedUserIds: [],
      };

      mockRiskAlertService.getAlertById.mockResolvedValue(mockAlert);

      await expect(
        service.executePunishment({
          alertId: 'alert-1',
          type: PunishmentType.MUTE,
          createdBy: 'admin-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserPunishmentStatus', () => {
    it('should return comprehensive punishment status', async () => {
      const mockPunishments = [
        {
          id: 'p1',
          userId: 'user-123',
          type: PunishmentType.MUTE,
          status: PunishmentStatus.ACTIVE,
          reason: 'Test',
          isPermanent: false,
          expiresAt: new Date(Date.now() + 3600000),
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'p2',
          userId: 'user-123',
          type: PunishmentType.WARNING,
          status: PunishmentStatus.ACTIVE,
          reason: 'Warning',
          isPermanent: false,
          expiresAt: null,
          createdBy: 'admin-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.userPunishment.findMany.mockResolvedValue(mockPunishments);
      mockPrismaService.userPunishment.count.mockResolvedValue(5);

      const result = await service.getUserPunishmentStatus('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.isMuted).toBe(true);
      expect(result.isBanned).toBe(false);
      expect(result.isFrozen).toBe(false);
      expect(result.hasWarning).toBe(true);
      expect(result.activePunishments).toHaveLength(2);
      expect(result.totalPunishments).toBe(5);
    });
  });

  describe('updateExpiredPunishments', () => {
    it('should update expired punishments', async () => {
      mockPrismaService.userPunishment.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.updateExpiredPunishments();

      expect(result).toBe(3);
      expect(mockPrismaService.userPunishment.updateMany).toHaveBeenCalledWith({
        where: {
          status: PunishmentStatus.ACTIVE,
          isPermanent: false,
          expiresAt: { lte: expect.any(Date) },
        },
        data: {
          status: PunishmentStatus.EXPIRED,
        },
      });
    });
  });

  describe('getPunishmentHistoryStats', () => {
    it('should return punishment history statistics', async () => {
      const mockPunishments = [
        {
          id: 'p1',
          type: PunishmentType.WARNING,
          status: PunishmentStatus.ACTIVE,
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'p2',
          type: PunishmentType.MUTE,
          status: PunishmentStatus.EXPIRED,
          createdAt: new Date('2024-01-15'),
        },
        {
          id: 'p3',
          type: PunishmentType.MUTE,
          status: PunishmentStatus.REVOKED,
          createdAt: new Date('2024-02-01'),
        },
      ];

      mockPrismaService.userPunishment.findMany.mockResolvedValue(mockPunishments);

      const result = await service.getPunishmentHistoryStats('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.totalPunishments).toBe(3);
      expect(result.byType[PunishmentType.WARNING]).toBe(1);
      expect(result.byType[PunishmentType.MUTE]).toBe(2);
      expect(result.byStatus[PunishmentStatus.ACTIVE]).toBe(1);
      expect(result.byStatus[PunishmentStatus.EXPIRED]).toBe(1);
      expect(result.byStatus[PunishmentStatus.REVOKED]).toBe(1);
    });
  });
});
