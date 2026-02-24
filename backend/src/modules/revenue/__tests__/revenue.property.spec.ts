// Feature: library-branch-system, Property 12: 打赏收益分配
// **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 8.4**

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { RevenueService } from '../revenue.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

describe('Property 12: 打赏收益分配', () => {
  let service: RevenueService;

  // 生成器定义
  const tipAmount = fc.integer({ min: 1, max: 10000 });
  const ownerCutPercent = fc.integer({ min: 0, max: 30 });

  beforeEach(async () => {
    const mockPrismaService = {
      libraryBranch: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      library: {
        update: jest.fn(),
      },
      wallet: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
      },
      branchTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      tipRecord: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrismaService),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RevenueService>(RevenueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('收益分配公式验证', () => {
    /**
     * Property 12: 打赏收益分配
     * platformAmount + ownerAmount + creatorAmount = totalAmount
     * 验证分配总和始终等于总金额
     */
    it('should ensure platformAmount + ownerAmount + creatorAmount = totalAmount', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, ownerCutPercent, async (amount, ownerPercent) => {
          const distribution = service.calculateRevenueDistribution(amount, ownerPercent);

          // 验证总和等于总金额
          const sum =
            distribution.platformAmount +
            distribution.ownerAmount +
            distribution.creatorAmount;

          expect(sum).toBe(distribution.totalAmount);
          expect(sum).toBe(amount);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 12: 打赏收益分配
     * platformAmount = floor(totalAmount × 30%)
     * 验证平台收入计算公式
     */
    it('should calculate platformAmount = floor(totalAmount × 30%)', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, ownerCutPercent, async (amount, ownerPercent) => {
          const distribution = service.calculateRevenueDistribution(amount, ownerPercent);

          // 验证平台收入 = floor(totalAmount × 30%)
          const expectedPlatformAmount = Math.floor((amount * 30) / 100);

          expect(distribution.platformAmount).toBe(expectedPlatformAmount);
          expect(distribution.platformPercent).toBe(30);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 12: 打赏收益分配
     * ownerAmount = floor(totalAmount × ownerCutPercent%)
     * 验证库拥有者收入计算公式
     */
    it('should calculate ownerAmount = floor(totalAmount × ownerCutPercent%)', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, ownerCutPercent, async (amount, ownerPercent) => {
          const distribution = service.calculateRevenueDistribution(amount, ownerPercent);

          // 验证库拥有者收入 = floor(totalAmount × ownerCutPercent%)
          const expectedOwnerAmount = Math.floor((amount * ownerPercent) / 100);

          expect(distribution.ownerAmount).toBe(expectedOwnerAmount);
          expect(distribution.ownerPercent).toBe(ownerPercent);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 12: 打赏收益分配
     * creatorAmount = totalAmount - platformAmount - ownerAmount
     * 验证分支创作者获得剩余部分
     */
    it('should calculate creatorAmount = totalAmount - platformAmount - ownerAmount', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, ownerCutPercent, async (amount, ownerPercent) => {
          const distribution = service.calculateRevenueDistribution(amount, ownerPercent);

          // 验证创作者收入 = 总金额 - 平台收入 - 库拥有者收入
          const expectedCreatorAmount =
            amount - distribution.platformAmount - distribution.ownerAmount;

          expect(distribution.creatorAmount).toBe(expectedCreatorAmount);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 12: 打赏收益分配
     * creatorPercent = 70% - ownerCutPercent%
     * 验证创作者比例计算
     */
    it('should calculate creatorPercent = 70% - ownerCutPercent%', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, ownerCutPercent, async (amount, ownerPercent) => {
          const distribution = service.calculateRevenueDistribution(amount, ownerPercent);

          // 验证创作者比例 = 70% - ownerCutPercent%
          const expectedCreatorPercent = 70 - ownerPercent;

          expect(distribution.creatorPercent).toBe(expectedCreatorPercent);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('比例总和验证', () => {
    /**
     * Property 12: 打赏收益分配
     * platformPercent + ownerPercent + creatorPercent = 100%
     * 验证比例总和始终等于 100%
     */
    it('should ensure platformPercent + ownerPercent + creatorPercent = 100%', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, ownerCutPercent, async (amount, ownerPercent) => {
          const distribution = service.calculateRevenueDistribution(amount, ownerPercent);

          // 验证比例总和等于 100%
          const percentSum =
            distribution.platformPercent +
            distribution.ownerPercent +
            distribution.creatorPercent;

          expect(percentSum).toBe(100);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('默认值验证', () => {
    /**
     * Property 12: 打赏收益分配
     * 若 ownerCutPercent 未设置，默认为 0%
     * 验证默认值行为
     */
    it('should use 0% as default ownerCutPercent when not provided', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, async (amount) => {
          // 不传入 ownerCutPercent，使用默认值
          const distribution = service.calculateRevenueDistribution(amount);

          // 验证默认 ownerCutPercent 为 0%
          expect(distribution.ownerPercent).toBe(0);
          expect(distribution.ownerAmount).toBe(0);

          // 验证创作者获得 70%
          expect(distribution.creatorPercent).toBe(70);

          // 验证总和仍然等于总金额
          const sum =
            distribution.platformAmount +
            distribution.ownerAmount +
            distribution.creatorAmount;
          expect(sum).toBe(amount);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('边界情况', () => {
    /**
     * Property 12: 边界情况 - ownerCutPercent 为 0%
     * 创作者应获得 70%
     */
    it('should give creator 70% when ownerCutPercent is 0%', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, async (amount) => {
          const distribution = service.calculateRevenueDistribution(amount, 0);

          // 验证库拥有者收入为 0
          expect(distribution.ownerAmount).toBe(0);
          expect(distribution.ownerPercent).toBe(0);

          // 验证创作者比例为 70%
          expect(distribution.creatorPercent).toBe(70);

          // 验证总和等于总金额
          expect(distribution.platformAmount + distribution.creatorAmount).toBe(amount);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 12: 边界情况 - ownerCutPercent 为 30%（最大值）
     * 创作者应获得 40%
     */
    it('should give creator 40% when ownerCutPercent is 30%', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, async (amount) => {
          const distribution = service.calculateRevenueDistribution(amount, 30);

          // 验证库拥有者比例为 30%
          expect(distribution.ownerPercent).toBe(30);

          // 验证创作者比例为 40%
          expect(distribution.creatorPercent).toBe(40);

          // 验证总和等于总金额
          const sum =
            distribution.platformAmount +
            distribution.ownerAmount +
            distribution.creatorAmount;
          expect(sum).toBe(amount);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 12: 边界情况 - 最小打赏金额 (1)
     * 验证最小金额时分配正确
     */
    it('should handle minimum tip amount (1) correctly', () => {
      const distribution = service.calculateRevenueDistribution(1, 0);

      // 1 × 30% = 0.3 → floor = 0
      expect(distribution.platformAmount).toBe(0);
      expect(distribution.ownerAmount).toBe(0);
      // 创作者获得剩余部分
      expect(distribution.creatorAmount).toBe(1);

      // 验证总和
      expect(
        distribution.platformAmount +
          distribution.ownerAmount +
          distribution.creatorAmount,
      ).toBe(1);
    });

    /**
     * Property 12: 边界情况 - 最大打赏金额 (10000)
     * 验证最大金额时分配正确
     */
    it('should handle maximum tip amount (10000) correctly', () => {
      const distribution = service.calculateRevenueDistribution(10000, 15);

      // 10000 × 30% = 3000
      expect(distribution.platformAmount).toBe(3000);
      // 10000 × 15% = 1500
      expect(distribution.ownerAmount).toBe(1500);
      // 10000 - 3000 - 1500 = 5500
      expect(distribution.creatorAmount).toBe(5500);

      // 验证总和
      expect(
        distribution.platformAmount +
          distribution.ownerAmount +
          distribution.creatorAmount,
      ).toBe(10000);
    });

    /**
     * Property 12: 边界情况 - ownerCutPercent 超出范围时应被限制
     * 验证超出 [0, 30] 范围的值被限制
     */
    it('should clamp ownerCutPercent to valid range [0, 30]', async () => {
      // 测试负值
      const distributionNegative = service.calculateRevenueDistribution(1000, -10);
      expect(distributionNegative.ownerPercent).toBe(0);
      expect(distributionNegative.ownerAmount).toBe(0);

      // 测试超过 30 的值
      const distributionOver = service.calculateRevenueDistribution(1000, 50);
      expect(distributionOver.ownerPercent).toBe(30);
      expect(distributionOver.ownerAmount).toBe(Math.floor((1000 * 30) / 100));
    });
  });

  describe('整数运算验证', () => {
    /**
     * Property 12: 打赏收益分配
     * 验证所有金额都是整数（使用 Math.floor）
     */
    it('should ensure all amounts are integers', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, ownerCutPercent, async (amount, ownerPercent) => {
          const distribution = service.calculateRevenueDistribution(amount, ownerPercent);

          // 验证所有金额都是整数
          expect(Number.isInteger(distribution.platformAmount)).toBe(true);
          expect(Number.isInteger(distribution.ownerAmount)).toBe(true);
          expect(Number.isInteger(distribution.creatorAmount)).toBe(true);
          expect(Number.isInteger(distribution.totalAmount)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 12: 打赏收益分配
     * 验证所有金额都是非负数
     */
    it('should ensure all amounts are non-negative', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, ownerCutPercent, async (amount, ownerPercent) => {
          const distribution = service.calculateRevenueDistribution(amount, ownerPercent);

          // 验证所有金额都是非负数
          expect(distribution.platformAmount).toBeGreaterThanOrEqual(0);
          expect(distribution.ownerAmount).toBeGreaterThanOrEqual(0);
          expect(distribution.creatorAmount).toBeGreaterThanOrEqual(0);
        }),
        { numRuns: 100 },
      );
    });
  });
});
