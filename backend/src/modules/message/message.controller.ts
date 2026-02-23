import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MessageService } from './message.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  SendMessageDto,
  CreateConversationDto,
  SendDirectMessageDto,
  MessageResponseDto,
  CreateConversationResultDto,
  GetConversationsDto,
  ConversationListResponseDto,
  ConversationListItemDto,
  GetMessagesDto,
  MessageListResponseDto,
} from './dto';

interface AuthenticatedRequest {
  user: { userId: string };
}

/**
 * 私信控制器
 *
 * 需求20: 私信系统
 * - 20.1.2 发送私信 API
 * - 20.1.3 会话列表 API
 * - 20.1.4 消息历史 API
 *
 * API 端点:
 * - POST /api/v1/messages - 发送消息到会话
 * - POST /api/v1/messages/direct/:userId - 发送直接消息给用户
 * - POST /api/v1/conversations - 创建新会话
 * - GET /api/v1/conversations - 获取会话列表
 * - GET /api/v1/conversations/:id - 获取单个会话详情
 * - GET /api/v1/conversations/:id/messages - 获取会话消息历史
 * - POST /api/v1/conversations/:id/read - 标记会话为已读
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  /**
   * 获取用户的会话列表
   * GET /api/v1/conversations
   *
   * 需求 20.1.3: 会话列表 API
   * - 按最后消息时间排序（最新优先）
   * - 包含最后消息预览
   * - 包含未读消息数
   * - 支持分页
   */
  @Get('conversations')
  async getConversations(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetConversationsDto,
  ): Promise<ConversationListResponseDto> {
    return this.messageService.getConversations(req.user.userId, query);
  }

  /**
   * 获取单个会话详情
   * GET /api/v1/conversations/:id
   *
   * 需求 20.1.3: 会话列表 API
   * - 验证用户是会话参与者
   * - 返回会话详情和未读数
   */
  @Get('conversations/:id')
  async getConversationById(
    @Request() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
  ): Promise<ConversationListItemDto> {
    return this.messageService.getConversationById(
      req.user.userId,
      conversationId,
    );
  }

  /**
   * 获取会话中的消息历史
   * GET /api/v1/conversations/:id/messages
   *
   * 需求 20.1.4: 消息历史 API
   * - 验证用户是会话参与者
   * - 支持游标分页（用于无限滚动）
   * - 排除已删除的消息
   * - 包含回复消息信息
   */
  @Get('conversations/:id/messages')
  async getMessages(
    @Request() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
    @Query() query: GetMessagesDto,
  ): Promise<MessageListResponseDto> {
    return this.messageService.getMessages(
      req.user.userId,
      conversationId,
      query,
    );
  }

  /**
   * 标记会话为已读
   * POST /api/v1/conversations/:id/read
   *
   * 需求 20.1.4: 消息历史 API
   * - 验证用户是会话参与者
   * - 更新用户在该会话中的 lastReadAt
   */
  @Post('conversations/:id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(
    @Request() req: AuthenticatedRequest,
    @Param('id') conversationId: string,
  ): Promise<{ lastReadAt: Date }> {
    return this.messageService.markAsRead(req.user.userId, conversationId);
  }

  /**
   * 发送消息到会话
   * POST /api/v1/messages
   *
   * 需求 20.1.2: 发送私信 API
   * - 验证发送者是会话参与者
   * - 更新会话的 lastMessageAt
   * - 支持回复功能
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.sendMessage(req.user.userId, dto);
  }

  /**
   * 发送直接消息给用户
   * POST /api/v1/messages/direct/:userId
   *
   * 需求 20.1.2: 发送私信 API
   * - 如果会话不存在则自动创建
   * - 便捷的一对一消息发送方式
   */
  @Post('messages/direct/:userId')
  @HttpCode(HttpStatus.CREATED)
  async sendDirectMessage(
    @Request() req: AuthenticatedRequest,
    @Param('userId') recipientId: string,
    @Body() dto: SendDirectMessageDto,
  ): Promise<MessageResponseDto> {
    return this.messageService.sendDirectMessage(
      req.user.userId,
      recipientId,
      dto.content,
    );
  }

  /**
   * 创建新会话
   * POST /api/v1/conversations
   *
   * 需求 20.1.2: 发送私信 API
   * - 支持创建一对一或群聊会话
   * - 创建者自动成为管理员
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateConversationDto,
  ): Promise<CreateConversationResultDto> {
    return this.messageService.createConversation(req.user.userId, dto);
  }
}
