import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CacheService } from '../../redis/cache.service.js';
import {
  LoginDeviceDto,
  GetLoginDevicesResponseDto,
  GetDeviceByIdResponseDto,
  RemoveDeviceResponseDto,
  RemoveAllOtherDevicesResponseDto,
} from './dto/index.js';

/**
 * 设备数据库记录接口
 */
interface DeviceRecord {
  id: string;
  fingerprint: string;
  userAgent: string | null;
  ipAddress: string | null;
  deviceName: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  location: string | null;
  lastSeenAt: Date;
  createdAt: Date;
}

/**
 * 设备管理服务
 *
 * 需求21: 设置中心 - 登录设备管理
 * 需求21验收标准2: WHEN 用户查看登录设备 THEN System SHALL 显示设备名称、登录时间、IP地址
 * 需求21验收标准3: WHEN 用户移除登录设备 THEN System SHALL 使该设备的会话失效
 */
@Injectable()
export class DeviceManagementService {
  private readonly logger = new Logger(DeviceManagementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 解析 User-Agent 获取设备信息
   */
  private parseUserAgent(userAgent: string | null): {
    deviceName: string;
    deviceType: string;
    browser: string;
    os: string;
  } {
    if (!userAgent) {
      return {
        deviceName: '未知设备',
        deviceType: 'unknown',
        browser: '未知浏览器',
        os: '未知系统',
      };
    }

    // 解析浏览器
    let browser = '未知浏览器';
    if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
      browser = 'Chrome';
    } else if (userAgent.includes('Firefox')) {
      browser = 'Firefox';
    } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
      browser = 'Safari';
    } else if (userAgent.includes('Edg')) {
      browser = 'Edge';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      browser = 'Opera';
    } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
      browser = 'Internet Explorer';
    }

    // 解析操作系统
    let os = '未知系统';
    if (userAgent.includes('Windows NT 10')) {
      os = 'Windows 10/11';
    } else if (userAgent.includes('Windows NT 6.3')) {
      os = 'Windows 8.1';
    } else if (userAgent.includes('Windows NT 6.2')) {
      os = 'Windows 8';
    } else if (userAgent.includes('Windows NT 6.1')) {
      os = 'Windows 7';
    } else if (userAgent.includes('Windows')) {
      os = 'Windows';
    } else if (userAgent.includes('Mac OS X')) {
      os = 'macOS';
    } else if (userAgent.includes('Linux')) {
      os = 'Linux';
    } else if (userAgent.includes('Android')) {
      os = 'Android';
    } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
      os = 'iOS';
    }

    // 解析设备类型
    let deviceType = 'desktop';
    if (
      userAgent.includes('Mobile') ||
      userAgent.includes('Android') ||
      userAgent.includes('iPhone')
    ) {
      deviceType = 'mobile';
    } else if (userAgent.includes('iPad') || userAgent.includes('Tablet')) {
      deviceType = 'tablet';
    }

    // 生成设备名称
    const deviceName = `${browser} on ${os}`;

    return { deviceName, deviceType, browser, os };
  }

  /**
   * 将数据库记录转换为 DTO
   */
  private toLoginDeviceDto(
    device: DeviceRecord,
    currentFingerprint?: string,
  ): LoginDeviceDto {
    const parsedInfo = this.parseUserAgent(device.userAgent);

    return {
      id: device.id,
      fingerprint: device.fingerprint,
      deviceName: device.deviceName || parsedInfo.deviceName,
      deviceType: device.deviceType || parsedInfo.deviceType,
      browser: device.browser || parsedInfo.browser,
      os: device.os || parsedInfo.os,
      ipAddress: device.ipAddress,
      location: device.location,
      lastActiveAt: device.lastSeenAt,
      createdAt: device.createdAt,
      isCurrentDevice: currentFingerprint
        ? device.fingerprint === currentFingerprint
        : false,
    };
  }

  /**
   * 获取用户所有登录设备
   *
   * 需求21验收标准2: WHEN 用户查看登录设备 THEN System SHALL 显示设备名称、登录时间、IP地址
   *
   * @param userId 用户ID
   * @param currentFingerprint 当前设备指纹（用于标记当前设备）
   */
  async getLoginDevices(
    userId: string,
    currentFingerprint?: string,
  ): Promise<GetLoginDevicesResponseDto> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const devices: DeviceRecord[] = await (
        this.prisma as any
      ).deviceFingerprint.findMany({
        where: { userId },
        orderBy: { lastSeenAt: 'desc' },
      });

      const deviceDtos = devices.map((device) =>
        this.toLoginDeviceDto(device, currentFingerprint),
      );

      this.logger.log(`Retrieved ${devices.length} devices for user ${userId}`);

      return {
        message: '获取登录设备列表成功',
        devices: deviceDtos,
        total: devices.length,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get login devices: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 获取单个设备详情
   *
   * @param userId 用户ID
   * @param deviceId 设备ID
   * @param currentFingerprint 当前设备指纹
   */
  async getDeviceById(
    userId: string,
    deviceId: string,
    currentFingerprint?: string,
  ): Promise<GetDeviceByIdResponseDto> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const device: DeviceRecord | null = await (
        this.prisma as any
      ).deviceFingerprint.findFirst({
        where: {
          id: deviceId,
          userId,
        },
      });

      if (!device) {
        return {
          message: '设备不存在',
          device: null,
        };
      }

      return {
        message: '获取设备详情成功',
        device: this.toLoginDeviceDto(device, currentFingerprint),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get device by id: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 移除设备（使该设备的会话失效）
   *
   * 需求21验收标准3: WHEN 用户移除登录设备 THEN System SHALL 使该设备的会话失效
   *
   * @param userId 用户ID
   * @param deviceId 设备ID
   * @param currentFingerprint 当前设备指纹（防止移除当前设备）
   */
  async removeDevice(
    userId: string,
    deviceId: string,
    currentFingerprint?: string,
  ): Promise<RemoveDeviceResponseDto> {
    try {
      // 查找设备
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const device: DeviceRecord | null = await (
        this.prisma as any
      ).deviceFingerprint.findFirst({
        where: {
          id: deviceId,
          userId,
        },
      });

      if (!device) {
        throw new NotFoundException('设备不存在或无权操作');
      }

      // 检查是否为当前设备
      if (currentFingerprint && device.fingerprint === currentFingerprint) {
        throw new ForbiddenException('不能移除当前正在使用的设备');
      }

      // 删除设备记录
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).deviceFingerprint.delete({
        where: { id: deviceId },
      });

      // 使该设备的会话失效（通过清除与该设备相关的缓存）
      await this.invalidateDeviceSessions(userId, device.fingerprint);

      this.logger.log(`Device ${deviceId} removed for user ${userId}`);

      return {
        success: true,
        message: '设备已成功移除，该设备的会话已失效',
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to remove device: ${errorMessage}`);
      return {
        success: false,
        message: '移除设备失败',
      };
    }
  }

  /**
   * 移除所有其他设备（保留当前设备）
   *
   * @param userId 用户ID
   * @param currentFingerprint 当前设备指纹
   */
  async removeAllOtherDevices(
    userId: string,
    currentFingerprint: string,
  ): Promise<RemoveAllOtherDevicesResponseDto> {
    try {
      if (!currentFingerprint) {
        throw new ForbiddenException('无法识别当前设备');
      }

      // 获取所有其他设备
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const otherDevices: DeviceRecord[] = await (
        this.prisma as any
      ).deviceFingerprint.findMany({
        where: {
          userId,
          fingerprint: { not: currentFingerprint },
        },
      });

      if (otherDevices.length === 0) {
        return {
          success: true,
          message: '没有其他设备需要移除',
          removedCount: 0,
        };
      }

      // 删除所有其他设备
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result: { count: number } = await (
        this.prisma as any
      ).deviceFingerprint.deleteMany({
        where: {
          userId,
          fingerprint: { not: currentFingerprint },
        },
      });

      // 使所有其他设备的会话失效
      for (const device of otherDevices) {
        await this.invalidateDeviceSessions(userId, device.fingerprint);
      }

      this.logger.log(
        `Removed ${result.count} other devices for user ${userId}`,
      );

      return {
        success: true,
        message: `已成功移除 ${result.count} 个其他设备`,
        removedCount: result.count,
      };
    } catch (error: unknown) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to remove all other devices: ${errorMessage}`);
      return {
        success: false,
        message: '移除其他设备失败',
        removedCount: 0,
      };
    }
  }

  /**
   * 使设备会话失效
   * 通过清除与该设备相关的缓存来实现
   *
   * @param userId 用户ID
   * @param fingerprint 设备指纹
   */
  private async invalidateDeviceSessions(
    userId: string,
    fingerprint: string,
  ): Promise<void> {
    try {
      // 清除与该设备相关的会话缓存
      const sessionKey = `session:${userId}:${fingerprint}`;
      await this.cacheService.del(sessionKey);

      // 清除用户的刷新令牌缓存（可选，根据实际实现）
      const refreshTokenKey = `refresh_token:${userId}:${fingerprint}`;
      await this.cacheService.del(refreshTokenKey);

      this.logger.debug(
        `Invalidated sessions for device ${fingerprint} of user ${userId}`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to invalidate device sessions: ${errorMessage}`);
      // 不抛出错误，因为设备已经被删除
    }
  }

  /**
   * 更新设备信息
   * 在用户登录时调用，更新设备的详细信息
   *
   * @param userId 用户ID
   * @param fingerprint 设备指纹
   * @param userAgent User-Agent 字符串
   * @param ipAddress IP地址
   */
  async updateDeviceInfo(
    userId: string,
    fingerprint: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const parsedInfo = this.parseUserAgent(userAgent || null);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await (this.prisma as any).deviceFingerprint.upsert({
        where: {
          userId_fingerprint: {
            userId,
            fingerprint,
          },
        },
        create: {
          userId,
          fingerprint,
          userAgent,
          ipAddress,
          deviceName: parsedInfo.deviceName,
          deviceType: parsedInfo.deviceType,
          browser: parsedInfo.browser,
          os: parsedInfo.os,
          lastSeenAt: new Date(),
        },
        update: {
          userAgent,
          ipAddress,
          deviceName: parsedInfo.deviceName,
          deviceType: parsedInfo.deviceType,
          browser: parsedInfo.browser,
          os: parsedInfo.os,
          lastSeenAt: new Date(),
        },
      });

      this.logger.debug(`Updated device info for user ${userId}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update device info: ${errorMessage}`);
      // 不抛出错误，不影响主流程
    }
  }
}
