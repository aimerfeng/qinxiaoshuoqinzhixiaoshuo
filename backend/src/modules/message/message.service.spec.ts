import { Test, TestingModule } from '@nestjs/testing';
import { MessageService } from './message.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { MessageType } from '@prisma/client';
import { SensitiveWordService, FilterMode } from './sensitive-word.service';
import { BlacklistService } from './blacklist.service';

describe('MessageService', () => {
  let service: MessageService;
  let prisma: PrismaService;
  let sensitiveWordService: SensitiveWordService;
  let blacklistService: BlacklistService;

  const mockPrismaService = {
    message: {
      create: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    conversation: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    conversationParticipant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockSensitiveWordService = {
    filterContent: jest.fn().mockImplementation((content: string) => ({
      containsSensitiveWords: false,
      filteredContent: content,
      detectedWords: [],
      originalContent: content,
    })),
    containsSensitiveWords: jest.fn().mockReturnValue(false),
    getFilterMode: jest.fn().mockReturnValue(FilterMode.REPLACE),
    getSensitiveWords: jest.fn().mockReturnValue([]),
    addWord: jest.fn(),
    removeWord: jest.fn(),
    setFilterMode: jest.fn(),
    setEnabled: jest.fn(),
    isFilterEnabled: jest.fn().mockReturnValue(true),
  };

  const mockBlacklistService = {
    isBlocked: jest.fn().mockResolvedValue(false),
    isBlockedBidirectional: jest.fn().mockResolvedValue({
      isBlocked: false,
      blockedBy: null,
      message: null,
    }),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
    getBlockedUsers: jest.fn(),
    getBlockedByUsers: jest.fn(),
    checkIsBlocked: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SensitiveWordService,
          useValue: mockSensitiveWordService,
        },
        {
          provide: BlacklistService,
          useValue: mockBlacklistService,
        },
      ],
    }).compile();

    service = module.get<MessageService>(MessageService);
    prisma = module.get<PrismaService>(PrismaService);
    sensitiveWordService = module.get<SensitiveWordService>(SensitiveWordService);
    blacklistService = module.get<BlacklistService>(BlacklistService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    const senderId = 'user-1';
    const conversationId = 'conv-1';
    const content = 'Hello, World!';

    it('should throw ForbiddenException if sender is not a participant', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.sendMessage(senderId, {
          conversationId,
          content,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if replyTo message does not exist', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue({
        id: 'participant-1',
        conversationId,
        userId: senderId,
      });
      // Mock conversation.findUnique for blacklist check
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: conversationId,
        isGroup: false,
        participants: [
          { userId: senderId },
          { userId: 'user-2' },
        ],
      });
      mockPrismaService.message.findFirst.mockResolvedValue(null);

      await expect(
        service.sendMessage(senderId, {
          conversationId,
          content,
          replyToId: 'non-existent-message',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a message and update conversation lastMessageAt', async () => {
      const mockMessage = {
        id: 'msg-1',
        conversationId,
        senderId,
        content,
        messageType: MessageType.TEXT,
        sender: {
          id: senderId,
          username: 'testuser',
          displayName: 'Test User',
          avatar: null,
        },
        replyTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue({
        id: 'participant-1',
        conversationId,
        userId: senderId,
      });
      // Mock conversation.findUnique for blacklist check
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: conversationId,
        isGroup: false,
        participants: [
          { userId: senderId },
          { userId: 'user-2' },
        ],
      });
      mockPrismaService.$transaction.mockResolvedValue([mockMessage, {}]);

      const result = await service.sendMessage(senderId, {
        conversationId,
        content,
      });

      expect(result).toEqual({
        id: mockMessage.id,
        conversationId: mockMessage.conversationId,
        content: mockMessage.content,
        messageType: mockMessage.messageType,
        sender: mockMessage.sender,
        replyTo: null,
        createdAt: mockMessage.createdAt,
        updatedAt: mockMessage.updatedAt,
      });
    });
  });

  describe('createConversation', () => {
    const userId = 'user-1';
    const participantIds = ['user-2'];

    it('should throw BadRequestException if some participants do not exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([{ id: userId }]);

      await expect(
        service.createConversation(userId, { participantIds }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a conversation with all participants', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: null,
        isGroup: false,
        lastMessageAt: new Date(),
        participants: [
          {
            id: 'p-1',
            userId,
            joinedAt: new Date(),
            lastReadAt: null,
            user: {
              id: userId,
              username: 'user1',
              displayName: 'User 1',
              avatar: null,
            },
          },
          {
            id: 'p-2',
            userId: 'user-2',
            joinedAt: new Date(),
            lastReadAt: null,
            user: {
              id: 'user-2',
              username: 'user2',
              displayName: 'User 2',
              avatar: null,
            },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: userId },
        { id: 'user-2' },
      ]);
      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.createConversation(userId, {
        participantIds,
      });

      expect(result.isNew).toBe(true);
      expect(result.conversation.id).toBe(mockConversation.id);
      expect(result.conversation.participants).toHaveLength(2);
    });
  });

  describe('getOrCreateDirectConversation', () => {
    const userId1 = 'user-1';
    const userId2 = 'user-2';

    it('should throw BadRequestException if trying to create conversation with self', async () => {
      await expect(
        service.getOrCreateDirectConversation(userId1, userId1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if users do not exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([{ id: userId1 }]);

      await expect(
        service.getOrCreateDirectConversation(userId1, userId2),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing conversation if found', async () => {
      const existingConversation = {
        id: 'conv-1',
        title: null,
        isGroup: false,
        lastMessageAt: new Date(),
        participants: [
          {
            id: 'p-1',
            userId: userId1,
            joinedAt: new Date(),
            lastReadAt: null,
            user: {
              id: userId1,
              username: 'user1',
              displayName: 'User 1',
              avatar: null,
            },
          },
          {
            id: 'p-2',
            userId: userId2,
            joinedAt: new Date(),
            lastReadAt: null,
            user: {
              id: userId2,
              username: 'user2',
              displayName: 'User 2',
              avatar: null,
            },
          },
        ],
        _count: { participants: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: userId1 },
        { id: userId2 },
      ]);
      mockPrismaService.conversation.findMany.mockResolvedValue([
        existingConversation,
      ]);

      const result = await service.getOrCreateDirectConversation(
        userId1,
        userId2,
      );

      expect(result.isNew).toBe(false);
      expect(result.conversation.id).toBe(existingConversation.id);
    });

    it('should create new conversation if not found', async () => {
      const newConversation = {
        id: 'conv-new',
        title: null,
        isGroup: false,
        lastMessageAt: new Date(),
        participants: [
          {
            id: 'p-1',
            userId: userId1,
            joinedAt: new Date(),
            lastReadAt: null,
            user: {
              id: userId1,
              username: 'user1',
              displayName: 'User 1',
              avatar: null,
            },
          },
          {
            id: 'p-2',
            userId: userId2,
            joinedAt: new Date(),
            lastReadAt: null,
            user: {
              id: userId2,
              username: 'user2',
              displayName: 'User 2',
              avatar: null,
            },
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: userId1 },
        { id: userId2 },
      ]);
      mockPrismaService.conversation.findMany.mockResolvedValue([]);
      mockPrismaService.conversation.create.mockResolvedValue(newConversation);

      const result = await service.getOrCreateDirectConversation(
        userId1,
        userId2,
      );

      expect(result.isNew).toBe(true);
      expect(result.conversation.id).toBe(newConversation.id);
    });
  });

  describe('sendDirectMessage', () => {
    const senderId = 'user-1';
    const recipientId = 'user-2';
    const content = 'Hello!';

    it('should get or create conversation and send message', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: null,
        isGroup: false,
        lastMessageAt: new Date(),
        participants: [
          {
            id: 'p-1',
            userId: senderId,
            joinedAt: new Date(),
            lastReadAt: null,
            user: {
              id: senderId,
              username: 'sender',
              displayName: 'Sender',
              avatar: null,
            },
          },
          {
            id: 'p-2',
            userId: recipientId,
            joinedAt: new Date(),
            lastReadAt: null,
            user: {
              id: recipientId,
              username: 'recipient',
              displayName: 'Recipient',
              avatar: null,
            },
          },
        ],
        _count: { participants: 2 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockMessage = {
        id: 'msg-1',
        conversationId: mockConversation.id,
        senderId,
        content,
        messageType: MessageType.TEXT,
        sender: {
          id: senderId,
          username: 'sender',
          displayName: 'Sender',
          avatar: null,
        },
        replyTo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: senderId },
        { id: recipientId },
      ]);
      mockPrismaService.conversation.findMany.mockResolvedValue([
        mockConversation,
      ]);
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue({
        id: 'p-1',
        conversationId: mockConversation.id,
        userId: senderId,
      });
      // Mock conversation.findUnique for blacklist check in sendMessage
      mockPrismaService.conversation.findUnique.mockResolvedValue({
        id: mockConversation.id,
        isGroup: false,
        participants: [
          { userId: senderId },
          { userId: recipientId },
        ],
      });
      mockPrismaService.$transaction.mockResolvedValue([mockMessage, {}]);

      const result = await service.sendDirectMessage(
        senderId,
        recipientId,
        content,
      );

      expect(result.content).toBe(content);
      expect(result.conversationId).toBe(mockConversation.id);
    });
  });

  describe('getConversations', () => {
    const userId = 'user-1';

    it('should return paginated conversation list', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: null,
          isGroup: false,
          lastMessageAt: new Date(),
          participants: [
            {
              id: 'p-1',
              userId,
              user: {
                id: userId,
                username: 'user1',
                displayName: 'User 1',
                avatar: null,
              },
            },
            {
              id: 'p-2',
              userId: 'user-2',
              user: {
                id: 'user-2',
                username: 'user2',
                displayName: 'User 2',
                avatar: null,
              },
            },
          ],
          messages: [
            {
              id: 'msg-1',
              content: 'Hello!',
              createdAt: new Date(),
              sender: {
                id: 'user-2',
                username: 'user2',
                displayName: 'User 2',
              },
            },
          ],
          createdAt: new Date(),
        },
      ];

      mockPrismaService.conversation.count.mockResolvedValue(1);
      mockPrismaService.conversation.findMany.mockResolvedValue(
        mockConversations,
      );
      mockPrismaService.conversationParticipant.findMany.mockResolvedValue([
        { conversationId: 'conv-1', lastReadAt: null },
      ]);
      mockPrismaService.message.count.mockResolvedValue(5);

      const result = await service.getConversations(userId, {
        page: 1,
        limit: 20,
      });

      expect(result.conversations).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.hasMore).toBe(false);
      expect(result.conversations[0].unreadCount).toBe(5);
      expect(result.conversations[0].lastMessage).toBeDefined();
      expect(result.conversations[0].lastMessage?.content).toBe('Hello!');
    });

    it('should return empty list when user has no conversations', async () => {
      mockPrismaService.conversation.count.mockResolvedValue(0);
      mockPrismaService.conversation.findMany.mockResolvedValue([]);
      mockPrismaService.conversationParticipant.findMany.mockResolvedValue([]);

      const result = await service.getConversations(userId, {});

      expect(result.conversations).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should calculate hasMore correctly', async () => {
      const mockConversations = Array(20)
        .fill(null)
        .map((_, i) => ({
          id: `conv-${i}`,
          title: null,
          isGroup: false,
          lastMessageAt: new Date(),
          participants: [
            {
              id: `p-${i}`,
              userId,
              user: {
                id: userId,
                username: 'user1',
                displayName: 'User 1',
                avatar: null,
              },
            },
          ],
          messages: [],
          createdAt: new Date(),
        }));

      mockPrismaService.conversation.count.mockResolvedValue(25);
      mockPrismaService.conversation.findMany.mockResolvedValue(
        mockConversations,
      );
      mockPrismaService.conversationParticipant.findMany.mockResolvedValue(
        mockConversations.map((c) => ({
          conversationId: c.id,
          lastReadAt: new Date(),
        })),
      );
      mockPrismaService.message.count.mockResolvedValue(0);

      const result = await service.getConversations(userId, {
        page: 1,
        limit: 20,
      });

      expect(result.hasMore).toBe(true);
    });
  });

  describe('getConversationById', () => {
    const userId = 'user-1';
    const conversationId = 'conv-1';

    it('should throw ForbiddenException if user is not a participant', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.getConversationById(userId, conversationId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if conversation does not exist', async () => {
      mockPrismaService.conversationParticipant.findUnique.mockResolvedValue({
        id: 'p-1',
        conversationId,
        userId,
      });
      mockPrismaService.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.getConversationById(userId, conversationId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return conversation details with unread count', async () => {
      const mockConversation = {
        id: conversationId,
        title: 'Test Conversation',
        isGroup: true,
        lastMessageAt: new Date(),
        participants: [
          {
            id: 'p-1',
            userId,
            user: {
              id: userId,
              username: 'user1',
              displayName: 'User 1',
              avatar: null,
            },
          },
          {
            id: 'p-2',
            userId: 'user-2',
            user: {
              id: 'user-2',
              username: 'user2',
              displayName: 'User 2',
              avatar: null,
            },
          },
        ],
        messages: [
          {
            id: 'msg-1',
            content: 'Latest message',
            createdAt: new Date(),
            sender: {
              id: 'user-2',
              username: 'user2',
              displayName: 'User 2',
            },
          },
        ],
        createdAt: new Date(),
      };

      mockPrismaService.conversationParticipant.findUnique
        .mockResolvedValueOnce({
          id: 'p-1',
          conversationId,
          userId,
        })
        .mockResolvedValueOnce({
          lastReadAt: new Date(Date.now() - 3600000), // 1 hour ago
        });
      mockPrismaService.conversation.findUnique.mockResolvedValue(
        mockConversation,
      );
      mockPrismaService.message.count.mockResolvedValue(3);

      const result = await service.getConversationById(userId, conversationId);

      expect(result.id).toBe(conversationId);
      expect(result.title).toBe('Test Conversation');
      expect(result.isGroup).toBe(true);
      expect(result.unreadCount).toBe(3);
      expect(result.lastMessage).toBeDefined();
      expect(result.lastMessage?.content).toBe('Latest message');
      expect(result.participants).toHaveLength(2);
    });

    it('should truncate long message content in preview', async () => {
      const longContent = 'A'.repeat(150);
      const mockConversation = {
        id: conversationId,
        title: null,
        isGroup: false,
        lastMessageAt: new Date(),
        participants: [
          {
            id: 'p-1',
            userId,
            user: {
              id: userId,
              username: 'user1',
              displayName: 'User 1',
              avatar: null,
            },
          },
        ],
        messages: [
          {
            id: 'msg-1',
            content: longContent,
            createdAt: new Date(),
            sender: {
              id: userId,
              username: 'user1',
              displayName: 'User 1',
            },
          },
        ],
        createdAt: new Date(),
      };

      mockPrismaService.conversationParticipant.findUnique
        .mockResolvedValueOnce({
          id: 'p-1',
          conversationId,
          userId,
        })
        .mockResolvedValueOnce({
          lastReadAt: null,
        });
      mockPrismaService.conversation.findUnique.mockResolvedValue(
        mockConversation,
      );
      mockPrismaService.message.count.mockResolvedValue(0);

      const result = await service.getConversationById(userId, conversationId);

      expect(result.lastMessage?.content.length).toBe(100);
      expect(result.lastMessage?.content.endsWith('...')).toBe(true);
    });
  });
});
