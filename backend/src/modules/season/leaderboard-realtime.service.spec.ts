import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardRealtimeService } from './leaderboard-realtime.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { LeaderboardCategory } from './dto/leaderboard.dto.js';
import { NotFoundException } from '@nestjs/common';

describe('LeaderboardRealtimeService', () => {
  let service: LeaderboardRealtimeService;
  let redisService: jest.Mocked<RedisService>;
  let prismaService: jest.Mocked<PrismaService>;

  // Mock Redis client
  const mockRedisClient = {
    zrevrank: jest.fn(),
    zincrby: jest.fn(),
    zrevrange: jest.fn(),
    zcard: jest.fn(),
    zcount: jest.fn(),
    zrem: jest.fn(),
    set: jest.fn(),
    pipeline: jest.fn(() => ({
      zadd: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardRealtimeService,
        {
          provide: PrismaService,
          useValue: {
            season: {
              findUnique: jest.fn(),
            },
            seasonLeaderboard: {
              findMany: jest.fn(),
              upsert: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn({
              seasonLeaderboard: {
                upsert: jest.fn(),
              },
            })),
          },
        },
        {
          provide: RedisService,
          useValue: {
            zadd: jest.fn().mockResolvedValue(1),
            zscore: jest.fn(),
            zrange: jest.fn(),
            zrevrange: jest.fn(),
            zrank: jest.fn(),
            del: jest.fn().mockResolvedValue(1),
            expire: jest.fn().mockResolvedValue(1),
            get: jest.fn(),
            set: jest.fn().mockResolvedValue('OK'),
            getClient: jest.fn(() => mockRedisClient),
          },
        },
      ],
    }).compile();

    service = module.get<LeaderboardRealtimeService>(LeaderboardRealtimeService);
    redisService = module.get(RedisService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateScore', () => {
    it('should update user score and return new rank', async () => {
      const seasonId = 'season-1';
      const category = LeaderboardCategory.READING;
      const userId = 'user-1';
      const score = 100;

      mockRedisClient.zrevrank.mockResolvedValue(0); // Rank 0 means position 1

      const rank = await service.updateScore(seasonId, category, userId, score);

      expect(redisService.zadd).toHaveBeenCalledWith(
        `leaderboard:realtime:${seasonId}:${category}`,
        score,
        userId,
      );
      expect(redisService.expire).toHaveBeenCalled();
      expect(rank).toBe(1);
    });

    it('should return -1 when user is not in leaderboard', async () => {
      mockRedisClient.zrevrank.mockResolvedValue(null);

      const rank = await service.updateScore(
        'season-1',
        LeaderboardCategory.READING,
        'user-1',
        100,
      );

      expect(rank).toBe(-1);
    });
  });

  describe('incrementScore', () => {
    it('should increment user score and return new score and rank', async () => {
      const seasonId = 'season-1';
      const category = LeaderboardCategory.CREATION;
      const userId = 'user-1';
      const increment = 20;

      mockRedisClient.zincrby.mockResolvedValue('120');
      mockRedisClient.zrevrank.mockResolvedValue(2);

      const result = await service.incrementScore(
        seasonId,
        category,
        userId,
        increment,
      );

      expect(mockRedisClient.zincrby).toHaveBeenCalledWith(
        `leaderboard:realtime:${seasonId}:${category}`,
        increment,
        userId,
      );
      expect(result.newScore).toBe(120);
      expect(result.rank).toBe(3);
    });
  });

  describe('getUserRank', () => {
    it('should return user rank (1-indexed)', async () => {
      mockRedisClient.zrevrank.mockResolvedValue(4);

      const rank = await service.getUserRank(
        'season-1',
        LeaderboardCategory.SOCIAL,
        'user-1',
      );

      expect(rank).toBe(5);
    });

    it('should return null when user is not in leaderboard', async () => {
      mockRedisClient.zrevrank.mockResolvedValue(null);

      const rank = await service.getUserRank(
        'season-1',
        LeaderboardCategory.SOCIAL,
        'user-1',
      );

      expect(rank).toBeNull();
    });
  });

  describe('getUserScore', () => {
    it('should return user score', async () => {
      redisService.zscore = jest.fn().mockResolvedValue('150');

      const score = await service.getUserScore(
        'season-1',
        LeaderboardCategory.OVERALL,
        'user-1',
      );

      expect(score).toBe(150);
    });

    it('should return null when user is not in leaderboard', async () => {
      redisService.zscore = jest.fn().mockResolvedValue(null);

      const score = await service.getUserScore(
        'season-1',
        LeaderboardCategory.OVERALL,
        'user-1',
      );

      expect(score).toBeNull();
    });
  });

  describe('getTopUsers', () => {
    it('should return top N users with scores and ranks', async () => {
      mockRedisClient.zrevrange.mockResolvedValue([
        'user-1', '300',
        'user-2', '250',
        'user-3', '200',
      ]);

      const users = await service.getTopUsers(
        'season-1',
        LeaderboardCategory.READING,
        3,
      );

      expect(users).toHaveLength(3);
      expect(users[0]).toEqual({ userId: 'user-1', score: 300, rank: 1 });
      expect(users[1]).toEqual({ userId: 'user-2', score: 250, rank: 2 });
      expect(users[2]).toEqual({ userId: 'user-3', score: 200, rank: 3 });
    });

    it('should return empty array when no users', async () => {
      mockRedisClient.zrevrange.mockResolvedValue([]);

      const users = await service.getTopUsers(
        'season-1',
        LeaderboardCategory.READING,
        10,
      );

      expect(users).toHaveLength(0);
    });
  });

  describe('getTotalParticipants', () => {
    it('should return total number of participants', async () => {
      mockRedisClient.zcard.mockResolvedValue(1000);

      const total = await service.getTotalParticipants(
        'season-1',
        LeaderboardCategory.OVERALL,
      );

      expect(total).toBe(1000);
    });
  });

  describe('getCountInScoreRange', () => {
    it('should return count of users in score range', async () => {
      mockRedisClient.zcount.mockResolvedValue(50);

      const count = await service.getCountInScoreRange(
        'season-1',
        LeaderboardCategory.CREATION,
        100,
        500,
      );

      expect(count).toBe(50);
      expect(mockRedisClient.zcount).toHaveBeenCalledWith(
        'leaderboard:realtime:season-1:CREATION',
        100,
        500,
      );
    });
  });

  describe('removeUser', () => {
    it('should remove user from leaderboard', async () => {
      mockRedisClient.zrem.mockResolvedValue(1);

      const removed = await service.removeUser(
        'season-1',
        LeaderboardCategory.SOCIAL,
        'user-1',
      );

      expect(removed).toBe(true);
    });

    it('should return false when user was not in leaderboard', async () => {
      mockRedisClient.zrem.mockResolvedValue(0);

      const removed = await service.removeUser(
        'season-1',
        LeaderboardCategory.SOCIAL,
        'user-1',
      );

      expect(removed).toBe(false);
    });
  });

  describe('clearLeaderboard', () => {
    it('should delete the leaderboard key', async () => {
      await service.clearLeaderboard('season-1', LeaderboardCategory.READING);

      expect(redisService.del).toHaveBeenCalledWith(
        'leaderboard:realtime:season-1:READING',
      );
    });
  });

  describe('getUserNeighbors', () => {
    it('should return user and neighbors', async () => {
      mockRedisClient.zrevrank.mockResolvedValue(10);
      redisService.zscore = jest.fn().mockResolvedValue('500');
      mockRedisClient.zrevrange.mockResolvedValue([
        'user-5', '600',
        'user-6', '550',
        'user-1', '500',
        'user-7', '450',
        'user-8', '400',
      ]);

      const result = await service.getUserNeighbors(
        'season-1',
        LeaderboardCategory.OVERALL,
        'user-1',
        2,
      );

      expect(result.user).toEqual({ userId: 'user-1', score: 500, rank: 11 });
      expect(result.neighbors).toHaveLength(5);
    });

    it('should return null user when not in leaderboard', async () => {
      mockRedisClient.zrevrank.mockResolvedValue(null);

      const result = await service.getUserNeighbors(
        'season-1',
        LeaderboardCategory.OVERALL,
        'user-1',
        5,
      );

      expect(result.user).toBeNull();
      expect(result.neighbors).toHaveLength(0);
    });
  });

  describe('getLastSyncTime', () => {
    it('should return last sync time', async () => {
      const syncTime = '2024-01-15T10:30:00.000Z';
      redisService.get = jest.fn().mockResolvedValue(syncTime);

      const result = await service.getLastSyncTime(
        'season-1',
        LeaderboardCategory.READING,
      );

      expect(result).toEqual(new Date(syncTime));
    });

    it('should return null when no sync has occurred', async () => {
      redisService.get = jest.fn().mockResolvedValue(null);

      const result = await service.getLastSyncTime(
        'season-1',
        LeaderboardCategory.READING,
      );

      expect(result).toBeNull();
    });
  });

  describe('needsSync', () => {
    it('should return true when no sync has occurred', async () => {
      redisService.get = jest.fn().mockResolvedValue(null);

      const result = await service.needsSync(
        'season-1',
        LeaderboardCategory.READING,
        5,
      );

      expect(result).toBe(true);
    });

    it('should return true when last sync is older than maxAge', async () => {
      const oldTime = new Date(Date.now() - 10 * 60 * 1000).toISOString(); // 10 minutes ago
      redisService.get = jest.fn().mockResolvedValue(oldTime);

      const result = await service.needsSync(
        'season-1',
        LeaderboardCategory.READING,
        5, // 5 minutes max age
      );

      expect(result).toBe(true);
    });

    it('should return false when last sync is recent', async () => {
      const recentTime = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // 2 minutes ago
      redisService.get = jest.fn().mockResolvedValue(recentTime);

      const result = await service.needsSync(
        'season-1',
        LeaderboardCategory.READING,
        5, // 5 minutes max age
      );

      expect(result).toBe(false);
    });
  });
});
