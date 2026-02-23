import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  BlacklistEntryDto,
  GetBlacklistResponseDto,
  AddToBlacklistResponseDto,
  RemoveFromBlacklistResponseDto,
  CheckBlacklistResponseDto,
} from './dto/blacklist.dto.js';

/**
 * 黑名单管理服务
 *
 * 需求21: 设置中心 - 黑名单管理
 * 需求21验收标准4: WHEN 用户添加黑名单 THEN System SHALL 屏蔽该用户的所有互动（私信、评论、@）
 * 需求21验收标准10: WHEN 用户拉黑其他用户 THEN System SHALL 屏蔽对方内容和互动
 * 需求21验收标准11: WHEN 用户解除拉黑 THEN System SHALL 恢复正常显示
 *
 * 提供设置中心的黑名单管理功能：
 * - 获取黑名单列表（分页）
 * - 添加用户到黑名单
 * - 从黑名单移除用户
 * - 检查用户是否在黑名单中
 */
@Injectable()
export class BlacklistManagementService {
  private readonly logger = new Logger(BlacklistManagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户的黑名单列表（分页）
   *
   * GET /api/v1/settings/blacklist
   *
   * @param userId 当前用户ID
   * @param page 页码
   * @param limit 每页数量
   * @returns 黑名单列表响应
   */
  async getBlacklist(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<GetBlacklistResponseDto> {
    const skip = (page - 1) * limit;

    const [total, blacklistEntries] = await Promise.all([
      this.prisma.userBlacklist.count({
        where: { userId },
      }),
      this.prisma.userBlacklist.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          blockedUser: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      }),
    ]);

    const users: BlacklistEntryDto[] = blacklistEntries.map((entry) => ({
      id: entry.id,
      blockedUserId: entry.blockedUserId,
      blockedUser: {
        id: entry.blockedUser.id,
        username: entry.blockedUser.username,
        displayName: entry.blockedUser.displayName,
        avatar: entry.blockedUser.avatar,
      },
      reason: entry.reason,
      createdAt: entry.createdAt,
    }));

    return {
      success: true,
      data: {
        users,
        total,
        page,
        limit,
        hasMore: skip + blacklistEntries.length < total,
      },
    };
  }

  /**
   * 添加用户到黑名单
   *
   * POST /api/v1/settings/blacklist/:userId
   *
   * 需求21验收标准4: WHEN 用户添加黑名单 THEN System SHALL 屏蔽该用户的所有互动（私信、评论、@）
   * 需求21验收标准10: WHEN 用户拉黑其他用户 THEN System SHALL 屏蔽对方内容和互动
   *
   * @param userId 当前用户ID
   * @param targetUserId 要拉黑的用户ID
   * @param reason 拉黑原因（可选）
   * @returns 添加结果响应
   */
  async addToBlacklist(
    userId: string,
    targetUserId: string,
    reason?: string,
  ): Promise<AddToBlacklistResponseDto> {
    // 不能拉黑自己
    if (userId === targetUserId) {
      throw new BadRequestException('不能拉黑自己');
    }

    // 验证目标用户存在
    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        isActive: true,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('用户不存在');
    }

    if (!targetUser.isActive) {
      throw new BadRequestException('该用户已被禁用');
    }

    // 检查是否已经拉黑
    const existingBlock = await this.prisma.userBlacklist.findUnique({
      where: {
        userId_blockedUserId: {
          userId,
          blockedUserId: targetUserId,
        },
      },
    });

    if (existingBlock) {
      throw new ConflictException('您已经拉黑了该用户');
    }

    // 创建黑名单记录
    const blacklistEntry = await this.prisma.userBlacklist.create({
      data: {
        userId,
        blockedUserId: targetUserId,
        reason,
      },
    });

    this.logger.log(
      `User ${userId} added user ${targetUserId} to blacklist${reason ? ` with reason: ${reason}` : ''}`,
    );

    return {
      success: true,
      message: '已将该用户加入黑名单',
      data: {
        id: blacklistEntry.id,
        blockedUserId: blacklistEntry.blockedUserId,
        blockedUser: {
          id: targetUser.id,
          username: targetUser.username,
          displayName: targetUser.displayName,
          avatar: targetUser.avatar,
        },
        reason: blacklistEntry.reason,
        createdAt: blacklistEntry.createdAt,
      },
    };
  }

  /**
   * 从黑名单移除用户
   *
   * DELETE /api/v1/settings/blacklist/:userId
   *
   * 需求21验收标准11: WHEN 用户解除拉黑 THEN System SHALL 恢复正常显示
   *
   * @param userId 当前用户ID
   * @param targetUserId 要解除拉黑的用户ID
   * @returns 移除结果响应
   */
  async removeFromBlacklist(
    userId: string,
    targetUserId: string,
  ): Promise<RemoveFromBlacklistResponseDto> {
    // 检查是否存在拉黑记录
    const blacklistEntry = await this.prisma.userBlacklist.findUnique({
      where: {
        userId_blockedUserId: {
          userId,
          blockedUserId: targetUserId,
        },
      },
    });

    if (!blacklistEntry) {
      throw new NotFoundException('您没有拉黑该用户');
    }

    // 删除黑名单记录
    await this.prisma.userBlacklist.delete({
      where: {
        userId_blockedUserId: {
          userId,
          blockedUserId: targetUserId,
        },
      },
    });

    this.logger.log(
      `User ${userId} removed user ${targetUserId} from blacklist`,
    );

    return {
      success: true,
      message: '已将该用户从黑名单移除',
    };
  }

  /**
   * 检查用户是否在黑名单中
   *
   * GET /api/v1/settings/blacklist/check/:userId
   *
   * @param userId 当前用户ID
   * @param targetUserId 要检查的用户ID
   * @returns 检查结果响应
   */
  async checkBlacklist(
    userId: string,
    targetUserId: string,
  ): Promise<CheckBlacklistResponseDto> {
    const blacklistEntry = await this.prisma.userBlacklist.findUnique({
      where: {
        userId_blockedUserId: {
          userId,
          blockedUserId: targetUserId,
        },
      },
    });

    if (blacklistEntry) {
      return {
        success: true,
        data: {
          isBlocked: true,
          blockedAt: blacklistEntry.createdAt,
          reason: blacklistEntry.reason,
        },
      };
    }

    return {
      success: true,
      data: {
        isBlocked: false,
      },
    };
  }
}
