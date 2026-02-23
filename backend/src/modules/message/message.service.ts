import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MessageType } from '@prisma/client';
import {
  SendMessageDto,
  CreateConversationDto,
  MessageResponseDto,
  ConversationResponseDto,
  CreateConversationResultDto,
  MessageSenderDto,
  ReplyToDto,
  ConversationParticipantDto,
  GetConversationsDto,
  ConversationListResponseDto,
  ConversationListItemDto,
  LastMessagePreviewDto,
  ConversationParticipantSummaryDto,
  GetMessagesDto,
  MessageListResponseDto,
  PaginationDirection,
} from './dto';
import { SensitiveWordService, FilterMode } from './sensitive-word.service';
import { BlacklistService } from './blacklist.service';

/**
 * 私信服务
 *
 * 需求20: 私信系统
 * - 20.1.2 发送私信 API
 * - 20.1.5 敏感词过滤
 * - 20.1.6 黑名单检查
 */
@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sensitiveWordService: SensitiveWordService,
    private readonly blacklistService: BlacklistService,
  ) {}

  /**
   * 发送消息到会话
   *
   * @param senderId 发送者ID
   * @param dto 发送消息DTO
   * @returns 创建的消息
   */
  async sendMessage(
    senderId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    const { conversationId, content, messageType, replyToId } = dto;

    // 验证发送者是会话参与者
    const isParticipant = await this.isConversationParticipant(
      conversationId,
      senderId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('您不是该会话的参与者');
    }

    // 获取会话信息，检查是否为一对一会话
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          select: { userId: true },
        },
      },
    });

    if (!conversation) {
      throw new BadRequestException('会话不存在');
    }

    // 对于一对一会话，检查黑名单
    if (!conversation.isGroup && conversation.participants.length === 2) {
      const otherParticipant = conversation.participants.find(
        (p) => p.userId !== senderId,
      );
      if (otherParticipant) {
        const blacklistCheck = await this.blacklistService.isBlockedBidirectional(
          senderId,
          otherParticipant.userId,
        );
        if (blacklistCheck.isBlocked) {
          this.logger.warn(
            `User ${senderId} attempted to send message to blocked user ${otherParticipant.userId}`,
          );
          throw new ForbiddenException(blacklistCheck.message);
        }
      }
    }

    // 敏感词过滤
    const filterResult = this.sensitiveWordService.filterContent(content);
    
    // 如果是阻止模式且包含敏感词，则拒绝发送
    if (
      filterResult.containsSensitiveWords &&
      this.sensitiveWordService.getFilterMode() === FilterMode.BLOCK
    ) {
      this.logger.warn(
        `User ${senderId} attempted to send message with sensitive words: ${filterResult.detectedWords.join(', ')}`,
      );
      throw new BadRequestException(
        '消息包含敏感词，请修改后重新发送',
      );
    }

    // 使用过滤后的内容（替换模式下敏感词会被替换为星号）
    const filteredContent = filterResult.filteredContent;

    // 记录敏感词过滤日志（用于审核）
    if (filterResult.containsSensitiveWords) {
      this.logger.log(
        `Filtered sensitive words in message from user ${senderId}: ${filterResult.detectedWords.join(', ')}`,
      );
    }

    // 如果有回复消息，验证回复的消息存在且属于同一会话
    if (replyToId) {
      const replyToMessage = await this.prisma.message.findFirst({
        where: {
          id: replyToId,
          conversationId,
          isDeleted: false,
        },
      });
      if (!replyToMessage) {
        throw new BadRequestException('回复的消息不存在或已被删除');
      }
    }

    // 创建消息并更新会话的最后消息时间
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          senderId,
          content: filteredContent,
          messageType: messageType || MessageType.TEXT,
          replyToId,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          replyTo: {
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                  avatar: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: new Date() },
      }),
    ]);

    this.logger.debug(
      `User ${senderId} sent message ${message.id} to conversation ${conversationId}`,
    );

    return this.toMessageResponseDto(message);
  }

  /**
   * 创建新会话
   *
   * @param userId 创建者ID
   * @param dto 创建会话DTO
   * @returns 创建的会话
   */
  async createConversation(
    userId: string,
    dto: CreateConversationDto,
  ): Promise<CreateConversationResultDto> {
    const { participantIds, title, isGroup } = dto;

    // 确保创建者也在参与者列表中
    const allParticipantIds = [...new Set([userId, ...participantIds])];

    // 验证所有参与者存在
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: allParticipantIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (users.length !== allParticipantIds.length) {
      throw new BadRequestException('部分参与者不存在或已被禁用');
    }

    // 创建会话和参与者
    const conversation = await this.prisma.conversation.create({
      data: {
        title,
        isGroup: isGroup || allParticipantIds.length > 2,
        participants: {
          create: allParticipantIds.map((participantId) => ({
            userId: participantId,
            isAdmin: participantId === userId,
          })),
        },
      },
      include: {
        participants: {
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
        },
      },
    });

    this.logger.debug(
      `User ${userId} created conversation ${conversation.id} with ${allParticipantIds.length} participants`,
    );

    return {
      conversation: this.toConversationResponseDto(conversation),
      isNew: true,
    };
  }

  /**
   * 获取或创建一对一会话
   *
   * @param userId1 用户1 ID
   * @param userId2 用户2 ID
   * @returns 会话信息和是否新创建
   */
  async getOrCreateDirectConversation(
    userId1: string,
    userId2: string,
  ): Promise<CreateConversationResultDto> {
    if (userId1 === userId2) {
      throw new BadRequestException('不能与自己创建会话');
    }

    // 验证两个用户都存在且活跃
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: [userId1, userId2] },
        isActive: true,
      },
      select: { id: true },
    });

    if (users.length !== 2) {
      throw new BadRequestException('用户不存在或已被禁用');
    }

    // 检查黑名单（创建会话时也需要检查）
    const blacklistCheck = await this.blacklistService.isBlockedBidirectional(
      userId1,
      userId2,
    );
    if (blacklistCheck.isBlocked) {
      this.logger.warn(
        `User ${userId1} attempted to create conversation with blocked user ${userId2}`,
      );
      throw new ForbiddenException(blacklistCheck.message);
    }

    // 查找现有的一对一会话
    const existingConversation = await this.findDirectConversation(
      userId1,
      userId2,
    );

    if (existingConversation) {
      return {
        conversation: this.toConversationResponseDto(existingConversation),
        isNew: false,
      };
    }

    // 创建新的一对一会话
    const conversation = await this.prisma.conversation.create({
      data: {
        isGroup: false,
        participants: {
          create: [{ userId: userId1 }, { userId: userId2 }],
        },
      },
      include: {
        participants: {
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
        },
      },
    });

    this.logger.debug(
      `Created direct conversation ${conversation.id} between ${userId1} and ${userId2}`,
    );

    return {
      conversation: this.toConversationResponseDto(conversation),
      isNew: true,
    };
  }

  /**
   * 发送直接消息（便捷方法）
   * 如果会话不存在则自动创建
   *
   * @param senderId 发送者ID
   * @param recipientId 接收者ID
   * @param content 消息内容
   * @returns 创建的消息
   */
  async sendDirectMessage(
    senderId: string,
    recipientId: string,
    content: string,
  ): Promise<MessageResponseDto> {
    // 获取或创建一对一会话
    const { conversation } = await this.getOrCreateDirectConversation(
      senderId,
      recipientId,
    );

    // 发送消息
    return this.sendMessage(senderId, {
      conversationId: conversation.id,
      content,
      messageType: MessageType.TEXT,
    });
  }

  /**
   * 获取用户的会话列表
   *
   * 需求20: 私信系统
   * - 20.1.3 会话列表 API
   *
   * @param userId 用户ID
   * @param options 分页选项
   * @returns 会话列表响应
   */
  async getConversations(
    userId: string,
    options: GetConversationsDto,
  ): Promise<ConversationListResponseDto> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // 获取用户参与的会话总数
    const total = await this.prisma.conversation.count({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
    });

    // 获取会话列表，按最后消息时间排序
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
      skip,
      take: limit,
      include: {
        participants: {
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
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          where: {
            isDeleted: false,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    // 获取当前用户在每个会话中的参与者信息（用于计算未读数）
    const userParticipants = await this.prisma.conversationParticipant.findMany(
      {
        where: {
          userId,
          conversationId: {
            in: conversations.map((c) => c.id),
          },
        },
        select: {
          conversationId: true,
          lastReadAt: true,
        },
      },
    );

    const userParticipantMap = new Map(
      userParticipants.map((p) => [p.conversationId, p.lastReadAt]),
    );

    // 计算每个会话的未读消息数
    const unreadCounts = await Promise.all(
      conversations.map(async (conversation) => {
        const lastReadAt = userParticipantMap.get(conversation.id);
        if (!lastReadAt) {
          // 如果从未读过，返回所有消息数
          return this.prisma.message.count({
            where: {
              conversationId: conversation.id,
              isDeleted: false,
              senderId: { not: userId }, // 不计算自己发送的消息
            },
          });
        }
        // 计算 lastReadAt 之后的消息数
        return this.prisma.message.count({
          where: {
            conversationId: conversation.id,
            isDeleted: false,
            senderId: { not: userId },
            createdAt: { gt: lastReadAt },
          },
        });
      }),
    );

    // 构建响应
    const conversationItems: ConversationListItemDto[] = conversations.map(
      (conversation, index) => {
        const lastMessage = conversation.messages[0];
        const lastMessagePreview: LastMessagePreviewDto | null = lastMessage
          ? {
              id: lastMessage.id,
              content: this.truncateContent(lastMessage.content, 100),
              sender: {
                id: lastMessage.sender.id,
                username: lastMessage.sender.username,
                displayName: lastMessage.sender.displayName,
              },
              createdAt: lastMessage.createdAt,
            }
          : null;

        const participants: ConversationParticipantSummaryDto[] =
          conversation.participants.map((p) => ({
            id: p.id,
            userId: p.userId,
            username: p.user.username,
            displayName: p.user.displayName,
            avatar: p.user.avatar,
          }));

        return {
          id: conversation.id,
          title: conversation.title,
          isGroup: conversation.isGroup,
          lastMessage: lastMessagePreview,
          unreadCount: unreadCounts[index],
          participants,
          lastMessageAt: conversation.lastMessageAt,
          createdAt: conversation.createdAt,
        };
      },
    );

    return {
      conversations: conversationItems,
      total,
      page,
      limit,
      hasMore: skip + conversations.length < total,
    };
  }

  /**
   * 获取单个会话详情
   *
   * 需求20: 私信系统
   * - 20.1.3 会话列表 API
   *
   * @param userId 用户ID
   * @param conversationId 会话ID
   * @returns 会话详情
   */
  async getConversationById(
    userId: string,
    conversationId: string,
  ): Promise<ConversationListItemDto> {
    // 验证用户是会话参与者
    const isParticipant = await this.isConversationParticipant(
      conversationId,
      userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('您不是该会话的参与者');
    }

    // 获取会话详情
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
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
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          where: {
            isDeleted: false,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new BadRequestException('会话不存在');
    }

    // 获取用户的 lastReadAt
    const userParticipant =
      await this.prisma.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId,
          },
        },
        select: {
          lastReadAt: true,
        },
      });

    // 计算未读消息数
    let unreadCount = 0;
    if (!userParticipant?.lastReadAt) {
      unreadCount = await this.prisma.message.count({
        where: {
          conversationId,
          isDeleted: false,
          senderId: { not: userId },
        },
      });
    } else {
      unreadCount = await this.prisma.message.count({
        where: {
          conversationId,
          isDeleted: false,
          senderId: { not: userId },
          createdAt: { gt: userParticipant.lastReadAt },
        },
      });
    }

    // 构建响应
    const lastMessage = conversation.messages[0];
    const lastMessagePreview: LastMessagePreviewDto | null = lastMessage
      ? {
          id: lastMessage.id,
          content: this.truncateContent(lastMessage.content, 100),
          sender: {
            id: lastMessage.sender.id,
            username: lastMessage.sender.username,
            displayName: lastMessage.sender.displayName,
          },
          createdAt: lastMessage.createdAt,
        }
      : null;

    const participants: ConversationParticipantSummaryDto[] =
      conversation.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        username: p.user.username,
        displayName: p.user.displayName,
        avatar: p.user.avatar,
      }));

    return {
      id: conversation.id,
      title: conversation.title,
      isGroup: conversation.isGroup,
      lastMessage: lastMessagePreview,
      unreadCount,
      participants,
      lastMessageAt: conversation.lastMessageAt,
      createdAt: conversation.createdAt,
    };
  }

  /**
   * 获取会话中的消息历史
   *
   * 需求20: 私信系统
   * - 20.1.4 消息历史 API
   *
   * @param userId 用户ID
   * @param conversationId 会话ID
   * @param options 分页选项（游标分页）
   * @returns 消息列表响应
   */
  async getMessages(
    userId: string,
    conversationId: string,
    options: GetMessagesDto,
  ): Promise<MessageListResponseDto> {
    // 验证用户是会话参与者
    const isParticipant = await this.isConversationParticipant(
      conversationId,
      userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('您不是该会话的参与者');
    }

    const limit = options.limit || 20;
    const direction = options.direction || PaginationDirection.BEFORE;
    const cursor = options.cursor;

    // 构建查询条件
    const whereCondition: {
      conversationId: string;
      isDeleted: boolean;
      createdAt?: { lt?: Date; gt?: Date };
    } = {
      conversationId,
      isDeleted: false,
    };

    // 如果有游标，根据方向添加时间条件
    if (cursor) {
      // 游标是消息ID，需要先获取该消息的创建时间
      const cursorMessage = await this.prisma.message.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });

      if (cursorMessage) {
        if (direction === PaginationDirection.BEFORE) {
          // 加载更早的消息
          whereCondition.createdAt = { lt: cursorMessage.createdAt };
        } else {
          // 加载更新的消息
          whereCondition.createdAt = { gt: cursorMessage.createdAt };
        }
      }
    }

    // 查询消息
    const messages = await this.prisma.message.findMany({
      where: whereCondition,
      orderBy: {
        createdAt: direction === PaginationDirection.BEFORE ? 'desc' : 'asc',
      },
      take: limit + 1, // 多取一条用于判断是否还有更多
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // 判断是否还有更多消息
    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    // 如果是向前加载（加载更早的消息），需要反转结果以保持时间顺序
    if (direction === PaginationDirection.BEFORE) {
      resultMessages.reverse();
    }

    // 计算游标
    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    if (resultMessages.length > 0) {
      const firstMessage = resultMessages[0];
      const lastMessage = resultMessages[resultMessages.length - 1];

      if (direction === PaginationDirection.BEFORE) {
        // 向前加载时，prevCursor 指向最早的消息（用于继续加载更早的）
        prevCursor = hasMore ? firstMessage.id : null;
        // nextCursor 指向最新的消息（用于加载更新的）
        nextCursor = lastMessage.id;
      } else {
        // 向后加载时，nextCursor 指向最新的消息（用于继续加载更新的）
        nextCursor = hasMore ? lastMessage.id : null;
        // prevCursor 指向最早的消息（用于加载更早的）
        prevCursor = firstMessage.id;
      }
    }

    // 转换为响应DTO
    const messageResponses = resultMessages.map((message) =>
      this.toMessageResponseDto(message),
    );

    this.logger.debug(
      `User ${userId} fetched ${messageResponses.length} messages from conversation ${conversationId}`,
    );

    return {
      messages: messageResponses,
      nextCursor,
      prevCursor,
      hasMore,
    };
  }

  /**
   * 标记会话为已读
   *
   * 需求20: 私信系统
   * - 20.1.4 消息历史 API
   *
   * @param userId 用户ID
   * @param conversationId 会话ID
   * @returns 更新后的已读时间
   */
  async markAsRead(
    userId: string,
    conversationId: string,
  ): Promise<{ lastReadAt: Date }> {
    // 验证用户是会话参与者
    const isParticipant = await this.isConversationParticipant(
      conversationId,
      userId,
    );
    if (!isParticipant) {
      throw new ForbiddenException('您不是该会话的参与者');
    }

    const now = new Date();

    // 更新用户在该会话中的 lastReadAt
    await this.prisma.conversationParticipant.update({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
      data: {
        lastReadAt: now,
      },
    });

    this.logger.debug(
      `User ${userId} marked conversation ${conversationId} as read`,
    );

    return { lastReadAt: now };
  }

  /**
   * 截断内容（用于消息预览）
   */
  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength - 3) + '...';
  }

  /**
   * 检查用户是否是会话参与者
   */
  private async isConversationParticipant(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });
    return !!participant;
  }

  /**
   * 查找两个用户之间的一对一会话
   */
  private async findDirectConversation(userId1: string, userId2: string) {
    // 查找同时包含两个用户且只有两个参与者的非群聊会话
    const conversations = await this.prisma.conversation.findMany({
      where: {
        isGroup: false,
        participants: {
          every: {
            userId: { in: [userId1, userId2] },
          },
        },
      },
      include: {
        participants: {
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
        },
        _count: {
          select: { participants: true },
        },
      },
    });

    // 过滤出恰好有两个参与者的会话
    return conversations.find((c) => c._count.participants === 2) || null;
  }

  /**
   * 转换消息为响应DTO
   */
  private toMessageResponseDto(message: {
    id: string;
    conversationId: string;
    content: string;
    messageType: MessageType;
    sender: {
      id: string;
      username: string;
      displayName: string | null;
      avatar: string | null;
    };
    replyTo?: {
      id: string;
      content: string;
      sender: {
        id: string;
        username: string;
        displayName: string | null;
        avatar: string | null;
      };
    } | null;
    createdAt: Date;
    updatedAt: Date;
  }): MessageResponseDto {
    const sender: MessageSenderDto = {
      id: message.sender.id,
      username: message.sender.username,
      displayName: message.sender.displayName,
      avatar: message.sender.avatar,
    };

    let replyTo: ReplyToDto | null = null;
    if (message.replyTo) {
      replyTo = {
        id: message.replyTo.id,
        content: message.replyTo.content,
        sender: {
          id: message.replyTo.sender.id,
          username: message.replyTo.sender.username,
          displayName: message.replyTo.sender.displayName,
          avatar: message.replyTo.sender.avatar,
        },
      };
    }

    return {
      id: message.id,
      conversationId: message.conversationId,
      content: message.content,
      messageType: message.messageType,
      sender,
      replyTo,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }

  /**
   * 转换会话为响应DTO
   */
  private toConversationResponseDto(conversation: {
    id: string;
    title: string | null;
    isGroup: boolean;
    lastMessageAt: Date;
    participants: Array<{
      id: string;
      userId: string;
      joinedAt: Date;
      lastReadAt: Date | null;
      user: {
        id: string;
        username: string;
        displayName: string | null;
        avatar: string | null;
      };
    }>;
    createdAt: Date;
    updatedAt: Date;
  }): ConversationResponseDto {
    const participants: ConversationParticipantDto[] =
      conversation.participants.map((p) => ({
        id: p.id,
        userId: p.userId,
        username: p.user.username,
        displayName: p.user.displayName,
        avatar: p.user.avatar,
        joinedAt: p.joinedAt,
        lastReadAt: p.lastReadAt,
      }));

    return {
      id: conversation.id,
      title: conversation.title,
      isGroup: conversation.isGroup,
      lastMessageAt: conversation.lastMessageAt,
      participants,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}
