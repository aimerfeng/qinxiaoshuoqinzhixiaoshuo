import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminService, AdminLoginResponse, AdminUser } from './admin.service.js';
import { AdminLoginDto } from './dto/admin-login.dto.js';
import { AdminGuard } from '../../common/guards/admin.guard.js';
import { Admin } from '../../common/decorators/admin.decorator.js';
import { UserManagementService } from './user-management.service.js';
import {
  UserListQueryDto,
  UserUpdateDto,
  UserListResponseDto,
  UserDetailDto,
  UserOperationResultDto,
} from './dto/user-management.dto.js';

/**
 * 扩展 Request 类型以包含用户信息
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    userId: string;
    email: string;
    sessionId: string;
    isAdmin?: boolean;
  };
}

/**
 * 管理后台控制器
 * 提供管理员认证和管理功能的 API 端点
 * 
 * 需求18: 管理后台
 */
@Controller('api/v1/admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly userManagementService: UserManagementService,
  ) {}

  /**
   * 管理员登录
   * 
   * POST /api/v1/admin/login
   * 
   * 需求18验收标准1: WHEN 运营人员登录后台 THEN System SHALL 验证权限并显示对应功能模块
   * 
   * @param loginDto 登录信息
   * @param req 请求对象
   * @returns 登录结果
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: AdminLoginDto,
    @Req() req: Request,
  ): Promise<AdminLoginResponse> {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.adminService.login(loginDto, ipAddress, userAgent);
  }

  /**
   * 获取当前管理员信息
   * 
   * GET /api/v1/admin/profile
   * 
   * @param req 请求对象
   * @returns 管理员信息
   */
  @Get('profile')
  @UseGuards(AdminGuard)
  @Admin()
  async getProfile(@Req() req: AuthenticatedRequest): Promise<AdminUser | null> {
    return this.adminService.getAdminProfile(req.user.id);
  }

  /**
   * 验证管理员身份
   * 
   * GET /api/v1/admin/verify
   * 
   * 用于前端检查当前用户是否为管理员
   * 
   * @param req 请求对象
   * @returns 验证结果
   */
  @Get('verify')
  @UseGuards(AdminGuard)
  @Admin()
  async verifyAdmin(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ isAdmin: boolean; userId: string }> {
    const isAdmin = await this.adminService.verifyAdmin(req.user.id);
    return {
      isAdmin,
      userId: req.user.id,
    };
  }

  /**
   * 获取客户端 IP 地址
   */
  private getClientIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.ip || req.socket.remoteAddress;
  }

  // ==================== 用户管理 API ====================

  /**
   * 获取用户列表
   *
   * GET /api/v1/admin/users
   *
   * 需求18验收标准3: WHEN 运营人员搜索用户 THEN System SHALL 支持按ID、昵称、邮箱等条件查询
   */
  @Get('users')
  @UseGuards(AdminGuard)
  @Admin()
  async getUserList(
    @Query() query: UserListQueryDto,
  ): Promise<UserListResponseDto> {
    return this.userManagementService.getUserList(query);
  }

  /**
   * 获取用户详情
   *
   * GET /api/v1/admin/users/:userId
   *
   * 需求18验收标准4: WHEN 运营人员查看用户详情 THEN System SHALL 显示资料、行为记录、处罚历史
   */
  @Get('users/:userId')
  @UseGuards(AdminGuard)
  @Admin()
  async getUserDetail(@Param('userId') userId: string): Promise<UserDetailDto> {
    return this.userManagementService.getUserDetail(userId);
  }

  /**
   * 更新用户信息
   *
   * PUT /api/v1/admin/users/:userId
   *
   * 需求18验收标准5: WHEN 运营人员封禁用户 THEN System SHALL 记录原因、生效时间并通知用户
   */
  @Put('users/:userId')
  @UseGuards(AdminGuard)
  @Admin()
  async updateUser(
    @Param('userId') userId: string,
    @Body() updateDto: UserUpdateDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserOperationResultDto> {
    return this.userManagementService.updateUser(userId, updateDto, req.user.id);
  }

  /**
   * 封禁用户
   *
   * POST /api/v1/admin/users/:userId/ban
   */
  @Post('users/:userId/ban')
  @UseGuards(AdminGuard)
  @Admin()
  @HttpCode(HttpStatus.OK)
  async banUser(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserOperationResultDto> {
    return this.userManagementService.banUser(userId, reason, req.user.id);
  }

  /**
   * 解封用户
   *
   * POST /api/v1/admin/users/:userId/unban
   */
  @Post('users/:userId/unban')
  @UseGuards(AdminGuard)
  @Admin()
  @HttpCode(HttpStatus.OK)
  async unbanUser(
    @Param('userId') userId: string,
    @Body('reason') reason: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<UserOperationResultDto> {
    return this.userManagementService.unbanUser(userId, reason, req.user.id);
  }
}
