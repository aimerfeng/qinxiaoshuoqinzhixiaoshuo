import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { DanmakuService } from './danmaku.service';
import { CreateDanmakuDto, DanmakuResponseDto } from './dto';

/**
 * 弹幕 WebSocket 网关
 *
 * 需求24.4: WHEN 新弹幕被发送 THEN System SHALL 通过 WebSocket 实时推送给正在阅读同一段落的其他用户
 */
@WebSocketGateway({
  namespace: '/danmaku',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class DanmakuGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DanmakuGateway.name);

  // 存储用户订阅的 anchorId 列表
  private userSubscriptions: Map<string, Set<string>> = new Map();

  constructor(private readonly danmakuService: DanmakuService) {}

  /**
   * 客户端连接
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.userSubscriptions.set(client.id, new Set());
  }

  /**
   * 客户端断开连接
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 清理订阅
    const subscriptions = this.userSubscriptions.get(client.id);
    if (subscriptions) {
      subscriptions.forEach((anchorId) => {
        client.leave(`anchor:${anchorId}`);
      });
    }
    this.userSubscriptions.delete(client.id);
  }

  /**
   * 订阅段落弹幕
   * 客户端加入对应的房间以接收实时弹幕
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { anchorIds: string[] },
  ) {
    const subscriptions = this.userSubscriptions.get(client.id) || new Set();

    for (const anchorId of data.anchorIds) {
      client.join(`anchor:${anchorId}`);
      subscriptions.add(anchorId);
    }

    this.userSubscriptions.set(client.id, subscriptions);
    this.logger.debug(
      `Client ${client.id} subscribed to anchors: ${data.anchorIds.join(', ')}`,
    );

    return { success: true, subscribedAnchors: data.anchorIds };
  }

  /**
   * 取消订阅段落弹幕
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { anchorIds: string[] },
  ) {
    const subscriptions = this.userSubscriptions.get(client.id);

    if (subscriptions) {
      for (const anchorId of data.anchorIds) {
        client.leave(`anchor:${anchorId}`);
        subscriptions.delete(anchorId);
      }
    }

    this.logger.debug(
      `Client ${client.id} unsubscribed from anchors: ${data.anchorIds.join(', ')}`,
    );

    return { success: true, unsubscribedAnchors: data.anchorIds };
  }

  /**
   * 发送弹幕（通过 WebSocket）
   * 需要客户端传递用户认证信息
   */
  @SubscribeMessage('send')
  async handleSendDanmaku(
    @ConnectedSocket() _client: Socket,
    @MessageBody() data: { userId: string; danmaku: CreateDanmakuDto },
  ) {
    try {
      // 创建弹幕
      const danmaku = await this.danmakuService.create(
        data.userId,
        data.danmaku,
      );

      // 广播给订阅该段落的所有客户端
      this.broadcastDanmaku(danmaku);

      return { success: true, danmaku };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send danmaku: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 广播新弹幕给订阅的客户端
   *
   * 需求24.4: 通过 WebSocket 实时推送给正在阅读同一段落的其他用户
   */
  broadcastDanmaku(danmaku: DanmakuResponseDto) {
    this.server.to(`anchor:${danmaku.anchorId}`).emit('newDanmaku', danmaku);
    this.logger.debug(`Broadcasted danmaku to anchor:${danmaku.anchorId}`);
  }

  /**
   * 广播弹幕删除事件
   */
  broadcastDanmakuDeleted(anchorId: string, danmakuId: string) {
    this.server
      .to(`anchor:${anchorId}`)
      .emit('danmakuDeleted', { anchorId, danmakuId });
    this.logger.debug(`Broadcasted danmaku deletion to anchor:${anchorId}`);
  }
}
