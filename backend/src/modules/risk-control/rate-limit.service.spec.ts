import { Test, TestingModule } from '@nestjs/testing';
import { RateLimitService } from './rate-limit.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { RateLimitAction, TimeWindow } from './dto/rate-limit.dto.js';

/**
 * 频率限制服务单元测试
 *
 * 需求19: 风控与反作弊系统 - 频率限制服务
 */
describe('RateLimitService', () => {
  let service: RateLimitService;
  let redisService: jest.Mocked<RedisService>;

  // Mock Redis 存储
  const mockRedisStore = new Map<string, string>();
  const mockRedisTtl = new Map<string, number>();

  beforeEach(async () => {
    // 清空 mock 存储
    mockRedisStore.clear();
    mockRedisTtl.clear();

    // 创建 mock RedisService
    const mockRedisService = {
      get: jest.fn().mockImplementation((key: string) => {
        return Promise.resolve(mockRedisStore.get(key) ?? null);
      }),
      set: jest.fn().mockImplementation((key: string, value: string, ttl?: number) => {
        mockRedisStore.set(key, value);
        if (ttl) {
          mockRedisTtl.set(key, ttl);
        }
        return Promise.resolve('OK');
      }),
      del: jest.fn().mockImplementation((...keys: string[]) => {
        let deleted = 0;
        for (const key of keys) {
          if (mockRedisStore.has(key)) {
            mockRedisStore.delete(key);
            mockRedisTtl.delete(key);
            deleted++;
          }
        }
        return Promise.resolve(deleted);
      }),
      incr: jest.fn().mockImplementation((key: string) => {
        const current = mockRedisStore.get(key);
        const newValue = current ? parseInt(current, 10) + 1 : 1;
        mockRedisStore.set(key, newValue.toString());
        return Promise.resolve(newValue);
      }),
      expire: jest.fn().mockImplementation((key: string, seconds: number) => {
        mockRedisTtl.set(key, seconds);
        return Promise.resolve(1);
      }),
      ttl: jest.fn().mockImplementation((key: string) => {
        const ttl = mockRedisTtl.get(key);
        return Promise.resolve(ttl ?? -2);
      }),
      exists: jest.fn().mockImplementation((...keys: string[]) => {
        let count = 0;
        for (const key of keys) {
          if (mockRedisStore.has(key)) count++;
        }
        return Promise.resolve(count);
      }),
      getClient: jest.fn().mockReturnValue({
        get: jest.fn().mockImplementation((key: string) => {
          return Promise.resolve(mockRedisStore.get(key) ?? null);
        }),
        incr: jest.fn().mockImplementation((key: string) => {
          const current = mockRedisStore.get(key);
          const newValue = current ? parseInt(current, 10) + 1 : 1;
          mockRedisStore.set(key, newValue.toString());
          return Promise.resolve(newValue);
        }),
        expire: jest.fn().mockImplementation((key: string, seconds: number) => {
          mockRedisTtl.set(key, seconds);
          return Promise.resolve(1);
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<RateLimitService>(RateLimitService);
    redisService = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('should allow request when under limit', async () => {
      const result = await service.checkRateLimit('test:key', 10, 60);

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(10);
      expect(result.blocked).toBe(false);
    });

    it('should deny request when at limit', async () => {
      // 设置计数已达到限制
      mockRedisStore.set('ratelimit:test:key', '10');
      mockRedisTtl.set('ratelimit:test:key', 30);

      const result = await service.checkRateLimit('test:key', 10, 60);

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(10);
      expect(result.remaining).toBe(0);
      expect(result.blocked).toBe(false);
    });

    it('should deny request when blocked', async () => {
      // 设置封禁状态
      const blockedUntil = Math.floor(Date.now() / 1000) + 300;
      mockRedisStore.set('ratelimit:block:test:key', blockedUntil.toString());

      const result = await service.checkRateLimit('test:key', 10, 60);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.blockedUntil).toBe(blockedUntil);
    });

    it('should allow request when block has expired', async () => {
      // 设置已过期的封禁
      const blockedUntil = Math.floor(Date.now() / 1000) - 100;
      mockRedisStore.set('ratelimit:block:test:key', blockedUntil.toString());

      const result = await service.checkRateLimit('test:key', 10, 60);

      expect(result.allowed).toBe(true);
      expect(result.blocked).toBe(false);
      // 应该删除过期的封禁记录
      expect(redisService.del).toHaveBeenCalledWith('ratelimit:block:test:key');
    });
  });

  describe('incrementCounter', () => {
    it('should increment counter and set expiry on first call', async () => {
      const count = await service.incrementCounter('test:key', 60);

      expect(count).toBe(1);
      expect(redisService.incr).toHaveBeenCalledWith('ratelimit:test:key');
      expect(redisService.expire).toHaveBeenCalledWith('ratelimit:test:key', 60);
    });

    it('should only increment on subsequent calls', async () => {
      // 第一次调用
      await service.incrementCounter('test:key', 60);
      
      // 第二次调用
      const count = await service.incrementCounter('test:key', 60);

      expect(count).toBe(2);
      // expire 只应该在第一次调用时设置
      expect(redisService.expire).toHaveBeenCalledTimes(1);
    });
  });

  describe('getRemainingQuota', () => {
    it('should return full quota when no requests made', async () => {
      const remaining = await service.getRemainingQuota('test:key', 10, 60);

      expect(remaining).toBe(10);
    });

    it('should return reduced quota after requests', async () => {
      mockRedisStore.set('ratelimit:test:key', '3');
      mockRedisTtl.set('ratelimit:test:key', 30);

      const remaining = await service.getRemainingQuota('test:key', 10, 60);

      expect(remaining).toBe(7);
    });

    it('should return zero when limit reached', async () => {
      mockRedisStore.set('ratelimit:test:key', '10');
      mockRedisTtl.set('ratelimit:test:key', 30);

      const remaining = await service.getRemainingQuota('test:key', 10, 60);

      expect(remaining).toBe(0);
    });
  });

  describe('resetRateLimit', () => {
    it('should delete rate limit and block keys', async () => {
      mockRedisStore.set('ratelimit:test:key', '5');
      mockRedisStore.set('ratelimit:block:test:key', '12345');

      await service.resetRateLimit('test:key');

      expect(redisService.del).toHaveBeenCalledWith(
        'ratelimit:test:key',
        'ratelimit:block:test:key',
      );
    });
  });

  describe('isBlocked', () => {
    it('should return false when not blocked', async () => {
      const blocked = await service.isBlocked('test:key');

      expect(blocked).toBe(false);
    });

    it('should return true when blocked', async () => {
      const blockedUntil = Math.floor(Date.now() / 1000) + 300;
      mockRedisStore.set('ratelimit:block:test:key', blockedUntil.toString());

      const blocked = await service.isBlocked('test:key');

      expect(blocked).toBe(true);
    });

    it('should return false and clean up when block expired', async () => {
      const blockedUntil = Math.floor(Date.now() / 1000) - 100;
      mockRedisStore.set('ratelimit:block:test:key', blockedUntil.toString());

      const blocked = await service.isBlocked('test:key');

      expect(blocked).toBe(false);
      expect(redisService.del).toHaveBeenCalledWith('ratelimit:block:test:key');
    });
  });

  describe('blockKey', () => {
    it('should set block with correct expiry', async () => {
      await service.blockKey('test:key', 300);

      expect(redisService.set).toHaveBeenCalled();
      const call = (redisService.set as jest.Mock).mock.calls[0];
      expect(call[0]).toBe('ratelimit:block:test:key');
      expect(call[2]).toBe(300);
    });
  });

  describe('unblockKey', () => {
    it('should delete block key', async () => {
      await service.unblockKey('test:key');

      expect(redisService.del).toHaveBeenCalledWith('ratelimit:block:test:key');
    });
  });

  describe('checkAndIncrement', () => {
    it('should allow and increment when under limit', async () => {
      const result = await service.checkAndIncrement('test:key', 10, 60);

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.remaining).toBe(9);
    });

    it('should deny when over limit', async () => {
      mockRedisStore.set('ratelimit:test:key', '10');
      mockRedisTtl.set('ratelimit:test:key', 30);

      const result = await service.checkAndIncrement('test:key', 10, 60);

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(11);
      expect(result.remaining).toBe(0);
    });

    it('should block when over limit with blockDuration', async () => {
      mockRedisStore.set('ratelimit:test:key', '10');
      mockRedisTtl.set('ratelimit:test:key', 30);

      await service.checkAndIncrement('test:key', 10, 60, 300);

      // 应该设置封禁
      expect(redisService.set).toHaveBeenCalled();
      const setCalls = (redisService.set as jest.Mock).mock.calls;
      const blockCall = setCalls.find((call: any[]) => 
        call[0].includes('block')
      );
      expect(blockCall).toBeDefined();
    });

    it('should deny when blocked', async () => {
      const blockedUntil = Math.floor(Date.now() / 1000) + 300;
      mockRedisStore.set('ratelimit:block:test:key', blockedUntil.toString());

      const result = await service.checkAndIncrement('test:key', 10, 60);

      expect(result.allowed).toBe(false);
      expect(result.blocked).toBe(true);
    });
  });

  describe('checkActionRateLimit', () => {
    it('should use default config for known actions', async () => {
      const result = await service.checkActionRateLimit(
        RateLimitAction.LOGIN,
        'user123',
      );

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(5); // 默认登录限制
    });

    it('should use fallback config for unknown actions', async () => {
      const result = await service.checkActionRateLimit(
        'unknown_action',
        'user123',
      );

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(100); // 默认限制
    });
  });

  describe('getStatus', () => {
    it('should return correct status', async () => {
      mockRedisStore.set('ratelimit:test:key', '5');
      mockRedisTtl.set('ratelimit:test:key', 30);

      const status = await service.getStatus('test:key', 'test_action', 10, 60);

      expect(status.key).toBe('test:key');
      expect(status.action).toBe('test_action');
      expect(status.currentCount).toBe(5);
      expect(status.limit).toBe(10);
      expect(status.remaining).toBe(5);
      expect(status.blocked).toBe(false);
    });

    it('should indicate blocked status', async () => {
      const blockedUntil = Math.floor(Date.now() / 1000) + 300;
      mockRedisStore.set('ratelimit:block:test:key', blockedUntil.toString());

      const status = await service.getStatus('test:key', 'test_action', 10, 60);

      expect(status.blocked).toBe(true);
      expect(status.blockedUntil).toBe(blockedUntil);
    });
  });

  describe('checkSlidingWindow', () => {
    it('should allow request when under limit', async () => {
      const result = await service.checkSlidingWindow('test:key', 10, {
        windowSize: 60,
        precision: 6,
      });

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.remaining).toBe(10);
    });
  });

  describe('checkTokenBucket', () => {
    it('should allow request when tokens available', async () => {
      const result = await service.checkTokenBucket('test:key', {
        capacity: 10,
        refillRate: 1,
        tokensPerRequest: 1,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
    });

    it('should deny request when no tokens', async () => {
      // 设置空桶状态
      const emptyBucket = {
        tokens: 0,
        lastRefillTime: Math.floor(Date.now() / 1000),
        capacity: 10,
        refillRate: 1,
      };
      mockRedisStore.set('ratelimit:bucket:test:key', JSON.stringify(emptyBucket));

      const result = await service.checkTokenBucket('test:key', {
        capacity: 10,
        refillRate: 1,
        tokensPerRequest: 1,
      });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('consumeToken', () => {
    it('should consume token when available', async () => {
      const consumed = await service.consumeToken('test:key', {
        capacity: 10,
        refillRate: 1,
        tokensPerRequest: 1,
      });

      expect(consumed).toBe(true);
    });

    it('should not consume when no tokens', async () => {
      const emptyBucket = {
        tokens: 0,
        lastRefillTime: Math.floor(Date.now() / 1000),
        capacity: 10,
        refillRate: 1,
      };
      mockRedisStore.set('ratelimit:bucket:test:key', JSON.stringify(emptyBucket));

      const consumed = await service.consumeToken('test:key', {
        capacity: 10,
        refillRate: 1,
        tokensPerRequest: 1,
      });

      expect(consumed).toBe(false);
    });
  });

  describe('helper methods', () => {
    it('should build user key correctly', () => {
      const key = service.buildUserKey('login', 'user123');
      expect(key).toBe('login:user:user123');
    });

    it('should build IP key correctly', () => {
      const key = service.buildIpKey('api', '192.168.1.1');
      expect(key).toBe('api:ip:192.168.1.1');
    });

    it('should build composite key correctly', () => {
      const key = service.buildCompositeKey('action', 'user123', '192.168.1.1');
      expect(key).toBe('action:user123:192.168.1.1');
    });

    it('should return default config for known actions', () => {
      const config = service.getDefaultConfig(RateLimitAction.LOGIN);
      expect(config).toBeDefined();
      expect(config?.limit).toBe(5);
    });
  });
});
