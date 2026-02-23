import { Test, TestingModule } from '@nestjs/testing';
import { SeasonPointsService, PointsChangeReason, POINTS_CONFIG, OVERALL_WEIGHTS } from './season-points.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { SeasonConfigService } from './season-config.service.js';
import { LeaderboardCategory, SeasonTier, SeasonStatus } from './dto/leaderboard.dto.js';

describe('SeasonPointsService', () => {
  let service: SeasonPointsService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;
  let seasonConfigService: jest.Mocked<SeasonConfigService>;

  const mockUserId = 'user-123';
  const mockSeasonId = 'season-456';

  beforeEach(async () => {
    const mockPrismaService = {
      $transaction: jest.fn(),
      season: {
        findUnique: jest.fn(),
      },
      seasonLeaderboard: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      seasonRank: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockRedisService = {
      lpush: jest.fn(),
      ltrim: jest.fn(),
      expire: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      del: jest.fn(),
      lrange: jest.fn().mockResolvedValue([]),
    };

    const mockSeasonConfigService = {
      getTierByPoints: jest.fn().mockReturnValue(SeasonTier.NOVICE),
      getTierConfig: jest.fn().mockReturnValue({
        displayName: '新秀',
        description: '刚刚开始的旅程',
        minPoints: 0,
        color: '#9CA3AF',
        sortValue: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeasonPointsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: SeasonConfigService, useValue: mockSeasonConfigService },
      ],
    }).compile();

    service = module.get<SeasonPointsService>(SeasonPointsService);
    prismaService = module.get(PrismaService);
    redisService = module.get(RedisService);
    seasonConfigService = module.get(SeasonConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('POINTS_CONFIG', () => {
    it('should have correct reading points configuration', () => {
      expect(POINTS_CONFIG[PointsChangeReason.READ_CHAPTER]).toBe(2);
      expect(POINTS_CONFIG[PointsChangeReason.COMPLETE_WORK]).toBe(10);
      expect(POINTS_CONFIG[PointsChangeReason.READING_DURATION]).toBe(1);
    });

    it('should have correct creation points configuration', () => {
      expect(POINTS_CONFIG[PointsChangeReason.PUBLISH_CHAPTER]).toBe(20);
      expect(POINTS_CONFIG[PointsChangeReason.RECEIVE_READS]).toBe(1);
      expect(POINTS_CONFIG[PointsChangeReason.RECEIVE_QUOTES]).toBe(5);
    });

    it('should have correct social points configuration', () => {
      expect(POINTS_CONFIG[PointsChangeReason.POST_CARD]).toBe(3);
      expect(POINTS_CONFIG[PointsChangeReason.RECEIVE_LIKES]).toBe(1);
      expect(POINTS_CONFIG[PointsChangeReason.RECEIVE_COMMENTS]).toBe(2);
      expect(POINTS_CONFIG[PointsChangeReason.GAIN_FOLLOWERS]).toBe(5);
    });
  });

  describe('OVERALL_WEIGHTS', () => {
    it('should have correct weights for each category', () => {
      expect(OVERALL_WEIGHTS[LeaderboardCategory.READING]).toBe(0.3);
      expect(OVERALL_WEIGHTS[LeaderboardCategory.CREATION]).toBe(0.4);
      expect(OVERALL_WEIGHTS[LeaderboardCategory.SOCIAL]).toBe(0.3);
    });

    it('should sum to 1.0', () => {
      const totalWeight =
        OVERALL_WEIGHTS[LeaderboardCategory.READING] +
        OVERALL_WEIGHTS[LeaderboardCategory.CREATION] +
        OVERALL_WEIGHTS[LeaderboardCategory.SOCIAL];
      expect(totalWeight).toBe(1.0);
    });
  });

  describe('PointsChangeReason enum', () => {
    it('should have all reading activity reasons', () => {
      expect(PointsChangeReason.READ_CHAPTER).toBe('READ_CHAPTER');
      expect(PointsChangeReason.COMPLETE_WORK).toBe('COMPLETE_WORK');
      expect(PointsChangeReason.READING_DURATION).toBe('READING_DURATION');
    });

    it('should have all creation activity reasons', () => {
      expect(PointsChangeReason.PUBLISH_CHAPTER).toBe('PUBLISH_CHAPTER');
      expect(PointsChangeReason.RECEIVE_READS).toBe('RECEIVE_READS');
      expect(PointsChangeReason.RECEIVE_QUOTES).toBe('RECEIVE_QUOTES');
    });

    it('should have all social activity reasons', () => {
      expect(PointsChangeReason.POST_CARD).toBe('POST_CARD');
      expect(PointsChangeReason.RECEIVE_LIKES).toBe('RECEIVE_LIKES');
      expect(PointsChangeReason.RECEIVE_COMMENTS).toBe('RECEIVE_COMMENTS');
      expect(PointsChangeReason.GAIN_FOLLOWERS).toBe('GAIN_FOLLOWERS');
    });

    it('should have system adjustment reasons', () => {
      expect(PointsChangeReason.ADMIN_ADJUSTMENT).toBe('ADMIN_ADJUSTMENT');
      expect(PointsChangeReason.SEASON_RESET).toBe('SEASON_RESET');
    });
  });

  describe('Service methods', () => {
    it('should have addReadingPoints method', () => {
      expect(typeof service.addReadingPoints).toBe('function');
    });

    it('should have addCreationPoints method', () => {
      expect(typeof service.addCreationPoints).toBe('function');
    });

    it('should have addSocialPoints method', () => {
      expect(typeof service.addSocialPoints).toBe('function');
    });

    it('should have recalculateOverallScore method', () => {
      expect(typeof service.recalculateOverallScore).toBe('function');
    });

    it('should have getPointsHistory method', () => {
      expect(typeof service.getPointsHistory).toBe('function');
    });

    it('should have batchAddPoints method', () => {
      expect(typeof service.batchAddPoints).toBe('function');
    });

    it('should have getUserPointsSummary method', () => {
      expect(typeof service.getUserPointsSummary).toBe('function');
    });
  });
});
