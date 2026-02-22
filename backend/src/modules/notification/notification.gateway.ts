import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { NotificationResponseDto } from './dto';

/**
 * 通知 WebSocket 网关
 *
 * 需求 10.1.4: WebSocket 实时推送
 * WHEN 新通知产生 THEN System SHALL 通过 WebSocket 实时推送给目标用户
 */
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  // 存储用户 ID 到 Socket ID 的映射
  private userSockets: Map<string, Set<string>> = new Map();
  // 存储 Socket ID 到用户 ID 的映射
  private socketUsers: Map<string, string> = new Map();

  /**
   * 客户端连接
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * 客户端断开连接
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 清理用户映射
    const userId = this.socketUsers.get(client.id);
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketUsers.delete(client.id);
      client.leave(`user:${userId}`);
    }
  }

  /**
   * 用户认证并加入个人房间
   * 客户端连接后需要发送此消息进行认证
   */
  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    const { userId } = data;

    if (!userId) {
      return { success: false, error: 'userId is required' };
    }

    // 加入用户专属房间
    client.join(`user:${userId}`);

    // 更新映射
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);
    this.socketUsers.set(client.id, userId);

    this.logger.debug(`User ${userId} authenticated with socket ${client.id}`);

    return { success: true, userId };
  }

  /**
   * 推送通知给指定用户
   *
   * 需求 10.1.4: WebSocket 实时推送
   */
  pushNotification(userId: string, notification: NotificationResponseDto) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.debug(
      `Pushed notification ${notification.id} to user ${userId}`,
    );
  }

  /**
   * 推送未读计数更新
   */
  pushUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unreadCount', { count });
    this.logger.debug(`Pushed unread count ${count} to user ${userId}`);
  }

  /**
   * 推送通知已读状态更新
   */
  pushReadStatus(userId: string, notificationIds: string[]) {
    this.server
      .to(`user:${userId}`)
      .emit('notificationsRead', { notificationIds });
    this.logger.debug(
      `Pushed read status for ${notificationIds.length} notifications to user ${userId}`,
    );
  }

  /**
   * 广播系统通知给所有在线用户
   */
  broadcastSystemNotification(notification: NotificationResponseDto) {
    this.server.emit('systemNotification', notification);
    this.logger.debug(`Broadcasted system notification ${notification.id}`);
  }

  /**
   * 检查用户是否在线
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * 获取在线用户数量
   */
  getOnlineUserCount(): number {
    return this.userSockets.size;
  }

  /**
   * 获取用户的连接数
   */
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}
