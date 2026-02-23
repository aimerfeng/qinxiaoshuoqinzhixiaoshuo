import { Test, TestingModule } from '@nestjs/testing';
import { RiskDeviceFingerprintService } from './device-fingerprint.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('RiskDeviceFingerprintService', () => {
  let service: RiskDeviceFingerprintService;

  const mockPrisma = {
    deviceFingerprint: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskDeviceFingerprintService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RiskDeviceFingerprintService>(
      RiskDeviceFingerprintService,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordFingerprint', () => {
    const params = {
      userId: 'user-1',
      fingerprint: 'fp-abc',
      userAgent: 'Chrome/120',
      ipAddress: '1.2.3.4',
      deviceInfo: { screenResolution: '1920x1080', timezone: 'Asia/Shanghai' },
    };

    it('should throw for empty fingerprint', async () => {
      await expect(
        service.recordFingerprint({ userId: 'u1', fingerprint: '' }),
      ).rejects.toThrow('Fingerprint is required');
    });

    it('should create new device record', async () => {
      mockPrisma.deviceFingerprint.findUnique.mockResolvedValue(null);
      const created = {
        id: 'd1',
        userId: params.userId,
        fingerprint: params.fingerprint,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        deviceInfo: params.deviceInfo,
        createdAt: new Date('2024-01-01'),
        lastSeenAt: new Date('2024-01-01'),
      };
      mockPrisma.deviceFingerprint.create.mockResolvedValue(created);

      const result = await service.recordFingerprint(params);

      expect(result.isNewDevice).toBe(true);
      expect(result.record.fingerprint).toBe(params.fingerprint);
      expect(result.record.deviceInfo).toEqual(params.deviceInfo);
      expect(mockPrisma.deviceFingerprint.create).toHaveBeenCalled();
    });

    it('should update existing device record', async () => {
      const existing = {
        id: 'd1',
        userId: params.userId,
        fingerprint: params.fingerprint,
        userAgent: 'Old Agent',
        ipAddress: '10.0.0.1',
        deviceInfo: null,
        createdAt: new Date('2024-01-01'),
        lastSeenAt: new Date('2024-01-01'),
      };
      mockPrisma.deviceFingerprint.findUnique.mockResolvedValue(existing);
      mockPrisma.deviceFingerprint.update.mockResolvedValue({
        ...existing,
        userAgent: params.userAgent,
        ipAddress: params.ipAddress,
        deviceInfo: params.deviceInfo,
        lastSeenAt: new Date(),
      });

      const result = await service.recordFingerprint(params);

      expect(result.isNewDevice).toBe(false);
      expect(mockPrisma.deviceFingerprint.update).toHaveBeenCalled();
    });

    it('should propagate errors', async () => {
      mockPrisma.deviceFingerprint.findUnique.mockRejectedValue(
        new Error('DB error'),
      );

      await expect(service.recordFingerprint(params)).rejects.toThrow(
        'DB error',
      );
    });
  });

  describe('getUserDeviceHistory', () => {
    it('should return device history for a user', async () => {
      const devices = [
        {
          id: 'd1',
          userId: 'user-1',
          fingerprint: 'fp-1',
          userAgent: 'Chrome',
          ipAddress: '1.2.3.4',
          deviceInfo: { timezone: 'UTC' },
          createdAt: new Date(),
          lastSeenAt: new Date(),
        },
      ];
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue(devices);

      const result = await service.getUserDeviceHistory('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.totalDevices).toBe(1);
      expect(result.devices[0].fingerprint).toBe('fp-1');
    });

    it('should return empty on error', async () => {
      mockPrisma.deviceFingerprint.findMany.mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.getUserDeviceHistory('user-1');

      expect(result.devices).toEqual([]);
      expect(result.totalDevices).toBe(0);
    });
  });

  describe('detectMultiAccountByFingerprint', () => {
    it('should return null for empty fingerprint', async () => {
      const result = await service.detectMultiAccountByFingerprint('');
      expect(result).toBeNull();
    });

    it('should return null when only one user', async () => {
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([
        { userId: 'user-1', fingerprint: 'fp-1', ipAddress: '1.2.3.4' },
      ]);

      const result = await service.detectMultiAccountByFingerprint('fp-1');
      expect(result).toBeNull();
    });

    it('should detect multiple accounts on same device', async () => {
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([
        { userId: 'user-1', fingerprint: 'fp-1', ipAddress: '1.2.3.4' },
        { userId: 'user-2', fingerprint: 'fp-1', ipAddress: '1.2.3.4' },
        { userId: 'user-3', fingerprint: 'fp-1', ipAddress: '5.6.7.8' },
      ]);

      const result = await service.detectMultiAccountByFingerprint('fp-1');

      expect(result).not.toBeNull();
      expect(result!.userCount).toBe(3);
      expect(result!.riskLevel).toBe('medium');
      expect(result!.userIds).toContain('user-1');
      expect(result!.userIds).toContain('user-2');
      expect(result!.userIds).toContain('user-3');
    });

    it('should flag high risk for 5+ accounts', async () => {
      const records = Array.from({ length: 5 }, (_, i) => ({
        userId: `user-${i}`,
        fingerprint: 'fp-1',
        ipAddress: '1.2.3.4',
      }));
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue(records);

      const result = await service.detectMultiAccountByFingerprint('fp-1');

      expect(result!.riskLevel).toBe('high');
      expect(result!.userCount).toBe(5);
    });
  });

  describe('detectMultiAccountByIp', () => {
    it('should return null for empty IP', async () => {
      const result = await service.detectMultiAccountByIp('');
      expect(result).toBeNull();
    });

    it('should return null when only one user', async () => {
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([
        { userId: 'user-1', fingerprint: 'fp-1', ipAddress: '1.2.3.4' },
      ]);

      const result = await service.detectMultiAccountByIp('1.2.3.4');
      expect(result).toBeNull();
    });

    it('should detect multiple accounts on same IP', async () => {
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue([
        { userId: 'user-1', fingerprint: 'fp-1', ipAddress: '1.2.3.4' },
        { userId: 'user-2', fingerprint: 'fp-2', ipAddress: '1.2.3.4' },
      ]);

      const result = await service.detectMultiAccountByIp('1.2.3.4');

      expect(result).not.toBeNull();
      expect(result!.userCount).toBe(2);
      expect(result!.riskLevel).toBe('medium');
    });
  });

  describe('getUsersByFingerprint', () => {
    it('should return users associated with a fingerprint', async () => {
      const records = [
        { userId: 'user-1', lastSeenAt: new Date() },
        { userId: 'user-2', lastSeenAt: new Date() },
      ];
      mockPrisma.deviceFingerprint.findMany.mockResolvedValue(records);

      const result = await service.getUsersByFingerprint('fp-1');

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('user-1');
    });

    it('should return empty on error', async () => {
      mockPrisma.deviceFingerprint.findMany.mockRejectedValue(
        new Error('DB error'),
      );

      const result = await service.getUsersByFingerprint('fp-1');
      expect(result).toEqual([]);
    });
  });
});
