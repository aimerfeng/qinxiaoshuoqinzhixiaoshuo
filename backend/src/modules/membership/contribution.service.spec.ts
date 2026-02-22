import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  ContributionService,
  CONTRIBUTION_CONFIG,
} from './contribution.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { ContributionType } from '@prisma/client';

describe('ContributionService', () => {
  let service: ContributionService;
  let prismaService: PrismaService;
  let redisService: RedisService;

  // Mock data
  const mockUserId = 'test-user-id';
  const mockUser = {
    id: mockUserId,
    contributionScore: 100,
  };

  const mockContributionRecord = {
    id: 'record-id',
    userId: mockUserId,
    type: ContributionType.READ_CHAPTER,
    points: 2,
    referenceId: 'chapter-id',
    referenceType: 'chapter',
    description: '完整阅读1章节',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContributionService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            contributionRecord: {
              create: jest.fn(),
              count: jest.fn(),
              findMany: jest.fn(),
              aggregate: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            exists: jest.fn(),
            incrBy: jest.fn(),
            expire: jest.fn(),
            ttl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ContributionService>(ContributionService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 任务14.1.6: 每日贡献度上限控制测试 ====================

  describe('Daily Contribution Limit Control (Task 14.1.6)', () => {
    /**
     * 测试每日上限配置正确性
     * 验证: 需求14贡献度计算维度表中的每日上限配置
     */
    describe('Daily Limit Configuration', () => {
      it('should have correct daily limits for all contribution types', () => {
        // 阅读贡献
        expect(CONTRIBUTION_CONFIG.READ_CHAPTER.dailyLimit).toBe(20);
        expect(CONTRIBUTION_CONFIG.READ_DURATION.dailyLimit).toBe(15);

        // 互动贡献
        expect(CONTRIBUTION_CONFIG.COMMENT_VALID.dailyLimit).toBe(15);
        expect(CONTRIBUTION_CONFIG.COMMENT_LIKED.dailyLimit).toBe(10);
        expect(CONTRIBUTION_CONFIG.QUOTE_INTERACTED.dailyLimit).toBe(20);

        // 创作贡献
        expect(CONTRIBUTION_CONFIG.PUBLISH_CHAPTER.dailyLimit).toBe(60);
        expect(CONTRIBUTION_CONFIG.WORK_FAVORITED.dailyLimit).toBe(50);
        expect(CONTRIBUTION_CONFIG.PARAGRAPH_QUOTED.dailyLimit).toBe(30);

        // 社区贡献
        expect(CONTRIBUTION_CONFIG.REPORT_VALID.dailyLimit).toBe(30);
        expect(CONTRIBUTION_CONFIG.ACTIVITY_PARTICIPATE.dailyLimit).toBeNull(); // 无上限
      });

      it('should have correct points for all contribution types', () => {
        expect(CONTRIBUTION_CONFIG.READ_CHAPTER.points).toBe(2);
        expect(CONTRIBUTION_CONFIG.READ_DURATION.points).toBe(5);
        expect(CONTRIBUTION_CONFIG.COMMENT_VALID.points).toBe(3);
        expect(CONTRIBUTION_CONFIG.COMMENT_LIKED.points).toBe(1);
        expect(CONTRIBUTION_CONFIG.QUOTE_INTERACTED.points).toBe(2);
        expect(CONTRIBUTION_CONFIG.PUBLISH_CHAPTER.points).toBe(20);
        expect(CONTRIBUTION_CONFIG.WORK_FAVORITED.points).toBe(5);
        expect(CONTRIBUTION_CONFIG.PARAGRAPH_QUOTED.points).toBe(3);
        expect(CONTRIBUTION_CONFIG.REPORT_VALID.points).toBe(10);
        expect(CONTRIBUTION_CONFIG.ACTIVITY_PARTICIPATE.points).toBe(15);
      });
    });

    /**
     * 测试每日上限强制执行
     * 验证: 当达到每日上限时，系统应拒绝添加更多贡献度
     */
    describe('Daily Limit Enforcement', () => {
      it('should reject contribution when daily limit is exactly reached', async () => {
        // Arrange: 设置当前积分正好等于每日上限
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(0);
        (redisService.get as jest.Mock).mockResolvedValue('20'); // READ_CHAPTER 每日上限是 20

        // Act
        const result = await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.points).toBe(0);
        expect(result.message).toContain('已达上限');
        expect(result.message).toContain('20分');
      });

      it('should reject contribution when daily limit is exceeded', async () => {
        // Arrange: 设置当前积分超过每日上限
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(0);
        (redisService.get as jest.Mock).mockResolvedValue('25'); // 超过 READ_CHAPTER 的 20 上限

        // Act
        const result = await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.points).toBe(0);
        expect(result.message).toContain('已达上限');
      });

      it('should allow contribution when under daily limit', async () => {
        // Arrange: 设置当前积分低于每日上限
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(0);
        (redisService.get as jest.Mock).mockResolvedValue('18'); // 低于 READ_CHAPTER 的 20 上限
        (prismaService.$transaction as jest.Mock).mockResolvedValue({
          record: mockContributionRecord,
          updatedUser: { contributionScore: 102 },
        });
        (redisService.incrBy as jest.Mock).mockResolvedValue(20);
        (redisService.expire as jest.Mock).mockResolvedValue(1);

        // Act
        const result = await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.points).toBe(2);
      });

      it('should enforce different limits for different contribution types', async () => {
        // Arrange: COMMENT_LIKED 每日上限是 10
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(0);
        (redisService.get as jest.Mock).mockResolvedValue('10'); // 正好达到 COMMENT_LIKED 的 10 上限

        // Act
        const result = await service.addContribution(
          mockUserId,
          ContributionType.COMMENT_LIKED,
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.message).toContain('10分');
      });
    });

    /**
     * 测试无上限类型
     * 验证: ACTIVITY_PARTICIPATE 类型没有每日上限
     */
    describe('Types Without Daily Limit', () => {
      it('should allow unlimited contributions for ACTIVITY_PARTICIPATE', async () => {
        // Arrange: 即使已经有很高的积分，也应该允许
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(0);
        (redisService.get as jest.Mock).mockResolvedValue('1000'); // 很高的积分
        (prismaService.$transaction as jest.Mock).mockResolvedValue({
          record: {
            ...mockContributionRecord,
            type: ContributionType.ACTIVITY_PARTICIPATE,
            points: 15,
          },
          updatedUser: { contributionScore: 115 },
        });
        (redisService.incrBy as jest.Mock).mockResolvedValue(1015);
        (redisService.expire as jest.Mock).mockResolvedValue(1);

        // Act
        const result = await service.addContribution(
          mockUserId,
          ContributionType.ACTIVITY_PARTICIPATE,
          'activity-id',
          'activity',
        );

        // Assert
        expect(result.success).toBe(true);
        expect(result.points).toBe(15);
      });

      it('should return null for dailyLimit in checkDailyLimit for unlimited types', async () => {
        // Act
        const result = await service.checkDailyLimit(
          mockUserId,
          ContributionType.ACTIVITY_PARTICIPATE,
        );

        // Assert
        expect(result.dailyLimit).toBeNull();
        expect(result.isLimitReached).toBe(false);
      });

      it('should return null for remaining in getDailyContribution for unlimited types', async () => {
        // Arrange
        (redisService.get as jest.Mock).mockResolvedValue('500');

        // Act
        const result = await service.getDailyContribution(
          mockUserId,
          ContributionType.ACTIVITY_PARTICIPATE,
        );

        // Assert
        expect(result.dailyLimit).toBeNull();
        expect(result.remaining).toBeNull();
        expect(result.isLimitReached).toBe(false);
      });
    });

    /**
     * 测试去重机制
     * 验证: 同一用户对同一实体的同类型贡献不能重复计分
     */
    describe('Deduplication', () => {
      it('should reject duplicate contribution for same referenceId', async () => {
        // Arrange: 设置去重键已存在
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(1); // 去重键存在

        // Act
        const result = await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
          'chapter-123',
          'chapter',
        );

        // Assert
        expect(result.success).toBe(false);
        expect(result.points).toBe(0);
        expect(result.message).toContain('不能重复计分');
      });

      it('should allow contribution for different referenceId', async () => {
        // Arrange: 设置去重键不存在
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(0); // 去重键不存在
        (redisService.get as jest.Mock).mockResolvedValue('0');
        (prismaService.$transaction as jest.Mock).mockResolvedValue({
          record: mockContributionRecord,
          updatedUser: { contributionScore: 102 },
        });
        (redisService.incrBy as jest.Mock).mockResolvedValue(2);
        (redisService.expire as jest.Mock).mockResolvedValue(1);
        (redisService.set as jest.Mock).mockResolvedValue('OK');

        // Act
        const result = await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
          'chapter-456', // 不同的 referenceId
          'chapter',
        );

        // Assert
        expect(result.success).toBe(true);
        expect(redisService.set).toHaveBeenCalled(); // 应该设置去重键
      });

      it('should set dedup key with correct TTL', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(0);
        (redisService.get as jest.Mock).mockResolvedValue('0');
        (prismaService.$transaction as jest.Mock).mockResolvedValue({
          record: mockContributionRecord,
          updatedUser: { contributionScore: 102 },
        });
        (redisService.incrBy as jest.Mock).mockResolvedValue(2);
        (redisService.expire as jest.Mock).mockResolvedValue(1);
        (redisService.set as jest.Mock).mockResolvedValue('OK');

        // Act
        await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
          'chapter-789',
          'chapter',
        );

        // Assert: 验证去重键被设置，且 TTL 应该是到午夜的秒数
        expect(redisService.set).toHaveBeenCalledWith(
          expect.stringContaining('contribution_dedup'),
          '1',
          expect.any(Number),
        );
      });

      it('should allow contribution without referenceId (no dedup check)', async () => {
        // Arrange: 没有 referenceId 时不检查去重
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.get as jest.Mock).mockResolvedValue('0');
        (prismaService.$transaction as jest.Mock).mockResolvedValue({
          record: { ...mockContributionRecord, referenceId: null },
          updatedUser: { contributionScore: 102 },
        });
        (redisService.incrBy as jest.Mock).mockResolvedValue(2);
        (redisService.expire as jest.Mock).mockResolvedValue(1);

        // Act
        const result = await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
          // 没有 referenceId
        );

        // Assert
        expect(result.success).toBe(true);
        expect(redisService.exists).not.toHaveBeenCalled(); // 不应该检查去重
      });
    });

    /**
     * 测试 Redis 键过期（午夜重置）
     * 验证: Redis 键应该在午夜过期，实现每日上限重置
     */
    describe('Midnight Reset (TTL-based)', () => {
      it('should set Redis key with TTL until midnight', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(0);
        (redisService.get as jest.Mock).mockResolvedValue('0');
        (prismaService.$transaction as jest.Mock).mockResolvedValue({
          record: mockContributionRecord,
          updatedUser: { contributionScore: 102 },
        });
        (redisService.incrBy as jest.Mock).mockResolvedValue(2);
        (redisService.expire as jest.Mock).mockResolvedValue(1);

        // Act
        await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
        );

        // Assert: 验证 expire 被调用，TTL 应该是正数且小于 86400（一天的秒数）
        expect(redisService.expire).toHaveBeenCalledWith(
          expect.stringContaining('contribution_daily'),
          expect.any(Number),
        );
        const ttlArg = (redisService.expire as jest.Mock).mock.calls[0][1];
        expect(ttlArg).toBeGreaterThan(0);
        expect(ttlArg).toBeLessThanOrEqual(86400);
      });

      it('should use date-based Redis key for daily tracking', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(0);
        (redisService.get as jest.Mock).mockResolvedValue('0');
        (prismaService.$transaction as jest.Mock).mockResolvedValue({
          record: mockContributionRecord,
          updatedUser: { contributionScore: 102 },
        });
        (redisService.incrBy as jest.Mock).mockResolvedValue(2);
        (redisService.expire as jest.Mock).mockResolvedValue(1);

        // Act
        await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
        );

        // Assert: 验证 Redis 键包含日期
        const today = new Date().toISOString().split('T')[0];
        expect(redisService.incrBy).toHaveBeenCalledWith(
          expect.stringContaining(today),
          2,
        );
      });

      it('should return 0 points when Redis key does not exist (new day)', async () => {
        // Arrange: Redis 返回 null（键不存在，表示新的一天）
        (redisService.get as jest.Mock).mockResolvedValue(null);

        // Act
        const result = await service.getDailyContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
        );

        // Assert
        expect(result.currentPoints).toBe(0);
        expect(result.remaining).toBe(20); // 全部可用
        expect(result.isLimitReached).toBe(false);
      });
    });

    /**
     * 测试剩余贡献度计算
     * 验证: 正确计算每种类型的剩余可获得贡献度
     */
    describe('Remaining Contribution Calculation', () => {
      it('should calculate remaining points correctly', async () => {
        // Arrange: 当前积分为 12，上限为 20
        (redisService.get as jest.Mock).mockResolvedValue('12');

        // Act
        const result = await service.getDailyContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
        );

        // Assert
        expect(result.currentPoints).toBe(12);
        expect(result.dailyLimit).toBe(20);
        expect(result.remaining).toBe(8); // 20 - 12 = 8
        expect(result.isLimitReached).toBe(false);
      });

      it('should return 0 remaining when limit is reached', async () => {
        // Arrange: 当前积分等于上限
        (redisService.get as jest.Mock).mockResolvedValue('20');

        // Act
        const result = await service.getDailyContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
        );

        // Assert
        expect(result.remaining).toBe(0);
        expect(result.isLimitReached).toBe(true);
      });

      it('should return 0 remaining when limit is exceeded', async () => {
        // Arrange: 当前积分超过上限（边界情况）
        (redisService.get as jest.Mock).mockResolvedValue('25');

        // Act
        const result = await service.getDailyContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
        );

        // Assert
        expect(result.remaining).toBe(0); // Math.max(0, 20 - 25) = 0
        expect(result.isLimitReached).toBe(true);
      });
    });

    /**
     * 测试获取所有每日贡献度统计
     * 验证: getAllDailyContributions 返回所有类型的统计
     */
    describe('Get All Daily Contributions', () => {
      it('should return stats for all contribution types', async () => {
        // Arrange
        (redisService.get as jest.Mock).mockResolvedValue('5');

        // Act
        const result = await service.getAllDailyContributions(mockUserId);

        // Assert
        expect(result).toHaveLength(Object.keys(CONTRIBUTION_CONFIG).length);
        expect(result).toHaveLength(10); // 10 种贡献类型

        // 验证每种类型都有正确的结构
        result.forEach((item) => {
          expect(item).toHaveProperty('type');
          expect(item).toHaveProperty('currentPoints');
          expect(item).toHaveProperty('dailyLimit');
          expect(item).toHaveProperty('remaining');
          expect(item).toHaveProperty('isLimitReached');
        });
      });

      it('should correctly identify types with and without limits', async () => {
        // Arrange
        (redisService.get as jest.Mock).mockResolvedValue('5');

        // Act
        const result = await service.getAllDailyContributions(mockUserId);

        // Assert: 找到 ACTIVITY_PARTICIPATE 类型
        const activityType = result.find(
          (item) => item.type === ContributionType.ACTIVITY_PARTICIPATE,
        );
        expect(activityType).toBeDefined();
        expect(activityType!.dailyLimit).toBeNull();
        expect(activityType!.remaining).toBeNull();
        expect(activityType!.isLimitReached).toBe(false);

        // 找到有上限的类型
        const readChapterType = result.find(
          (item) => item.type === ContributionType.READ_CHAPTER,
        );
        expect(readChapterType).toBeDefined();
        expect(readChapterType!.dailyLimit).toBe(20);
        expect(readChapterType!.remaining).toBe(15); // 20 - 5 = 15
      });
    });

    /**
     * 测试错误消息
     * 验证: 达到上限时返回清晰的错误消息
     */
    describe('Error Messages', () => {
      it('should return clear error message when daily limit reached', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(0);
        (redisService.get as jest.Mock).mockResolvedValue('20');

        // Act
        const result = await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
        );

        // Assert: 消息应该包含贡献类型描述和上限值
        expect(result.message).toContain('完整阅读1章节');
        expect(result.message).toContain('20分');
        expect(result.message).toContain('已达上限');
      });

      it('should return clear error message for duplicate contribution', async () => {
        // Arrange
        (prismaService.user.findUnique as jest.Mock).mockResolvedValue(
          mockUser,
        );
        (redisService.exists as jest.Mock).mockResolvedValue(1);

        // Act
        const result = await service.addContribution(
          mockUserId,
          ContributionType.READ_CHAPTER,
          'chapter-123',
        );

        // Assert
        expect(result.message).toContain('不能重复计分');
      });
    });
  });

  // ==================== 原有测试（保留） ====================

  describe('addContribution', () => {
    it('should add contribution successfully', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (redisService.exists as jest.Mock).mockResolvedValue(0);
      (redisService.get as jest.Mock).mockResolvedValue('0');
      (prismaService.$transaction as jest.Mock).mockResolvedValue({
        record: mockContributionRecord,
        updatedUser: { contributionScore: 102 },
      });
      (redisService.incrBy as jest.Mock).mockResolvedValue(2);
      (redisService.expire as jest.Mock).mockResolvedValue(1);
      (redisService.set as jest.Mock).mockResolvedValue('OK');

      // Act
      const result = await service.addContribution(
        mockUserId,
        ContributionType.READ_CHAPTER,
        'chapter-id',
        'chapter',
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.points).toBe(2);
      expect(result.totalScore).toBe(102);
      expect(result.message).toContain('成功获得');
    });

    it('should reject duplicate contribution', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (redisService.exists as jest.Mock).mockResolvedValue(1); // Already exists

      // Act
      const result = await service.addContribution(
        mockUserId,
        ContributionType.READ_CHAPTER,
        'chapter-id',
        'chapter',
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.points).toBe(0);
      expect(result.message).toContain('不能重复计分');
    });

    it('should reject when daily limit reached', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (redisService.exists as jest.Mock).mockResolvedValue(0);
      (redisService.get as jest.Mock).mockResolvedValue('20'); // Daily limit is 20

      // Act
      const result = await service.addContribution(
        mockUserId,
        ContributionType.READ_CHAPTER,
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.points).toBe(0);
      expect(result.message).toContain('已达上限');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.addContribution(mockUserId, ContributionType.READ_CHAPTER),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid contribution type', async () => {
      // Act & Assert
      await expect(
        service.addContribution(mockUserId, 'INVALID_TYPE' as ContributionType),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getDailyContribution', () => {
    it('should return daily contribution stats', async () => {
      // Arrange
      (redisService.get as jest.Mock).mockResolvedValue('10');

      // Act
      const result = await service.getDailyContribution(
        mockUserId,
        ContributionType.READ_CHAPTER,
      );

      // Assert
      expect(result.type).toBe(ContributionType.READ_CHAPTER);
      expect(result.currentPoints).toBe(10);
      expect(result.dailyLimit).toBe(20);
      expect(result.remaining).toBe(10);
      expect(result.isLimitReached).toBe(false);
    });

    it('should return limit reached when at daily limit', async () => {
      // Arrange
      (redisService.get as jest.Mock).mockResolvedValue('20');

      // Act
      const result = await service.getDailyContribution(
        mockUserId,
        ContributionType.READ_CHAPTER,
      );

      // Assert
      expect(result.isLimitReached).toBe(true);
      expect(result.remaining).toBe(0);
    });

    it('should handle types without daily limit', async () => {
      // Arrange
      (redisService.get as jest.Mock).mockResolvedValue('100');

      // Act
      const result = await service.getDailyContribution(
        mockUserId,
        ContributionType.ACTIVITY_PARTICIPATE,
      );

      // Assert
      expect(result.dailyLimit).toBeNull();
      expect(result.remaining).toBeNull();
      expect(result.isLimitReached).toBe(false);
    });
  });

  describe('checkDailyLimit', () => {
    it('should return not reached when under limit', async () => {
      // Arrange
      (redisService.get as jest.Mock).mockResolvedValue('5');

      // Act
      const result = await service.checkDailyLimit(
        mockUserId,
        ContributionType.READ_CHAPTER,
      );

      // Assert
      expect(result.isLimitReached).toBe(false);
      expect(result.currentPoints).toBe(5);
      expect(result.dailyLimit).toBe(20);
    });

    it('should return reached when at or over limit', async () => {
      // Arrange
      (redisService.get as jest.Mock).mockResolvedValue('25');

      // Act
      const result = await service.checkDailyLimit(
        mockUserId,
        ContributionType.READ_CHAPTER,
      );

      // Assert
      expect(result.isLimitReached).toBe(true);
    });

    it('should return not reached for types without limit', async () => {
      // Act
      const result = await service.checkDailyLimit(
        mockUserId,
        ContributionType.ACTIVITY_PARTICIPATE,
      );

      // Assert
      expect(result.isLimitReached).toBe(false);
      expect(result.dailyLimit).toBeNull();
    });
  });

  describe('getTotalContribution', () => {
    it('should return total contribution with breakdown', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.contributionRecord.aggregate as jest.Mock)
        .mockResolvedValueOnce({ _sum: { points: 20 } }) // reading
        .mockResolvedValueOnce({ _sum: { points: 30 } }) // interaction
        .mockResolvedValueOnce({ _sum: { points: 40 } }) // creation
        .mockResolvedValueOnce({ _sum: { points: 10 } }); // community

      // Act
      const result = await service.getTotalContribution(mockUserId);

      // Assert
      expect(result.totalScore).toBe(100);
      expect(result.breakdown.reading).toBe(20);
      expect(result.breakdown.interaction).toBe(30);
      expect(result.breakdown.creation).toBe(40);
      expect(result.breakdown.community).toBe(10);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(service.getTotalContribution(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getContributionHistory', () => {
    it('should return paginated contribution history', async () => {
      // Arrange
      const mockRecords = [mockContributionRecord];
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prismaService.contributionRecord.count as jest.Mock).mockResolvedValue(
        1,
      );
      (
        prismaService.contributionRecord.findMany as jest.Mock
      ).mockResolvedValue(mockRecords);

      // Act
      const result = await service.getContributionHistory(mockUserId, {
        page: 1,
        pageSize: 10,
      });

      // Assert
      expect(result.records).toHaveLength(1);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(10);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      // Arrange
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getContributionHistory(mockUserId, { page: 1, pageSize: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getContributionConfig', () => {
    it('should return contribution configuration', () => {
      // Act
      const config = service.getContributionConfig();

      // Assert
      expect(config).toBe(CONTRIBUTION_CONFIG);
      expect(config.READ_CHAPTER.points).toBe(2);
      expect(config.READ_CHAPTER.dailyLimit).toBe(20);
    });
  });

  describe('getAllDailyContributions', () => {
    it('should return all daily contribution stats', async () => {
      // Arrange
      (redisService.get as jest.Mock).mockResolvedValue('5');

      // Act
      const result = await service.getAllDailyContributions(mockUserId);

      // Assert
      expect(result).toHaveLength(Object.keys(CONTRIBUTION_CONFIG).length);
      expect(result[0].type).toBeDefined();
      expect(result[0].currentPoints).toBeDefined();
    });
  });
});
