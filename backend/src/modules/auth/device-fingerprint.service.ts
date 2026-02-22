import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

/**
 * 设备信息接口
 */
export interface DeviceInfo {
  id: string;
  fingerprint: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastSeenAt: Date;
  createdAt: Date;
}

/**
 * 记录设备指纹的参数
 */
export interface RecordDeviceParams {
  userId: string;
  fingerprint: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * 设备指纹服务
 * 需求19: 风控与反作弊系统 - 设备指纹采集
 * 用于追踪用户登录设备，检测新设备，支持风控系统
 */
@Injectable()
export class DeviceFingerprintService {
  private readonly logger = new Logger(DeviceFingerprintService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录设备指纹
   * 如果设备已存在则更新 lastSeenAt，否则创建新记录
   *
   * @param params 设备信息参数
   * @returns 是否为新设备
   */
  async recordDeviceFingerprint(params: RecordDeviceParams): Promise<boolean> {
    const { userId, fingerprint, userAgent, ipAddress } = params;

    if (!fingerprint) {
      this.logger.warn(`Empty fingerprint for user ${userId}, skipping record`);
      return true; // 没有指纹时视为新设备
    }

    try {
      // 尝试查找现有设备记录
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const existingDevice = await (
        this.prisma as any
      ).deviceFingerprint.findUnique({
        where: {
          userId_fingerprint: {
            userId,
            fingerprint,
          },
        },
      });

      if (existingDevice) {
        // 设备已存在，更新 lastSeenAt 和其他信息
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        await (this.prisma as any).deviceFingerprint.update({
          where: {
            userId_fingerprint: {
              userId,
              fingerprint,
            },
          },
          data: {
            lastSeenAt: new Date(),
            userAgent: userAgent || existingDevice.userAgent,
            ipAddress: ipAddress || existingDevice.ipAddress,
          },
        });

        this.logger.debug(`Updated device fingerprint for user ${userId}`);
        return false; // 不是新设备
      }

      // 创建新设备记录
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).deviceFingerprint.create({
        data: {
          userId,
          fingerprint,
          userAgent,
          ipAddress,
          lastSeenAt: new Date(),
        },
      });

      this.logger.log(`New device recorded for user ${userId}`);
      return true; // 是新设备
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to record device fingerprint: ${errorMessage}`);
      // 出错时默认视为新设备，不影响登录流程
      return true;
    }
  }

  /**
   * 检查是否为已知设备
   *
   * @param userId 用户ID
   * @param fingerprint 设备指纹
   * @returns 是否为已知设备
   */
  async isKnownDevice(userId: string, fingerprint: string): Promise<boolean> {
    if (!fingerprint) {
      return false;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const device = await (this.prisma as any).deviceFingerprint.findUnique({
        where: {
          userId_fingerprint: {
            userId,
            fingerprint,
          },
        },
      });

      return !!device;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to check device: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 获取用户的所有已知设备
   *
   * @param userId 用户ID
   * @returns 设备列表
   */
  async getUserDevices(userId: string): Promise<DeviceInfo[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const devices = await (this.prisma as any).deviceFingerprint.findMany({
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
      });

      return devices as DeviceInfo[];
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user devices: ${errorMessage}`);
      return [];
    }
  }

  /**
   * 移除设备
   * 允许用户从设置页面移除不再使用的设备
   *
   * @param userId 用户ID
   * @param deviceId 设备记录ID
   * @returns 是否成功移除
   */
  async removeDevice(userId: string, deviceId: string): Promise<boolean> {
    try {
      // 确保设备属于该用户
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const device = await (this.prisma as any).deviceFingerprint.findFirst({
        where: {
          id: deviceId,
          userId,
        },
      });

      if (!device) {
        this.logger.warn(`Device ${deviceId} not found for user ${userId}`);
        return false;
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).deviceFingerprint.delete({
        where: { id: deviceId },
      });

      this.logger.log(`Device ${deviceId} removed for user ${userId}`);
      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to remove device: ${errorMessage}`);
      return false;
    }
  }

  /**
   * 获取用户设备数量
   *
   * @param userId 用户ID
   * @returns 设备数量
   */
  async getDeviceCount(userId: string): Promise<number> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const count = await (this.prisma as any).deviceFingerprint.count({
        where: { userId },
      });

      return count as number;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get device count: ${errorMessage}`);
      return 0;
    }
  }
}
