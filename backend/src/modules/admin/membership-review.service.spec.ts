import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MembershipReviewService } from './membership-review.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminLogService } from './admin-log.service.js';
import {
  ApplicationStatusDto,
  MemberLevelDto,
} from './dto/membership-review.dto.js';

/**
 * 会员审核服务单元测试
 *
 * 需求18验收标准6: WHEN 审核员处理会员申请 THEN System SHALL 显示申请信息、贡献度、历史行为
 * 需求14验收标准5: WHEN 管理员审核通过申请 THEN System SHALL 升级用户为 Official_Member 并发放欢迎奖励
 * 需求14验收标准6: WHEN 管理员拒绝申请 THEN System SHALL 通知用户并说明拒绝原因
 */
describe('MembershipReviewService', () => {
  let service: MembershipReviewService;

  // Mock data
  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    avatar: null,
    memberLevel: 'REGULAR',
    contributionScore: 600,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    lastLoginAt: new Date('2024-06-01'),
  };

  const mockApplication = {
    id: 'app-1',
    userId: 'user-1',
    targetLevel: 'OFFICIAL',
    currentScore: 600,
    status: 'PENDING',
    reason: '我想成为正式会员',
    rejectReason: null,
    reviewerId: null,
    reviewedAt: null,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    user: mockUser,
  };

  const mockReviewer = {
    id: 'admin-1',
    username: 'admin',
    displayName: 'Admin User',
  };

  // Mock Prisma
  const mockPrisma = {
    memberApplication: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    contributionRecord: {
      findMany: jest.fn(),
    },
    work: {
      count: jest.fn(),
    },
    card: {
      count: jest.fn(),
    },
    comment: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Mock AdminLogService
  const mockAdminLogService = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipReviewService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AdminLogService, useValue: mockAdminLogService },
      ],
    }).compile();

    service = module.get<MembershipReviewService>(MembershipReviewService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('getApplicationList', () => {
    it('should return paginated application list', async () => {
      mockPrisma.memberApplication.findMany.mockResolvedValue([mockApplication]);
      mockPrisma.memberApplication.count.mockResolvedValue(1);
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.getApplicationList({
        page: 1,
        limit: 20,
      });

      expect(result.applications).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
      expect(result.applications[0].id).toBe('app-1');
      expect(result.applications[0].targetLevelName).toBe('正式会员');
      expect(result.applications[0].statusName).toBe('待审核');
    });

    it('should filter by status', async () => {
      mockPrisma.memberApplication.findMany.mockResolvedValue([]);
      mockPrisma.memberApplication.count.mockResolvedValue(0);

      await service.getApplicationList({
        status: ApplicationStatusDto.PENDING,
      });

      expect(mockPrisma.memberApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should filter by target level', async () => {
      mockPrisma.memberApplication.findMany.mockResolvedValue([]);
      mockPrisma.memberApplication.count.mockResolvedValue(0);

      await service.getApplicationList({
        targetLevel: MemberLevelDto.OFFICIAL,
      });

      expect(mockPrisma.memberApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ targetLevel: 'OFFICIAL' }),
        }),
      );
    });
  });


  describe('getApplicationDetail', () => {
    it('should return application detail with user info and contribution breakdown', async () => {
      mockPrisma.memberApplication.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.contributionRecord.findMany.mockResolvedValue([
        { type: 'READ_CHAPTER', points: 20 },
        { type: 'COMMENT_VALID', points: 15 },
        { type: 'PUBLISH_CHAPTER', points: 40 },
      ]);
      mockPrisma.work.count.mockResolvedValue(2);
      mockPrisma.card.count.mockResolvedValue(5);
      mockPrisma.comment.count.mockResolvedValue(10);
      mockPrisma.memberApplication.count
        .mockResolvedValueOnce(3) // total
        .mockResolvedValueOnce(1) // approved
        .mockResolvedValueOnce(1); // rejected

      const result = await service.getApplicationDetail('app-1');

      expect(result.id).toBe('app-1');
      expect(result.targetLevelName).toBe('正式会员');
      expect(result.userDetail.email).toBe('test@example.com');
      expect(result.contributionBreakdown.reading).toBe(20);
      expect(result.contributionBreakdown.interaction).toBe(15);
      expect(result.contributionBreakdown.creation).toBe(40);
      expect(result.recentActivity.worksCount).toBe(2);
      expect(result.recentActivity.cardsCount).toBe(5);
      expect(result.applicationHistory.totalApplications).toBe(3);
    });

    it('should throw NotFoundException for non-existent application', async () => {
      mockPrisma.memberApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.getApplicationDetail('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveApplication', () => {
    it('should approve application and upgrade user level', async () => {
      const approvedApp = {
        ...mockApplication,
        status: 'APPROVED',
        reviewerId: 'admin-1',
        reviewedAt: new Date(),
      };

      mockPrisma.memberApplication.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          memberApplication: {
            update: jest.fn().mockResolvedValue(approvedApp),
          },
          user: {
            update: jest.fn().mockResolvedValue({ ...mockUser, memberLevel: 'OFFICIAL' }),
          },
        });
      });
      mockPrisma.user.findMany.mockResolvedValue([mockReviewer]);

      const result = await service.approveApplication('app-1', 'admin-1', {});

      expect(result.success).toBe(true);
      expect(result.message).toContain('正式会员');
      expect(mockAdminLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'MEMBER_APPROVE',
          targetType: 'USER',
          targetId: 'user-1',
        }),
      );
    });

    it('should throw NotFoundException for non-existent application', async () => {
      mockPrisma.memberApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.approveApplication('non-existent', 'admin-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already processed application', async () => {
      mockPrisma.memberApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        status: 'APPROVED',
      });

      await expect(
        service.approveApplication('app-1', 'admin-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectApplication', () => {
    it('should reject application with reason', async () => {
      const rejectedApp = {
        ...mockApplication,
        status: 'REJECTED',
        rejectReason: '贡献度不够活跃',
        reviewerId: 'admin-1',
        reviewedAt: new Date(),
      };

      mockPrisma.memberApplication.findUnique.mockResolvedValue(mockApplication);
      mockPrisma.memberApplication.update.mockResolvedValue(rejectedApp);
      mockPrisma.user.findMany.mockResolvedValue([mockReviewer]);

      const result = await service.rejectApplication('app-1', 'admin-1', {
        rejectReason: '贡献度不够活跃',
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('拒绝');
      expect(mockAdminLogService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'MEMBER_REJECT',
          targetType: 'USER',
          targetId: 'user-1',
        }),
      );
    });

    it('should throw NotFoundException for non-existent application', async () => {
      mockPrisma.memberApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectApplication('non-existent', 'admin-1', {
          rejectReason: '原因',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already processed application', async () => {
      mockPrisma.memberApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        status: 'REJECTED',
      });

      await expect(
        service.rejectApplication('app-1', 'admin-1', {
          rejectReason: '原因',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
