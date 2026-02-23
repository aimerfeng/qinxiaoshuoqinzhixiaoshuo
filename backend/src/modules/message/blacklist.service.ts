import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 黑名单响应DTO
 */
export interface BlockedUserDto {
  id: string;
  blockedUserId: string;
  blockedUser: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  reason: string | null;
  createdAt: Date;
}

/**
 * 被拉黑用户响应DTO
 */
export interface BlockedByUserDto {
  id: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
  createdAt: Date;
}

/**
 * 黑名单检查结果
 */
export interface BlacklistCheckResult {
  isBlocked: boolean;
  blockedBy: 'self' | 'target' | null;
  message: string | null;
}

/**
 * 黑名单服务
 *
 * 需求20: 私信系统
 * - 20.1.6 黑名单检查
 *
 * 提供用户黑名单管理功能：
 * - 拉黑/取消拉黑用户
 * - 检查黑名单状态
 * - 获取黑名单列表
 */
@Injectable()
export class BlacklistService {
  private readonly logger = new Logger(BlacklistService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 检查目标用户是否被当前用户拉黑
   *
   * @param userId 当前用户ID
   * @param targetUserId 目标用户ID
   * @returns 是否被拉黑
   */
  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const blacklistEntry = await this.prisma.userBlacklist.findUnique({
      where: {
        userId_blockedUserId: {
          userId,
          blockedUserId: targetUserId,
        },
      },
    });
    return !!blacklistEntry;
  }

  /**
   * 双向检查黑名单状态
   * 检查两个用户之间是否存在任一方向的拉黑关系
   *
   * @param userId1 用户1 ID
   * @param userId2 用户2 ID
   * @returns 黑名单检查结果，包含是否被拉黑、拉黑方向和提示消息
   */
  async isBlockedBidirectional(
    userId1: string,
    userId2: string,
  ): Promise<BlacklistCheckResult> {
    // 检查 userId1 是否拉黑了 userId2
    const blockedByUser1 = await this.prisma.userBlacklist.findUnique({
      where: {
        userId_blockedUserId: {
          userId: userId1,
          blockedUserId: userId2,
        },
      },
    });

    if (blockedByUser1) {
      return {
        isBlocked: true,
        blockedBy: 'self',
        message: '无法发送消息，您已将对方拉黑',
      };
    }

    // 检查 userId2 是否拉黑了 userId1
    const blockedByUser2 = await this.prisma.userBlacklist.findUnique({
      where: {
        userId_blockedUserId: {
          userId: userId2,
          blockedUserId: userId1,
        },
      },
    });

    if (blockedByUser2) {
      return {
        isBlocked: true,
        blockedBy: 'target',
        message: '无法发送消息，您已被对方拉黑',
      };
    }

    return {
      isBlocked: false,
      blockedBy: null,
      message: null,
    };
  }

  /**
   * 拉黑用户
   *
   * @param userId 当前用户ID
   * @param targetUserId 要拉黑的用户ID
   * @param reason 拉黑原因（可选）
   * @returns 创建的黑名单记录
   */
  async blockUser(
    userId: string,
    targetUserId: string,
    reason?: string,
  ): Promise<BlockedUserDto> {
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
      `User ${userId} blocked user ${targetUserId}${reason ? ` with reason: ${reason}` : ''}`,
    );

    return {
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
    };
  }

  /**
   * 取消拉黑用户
   *
   * @param userId 当前用户ID
   * @param targetUserId 要取消拉黑的用户ID
   */
  async unblockUser(userId: string, targetUserId: string): Promise<void> {
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

    this.logger.log(`User ${userId} unblocked user ${targetUserId}`);
  }

  /**
   * 获取用户拉黑的用户列表
   *
   * @param userId 用户ID
   * @param page 页码
   * @param limit 每页数量
   * @returns 被拉黑的用户列表
   */
  async getBlockedUsers(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    users: BlockedUserDto[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
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

    const users: BlockedUserDto[] = blacklistEntries.map((entry) => ({
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
      users,
      total,
      page,
      limit,
      hasMore: skip + blacklistEntries.length < total,
    };
  }

  /**
   * 获取拉黑当前用户的用户列表
   * （通常用于管理员查看或调试）
   *
   * @param userId 用户ID
   * @param page 页码
   * @param limit 每页数量
   * @returns 拉黑当前用户的用户列表
   */
  async getBlockedByUsers(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    users: BlockedByUserDto[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    const [total, blacklistEntries] = await Promise.all([
      this.prisma.userBlacklist.count({
        where: { blockedUserId: userId },
      }),
      this.prisma.userBlacklist.findMany({
        where: { blockedUserId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
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

    const users: BlockedByUserDto[] = blacklistEntries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      user: {
        id: entry.user.id,
        username: entry.user.username,
        displayName: entry.user.displayName,
        avatar: entry.user.avatar,
      },
      createdAt: entry.createdAt,
    }));

    return {
      users,
      total,
      page,
      limit,
      hasMore: skip + blacklistEntries.length < total,
    };
  }

  /**
   * 检查特定用户是否被当前用户拉黑
   *
   * @param userId 当前用户ID
   * @param targetUserId 目标用户ID
   * @returns 是否被拉黑
   */
  async checkIsBlocked(
    userId: string,
    targetUserId: string,
  ): Promise<{ isBlocked: boolean }> {
    const isBlocked = await this.isBlocked(userId, targetUserId);
    return { isBlocked };
  }
}
