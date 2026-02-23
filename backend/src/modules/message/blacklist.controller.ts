import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BlacklistService } from './blacklist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  BlockUserDto,
  GetBlockedUsersDto,
  BlockedUserResponseDto,
  BlockedUsersListResponseDto,
  IsBlockedResponseDto,
} from './dto';

interface AuthenticatedRequest {
  user: { userId: string };
}

/**
 * 黑名单控制器
 *
 * 需求20: 私信系统
 * - 20.1.6 黑名单检查
 *
 * API 端点:
 * - POST /api/v1/users/:userId/block - 拉黑用户
 * - DELETE /api/v1/users/:userId/block - 取消拉黑用户
 * - GET /api/v1/users/blocked - 获取黑名单列表
 * - GET /api/v1/users/:userId/is-blocked - 检查用户是否被拉黑
 */
@Controller('users')
@UseGuards(JwtAuthGuard)
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  /**
   * 拉黑用户
   * POST /api/v1/users/:userId/block
   *
   * 需求 20.1.6: 黑名单检查
   * - 将指定用户加入黑名单
   * - 可选提供拉黑原因
   */
  @Post(':userId/block')
  @HttpCode(HttpStatus.CREATED)
  async blockUser(
    @Request() req: AuthenticatedRequest,
    @Param('userId') targetUserId: string,
    @Body() dto: BlockUserDto,
  ): Promise<BlockedUserResponseDto> {
    return this.blacklistService.blockUser(
      req.user.userId,
      targetUserId,
      dto.reason,
    );
  }

  /**
   * 取消拉黑用户
   * DELETE /api/v1/users/:userId/block
   *
   * 需求 20.1.6: 黑名单检查
   * - 将指定用户从黑名单中移除
   */
  @Delete(':userId/block')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unblockUser(
    @Request() req: AuthenticatedRequest,
    @Param('userId') targetUserId: string,
  ): Promise<void> {
    return this.blacklistService.unblockUser(req.user.userId, targetUserId);
  }

  /**
   * 获取黑名单列表
   * GET /api/v1/users/blocked
   *
   * 需求 20.1.6: 黑名单检查
   * - 获取当前用户拉黑的所有用户列表
   * - 支持分页
   */
  @Get('blocked')
  async getBlockedUsers(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetBlockedUsersDto,
  ): Promise<BlockedUsersListResponseDto> {
    return this.blacklistService.getBlockedUsers(
      req.user.userId,
      query.page,
      query.limit,
    );
  }

  /**
   * 检查用户是否被拉黑
   * GET /api/v1/users/:userId/is-blocked
   *
   * 需求 20.1.6: 黑名单检查
   * - 检查指定用户是否在当前用户的黑名单中
   */
  @Get(':userId/is-blocked')
  async checkIsBlocked(
    @Request() req: AuthenticatedRequest,
    @Param('userId') targetUserId: string,
  ): Promise<IsBlockedResponseDto> {
    return this.blacklistService.checkIsBlocked(req.user.userId, targetUserId);
  }
}
