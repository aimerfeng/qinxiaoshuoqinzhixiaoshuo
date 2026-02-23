import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SettingsService } from './settings.service.js';
import {
  UpdateSettingsDto,
  GetSettingsResponseDto,
  UpdateSettingsResponseDto,
  ResetSettingsResponseDto,
} from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * 设置控制器
 * 处理用户设置相关的 HTTP 请求
 *
 * 需求21: 设置中心
 *
 * API 端点：
 * - GET /api/v1/settings - 获取当前用户的设置
 * - PATCH /api/v1/settings - 更新当前用户的设置
 * - POST /api/v1/settings/reset - 重置为默认设置
 */
@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * 获取当前用户的设置
   * GET /api/v1/settings
   *
   * 需求21验收标准1: WHEN 用户进入设置中心 THEN System SHALL 显示分类设置菜单
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getUserSettings(@Request() req: any): Promise<GetSettingsResponseDto> {
    const userId = req.user.userId as string;
    return this.settingsService.getUserSettings(userId);
  }

  /**
   * 更新当前用户的设置
   * PATCH /api/v1/settings
   *
   * 需求21验收标准5: WHEN 用户设置主页隐私 THEN System SHALL 支持"公开/仅关注者/仅自己"三级
   * 需求21验收标准6: WHEN 用户设置通知偏好 THEN System SHALL 支持按类型单独开关
   * 需求21验收标准7: WHEN 用户设置免打扰时段 THEN System SHALL 在该时段内不推送通知
   * 需求21验收标准8: WHEN 用户修改阅读设置 THEN System SHALL 保存为默认配置并同步到云端
   * 需求21验收标准9: WHEN 用户切换主题 THEN System SHALL 即时应用并保存偏好
   */
  @Patch()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateUserSettings(
    @Request() req: any,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ): Promise<UpdateSettingsResponseDto> {
    const userId = req.user.userId as string;
    return this.settingsService.updateUserSettings(userId, updateSettingsDto);
  }

  /**
   * 重置为默认设置
   * POST /api/v1/settings/reset
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  async resetUserSettings(
    @Request() req: any,
  ): Promise<ResetSettingsResponseDto> {
    const userId = req.user.userId as string;
    return this.settingsService.resetUserSettings(userId);
  }
}
