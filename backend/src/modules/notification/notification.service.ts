import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationType, Prisma } from '@prisma/client';
import {
  CreateNotificationDto,
  NotificationQueryDto,
  NotificationResponseDto,
  NotificationListResponseDto,
} from './dto';

/**
 * 通知服务
 *
 * 需求9: 通知系统
 * - 10.1.1 通知创建服务
 * - 10.1.2 通知列表 API
 * - 10.1.3 标记已读 API
 * - 10.1.5 未读计数服务
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建通知
   * 需求 10.1.1: 通知创建服务
   */
  async create(dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        data: dto.data as Prisma.InputJsonValue | undefined,
      },
    });

    this.logger.debug(
      `Created notification ${notification.id} for user ${dto.userId}`,
    );

    return this.toResponseDto(notification);
  }

  /**
   * 批量创建通知（用于群发）
   */
  async createMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    content: string,
    data?: Record<string, unknown>,
  ): Promise<number> {
    const result = await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        content,
        data: data as Prisma.InputJsonValue | undefined,
      })),
    });

    this.logger.debug(
      `Created ${result.count} notifications for ${userIds.length} users`,
    );

    return result.count;
  }

  /**
   * 获取用户通知列表
   * 需求 10.1.2: 通知列表 API
   */
  async findByUser(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    const { type, isRead, limit = 20, offset = 0 } = query;

    const where = {
      userId,
      ...(type && { type }),
      ...(isRead !== undefined && { isRead }),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      notifications: notifications.map((n) => this.toResponseDto(n)),
      total,
      unreadCount,
    };
  }

  /**
   * 获取单个通知
   */
  async findOne(
    id: string,
    userId: string,
  ): Promise<NotificationResponseDto | null> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    return notification ? this.toResponseDto(notification) : null;
  }

  /**
   * 标记通知为已读
   * 需求 10.1.3: 标记已读 API
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    this.logger.debug(
      `Marked ${result.count} notifications as read for user ${userId}`,
    );

    return result.count;
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    this.logger.debug(
      `Marked all (${result.count}) notifications as read for user ${userId}`,
    );

    return result.count;
  }

  /**
   * 获取未读通知数量
   * 需求 10.1.5: 未读计数服务
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  /**
   * 删除通知
   */
  async delete(id: string, userId: string): Promise<boolean> {
    const result = await this.prisma.notification.deleteMany({
      where: { id, userId },
    });

    return result.count > 0;
  }

  /**
   * 清理旧通知（保留最近30天）
   */
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.notification.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
        isRead: true,
      },
    });

    this.logger.log(`Cleaned up ${result.count} old notifications`);

    return result.count;
  }

  /**
   * 创建点赞通知
   */
  async createLikeNotification(
    targetUserId: string,
    likerName: string,
    targetType: 'card' | 'comment',
    targetId: string,
  ): Promise<NotificationResponseDto> {
    return this.create({
      userId: targetUserId,
      type: NotificationType.LIKE,
      title: '收到新点赞',
      content: `${likerName} 赞了你的${targetType === 'card' ? '动态' : '评论'}`,
      data: { targetType, targetId, likerName },
    });
  }

  /**
   * 创建评论通知
   */
  async createCommentNotification(
    targetUserId: string,
    commenterName: string,
    cardId: string,
    commentPreview: string,
  ): Promise<NotificationResponseDto> {
    return this.create({
      userId: targetUserId,
      type: NotificationType.COMMENT,
      title: '收到新评论',
      content: `${commenterName}: ${commentPreview.slice(0, 50)}${commentPreview.length > 50 ? '...' : ''}`,
      data: { cardId, commenterName, commentPreview },
    });
  }

  /**
   * 创建章节更新通知
   */
  async createChapterUpdateNotification(
    followerIds: string[],
    workTitle: string,
    chapterTitle: string,
    workId: string,
    chapterId: string,
  ): Promise<number> {
    return this.createMany(
      followerIds,
      NotificationType.CHAPTER_UPDATE,
      '作品更新',
      `《${workTitle}》更新了新章节：${chapterTitle}`,
      { workId, chapterId, workTitle, chapterTitle },
    );
  }

  /**
   * 创建引用通知
   */
  async createQuoteNotification(
    authorId: string,
    quoterName: string,
    workTitle: string,
    cardId: string,
  ): Promise<NotificationResponseDto> {
    return this.create({
      userId: authorId,
      type: NotificationType.QUOTE,
      title: '作品被引用',
      content: `${quoterName} 引用了《${workTitle}》的内容`,
      data: { cardId, quoterName, workTitle },
    });
  }

  /**
   * 创建系统通知
   */
  async createSystemNotification(
    userId: string,
    title: string,
    content: string,
    data?: Record<string, unknown>,
  ): Promise<NotificationResponseDto> {
    return this.create({
      userId,
      type: NotificationType.SYSTEM,
      title,
      content,
      data,
    });
  }

  /**
   * 转换为响应 DTO
   */
  private toResponseDto(notification: {
    id: string;
    type: NotificationType;
    title: string;
    content: string;
    data: unknown;
    isRead: boolean;
    createdAt: Date;
  }): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      content: notification.content,
      data: notification.data as Record<string, unknown> | null,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
    };
  }
}
