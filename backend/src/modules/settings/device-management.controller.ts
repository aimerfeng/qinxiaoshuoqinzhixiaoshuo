import {
  Controller,
  Get,
  Delete,
  Post,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { DeviceManagementService } from './device-management.service.js';
import {
  GetLoginDevicesResponseDto,
  GetDeviceByIdResponseDto,
  RemoveDeviceResponseDto,
  RemoveAllOtherDevicesResponseDto,
} from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * 设备管理控制器
 *
 * 需求21: 设置中心 - 登录设备管理
 * 需求21验收标准2: WHEN 用户查看登录设备 THEN System SHALL 显示设备名称、登录时间、IP地址
 * 需求21验收标准3: WHEN 用户移除登录设备 THEN System SHALL 使该设备的会话失效
 *
 * API 端点：
 * - GET /api/v1/settings/devices - 获取所有登录设备
 * - GET /api/v1/settings/devices/:deviceId - 获取单个设备详情
 * - DELETE /api/v1/settings/devices/:deviceId - 移除指定设备
 * - POST /api/v1/settings/devices/logout-others - 登出所有其他设备
 */
@Controller('settings/devices')
@UseGuards(JwtAuthGuard)
export class DeviceManagementController {
  constructor(
    private readonly deviceManagementService: DeviceManagementService,
  ) {}

  /**
   * 获取所有登录设备
   * GET /api/v1/settings/devices
   *
   * 需求21验收标准2: WHEN 用户查看登录设备 THEN System SHALL 显示设备名称、登录时间、IP地址
   *
   * @param req 请求对象（包含用户信息）
   * @param fingerprint 当前设备指纹（从请求头获取）
   * @returns 登录设备列表
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getLoginDevices(
    @Request() req: any,
    @Headers('x-device-fingerprint') fingerprint?: string,
  ): Promise<GetLoginDevicesResponseDto> {
    const userId = req.user.userId as string;
    return this.deviceManagementService.getLoginDevices(userId, fingerprint);
  }

  /**
   * 获取单个设备详情
   * GET /api/v1/settings/devices/:deviceId
   *
   * @param req 请求对象（包含用户信息）
   * @param deviceId 设备ID
   * @param fingerprint 当前设备指纹（从请求头获取）
   * @returns 设备详情
   */
  @Get(':deviceId')
  @HttpCode(HttpStatus.OK)
  async getDeviceById(
    @Request() req: any,
    @Param('deviceId') deviceId: string,
    @Headers('x-device-fingerprint') fingerprint?: string,
  ): Promise<GetDeviceByIdResponseDto> {
    const userId = req.user.userId as string;
    return this.deviceManagementService.getDeviceById(
      userId,
      deviceId,
      fingerprint,
    );
  }

  /**
   * 移除指定设备
   * DELETE /api/v1/settings/devices/:deviceId
   *
   * 需求21验收标准3: WHEN 用户移除登录设备 THEN System SHALL 使该设备的会话失效
   *
   * @param req 请求对象（包含用户信息）
   * @param deviceId 设备ID
   * @param fingerprint 当前设备指纹（从请求头获取，用于防止移除当前设备）
   * @returns 移除结果
   */
  @Delete(':deviceId')
  @HttpCode(HttpStatus.OK)
  async removeDevice(
    @Request() req: any,
    @Param('deviceId') deviceId: string,
    @Headers('x-device-fingerprint') fingerprint?: string,
  ): Promise<RemoveDeviceResponseDto> {
    const userId = req.user.userId as string;
    return this.deviceManagementService.removeDevice(
      userId,
      deviceId,
      fingerprint,
    );
  }

  /**
   * 登出所有其他设备
   * POST /api/v1/settings/devices/logout-others
   *
   * 保留当前设备，移除所有其他设备并使其会话失效
   *
   * @param req 请求对象（包含用户信息）
   * @param fingerprint 当前设备指纹（从请求头获取）
   * @returns 移除结果
   */
  @Post('logout-others')
  @HttpCode(HttpStatus.OK)
  async logoutOtherDevices(
    @Request() req: any,
    @Headers('x-device-fingerprint') fingerprint: string,
  ): Promise<RemoveAllOtherDevicesResponseDto> {
    const userId = req.user.userId as string;
    return this.deviceManagementService.removeAllOtherDevices(
      userId,
      fingerprint,
    );
  }
}
