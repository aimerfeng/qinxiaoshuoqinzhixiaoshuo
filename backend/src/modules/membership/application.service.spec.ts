import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { MembershipApplicationService } from './application.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  MemberLevelEnum,
  MemberApplicationStatusEnum,
} from './dto/application.dto.js';

/**
 * 会员申请服务测试
 *
 * 需求14: 会员等级体系
 * 任务14.1.4: 会员申请 API
 */
describe('MembershipApplicationService', () => {
  let service: MembershipApplicationService;
  let prismaService: PrismaService;

  // Mock 用户数据
  const mockUser = {
    id: 'user-123',
    memberLevel: 'REGULAR',
    contributionScore: 600,
  };

  // Mock 申请数据
  const mockApplication = {
    id: 'app-123',
    userId: 'user-123',
    targetLevel: 'OFFICIAL',
    currentScore: 600,
    status: 'PENDING',
    reason: '我想成为正式会员',
    rejectReason: null,
    reviewerId: null,
    reviewedAt: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipApplicationService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
            memberApplication: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              count: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<MembershipApplicationService>(
      MembershipApplicationService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkEligibility', () => {
    it('应该返回用户的升级资格信息', async () => {
      // Arrange
      (prismaService as any).user.findUnique = jest
        .fn()
        .mockResolvedValue(mockUser);
      (prismaService as any).memberApplication.findMany = jest
        .fn()
        .mockResolvedValue([]);

      // Act
      const result = await service.checkEligibility('user-123');

      // Assert
      expect(result.currentLevel).toBe(MemberLevelEnum.REGULAR);
      expect(result.currentScore).toBe(600);
      expect(result.eligibleLevels).toHaveLength(3); // OFFICIAL, SENIOR, HONORARY

      // 检查正式会员资格
      const officialLevel = result.eligibleLevels.find(
        (l) => l.level === MemberLevelEnum.OFFICIAL,
      );
      expect(officialLevel?.isEligible).toBe(true);
      expect(officialLevel?.canApply).toBe(true);
      expect(officialLevel?.requiredScore).toBe(500);
    });

    it('当用户贡献度不足时应该显示不可申请', async () => {
      // Arrange
      const lowScoreUser = { ...mockUser, contributionScore: 300 };
      (prismaService as any).user.findUnique = jest
        .fn()
        .mockResolvedValue(lowScoreUser);
      (prismaService as any).memberApplication.findMany = jest
        .fn()
        .mockResolvedValue([]);

      // Act
      const result = await service.checkEligibility('user-123');

      // Assert
      const officialLevel = result.eligibleLevels.find(
        (l) => l.level === MemberLevelEnum.OFFICIAL,
      );
      expect(officialLevel?.isEligible).toBe(false);
      expect(officialLevel?.canApply).toBe(false);
      expect(officialLevel?.reason).toContain('贡献度不足');
    });

    it('当已有待审核申请时应该显示不可申请', async () => {
      // Arrange
      (prismaService as any).user.findUnique = jest
        .fn()
        .mockResolvedValue(mockUser);
      (prismaService as any).memberApplication.findMany = jest
        .fn()
        .mockResolvedValue([{ targetLevel: 'OFFICIAL' }]);

      // Act
      const result = await service.checkEligibility('user-123');

      // Assert
      const officialLevel = result.eligibleLevels.find(
        (l) => l.level === MemberLevelEnum.OFFICIAL,
      );
      expect(officialLevel?.hasPendingApplication).toBe(true);
      expect(officialLevel?.canApply).toBe(false);
      expect(officialLevel?.reason).toBe('已有待审核的申请');
    });

    it('当用户不存在时应该抛出 NotFoundException', async () => {
      // Arrange
      (prismaService as any).user.findUnique = jest
        .fn()
        .mockResolvedValue(null);

      // Act & Assert
      await expect(service.checkEligibility('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createApplication', () => {
    it('应该成功创建会员申请', async () => {
      // Arrange
      (prismaService as any).user.findUnique = jest
        .fn()
        .mockResolvedValue(mockUser);
      (prismaService as any).memberApplication.findFirst = jest
        .fn()
        .mockResolvedValue(null);
      (prismaService as any).memberApplication.create = jest
        .fn()
        .mockResolvedValue(mockApplication);

      // Act
      const result = await service.createApplication(
        'user-123',
        MemberLevelEnum.OFFICIAL,
        '我想成为正式会员',
      );

      // Assert
      expect(result.id).toBe('app-123');
      expect(result.targetLevel).toBe(MemberLevelEnum.OFFICIAL);
      expect(result.status).toBe(MemberApplicationStatusEnum.PENDING);
      expect(
        (prismaService as any).memberApplication.create,
      ).toHaveBeenCalled();
    });

    it('当贡献度不足时应该抛出 BadRequestException', async () => {
      // Arrange
      const lowScoreUser = { ...mockUser, contributionScore: 300 };
      (prismaService as any).user.findUnique = jest
        .fn()
        .mockResolvedValue(lowScoreUser);

      // Act & Assert
      await expect(
        service.createApplication('user-123', MemberLevelEnum.OFFICIAL),
      ).rejects.toThrow(BadRequestException);
    });

    it('当目标等级不高于当前等级时应该抛出 BadRequestException', async () => {
      // Arrange
      const officialUser = { ...mockUser, memberLevel: 'OFFICIAL' };
      (prismaService as any).user.findUnique = jest
        .fn()
        .mockResolvedValue(officialUser);

      // Act & Assert
      await expect(
        service.createApplication('user-123', MemberLevelEnum.OFFICIAL),
      ).rejects.toThrow(BadRequestException);
    });

    it('当已有待审核申请时应该抛出 ConflictException', async () => {
      // Arrange
      (prismaService as any).user.findUnique = jest
        .fn()
        .mockResolvedValue(mockUser);
      (prismaService as any).memberApplication.findFirst = jest
        .fn()
        .mockResolvedValue(mockApplication);

      // Act & Assert
      await expect(
        service.createApplication('user-123', MemberLevelEnum.OFFICIAL),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getMyApplications', () => {
    it('应该返回用户的申请历史列表', async () => {
      // Arrange
      (prismaService as any).memberApplication.count = jest
        .fn()
        .mockResolvedValue(1);
      (prismaService as any).memberApplication.findMany = jest
        .fn()
        .mockResolvedValue([mockApplication]);

      // Act
      const result = await service.getMyApplications('user-123', {
        page: 1,
        pageSize: 10,
      });

      // Assert
      expect(result.applications).toHaveLength(1);
      expect(result.applications[0].id).toBe('app-123');
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.page).toBe(1);
    });

    it('应该支持按状态筛选', async () => {
      // Arrange
      (prismaService as any).memberApplication.count = jest
        .fn()
        .mockResolvedValue(0);
      (prismaService as any).memberApplication.findMany = jest
        .fn()
        .mockResolvedValue([]);

      // Act
      await service.getMyApplications(
        'user-123',
        { page: 1, pageSize: 10 },
        MemberApplicationStatusEnum.APPROVED,
      );

      // Assert
      expect(
        (prismaService as any).memberApplication.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: MemberApplicationStatusEnum.APPROVED,
          }),
        }),
      );
    });
  });

  describe('getApplicationStatus', () => {
    it('应该返回申请详情', async () => {
      // Arrange
      (prismaService as any).memberApplication.findFirst = jest
        .fn()
        .mockResolvedValue(mockApplication);

      // Act
      const result = await service.getApplicationStatus('user-123', 'app-123');

      // Assert
      expect(result.id).toBe('app-123');
      expect(result.targetLevel).toBe(MemberLevelEnum.OFFICIAL);
      expect(result.status).toBe(MemberApplicationStatusEnum.PENDING);
    });

    it('当申请不存在时应该抛出 NotFoundException', async () => {
      // Arrange
      (prismaService as any).memberApplication.findFirst = jest
        .fn()
        .mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getApplicationStatus('user-123', 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ==================== 管理员审核 API 测试 ====================

  describe('getPendingApplications', () => {
    const mockApplicationWithUser = {
      ...mockApplication,
      user: {
        id: 'user-123',
        username: 'testuser',
        nickname: '测试用户',
        avatar: null,
        memberLevel: 'REGULAR',
        contributionScore: 600,
        createdAt: new Date('2024-01-01'),
      },
    };

    it('应该返回待审核申请列表', async () => {
      // Arrange
      (prismaService as any).memberApplication.count = jest
        .fn()
        .mockResolvedValue(1);
      (prismaService as any).memberApplication.findMany = jest
        .fn()
        .mockResolvedValue([mockApplicationWithUser]);

      // Act
      const result = await service.getPendingApplications({
        page: 1,
        pageSize: 10,
      });

      // Assert
      expect(result.applications).toHaveLength(1);
      expect(result.applications[0].id).toBe('app-123');
      expect(result.applications[0].user.username).toBe('testuser');
      expect(result.pagination.total).toBe(1);
    });

    it('应该默认只查询待审核状态', async () => {
      // Arrange
      (prismaService as any).memberApplication.count = jest
        .fn()
        .mockResolvedValue(0);
      (prismaService as any).memberApplication.findMany = jest
        .fn()
        .mockResolvedValue([]);

      // Act
      await service.getPendingApplications({ page: 1, pageSize: 10 });

      // Assert
      expect(
        (prismaService as any).memberApplication.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
        }),
      );
    });

    it('应该支持按目标等级筛选', async () => {
      // Arrange
      (prismaService as any).memberApplication.count = jest
        .fn()
        .mockResolvedValue(0);
      (prismaService as any).memberApplication.findMany = jest
        .fn()
        .mockResolvedValue([]);

      // Act
      await service.getPendingApplications(
        { page: 1, pageSize: 10 },
        undefined,
        MemberLevelEnum.OFFICIAL,
      );

      // Assert
      expect(
        (prismaService as any).memberApplication.findMany,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            targetLevel: MemberLevelEnum.OFFICIAL,
          }),
        }),
      );
    });
  });

  describe('approveApplication', () => {
    const mockApplicationWithUser = {
      ...mockApplication,
      user: {
        id: 'user-123',
        username: 'testuser',
        nickname: '测试用户',
        avatar: null,
        memberLevel: 'REGULAR',
        contributionScore: 600,
        createdAt: new Date('2024-01-01'),
      },
    };

    const mockUpdatedApplication = {
      ...mockApplicationWithUser,
      status: 'APPROVED',
      reviewerId: 'admin-123',
      reviewedAt: new Date('2024-01-02'),
    };

    beforeEach(() => {
      // Mock $transaction
      (prismaService as any).$transaction = jest.fn(async (callback) => {
        const tx = {
          memberApplication: {
            update: jest.fn().mockResolvedValue(mockUpdatedApplication),
          },
          user: {
            update: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(tx);
      });
    });

    it('应该成功审核通过申请', async () => {
      // Arrange
      (prismaService as any).memberApplication.findUnique = jest
        .fn()
        .mockResolvedValue(mockApplicationWithUser);

      // Act
      const result = await service.approveApplication('app-123', 'admin-123');

      // Assert
      expect(result.status).toBe(MemberApplicationStatusEnum.APPROVED);
      expect(result.reviewerId).toBe('admin-123');
      expect((prismaService as any).$transaction).toHaveBeenCalled();
    });

    it('当申请不存在时应该抛出 NotFoundException', async () => {
      // Arrange
      (prismaService as any).memberApplication.findUnique = jest
        .fn()
        .mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.approveApplication('non-existent', 'admin-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('当申请已被处理时应该抛出 BadRequestException', async () => {
      // Arrange
      const approvedApplication = {
        ...mockApplicationWithUser,
        status: 'APPROVED',
      };
      (prismaService as any).memberApplication.findUnique = jest
        .fn()
        .mockResolvedValue(approvedApplication);

      // Act & Assert
      await expect(
        service.approveApplication('app-123', 'admin-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectApplication', () => {
    const mockApplicationWithUser = {
      ...mockApplication,
      user: {
        id: 'user-123',
        username: 'testuser',
        nickname: '测试用户',
        avatar: null,
        memberLevel: 'REGULAR',
        contributionScore: 600,
        createdAt: new Date('2024-01-01'),
      },
    };

    const mockRejectedApplication = {
      ...mockApplicationWithUser,
      status: 'REJECTED',
      rejectReason: '贡献度不够真实',
      reviewerId: 'admin-123',
      reviewedAt: new Date('2024-01-02'),
    };

    it('应该成功拒绝申请', async () => {
      // Arrange
      (prismaService as any).memberApplication.findUnique = jest
        .fn()
        .mockResolvedValue(mockApplicationWithUser);
      (prismaService as any).memberApplication.update = jest
        .fn()
        .mockResolvedValue(mockRejectedApplication);

      // Act
      const result = await service.rejectApplication(
        'app-123',
        'admin-123',
        '贡献度不够真实',
      );

      // Assert
      expect(result.status).toBe(MemberApplicationStatusEnum.REJECTED);
      expect(result.rejectReason).toBe('贡献度不够真实');
      expect(result.reviewerId).toBe('admin-123');
    });

    it('当申请不存在时应该抛出 NotFoundException', async () => {
      // Arrange
      (prismaService as any).memberApplication.findUnique = jest
        .fn()
        .mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.rejectApplication('non-existent', 'admin-123', '拒绝原因'),
      ).rejects.toThrow(NotFoundException);
    });

    it('当申请已被处理时应该抛出 BadRequestException', async () => {
      // Arrange
      const rejectedApplication = {
        ...mockApplicationWithUser,
        status: 'REJECTED',
      };
      (prismaService as any).memberApplication.findUnique = jest
        .fn()
        .mockResolvedValue(rejectedApplication);

      // Act & Assert
      await expect(
        service.rejectApplication('app-123', 'admin-123', '拒绝原因'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
