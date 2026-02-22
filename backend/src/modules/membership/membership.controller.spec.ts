import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { MembershipController } from './membership.controller.js';
import { ContributionService } from './contribution.service.js';
import { MembershipApplicationService } from './application.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

describe('MembershipController', () => {
  let controller: MembershipController;
  let contributionService: jest.Mocked<ContributionService>;

  const mockContributionService = {
    getTotalContribution: jest.fn(),
    getAllDailyContributions: jest.fn(),
    getContributionHistory: jest.fn(),
    getContributionConfig: jest.fn(),
  };

  const mockApplicationService = {
    checkEligibility: jest.fn(),
    createApplication: jest.fn(),
    getMyApplications: jest.fn(),
    getApplicationStatus: jest.fn(),
    getPendingApplications: jest.fn(),
    approveApplication: jest.fn(),
    rejectApplication: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MembershipController],
      providers: [
        {
          provide: ContributionService,
          useValue: mockContributionService,
        },
        {
          provide: MembershipApplicationService,
          useValue: mockApplicationService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        JwtAuthGuard,
      ],
    }).compile();

    controller = module.get<MembershipController>(MembershipController);
    contributionService = module.get(ContributionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTotalContribution', () => {
    it('should return total contribution with level info', async () => {
      const mockResult = {
        totalScore: 600,
        breakdown: {
          reading: 200,
          interaction: 150,
          creation: 200,
          community: 50,
        },
      };

      mockContributionService.getTotalContribution.mockResolvedValue(
        mockResult,
      );

      const req = { user: { userId: 'test-user-id' } };
      const result = await controller.getTotalContribution(req);

      expect(result.message).toBe('获取贡献度成功');
      expect(result.data.totalScore).toBe(600);
      expect(result.data.breakdown).toEqual(mockResult.breakdown);
      expect(result.data.level.current).toBe(1); // 600 >= 500, so level 1
      expect(result.data.level.name).toBe('正式会员');
      expect(result.data.level.nextLevelScore).toBe(2000);
      expect(contributionService.getTotalContribution).toHaveBeenCalledWith(
        'test-user-id',
      );
    });

    it('should calculate level 0 for score below 500', async () => {
      const mockResult = {
        totalScore: 100,
        breakdown: {
          reading: 50,
          interaction: 30,
          creation: 20,
          community: 0,
        },
      };

      mockContributionService.getTotalContribution.mockResolvedValue(
        mockResult,
      );

      const req = { user: { userId: 'test-user-id' } };
      const result = await controller.getTotalContribution(req);

      expect(result.data.level.current).toBe(0);
      expect(result.data.level.name).toBe('普通会员');
      expect(result.data.level.nextLevelScore).toBe(500);
    });
  });

  describe('getDailyContribution', () => {
    it('should return daily contribution stats', async () => {
      const mockDailyContributions = [
        {
          type: 'READ_CHAPTER',
          currentPoints: 10,
          dailyLimit: 20,
          remaining: 10,
          isLimitReached: false,
        },
        {
          type: 'COMMENT_VALID',
          currentPoints: 15,
          dailyLimit: 15,
          remaining: 0,
          isLimitReached: true,
        },
      ];

      mockContributionService.getAllDailyContributions.mockResolvedValue(
        mockDailyContributions,
      );

      const req = { user: { userId: 'test-user-id' } };
      const result = await controller.getDailyContribution(req);

      expect(result.message).toBe('获取今日贡献度统计成功');
      expect(result.data.contributions).toHaveLength(2);
      expect(result.data.contributions[0].typeName).toBe('阅读章节');
      expect(result.data.contributions[1].typeName).toBe('有效评论');
      expect(result.data.totalEarnedToday).toBe(25);
      expect(contributionService.getAllDailyContributions).toHaveBeenCalledWith(
        'test-user-id',
      );
    });
  });

  describe('getContributionHistory', () => {
    it('should return paginated contribution history', async () => {
      const mockHistory = {
        records: [
          {
            id: 'record-1',
            type: 'READ_CHAPTER',
            points: 2,
            referenceId: 'chapter-1',
            referenceType: 'chapter',
            description: '完整阅读1章节',
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockContributionService.getContributionHistory.mockResolvedValue(
        mockHistory,
      );

      const req = { user: { userId: 'test-user-id' } };
      const query = { page: 1, pageSize: 20 };
      const result = await controller.getContributionHistory(req, query);

      expect(result.message).toBe('获取贡献度历史成功');
      expect(result.data.records).toHaveLength(1);
      expect(result.data.pagination.total).toBe(1);
      expect(contributionService.getContributionHistory).toHaveBeenCalledWith(
        'test-user-id',
        { page: 1, pageSize: 20 },
      );
    });
  });

  describe('getContributionConfig', () => {
    it('should return contribution config', () => {
      const mockConfig = {
        READ_CHAPTER: {
          points: 2,
          dailyLimit: 20,
          description: '完整阅读1章节',
        },
        COMMENT_VALID: {
          points: 3,
          dailyLimit: 15,
          description: '发布有效评论（≥20字）',
        },
      };

      mockContributionService.getContributionConfig.mockReturnValue(mockConfig);

      const result = controller.getContributionConfig();

      expect(result.message).toBe('获取贡献度配置成功');
      expect(result.data.configs).toHaveLength(2);
      expect(result.data.configs[0].type).toBe('READ_CHAPTER');
      expect(result.data.configs[0].typeName).toBe('阅读章节');
      expect(result.data.configs[0].category).toBe('reading');
      expect(result.data.configs[1].type).toBe('COMMENT_VALID');
      expect(result.data.configs[1].category).toBe('interaction');
    });
  });
});
