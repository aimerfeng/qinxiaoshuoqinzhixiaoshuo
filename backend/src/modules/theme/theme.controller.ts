import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ThemeService } from './theme.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import {
  CreateThemeDto,
  UpdateThemeDto,
  SetUserThemePreferenceDto,
  UpdateThemeCustomizationsDto,
} from './dto/index.js';
import {
  GetThemesResponseDto,
  GetUserThemesResponseDto,
  GetThemeResponseDto,
  CreateThemeResponseDto,
  UpdateThemeResponseDto,
  DeleteThemeResponseDto,
  GetUserActiveThemeResponseDto,
  SetUserThemePreferenceResponseDto,
  CheckThemeUnlockResponseDto,
} from './dto/theme-response.dto.js';

interface RequestWithUser extends Request {
  user: { userId: string };
}

/**
 * 主题控制器
 *
 * 需求23: 主题皮肤系统
 *
 * 提供以下功能：
 * - 获取主题列表 API (23.1.2)
 * - 获取主题详情 API
 * - 创建主题 API（管理员）
 * - 更新主题 API（管理员）
 * - 删除主题 API（管理员）
 * - 获取用户可用主题列表 API（含解锁状态）
 * - 获取用户当前主题 API (23.1.4)
 * - 设置用户主题偏好 API (23.1.4)
 * - 更新用户主题自定义配置 API
 * - 检查主题解锁状态 API (23.1.3)
 *
 * API 端点：
 * 公开 API:
 * - GET /api/v1/themes - 获取所有启用的主题列表
 * - GET /api/v1/themes/:themeId - 获取主题详情
 * - GET /api/v1/themes/name/:name - 通过名称获取主题
 *
 * 用户 API:
 * - GET /api/v1/themes/user/available - 获取用户可用主题列表（含解锁状态）
 * - GET /api/v1/themes/user/active - 获取用户当前激活的主题
 * - POST /api/v1/themes/user/preference - 设置用户主题偏好
 * - PUT /api/v1/themes/user/preference/:themeId/customizations - 更新主题自定义配置
 * - GET /api/v1/themes/user/unlock-status/:themeId - 检查主题解锁状态
 *
 * 管理员 API:
 * - GET /api/v1/themes/admin/all - 获取所有主题列表
 * - POST /api/v1/themes/admin - 创建主题
 * - PUT /api/v1/themes/admin/:themeId - 更新主题
 * - DELETE /api/v1/themes/admin/:themeId - 删除主题
 * - POST /api/v1/themes/admin/unlock/:userId/:themeId - 为用户解锁主题
 */
@Controller('themes')
export class ThemeController {
  constructor(private readonly themeService: ThemeService) {}

  // ==================== 公开 API ====================

  /**
   * 获取所有启用的主题列表（公开）
   * GET /api/v1/themes
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getActiveThemes(): Promise<GetThemesResponseDto> {
    return this.themeService.getActiveThemes();
  }

  /**
   * 获取主题详情
   * GET /api/v1/themes/:themeId
   */
  @Get(':themeId')
  @HttpCode(HttpStatus.OK)
  async getThemeById(
    @Param('themeId') themeId: string,
  ): Promise<GetThemeResponseDto> {
    return this.themeService.getThemeById(themeId);
  }

  /**
   * 通过名称获取主题
   * GET /api/v1/themes/name/:name
   */
  @Get('name/:name')
  @HttpCode(HttpStatus.OK)
  async getThemeByName(@Param('name') name: string): Promise<GetThemeResponseDto> {
    return this.themeService.getThemeByName(name);
  }

  // ==================== 用户 API ====================

  /**
   * 获取用户可用的主题列表（含解锁状态）
   * GET /api/v1/themes/user/available
   *
   * 需求23验收标准1: WHEN 用户进入主题设置 THEN System SHALL 显示可用主题列表和预览
   */
  @Get('user/available')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserThemes(
    @Request() req: RequestWithUser,
  ): Promise<GetUserThemesResponseDto> {
    return this.themeService.getUserThemes(req.user.userId);
  }

  /**
   * 获取用户当前激活的主题
   * GET /api/v1/themes/user/active
   */
  @Get('user/active')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserActiveTheme(
    @Request() req: RequestWithUser,
  ): Promise<GetUserActiveThemeResponseDto> {
    return this.themeService.getUserActiveTheme(req.user.userId);
  }

  /**
   * 设置用户主题偏好（切换主题）
   * POST /api/v1/themes/user/preference
   *
   * 需求23验收标准3: WHEN 用户确认切换 THEN System SHALL 应用主题并保存到用户偏好
   */
  @Post('user/preference')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async setUserThemePreference(
    @Request() req: RequestWithUser,
    @Body() data: SetUserThemePreferenceDto,
  ): Promise<SetUserThemePreferenceResponseDto> {
    return this.themeService.setUserThemePreference(req.user.userId, data);
  }

  /**
   * 更新用户主题自定义配置
   * PUT /api/v1/themes/user/preference/:themeId/customizations
   */
  @Put('user/preference/:themeId/customizations')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateUserThemeCustomizations(
    @Request() req: RequestWithUser,
    @Param('themeId') themeId: string,
    @Body() data: UpdateThemeCustomizationsDto,
  ): Promise<SetUserThemePreferenceResponseDto> {
    return this.themeService.updateUserThemeCustomizations(
      req.user.userId,
      themeId,
      data,
    );
  }

  /**
   * 检查主题解锁状态
   * GET /api/v1/themes/user/unlock-status/:themeId
   *
   * 需求23验收标准8: WHEN 用户查看锁定主题 THEN System SHALL 显示解锁条件和预览
   */
  @Get('user/unlock-status/:themeId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async checkThemeUnlockStatus(
    @Request() req: RequestWithUser,
    @Param('themeId') themeId: string,
  ): Promise<CheckThemeUnlockResponseDto> {
    return this.themeService.checkThemeUnlockStatus(req.user.userId, themeId);
  }

  // ==================== 管理员 API ====================

  /**
   * 获取所有主题列表（管理员）
   * GET /api/v1/themes/admin/all
   */
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async getAllThemes(): Promise<GetThemesResponseDto> {
    return this.themeService.getAllThemes();
  }

  /**
   * 创建主题（管理员）
   * POST /api/v1/themes/admin
   */
  @Post('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createTheme(@Body() data: CreateThemeDto): Promise<CreateThemeResponseDto> {
    return this.themeService.createTheme(data);
  }

  /**
   * 更新主题（管理员）
   * PUT /api/v1/themes/admin/:themeId
   */
  @Put('admin/:themeId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateTheme(
    @Param('themeId') themeId: string,
    @Body() data: UpdateThemeDto,
  ): Promise<UpdateThemeResponseDto> {
    return this.themeService.updateTheme(themeId, data);
  }

  /**
   * 删除主题（管理员）
   * DELETE /api/v1/themes/admin/:themeId
   */
  @Delete('admin/:themeId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async deleteTheme(
    @Param('themeId') themeId: string,
  ): Promise<DeleteThemeResponseDto> {
    return this.themeService.deleteTheme(themeId);
  }

  /**
   * 为用户解锁主题（管理员/系统）
   * POST /api/v1/themes/admin/unlock/:userId/:themeId
   */
  @Post('admin/unlock/:userId/:themeId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(HttpStatus.OK)
  async unlockThemeForUser(
    @Param('userId') userId: string,
    @Param('themeId') themeId: string,
  ): Promise<SetUserThemePreferenceResponseDto> {
    return this.themeService.unlockThemeForUser(userId, themeId);
  }
}
