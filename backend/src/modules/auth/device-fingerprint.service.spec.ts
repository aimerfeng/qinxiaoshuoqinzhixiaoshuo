import { Test, TestingModule } from '@nestjs/testing';
import { DeviceFingerprintService } from './device-fingerprint.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('DeviceFingerprintService', () => {
  let service: DeviceFingerprintService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    deviceFingerprint: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeviceFingerprintService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DeviceFingerprintService>(DeviceFingerprintService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordDeviceFingerprint', () => {
    const userId = 'user-123';
    const fingerprint = 'fp-abc123';
    const userAgent = 'Mozilla/5.0';
    const ipAddress = '192.168.1.1';

    it('should return true for empty fingerprint', async () => {
      const result = await service.recordDeviceFingerprint({
        userId,
        fingerprint: '',
      });

      expect(result).toBe(true);
      expect(
        mockPrismaService.deviceFingerprint.findUnique,
      ).not.toHaveBeenCalled();
    });

    it('should create new device and return true for new fingerprint', async () => {
      mockPrismaService.deviceFingerprint.findUnique.mockResolvedValue(null);
      mockPrismaService.deviceFingerprint.create.mockResolvedValue({
        id: 'device-1',
        userId,
        fingerprint,
        userAgent,
        ipAddress,
        lastSeenAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.recordDeviceFingerprint({
        userId,
        fingerprint,
        userAgent,
        ipAddress,
      });

      expect(result).toBe(true);
      expect(
        mockPrismaService.deviceFingerprint.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          userId_fingerprint: { userId, fingerprint },
        },
      });
      expect(mockPrismaService.deviceFingerprint.create).toHaveBeenCalled();
    });

    it('should update existing device and return false for known fingerprint', async () => {
      const existingDevice = {
        id: 'device-1',
        userId,
        fingerprint,
        userAgent: 'Old User Agent',
        ipAddress: '10.0.0.1',
        lastSeenAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
      };

      mockPrismaService.deviceFingerprint.findUnique.mockResolvedValue(
        existingDevice,
      );
      mockPrismaService.deviceFingerprint.update.mockResolvedValue({
        ...existingDevice,
        userAgent,
        ipAddress,
        lastSeenAt: new Date(),
      });

      const result = await service.recordDeviceFingerprint({
        userId,
        fingerprint,
        userAgent,
        ipAddress,
      });

      expect(result).toBe(false);
      expect(mockPrismaService.deviceFingerprint.update).toHaveBeenCalled();
      expect(mockPrismaService.deviceFingerprint.create).not.toHaveBeenCalled();
    });

    it('should return true on error', async () => {
      mockPrismaService.deviceFingerprint.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.recordDeviceFingerprint({
        userId,
        fingerprint,
      });

      expect(result).toBe(true);
    });
  });

  describe('isKnownDevice', () => {
    const userId = 'user-123';
    const fingerprint = 'fp-abc123';

    it('should return false for empty fingerprint', async () => {
      const result = await service.isKnownDevice(userId, '');
      expect(result).toBe(false);
    });

    it('should return true for known device', async () => {
      mockPrismaService.deviceFingerprint.findUnique.mockResolvedValue({
        id: 'device-1',
        userId,
        fingerprint,
      });

      const result = await service.isKnownDevice(userId, fingerprint);
      expect(result).toBe(true);
    });

    it('should return false for unknown device', async () => {
      mockPrismaService.deviceFingerprint.findUnique.mockResolvedValue(null);

      const result = await service.isKnownDevice(userId, fingerprint);
      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockPrismaService.deviceFingerprint.findUnique.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.isKnownDevice(userId, fingerprint);
      expect(result).toBe(false);
    });
  });

  describe('getUserDevices', () => {
    const userId = 'user-123';

    it('should return list of devices', async () => {
      const devices = [
        {
          id: 'device-1',
          fingerprint: 'fp-1',
          userAgent: 'Chrome',
          ipAddress: '192.168.1.1',
          lastSeenAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'device-2',
          fingerprint: 'fp-2',
          userAgent: 'Firefox',
          ipAddress: '192.168.1.2',
          lastSeenAt: new Date(),
          createdAt: new Date(),
        },
      ];

      mockPrismaService.deviceFingerprint.findMany.mockResolvedValue(devices);

      const result = await service.getUserDevices(userId);

      expect(result).toEqual(devices);
      expect(mockPrismaService.deviceFingerprint.findMany).toHaveBeenCalledWith(
        {
          where: { userId },
          orderBy: { lastSeenAt: 'desc' },
          select: {
            id: true,
            fingerprint: true,
            userAgent: true,
            ipAddress: true,
            lastSeenAt: true,
            createdAt: true,
          },
        },
      );
    });

    it('should return empty array on error', async () => {
      mockPrismaService.deviceFingerprint.findMany.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.getUserDevices(userId);
      expect(result).toEqual([]);
    });
  });

  describe('removeDevice', () => {
    const userId = 'user-123';
    const deviceId = 'device-1';

    it('should return true when device is successfully removed', async () => {
      mockPrismaService.deviceFingerprint.findFirst.mockResolvedValue({
        id: deviceId,
        userId,
      });
      mockPrismaService.deviceFingerprint.delete.mockResolvedValue({
        id: deviceId,
      });

      const result = await service.removeDevice(userId, deviceId);

      expect(result).toBe(true);
      expect(
        mockPrismaService.deviceFingerprint.findFirst,
      ).toHaveBeenCalledWith({
        where: { id: deviceId, userId },
      });
      expect(mockPrismaService.deviceFingerprint.delete).toHaveBeenCalledWith({
        where: { id: deviceId },
      });
    });

    it('should return false when device not found', async () => {
      mockPrismaService.deviceFingerprint.findFirst.mockResolvedValue(null);

      const result = await service.removeDevice(userId, deviceId);

      expect(result).toBe(false);
      expect(mockPrismaService.deviceFingerprint.delete).not.toHaveBeenCalled();
    });

    it('should return false on error', async () => {
      mockPrismaService.deviceFingerprint.findFirst.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.removeDevice(userId, deviceId);
      expect(result).toBe(false);
    });
  });

  describe('getDeviceCount', () => {
    const userId = 'user-123';

    it('should return device count', async () => {
      mockPrismaService.deviceFingerprint.count.mockResolvedValue(3);

      const result = await service.getDeviceCount(userId);

      expect(result).toBe(3);
      expect(mockPrismaService.deviceFingerprint.count).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should return 0 on error', async () => {
      mockPrismaService.deviceFingerprint.count.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.getDeviceCount(userId);
      expect(result).toBe(0);
    });
  });
});
