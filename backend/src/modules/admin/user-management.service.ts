import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  UserListQueryDto,
  UserUpdateDto,
  UserListResponseDto,
  UserDetailDto,
  UserOperationResultDto,
  UserListItemDto,
  UserStatusFilter,
  UserRoleFilter,
} from './dto/user-management.dto.js';

/**
 * 用户管理服务
 *
 * 提供管理员用户管理功能
 */
@Injectable()
export class UserManagementService {
  private readonly logger = new Logger(UserManagementService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户列表
   */
  async getUserList(query: UserListQueryDto): Promise<UserListResponseDto> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status === UserStatusFilter.ACTIVE) {
      where.isActive = true;
    } else if (query.status === UserStatusFilter.BANNED) {
      where.isActive = false;
    }

    if (query.role === UserRoleFilter.ADMIN) {
      where.isAdmin = true;
    } else if (query.role === UserRoleFilter.USER) {
      where.isAdmin = false;
    }

    if (query.memberLevel) {
      where.memberLevel = query.memberLevel;
    }

    const orderBy: Record<string, 'asc' | 'desc'> = {};
    orderBy[query.sortBy || 'createdAt'] = query.sortOrder || 'desc';

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          email: true,
          username: true,
          displayName: true,
          avatar: true,
          isEmailVerified: true,
          isActive: true,
          isAdmin: true,
          memberLevel: true,
          contributionScore: true,
          lastLoginAt: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users as UserListItemDto[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }


  /**
   * 获取用户详情
   */
  async getUserDetail(userId: string): Promise<UserDetailDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        bio: true,
        isEmailVerified: true,
        isActive: true,
        isAdmin: true,
        memberLevel: true,
        contributionScore: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            backgroundImage: true,
            website: true,
            location: true,
            birthday: true,
            gender: true,
          },
        },
        _count: {
          select: {
            works: true,
            cards: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      avatar: user.avatar,
      bio: user.bio,
      isEmailVerified: user.isEmailVerified,
      isActive: user.isActive,
      isAdmin: user.isAdmin,
      memberLevel: user.memberLevel,
      contributionScore: user.contributionScore,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profile: user.profile,
      stats: {
        worksCount: user._count.works,
        cardsCount: user._count.cards,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        totalReadingTime: 0,
      },
    };
  }

  /**
   * 更新用户信息
   */
  async updateUser(
    userId: string,
    updateDto: UserUpdateDto,
    operatorId: string,
  ): Promise<UserOperationResultDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (updateDto.isActive !== undefined) {
      updateData.isActive = updateDto.isActive;
    }
    if (updateDto.isAdmin !== undefined) {
      updateData.isAdmin = updateDto.isAdmin;
    }
    if (updateDto.memberLevel !== undefined) {
      updateData.memberLevel = updateDto.memberLevel;
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        isEmailVerified: true,
        isActive: true,
        isAdmin: true,
        memberLevel: true,
        contributionScore: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    this.logger.log(
      `User ${userId} updated by operator ${operatorId}: ${JSON.stringify(updateDto)}`,
    );

    return {
      success: true,
      message: '用户信息更新成功',
      user: updated as UserListItemDto,
    };
  }

  /**
   * 封禁用户
   */
  async banUser(
    userId: string,
    reason: string,
    operatorId: string,
  ): Promise<UserOperationResultDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (!user.isActive) {
      return {
        success: false,
        message: '用户已被封禁',
      };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        isEmailVerified: true,
        isActive: true,
        isAdmin: true,
        memberLevel: true,
        contributionScore: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    this.logger.log(
      `User ${userId} banned by operator ${operatorId}, reason: ${reason}`,
    );

    return {
      success: true,
      message: '用户已被封禁',
      user: updated as UserListItemDto,
    };
  }

  /**
   * 解封用户
   */
  async unbanUser(
    userId: string,
    reason: string,
    operatorId: string,
  ): Promise<UserOperationResultDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    if (user.isActive) {
      return {
        success: false,
        message: '用户未被封禁',
      };
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatar: true,
        isEmailVerified: true,
        isActive: true,
        isAdmin: true,
        memberLevel: true,
        contributionScore: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    this.logger.log(
      `User ${userId} unbanned by operator ${operatorId}, reason: ${reason}`,
    );

    return {
      success: true,
      message: '用户已解封',
      user: updated as UserListItemDto,
    };
  }

  /**
   * 获取用户列表（简化版本，兼容旧接口）
   */
  async getUsers(query: {
    page?: number;
    pageSize?: number;
    search?: string;
    memberLevel?: string;
    isActive?: boolean;
  }) {
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (query.search) {
      where.OR = [
        { username: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { displayName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.memberLevel) {
      where.memberLevel = query.memberLevel;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          avatar: true,
          memberLevel: true,
          isActive: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取用户详情（简化版本，兼容旧接口）
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        avatar: true,
        bio: true,
        memberLevel: true,
        isActive: true,
        isAdmin: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            works: true,
            cards: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /**
   * 更新用户状态
   */
  async updateUserStatus(userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        username: true,
        isActive: true,
      },
    });

    this.logger.log(
      `User ${userId} status updated to ${isActive ? 'active' : 'inactive'}`,
    );

    return updated;
  }

  /**
   * 更新用户会员等级
   */
  async updateMemberLevel(userId: string, memberLevel: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data: { memberLevel: memberLevel as any },
      select: {
        id: true,
        username: true,
        memberLevel: true,
      },
    });

    this.logger.log(`User ${userId} member level updated to ${memberLevel}`);

    return updated;
  }

  /**
   * 设置/取消管理员权限
   */
  async setAdminStatus(userId: string, isAdmin: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
      select: {
        id: true,
        username: true,
        isAdmin: true,
      },
    });

    this.logger.log(`User ${userId} admin status updated to ${isAdmin}`);

    return updated;
  }
}
