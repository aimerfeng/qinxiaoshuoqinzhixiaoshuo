import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BlacklistManagementService } from './blacklist-management.service.js';
import {
  GetBlacklistQueryDto,
  GetBlacklistResponseDto,
  AddToBlacklistDto,
  AddToBlacklistResponseDto,
  RemoveFromBlacklistResponseDto,
  CheckBlacklistResponseDto,
} from './dto/blacklist.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * 认证请求类型
 */
interface AuthenticatedRequest {
  user: { userId: string };
}

/**
 * 黑名单管理控制器
 *
 * 需求21: 设置中心 - 黑名单管理
 * 需求21验收标准4: WHEN 用户添加黑名单 THEN System SHALL 屏蔽该用户的所有互动（私信、评论、@）
 * 需求21验收标准10: WHEN 用户拉黑其他用户 THEN System SHALL 屏蔽对方内容和互动
 * 需求21验收标准11: WHEN 用户解除拉黑 THEN System SHALL 恢复正常显示
 *
 * API 端点：
 * - GET /api/v1/settings/blacklist - 获取用户的黑名单列表（分页）
 * - POST /api/v1/settings/blacklist/:userId - 添加用户到黑名单
 * - DELETE /api/v1/settings/blacklist/:userId - 从黑名单移除用户
 * - GET /api/v1/settings/blacklist/check/:userId - 检查用户是否在黑名单中
 */
@Controller('settings/blacklist')
@UseGuards(JwtAuthGuard)
export class BlacklistManagementController {
  constructor(
    private readonly blacklistManagementService: BlacklistManagementService,
  ) {}

  /**
   * 获取用户的黑名单列表
   * GET /api/v1/settings/blacklist
   *
   * @param req 请求对象（包含用户信息）
   * @param query 查询参数（分页）
   * @returns 黑名单列表
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  async getBlacklist(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetBlacklistQueryDto,
  ): Promise<GetBlacklistResponseDto> {
    const userId = req.user.userId;
    return this.blacklistManagementService.getBlacklist(
      userId,
      query.page,
      query.limit,
    );
  }

  /**
   * 检查用户是否在黑名单中
   * GET /api/v1/settings/blacklist/check/:userId
   *
   * 注意：此路由必须在 :userId 路由之前定义，否则会被 :userId 捕获
   *
   * @param req 请求对象（包含用户信息）
   * @param targetUserId 要检查的用户ID
   * @returns 检查结果
   */
  @Get('check/:userId')
  @HttpCode(HttpStatus.OK)
  async checkBlacklist(
    @Request() req: AuthenticatedRequest,
    @Param('userId') targetUserId: string,
  ): Promise<CheckBlacklistResponseDto> {
    const userId = req.user.userId;
    return this.blacklistManagementService.checkBlacklist(userId, targetUserId);
  }

  /**
   * 添加用户到黑名单
   * POST /api/v1/settings/blacklist/:userId
   *
   * 需求21验收标准4: WHEN 用户添加黑名单 THEN System SHALL 屏蔽该用户的所有互动（私信、评论、@）
   * 需求21验收标准10: WHEN 用户拉黑其他用户 THEN System SHALL 屏蔽对方内容和互动
   *
   * @param req 请求对象（包含用户信息）
   * @param targetUserId 要拉黑的用户ID
   * @param body 请求体（可选的拉黑原因）
   * @returns 添加结果
   */
  @Post(':userId')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async addToBlacklist(
    @Request() req: AuthenticatedRequest,
    @Param('userId') targetUserId: string,
    @Body() body: AddToBlacklistDto,
  ): Promise<AddToBlacklistResponseDto> {
    const userId = req.user.userId;
    return this.blacklistManagementService.addToBlacklist(
      userId,
      targetUserId,
      body.reason,
    );
  }

  /**
   * 从黑名单移除用户
   * DELETE /api/v1/settings/blacklist/:userId
   *
   * 需求21验收标准11: WHEN 用户解除拉黑 THEN System SHALL 恢复正常显示
   *
   * @param req 请求对象（包含用户信息）
   * @param targetUserId 要解除拉黑的用户ID
   * @returns 移除结果
   */
  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  async removeFromBlacklist(
    @Request() req: AuthenticatedRequest,
    @Param('userId') targetUserId: string,
  ): Promise<RemoveFromBlacklistResponseDto> {
    const userId = req.user.userId;
    return this.blacklistManagementService.removeFromBlacklist(
      userId,
      targetUserId,
    );
  }
}
