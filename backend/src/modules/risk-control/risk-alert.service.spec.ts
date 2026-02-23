import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RiskAlertService } from './risk-alert.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import {
  AlertType,
  AlertSeverity,
  AlertStatus,
} from './dto/risk-alert.dto.js';

describe('RiskAlertService', () => {
  let service: RiskAlertService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  const mockRedisClient = {
    publish: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    const mockPrismaService = {
      riskAlert: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      riskAlertNote: {
        create: jest.fn(),
      },
    };

    const mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getClient: jest.fn().mockReturnValue(mockRedisClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskAlertService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<RiskAlertService>(RiskAlertService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });


  describe('createAlert', () => {
    it('should create a new alert successfully', async () => {
      const mockAlert = {
        id: 'alert-123',
        type: AlertType.MULTI_ACCOUNT_DETECTED,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.PENDING,
        title: '检测到多账户关联',
        description: '同一设备关联了多个账户',
        data: { deviceId: 'device-123' },
        affectedUserIds: ['user-1', 'user-2'],
        sourceService: 'RelatedAccountService',
        assignedTo: null,
        resolvedAt: null,
        resolvedBy: null,
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService as any).riskAlert.create.mockResolvedValue(mockAlert);
      redisService.del.mockResolvedValue(1);

      const result = await service.createAlert({
        type: AlertType.MULTI_ACCOUNT_DETECTED,
        severity: AlertSeverity.MEDIUM,
        title: '检测到多账户关联',
        description: '同一设备关联了多个账户',
        data: { deviceId: 'device-123' },
        affectedUserIds: ['user-1', 'user-2'],
        sourceService: 'RelatedAccountService',
      });

      expect(result.id).toBe('alert-123');
      expect(result.type).toBe(AlertType.MULTI_ACCOUNT_DETECTED);
      expect(result.severity).toBe(AlertSeverity.MEDIUM);
      expect(result.status).toBe(AlertStatus.PENDING);
      expect((prismaService as any).riskAlert.create).toHaveBeenCalled();
    });
  });

  describe('getAlerts', () => {
    it('should return alerts with filters', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: AlertType.SUSPICIOUS_TRANSACTION,
          severity: AlertSeverity.HIGH,
          status: AlertStatus.PENDING,
          title: 'Test Alert 1',
          notes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'alert-2',
          type: AlertType.SUSPICIOUS_TRANSACTION,
          severity: AlertSeverity.HIGH,
          status: AlertStatus.PENDING,
          title: 'Test Alert 2',
          notes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prismaService as any).riskAlert.findMany.mockResolvedValue(mockAlerts);
      (prismaService as any).riskAlert.count.mockResolvedValue(2);

      const result = await service.getAlerts({
        type: AlertType.SUSPICIOUS_TRANSACTION,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.PENDING,
        limit: 20,
        offset: 0,
      });

      expect(result.alerts).toHaveLength(2);
      expect(result.total).toBe(2);
      expect((prismaService as any).riskAlert.findMany).toHaveBeenCalled();
    });

    it('should return empty list when no alerts match', async () => {
      (prismaService as any).riskAlert.findMany.mockResolvedValue([]);
      (prismaService as any).riskAlert.count.mockResolvedValue(0);

      const result = await service.getAlerts({
        type: AlertType.CIRCULAR_TRANSFER,
      });

      expect(result.alerts).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('getAlertById', () => {
    it('should return alert by id', async () => {
      const mockAlert = {
        id: 'alert-123',
        type: AlertType.ACCOUNT_CLUSTER,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.INVESTIGATING,
        title: 'Test Alert',
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService as any).riskAlert.findUnique.mockResolvedValue(mockAlert);

      const result = await service.getAlertById('alert-123');

      expect(result.id).toBe('alert-123');
      expect(result.type).toBe(AlertType.ACCOUNT_CLUSTER);
    });

    it('should throw NotFoundException when alert not found', async () => {
      (prismaService as any).riskAlert.findUnique.mockResolvedValue(null);

      await expect(service.getAlertById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateAlertStatus', () => {
    it('should update alert status to INVESTIGATING', async () => {
      const mockAlert = {
        id: 'alert-123',
        type: AlertType.SUSPICIOUS_TRANSACTION,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.INVESTIGATING,
        title: 'Test Alert',
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService as any).riskAlert.update.mockResolvedValue(mockAlert);
      redisService.del.mockResolvedValue(1);

      const result = await service.updateAlertStatus(
        'alert-123',
        AlertStatus.INVESTIGATING,
      );

      expect(result.status).toBe(AlertStatus.INVESTIGATING);
      expect((prismaService as any).riskAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'alert-123' },
          data: { status: AlertStatus.INVESTIGATING },
        }),
      );
    });

    it('should set resolvedAt when status is RESOLVED', async () => {
      const mockAlert = {
        id: 'alert-123',
        type: AlertType.SUSPICIOUS_TRANSACTION,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.RESOLVED,
        title: 'Test Alert',
        resolvedAt: new Date(),
        resolvedBy: 'admin-123',
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService as any).riskAlert.update.mockResolvedValue(mockAlert);
      redisService.del.mockResolvedValue(1);

      const result = await service.updateAlertStatus(
        'alert-123',
        AlertStatus.RESOLVED,
        undefined,
        'admin-123',
      );

      expect(result.status).toBe(AlertStatus.RESOLVED);
      expect((prismaService as any).riskAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AlertStatus.RESOLVED,
            resolvedAt: expect.any(Date),
            resolvedBy: 'admin-123',
          }),
        }),
      );
    });
  });


  describe('assignAlert', () => {
    it('should assign alert to admin and set status to INVESTIGATING', async () => {
      const mockAlert = {
        id: 'alert-123',
        type: AlertType.CONCENTRATED_RECEIPTS,
        severity: AlertSeverity.HIGH,
        status: AlertStatus.INVESTIGATING,
        title: 'Test Alert',
        assignedTo: 'admin-456',
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService as any).riskAlert.update.mockResolvedValue(mockAlert);
      redisService.del.mockResolvedValue(1);

      const result = await service.assignAlert('alert-123', 'admin-456');

      expect(result.assignedTo).toBe('admin-456');
      expect(result.status).toBe(AlertStatus.INVESTIGATING);
      expect((prismaService as any).riskAlert.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            assignedTo: 'admin-456',
            status: AlertStatus.INVESTIGATING,
          },
        }),
      );
    });
  });

  describe('addAlertNote', () => {
    it('should add note to alert', async () => {
      const mockNote = {
        id: 'note-123',
        alertId: 'alert-123',
        authorId: 'admin-456',
        content: 'Investigation started',
        createdAt: new Date(),
      };

      (prismaService as any).riskAlertNote.create.mockResolvedValue(mockNote);

      const result = await service.addAlertNote(
        'alert-123',
        'Investigation started',
        'admin-456',
      );

      expect(result.id).toBe('note-123');
      expect(result.content).toBe('Investigation started');
      expect(result.authorId).toBe('admin-456');
    });
  });

  describe('getAlertStats', () => {
    it('should return alert statistics', async () => {
      // Mock cache miss
      redisService.get.mockResolvedValue(null);

      // Mock database queries
      (prismaService as any).riskAlert.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // pending
        .mockResolvedValueOnce(20) // investigating
        .mockResolvedValueOnce(40) // resolved
        .mockResolvedValueOnce(10) // dismissed
        .mockResolvedValueOnce(5) // critical
        .mockResolvedValueOnce(25) // high
        .mockResolvedValueOnce(50) // medium
        .mockResolvedValueOnce(20) // low
        .mockResolvedValueOnce(15) // last24Hours
        .mockResolvedValueOnce(60); // last7Days

      (prismaService as any).riskAlert.groupBy.mockResolvedValue([
        { type: AlertType.MULTI_ACCOUNT_DETECTED, _count: { type: 20 } },
        { type: AlertType.SUSPICIOUS_TRANSACTION, _count: { type: 30 } },
        { type: AlertType.RATE_LIMIT_EXCEEDED, _count: { type: 15 } },
      ]);

      (prismaService as any).riskAlert.findMany.mockResolvedValue([
        {
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          resolvedAt: new Date(),
        },
        {
          createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          resolvedAt: new Date(),
        },
      ]);

      redisService.set.mockResolvedValue('OK');

      const result = await service.getAlertStats();

      expect(result.total).toBe(100);
      expect(result.byStatus.pending).toBe(30);
      expect(result.byStatus.investigating).toBe(20);
      expect(result.byStatus.resolved).toBe(40);
      expect(result.byStatus.dismissed).toBe(10);
      expect(result.bySeverity.critical).toBe(5);
      expect(result.bySeverity.high).toBe(25);
      expect(result.last24Hours).toBe(15);
      expect(result.last7Days).toBe(60);
    });

    it('should return cached stats if available', async () => {
      const cachedStats = {
        total: 50,
        byStatus: { pending: 10, investigating: 10, resolved: 20, dismissed: 10 },
        bySeverity: { critical: 2, high: 10, medium: 25, low: 13 },
        byType: {},
        last24Hours: 5,
        last7Days: 30,
        avgResolutionTimeHours: 2.5,
      };

      redisService.get.mockResolvedValue(JSON.stringify(cachedStats));

      const result = await service.getAlertStats();

      expect(result.total).toBe(50);
      expect((prismaService as any).riskAlert.count).not.toHaveBeenCalled();
    });
  });

  describe('triggerAlert', () => {
    it('should trigger alert with default values based on type', async () => {
      const mockAlert = {
        id: 'alert-123',
        type: AlertType.CIRCULAR_TRANSFER,
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.PENDING,
        title: '检测到循环转账',
        description: '发现固定金额在多个账户间循环转账的模式',
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService as any).riskAlert.create.mockResolvedValue(mockAlert);
      redisService.del.mockResolvedValue(1);

      const result = await service.triggerAlert({
        type: AlertType.CIRCULAR_TRANSFER,
        data: { cycleId: 'cycle-123' },
        affectedUserIds: ['user-1', 'user-2', 'user-3'],
        sourceService: 'TransactionAnomalyService',
      });

      expect(result.type).toBe(AlertType.CIRCULAR_TRANSFER);
      expect(result.severity).toBe(AlertSeverity.CRITICAL);
      expect((prismaService as any).riskAlert.create).toHaveBeenCalled();
    });

    it('should use custom severity when provided', async () => {
      const mockAlert = {
        id: 'alert-123',
        type: AlertType.RATE_LIMIT_EXCEEDED,
        severity: AlertSeverity.MEDIUM,
        status: AlertStatus.PENDING,
        title: 'Custom Title',
        notes: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prismaService as any).riskAlert.create.mockResolvedValue(mockAlert);
      redisService.del.mockResolvedValue(1);

      const result = await service.triggerAlert({
        type: AlertType.RATE_LIMIT_EXCEEDED,
        severity: AlertSeverity.MEDIUM,
        title: 'Custom Title',
      });

      expect(result.severity).toBe(AlertSeverity.MEDIUM);
      expect(result.title).toBe('Custom Title');
    });
  });

  describe('getPendingHighPriorityAlerts', () => {
    it('should return pending CRITICAL and HIGH alerts', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: AlertType.CIRCULAR_TRANSFER,
          severity: AlertSeverity.CRITICAL,
          status: AlertStatus.PENDING,
          title: 'Critical Alert',
          notes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'alert-2',
          type: AlertType.SUSPICIOUS_TRANSACTION,
          severity: AlertSeverity.HIGH,
          status: AlertStatus.PENDING,
          title: 'High Alert',
          notes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prismaService as any).riskAlert.findMany.mockResolvedValue(mockAlerts);

      const result = await service.getPendingHighPriorityAlerts(10);

      expect(result).toHaveLength(2);
      expect((prismaService as any).riskAlert.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PENDING',
            severity: { in: ['CRITICAL', 'HIGH'] },
          },
        }),
      );
    });
  });

  describe('getAlertsByAssignee', () => {
    it('should return alerts assigned to specific admin', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: AlertType.ACCOUNT_CLUSTER,
          severity: AlertSeverity.HIGH,
          status: AlertStatus.INVESTIGATING,
          title: 'Assigned Alert',
          assignedTo: 'admin-123',
          notes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prismaService as any).riskAlert.findMany.mockResolvedValue(mockAlerts);

      const result = await service.getAlertsByAssignee('admin-123');

      expect(result).toHaveLength(1);
      expect(result[0].assignedTo).toBe('admin-123');
    });
  });

  describe('getAlertsByAffectedUser', () => {
    it('should return alerts affecting specific user', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          type: AlertType.MULTI_ACCOUNT_DETECTED,
          severity: AlertSeverity.MEDIUM,
          status: AlertStatus.PENDING,
          title: 'User Alert',
          affectedUserIds: ['user-123', 'user-456'],
          notes: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prismaService as any).riskAlert.findMany.mockResolvedValue(mockAlerts);

      const result = await service.getAlertsByAffectedUser('user-123');

      expect(result).toHaveLength(1);
      expect(result[0].affectedUserIds).toContain('user-123');
    });
  });
});
