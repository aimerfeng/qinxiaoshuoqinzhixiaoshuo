import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  DeviceInfoPayload,
  DeviceRecordResponse,
  MultiAccountDetection,
  UserDeviceHistoryResponse,
} from './dto/device-fingerprint.dto.js';

/**
 * 风控设备指纹服务
 *
 * 需求19: 风控与反作弊系统 - 设备指纹采集
 * 需求19验收标准1: WHEN 用户注册 THEN System SHALL 采集设备指纹并建立用户画像
 * 需求19验收标准2: WHEN 用户登录 THEN System SHALL 更新设备和IP记录
 *
 * 风控检测维度:
 * - 设备关联: 同设备/IP多账户 (中风险)
 * - 行为相似: 登录时间、操作习惯相似 (中风险)
 */
@Injectable()
export class RiskDeviceFingerprintService {
  private readonly logger = new Logger(RiskDeviceFingerprintService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 记录设备指纹（增强版，含设备详细信息）
   *
   * 如果设备已存在则更新 lastSeenAt 和 deviceInfo，否则创建新记录。
   * 同时检测同设备/IP多账户风险。
   */
  async recordFingerprint(params: {
    userId: string;
    fingerprint: string;
    userAgent?: string;
    ipAddress?: string;
    deviceInfo?: DeviceInfoPayload;
  }): Promise<{ isNewDevice: boolean; record: DeviceRecordResponse }> {
    const { userId, fingerprint, userAgent, ipAddress, deviceInfo } = params;

    if (!fingerprint) {
      this.logger.warn(`Empty fingerprint for user ${userId}, skipping`);
      throw new Error('Fingerprint is required');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const existing = await (
        this.prisma as any
      ).deviceFingerprint.findUnique({
        where: {
          userId_fingerprint: { userId, fingerprint },
        },
      });

      if (existing) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const updated = await (this.prisma as any).deviceFingerprint.update({
          where: {
            userId_fingerprint: { userId, fingerprint },
          },
          data: {
            lastSeenAt: new Date(),
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            userAgent: userAgent ?? existing.userAgent,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            ipAddress: ipAddress ?? existing.ipAddress,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            deviceInfo: deviceInfo ?? existing.deviceInfo,
          },
        });

        this.logger.debug(`Updated device fingerprint for user ${userId}`);
        return {
          isNewDevice: false,
          record: this.toResponse(updated),
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const created = await (this.prisma as any).deviceFingerprint.create({
        data: {
          userId,
          fingerprint,
          userAgent,
          ipAddress,
          deviceInfo: deviceInfo ?? undefined,
          lastSeenAt: new Date(),
        },
      });

      this.logger.log(`New device recorded for user ${userId}`);
      return {
        isNewDevice: true,
        record: this.toResponse(created),
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to record fingerprint: ${msg}`);
      throw error;
    }
  }

  /**
   * 获取用户设备历史
   *
   * 返回用户所有已知设备的完整信息，包括设备详情。
   */
  async getUserDeviceHistory(
    userId: string,
  ): Promise<UserDeviceHistoryResponse> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const devices = await (this.prisma as any).deviceFingerprint.findMany({
        where: { userId },
        orderBy: { lastSeenAt: 'desc' },
      });

      return {
        userId,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        devices: (devices as any[]).map((d) => this.toResponse(d)),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        totalDevices: devices.length,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get device history: ${msg}`);
      return { userId, devices: [], totalDevices: 0 };
    }
  }

  /**
   * 检测同设备多账户
   *
   * 查找使用相同指纹的所有用户，用于风控关联账户检测。
   * 风控检测维度: 设备关联 - 同设备多账户 (中风险)
   */
  async detectMultiAccountByFingerprint(
    fingerprint: string,
  ): Promise<MultiAccountDetection | null> {
    if (!fingerprint) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const records = await (this.prisma as any).deviceFingerprint.findMany({
        where: { fingerprint },
        select: {
          userId: true,
          ipAddress: true,
          fingerprint: true,
        },
      });

      const userIds = [
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        ...new Set((records as any[]).map((r: any) => r.userId as string)),
      ];

      if (userIds.length <= 1) return null;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const ipAddress =
        (records as any[]).find((r: any) => r.ipAddress)?.ipAddress ?? null;

      return {
        fingerprint,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        ipAddress,
        userIds,
        userCount: userIds.length,
        riskLevel: userIds.length >= 5 ? 'high' : 'medium',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to detect multi-account by fingerprint: ${msg}`,
      );
      return null;
    }
  }

  /**
   * 检测同IP多账户
   *
   * 查找使用相同IP地址的所有用户，用于风控关联账户检测。
   * 风控检测维度: 设备关联 - 同IP多账户 (中风险)
   */
  async detectMultiAccountByIp(
    ipAddress: string,
  ): Promise<MultiAccountDetection | null> {
    if (!ipAddress) return null;

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const records = await (this.prisma as any).deviceFingerprint.findMany({
        where: { ipAddress },
        select: {
          userId: true,
          fingerprint: true,
          ipAddress: true,
        },
      });

      const userIds = [
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        ...new Set((records as any[]).map((r: any) => r.userId as string)),
      ];

      if (userIds.length <= 1) return null;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const fp =
        (records as any[]).find((r: any) => r.fingerprint)?.fingerprint ?? '';

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        fingerprint: fp,
        ipAddress,
        userIds,
        userCount: userIds.length,
        riskLevel: userIds.length >= 5 ? 'high' : 'medium',
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to detect multi-account by IP: ${msg}`);
      return null;
    }
  }

  /**
   * 获取设备关联的所有用户
   *
   * 用于管理后台查看某个设备指纹关联了哪些用户。
   */
  async getUsersByFingerprint(
    fingerprint: string,
  ): Promise<{ userId: string; lastSeenAt: Date }[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const records = await (this.prisma as any).deviceFingerprint.findMany({
        where: { fingerprint },
        select: {
          userId: true,
          lastSeenAt: true,
        },
        orderBy: { lastSeenAt: 'desc' },
      });

      return records as { userId: string; lastSeenAt: Date }[];
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get users by fingerprint: ${msg}`);
      return [];
    }
  }

  /**
   * 将数据库记录转换为响应 DTO
   */
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  private toResponse(record: any): DeviceRecordResponse {
    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      id: record.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      userId: record.userId,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fingerprint: record.fingerprint,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      userAgent: record.userAgent ?? null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ipAddress: record.ipAddress ?? null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      deviceInfo: record.deviceInfo ?? null,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      firstSeenAt: record.createdAt,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      lastSeenAt: record.lastSeenAt,
    };
  }
}
