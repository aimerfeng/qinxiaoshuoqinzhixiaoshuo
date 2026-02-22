import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  NotificationQueryDto,
  MarkReadDto,
  NotificationListResponseDto,
  UnreadCountResponseDto,
} from './dto';

interface AuthenticatedRequest {
  user: { userId: string };
}

/**
 * 通知控制器
 *
 * 需求9: 通知系统
 * - 10.1.2 通知列表 API
 * - 10.1.3 标记已读 API
 * - 10.1.5 未读计数服务
 */
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  /**
   * 获取通知列表
   * GET /api/v1/notifications
   *
   * 需求 10.1.2: 通知列表 API
   */
  @Get()
  async getNotifications(
    @Request() req: AuthenticatedRequest,
    @Query() query: NotificationQueryDto,
  ): Promise<NotificationListResponseDto> {
    return this.notificationService.findByUser(req.user.userId, query);
  }

  /**
   * 获取未读通知数量
   * GET /api/v1/notifications/unread-count
   *
   * 需求 10.1.5: 未读计数服务
   */
  @Get('unread-count')
  async getUnreadCount(
    @Request() req: AuthenticatedRequest,
  ): Promise<UnreadCountResponseDto> {
    const count = await this.notificationService.getUnreadCount(
      req.user.userId,
    );
    return { count };
  }

  /**
   * 标记通知为已读
   * POST /api/v1/notifications/mark-read
   *
   * 需求 10.1.3: 标记已读 API
   */
  @Post('mark-read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Request() req: AuthenticatedRequest,
    @Body() dto: MarkReadDto,
  ): Promise<{ success: boolean; count: number }> {
    const userId = req.user.userId;
    let count: number;

    if (dto.markAll) {
      count = await this.notificationService.markAllAsRead(userId);
    } else if (dto.notificationIds && dto.notificationIds.length > 0) {
      count = await this.notificationService.markAsRead(
        userId,
        dto.notificationIds,
      );
      // 推送已读状态更新
      this.notificationGateway.pushReadStatus(userId, dto.notificationIds);
    } else {
      return { success: false, count: 0 };
    }

    // 推送未读计数更新
    const unreadCount = await this.notificationService.getUnreadCount(userId);
    this.notificationGateway.pushUnreadCount(userId, unreadCount);

    return { success: true, count };
  }

  /**
   * 删除通知
   * DELETE /api/v1/notifications/:id
   */
  @Delete(':id')
  async deleteNotification(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<{ success: boolean }> {
    const success = await this.notificationService.delete(id, req.user.userId);

    if (success) {
      // 推送未读计数更新
      const unreadCount = await this.notificationService.getUnreadCount(
        req.user.userId,
      );
      this.notificationGateway.pushUnreadCount(req.user.userId, unreadCount);
    }

    return { success };
  }
}
