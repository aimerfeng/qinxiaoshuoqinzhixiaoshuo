import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ActivityReviewService } from './activity-review.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminLogService } from './admin-log.service.js';
import { ActivityService } from '../activity/activity.service.js';
import {
  ActivityStatusFilterDto,
  ActivityTypeFilterDto,
} from './dto/activity-review.dto.js';

describe('ActivityReviewService', () => {
  let service: ActivityReviewService;
  let prisma: any;
  let adminLogService: any;
  let activityService: any;

  const mockActivity = {
    id: 'activity-1',
    title: '阅读打卡挑战',
    description: '连续7天阅读指定作品，每天至少阅读1章',
    coverImage: null,
    type: 'READING_CHALLENGE',
    status: 'PENDING',
    startTime: new Date(Date.now() + 86400000), // tomorrow
    endTime: new Date(Date.now() + 86400000 * 8), // 8 days from now
    rules: { minChapters: 1 },
    rewards: { type: 'MUSTARD_SEED', amount: 10 },
    maxParticipants: 100,
    rewardPerPerson: 10,
    totalPool: 1000,
    lockedPool: 1000,
    creatorId: 'user-1',
    reviewerId: null,
    reviewedAt: null,
    rejectReason: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    creator: {
      id: 'user-1',
      email: 'creator@example.com',
      username: 'creator1',
      displayName: '创作者一号',
      avatar: null,
      memberLevel: 'OFFICIAL',
      contributionScore: 600,
      isActive: true,
      createdAt: new Date(),
    },
    _count: { participations: 5 },
  };

  beforeEach(async () => {
    prisma = {
      activity: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      activityParticipation: {
        count: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    adminLogService = {
      logAction: jest.fn(),
    };

    activityService = {
      approveActivity: jest.fn(),
      rejectActivity: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityReviewService,
        { provide: PrismaService, useValue: prisma },
        { provide: AdminLogService, useValue: adminLogService },
        { provide: ActivityService, useValue: activityService },
      ],
    }).compile();

    service = module.get<ActivityReviewService>(ActivityReviewService);
  });

  describe('getActivityList', () => {
    it('should return paginated activity list', async () => {
      prisma.activity.findMany.mockResolvedValue([mockActivity]);
      prisma.activity.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.getActivityList({ page: 1, limit: 20 });

      expect(result.activities).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.activities[0].id).toBe('activity-1');
      expect(result.activities[0].typeName).toBe('阅读打卡');
      expect(result.activities[0].statusName).toBe('待审核');
    });

    it('should filter by status', async () => {
      prisma.activity.findMany.mockResolvedValue([]);
      prisma.activity.count.mockResolvedValue(0);

      await service.getActivityList({
        status: ActivityStatusFilterDto.PENDING,
      });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should filter by type', async () => {
      prisma.activity.findMany.mockResolvedValue([]);
      prisma.activity.count.mockResolvedValue(0);

      await service.getActivityList({
        type: ActivityTypeFilterDto.READING_CHALLENGE,
      });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ type: 'READING_CHALLENGE' }),
        }),
      );
    });

    it('should search by title or description', async () => {
      prisma.activity.findMany.mockResolvedValue([]);
      prisma.activity.count.mockResolvedValue(0);

      await service.getActivityList({ search: '阅读' });

      expect(prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: '阅读', mode: 'insensitive' } },
              { description: { contains: '阅读', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });
  });

  describe('getActivityDetail', () => {
    it('should return activity detail with compliance check', async () => {
      prisma.activity.findUnique.mockResolvedValue(mockActivity);
      prisma.activityParticipation.count.mockResolvedValue(5);

      const result = await service.getActivityDetail('activity-1');

      expect(result.id).toBe('activity-1');
      expect(result.title).toBe('阅读打卡挑战');
      expect(result.complianceCheck).toBeDefined();
      expect(result.complianceCheck.checks.length).toBeGreaterThan(0);
      expect(result.creatorDetail).toBeDefined();
      expect(result.creatorDetail.email).toBe('creator@example.com');
      expect(result.participationStats).toBeDefined();
    });

    it('should throw NotFoundException for non-existent activity', async () => {
      prisma.activity.findUnique.mockResolvedValue(null);

      await expect(service.getActivityDetail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for deleted activity', async () => {
      prisma.activity.findUnique.mockResolvedValue({
        ...mockActivity,
        isDeleted: true,
      });

      await expect(service.getActivityDetail('activity-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should run compliance checks correctly for valid activity', async () => {
      prisma.activity.findUnique.mockResolvedValue(mockActivity);
      prisma.activityParticipation.count.mockResolvedValue(0);

      const result = await service.getActivityDetail('activity-1');

      // All checks should pass for the valid mock activity
      expect(result.complianceCheck.passed).toBe(true);
      expect(result.complianceCheck.checks.every((c) => c.passed)).toBe(true);
    });

    it('should detect compliance issues for invalid activity', async () => {
      const invalidActivity = {
        ...mockActivity,
        title: 'ab', // too short (< 4 chars)
        startTime: new Date(Date.now() - 86400000), // in the past
        rewardPerPerson: 200, // exceeds 100 limit
      };
      prisma.activity.findUnique.mockResolvedValue(invalidActivity);
      prisma.activityParticipation.count.mockResolvedValue(0);

      const result = await service.getActivityDetail('activity-1');

      expect(result.complianceCheck.passed).toBe(false);
      const failedChecks = result.complianceCheck.checks.filter((c) => !c.passed);
      expect(failedChecks.length).toBeGreaterThan(0);
    });
  });

  describe('approveActivity', () => {
    it('should approve activity and log admin action', async () => {
      activityService.approveActivity.mockResolvedValue({
        success: true,
        message: '活动已审核通过',
      });
      prisma.activity.update.mockResolvedValue(mockActivity);
      prisma.user.findMany.mockResolvedValue([
        { id: 'admin-1', username: 'admin', displayName: '管理员' },
      ]);

      const result = await service.approveActivity('activity-1', 'admin-1', {
        reviewNote: '活动内容合规',
      });

      expect(result.success).toBe(true);
      expect(activityService.approveActivity).toHaveBeenCalledWith(
        'activity-1',
        'admin-1',
        '活动内容合规',
      );
      expect(adminLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'admin-1',
          actionType: 'ACTIVITY_APPROVE',
          targetType: 'ACTIVITY',
          targetId: 'activity-1',
        }),
      );
    });

    it('should throw BadRequestException when activity service returns failure', async () => {
      activityService.approveActivity.mockResolvedValue({
        success: false,
        message: '活动不存在',
      });

      await expect(
        service.approveActivity('non-existent', 'admin-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectActivity', () => {
    it('should reject activity, log action, and include refund info', async () => {
      activityService.rejectActivity.mockResolvedValue({
        success: true,
        message: '活动已被拒绝，已退还 1000 零芥子',
        refundedAmount: 1000,
      });
      prisma.activity.update.mockResolvedValue({
        ...mockActivity,
        status: 'CANCELLED',
        rejectReason: '活动内容不合规',
      });
      prisma.user.findMany.mockResolvedValue([
        { id: 'admin-1', username: 'admin', displayName: '管理员' },
      ]);

      const result = await service.rejectActivity('activity-1', 'admin-1', {
        rejectReason: '活动内容不合规',
        suggestions: '建议修改活动描述',
      });

      expect(result.success).toBe(true);
      expect(activityService.rejectActivity).toHaveBeenCalledWith(
        'activity-1',
        'admin-1',
        '活动内容不合规',
      );
      expect(adminLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          adminId: 'admin-1',
          actionType: 'ACTIVITY_REJECT',
          targetType: 'ACTIVITY',
          targetId: 'activity-1',
          metadata: expect.objectContaining({
            rejectReason: '活动内容不合规',
            suggestions: '建议修改活动描述',
            refundedAmount: 1000,
          }),
        }),
      );
    });

    it('should throw BadRequestException when activity service returns failure', async () => {
      activityService.rejectActivity.mockResolvedValue({
        success: false,
        message: '活动当前状态不允许拒绝',
      });

      await expect(
        service.rejectActivity('activity-1', 'admin-1', {
          rejectReason: '不合规',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
