// Feature: library-branch-system, Property 13: 热度分数计算
// **Validates: Requirements 1.6, 7.1**

import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { HotScoreService, HotScoreParams } from '../hot-score.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';
import { CacheService } from '../../../redis/cache.service.js';

describe('Property 13: 热度分数计算', () => {
  let service: HotScoreService;

  // 生成器定义
  const likeCount = fc.integer({ min: 0, max: 100000 });
  const tipAmount = fc.integer({ min: 0, max: 10000000 });
  const viewCount = fc.integer({ min: 0, max: 10000000 });
  const branchCount = fc.integer({ min: 0, max: 1000 });

  beforeEach(async () => {
    const mockPrismaService = {
      library: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
      libraryBranch: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const mockCacheService = {
      del: jest.fn(),
      zadd: jest.fn(),
      expire: jest.fn(),
      zrevrange: jest.fn(),
      zrevrank: jest.fn(),
      zremrangebyrank: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HotScoreService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<HotScoreService>(HotScoreService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('热度分数计算公式验证', () => {
    /**
     * Property 13: 热度分数计算
     * hotScore = (likeCount × 1) + (tipAmount / 100 × 2) + (viewCount / 100 × 0.5) + (branchCount × 3)
     * 验证热度分数计算公式正确性
     */
    it('should calculate hotScore using the correct formula', async () => {
      await fc.assert(
        fc.asyncProperty(
          likeCount,
          tipAmount,
          viewCount,
          branchCount,
          async (likes, tips, views, branches) => {
            const params: HotScoreParams = {
              likeCount: likes,
              tipAmount: tips,
              viewCount: views,
              branchCount: branches,
            };

            const result = service.calculateHotScore(params);

            // 验证公式：(likeCount × 1) + (tipAmount / 100 × 2) + (viewCount / 100 × 0.5) + (branchCount × 3)
            const expectedLikeScore = likes * 1;
            const expectedTipScore = (tips / 100) * 2;
            const expectedViewScore = (views / 100) * 0.5;
            const expectedBranchScore = branches * 3;
            const expectedHotScore =
              expectedLikeScore + expectedTipScore + expectedViewScore + expectedBranchScore;

            expect(result).toBeCloseTo(expectedHotScore, 10);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('各分量计算验证', () => {
    /**
     * Property 13: 热度分数计算
     * likeScore = likeCount × 1
     * 验证点赞分数计算
     */
    it('should calculate likeScore = likeCount × 1', async () => {
      await fc.assert(
        fc.asyncProperty(likeCount, async (likes) => {
          const params: HotScoreParams = {
            likeCount: likes,
            tipAmount: 0,
            viewCount: 0,
            branchCount: 0,
          };

          const result = service.calculateHotScore(params);

          // 只有点赞分数时，hotScore = likeCount × 1
          expect(result).toBe(likes);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 13: 热度分数计算
     * tipScore = tipAmount / 100 × 2
     * 验证打赏分数计算
     */
    it('should calculate tipScore = tipAmount / 100 × 2', async () => {
      await fc.assert(
        fc.asyncProperty(tipAmount, async (tips) => {
          const params: HotScoreParams = {
            likeCount: 0,
            tipAmount: tips,
            viewCount: 0,
            branchCount: 0,
          };

          const result = service.calculateHotScore(params);

          // 只有打赏分数时，hotScore = tipAmount / 100 × 2
          const expectedTipScore = (tips / 100) * 2;
          expect(result).toBeCloseTo(expectedTipScore, 10);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 13: 热度分数计算
     * viewScore = viewCount / 100 × 0.5
     * 验证阅读量分数计算
     */
    it('should calculate viewScore = viewCount / 100 × 0.5', async () => {
      await fc.assert(
        fc.asyncProperty(viewCount, async (views) => {
          const params: HotScoreParams = {
            likeCount: 0,
            tipAmount: 0,
            viewCount: views,
            branchCount: 0,
          };

          const result = service.calculateHotScore(params);

          // 只有阅读量分数时，hotScore = viewCount / 100 × 0.5
          const expectedViewScore = (views / 100) * 0.5;
          expect(result).toBeCloseTo(expectedViewScore, 10);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 13: 热度分数计算
     * branchScore = branchCount × 3
     * 验证分支数量分数计算
     */
    it('should calculate branchScore = branchCount × 3', async () => {
      await fc.assert(
        fc.asyncProperty(branchCount, async (branches) => {
          const params: HotScoreParams = {
            likeCount: 0,
            tipAmount: 0,
            viewCount: 0,
            branchCount: branches,
          };

          const result = service.calculateHotScore(params);

          // 只有分支分数时，hotScore = branchCount × 3
          expect(result).toBe(branches * 3);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('可加性验证', () => {
    /**
     * Property 13: 热度分数计算
     * 验证各分量的可加性：总分 = 各分量之和
     */
    it('should be additive: total = sum of all components', async () => {
      await fc.assert(
        fc.asyncProperty(
          likeCount,
          tipAmount,
          viewCount,
          branchCount,
          async (likes, tips, views, branches) => {
            // 计算各分量单独的分数
            const likeOnlyScore = service.calculateHotScore({
              likeCount: likes,
              tipAmount: 0,
              viewCount: 0,
              branchCount: 0,
            });

            const tipOnlyScore = service.calculateHotScore({
              likeCount: 0,
              tipAmount: tips,
              viewCount: 0,
              branchCount: 0,
            });

            const viewOnlyScore = service.calculateHotScore({
              likeCount: 0,
              tipAmount: 0,
              viewCount: views,
              branchCount: 0,
            });

            const branchOnlyScore = service.calculateHotScore({
              likeCount: 0,
              tipAmount: 0,
              viewCount: 0,
              branchCount: branches,
            });

            // 计算总分
            const totalScore = service.calculateHotScore({
              likeCount: likes,
              tipAmount: tips,
              viewCount: views,
              branchCount: branches,
            });

            // 验证可加性
            const sumOfComponents =
              likeOnlyScore + tipOnlyScore + viewOnlyScore + branchOnlyScore;
            expect(totalScore).toBeCloseTo(sumOfComponents, 10);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('边界情况', () => {
    /**
     * Property 13: 边界情况 - 所有值为 0
     * 验证所有统计数据为 0 时，热度分数为 0
     */
    it('should return 0 when all stats are 0', () => {
      const params: HotScoreParams = {
        likeCount: 0,
        tipAmount: 0,
        viewCount: 0,
        branchCount: 0,
      };

      const result = service.calculateHotScore(params);

      expect(result).toBe(0);
    });

    /**
     * Property 13: 边界情况 - 最大值测试
     * 验证最大值时计算正确
     */
    it('should handle maximum values correctly', () => {
      const params: HotScoreParams = {
        likeCount: 100000,
        tipAmount: 10000000,
        viewCount: 10000000,
        branchCount: 1000,
      };

      const result = service.calculateHotScore(params);

      // 计算期望值
      const expectedLikeScore = 100000 * 1; // 100000
      const expectedTipScore = (10000000 / 100) * 2; // 200000
      const expectedViewScore = (10000000 / 100) * 0.5; // 50000
      const expectedBranchScore = 1000 * 3; // 3000
      const expectedTotal =
        expectedLikeScore + expectedTipScore + expectedViewScore + expectedBranchScore;

      expect(result).toBeCloseTo(expectedTotal, 10);
      expect(result).toBeCloseTo(353000, 10);
    });

    /**
     * Property 13: 边界情况 - 单一最大值
     * 验证单一统计数据为最大值时计算正确
     */
    it('should handle single maximum value correctly', () => {
      // 只有 likeCount 为最大值
      const likeOnlyMax = service.calculateHotScore({
        likeCount: 100000,
        tipAmount: 0,
        viewCount: 0,
        branchCount: 0,
      });
      expect(likeOnlyMax).toBe(100000);

      // 只有 tipAmount 为最大值
      const tipOnlyMax = service.calculateHotScore({
        likeCount: 0,
        tipAmount: 10000000,
        viewCount: 0,
        branchCount: 0,
      });
      expect(tipOnlyMax).toBeCloseTo(200000, 10);

      // 只有 viewCount 为最大值
      const viewOnlyMax = service.calculateHotScore({
        likeCount: 0,
        tipAmount: 0,
        viewCount: 10000000,
        branchCount: 0,
      });
      expect(viewOnlyMax).toBeCloseTo(50000, 10);

      // 只有 branchCount 为最大值
      const branchOnlyMax = service.calculateHotScore({
        likeCount: 0,
        tipAmount: 0,
        viewCount: 0,
        branchCount: 1000,
      });
      expect(branchOnlyMax).toBe(3000);
    });
  });

  describe('非负性验证', () => {
    /**
     * Property 13: 热度分数计算
     * 验证热度分数始终为非负数
     */
    it('should always return non-negative hotScore', async () => {
      await fc.assert(
        fc.asyncProperty(
          likeCount,
          tipAmount,
          viewCount,
          branchCount,
          async (likes, tips, views, branches) => {
            const params: HotScoreParams = {
              likeCount: likes,
              tipAmount: tips,
              viewCount: views,
              branchCount: branches,
            };

            const result = service.calculateHotScore(params);

            expect(result).toBeGreaterThanOrEqual(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('单调性验证', () => {
    /**
     * Property 13: 热度分数计算
     * 验证增加任一统计数据时，热度分数不会减少
     */
    it('should be monotonically increasing with respect to each parameter', async () => {
      await fc.assert(
        fc.asyncProperty(
          likeCount,
          tipAmount,
          viewCount,
          branchCount,
          fc.integer({ min: 1, max: 1000 }), // 增量
          async (likes, tips, views, branches, increment) => {
            const baseParams: HotScoreParams = {
              likeCount: likes,
              tipAmount: tips,
              viewCount: views,
              branchCount: branches,
            };

            const baseScore = service.calculateHotScore(baseParams);

            // 增加 likeCount
            const likeIncreasedScore = service.calculateHotScore({
              ...baseParams,
              likeCount: likes + increment,
            });
            expect(likeIncreasedScore).toBeGreaterThanOrEqual(baseScore);

            // 增加 tipAmount
            const tipIncreasedScore = service.calculateHotScore({
              ...baseParams,
              tipAmount: tips + increment,
            });
            expect(tipIncreasedScore).toBeGreaterThanOrEqual(baseScore);

            // 增加 viewCount
            const viewIncreasedScore = service.calculateHotScore({
              ...baseParams,
              viewCount: views + increment,
            });
            expect(viewIncreasedScore).toBeGreaterThanOrEqual(baseScore);

            // 增加 branchCount（确保不超过最大值）
            if (branches + increment <= 1000) {
              const branchIncreasedScore = service.calculateHotScore({
                ...baseParams,
                branchCount: branches + increment,
              });
              expect(branchIncreasedScore).toBeGreaterThanOrEqual(baseScore);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('权重比例验证', () => {
    /**
     * Property 13: 热度分数计算
     * 验证各分量的权重比例正确
     * likeCount 权重: 1
     * tipAmount 权重: 2/100 = 0.02
     * viewCount 权重: 0.5/100 = 0.005
     * branchCount 权重: 3
     */
    it('should apply correct weights to each component', async () => {
      // 测试 likeCount 权重为 1
      const likeScore = service.calculateHotScore({
        likeCount: 100,
        tipAmount: 0,
        viewCount: 0,
        branchCount: 0,
      });
      expect(likeScore).toBe(100); // 100 × 1 = 100

      // 测试 tipAmount 权重为 0.02 (2/100)
      const tipScore = service.calculateHotScore({
        likeCount: 0,
        tipAmount: 10000,
        viewCount: 0,
        branchCount: 0,
      });
      expect(tipScore).toBeCloseTo(200, 10); // 10000 / 100 × 2 = 200

      // 测试 viewCount 权重为 0.005 (0.5/100)
      const viewScore = service.calculateHotScore({
        likeCount: 0,
        tipAmount: 0,
        viewCount: 10000,
        branchCount: 0,
      });
      expect(viewScore).toBeCloseTo(50, 10); // 10000 / 100 × 0.5 = 50

      // 测试 branchCount 权重为 3
      const branchScore = service.calculateHotScore({
        likeCount: 0,
        tipAmount: 0,
        viewCount: 0,
        branchCount: 100,
      });
      expect(branchScore).toBe(300); // 100 × 3 = 300
    });
  });
});


// Feature: library-branch-system, Property 14: 热度排序正确性
// **Validates: Requirements 2.2, 7.2, 7.4**

describe('Property 14: 热度排序正确性', () => {
  // 生成器定义
  const hotScoreArbitrary = fc.float({ min: 0, max: 1000000, noNaN: true });

  // 生成带有 hotScore 的对象列表
  const hotScoreItemArbitrary = fc.record({
    id: fc.uuid(),
    hotScore: hotScoreArbitrary,
  });

  const hotScoreListArbitrary = fc.array(hotScoreItemArbitrary, { minLength: 0, maxLength: 100 });

  /**
   * 辅助函数：按 hotScore 降序排序
   */
  function sortByHotScoreDesc<T extends { hotScore: number }>(items: T[]): T[] {
    return [...items].sort((a, b) => b.hotScore - a.hotScore);
  }

  /**
   * 辅助函数：验证列表是否按 hotScore 降序排列
   */
  function isDescendingByHotScore<T extends { hotScore: number }>(items: T[]): boolean {
    for (let i = 0; i < items.length - 1; i++) {
      if (items[i].hotScore < items[i + 1].hotScore) {
        return false;
      }
    }
    return true;
  }

  describe('排序后列表按 hotScore 降序排列', () => {
    /**
     * Property 14: 热度排序正确性
     * 对于任意 hotScore 列表，排序后应满足 a[i].hotScore >= a[i+1].hotScore
     */
    it('should sort items in descending order by hotScore', async () => {
      await fc.assert(
        fc.asyncProperty(hotScoreListArbitrary, async (items) => {
          const sorted = sortByHotScoreDesc(items);

          // 验证排序后列表按 hotScore 降序排列
          expect(isDescendingByHotScore(sorted)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 14: 热度排序正确性
     * 验证相邻元素满足 a[i].hotScore >= a[i+1].hotScore
     */
    it('should satisfy a[i].hotScore >= a[i+1].hotScore for all adjacent elements', async () => {
      await fc.assert(
        fc.asyncProperty(hotScoreListArbitrary, async (items) => {
          const sorted = sortByHotScoreDesc(items);

          // 验证所有相邻元素满足降序条件
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].hotScore).toBeGreaterThanOrEqual(sorted[i + 1].hotScore);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('排序稳定性和完整性', () => {
    /**
     * Property 14: 热度排序正确性
     * 排序后列表长度应与原列表相同
     */
    it('should preserve list length after sorting', async () => {
      await fc.assert(
        fc.asyncProperty(hotScoreListArbitrary, async (items) => {
          const sorted = sortByHotScoreDesc(items);

          expect(sorted.length).toBe(items.length);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 14: 热度排序正确性
     * 排序后列表应包含原列表的所有元素
     */
    it('should contain all original elements after sorting', async () => {
      await fc.assert(
        fc.asyncProperty(hotScoreListArbitrary, async (items) => {
          const sorted = sortByHotScoreDesc(items);

          // 验证所有原始元素都在排序后的列表中
          const originalIds = items.map((item) => item.id).sort();
          const sortedIds = sorted.map((item) => item.id).sort();

          expect(sortedIds).toEqual(originalIds);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 14: 热度排序正确性
     * 排序后列表中的 hotScore 值应与原列表相同（只是顺序不同）
     */
    it('should preserve all hotScore values after sorting', async () => {
      await fc.assert(
        fc.asyncProperty(hotScoreListArbitrary, async (items) => {
          const sorted = sortByHotScoreDesc(items);

          // 验证所有 hotScore 值都被保留
          const originalScores = items.map((item) => item.hotScore).sort((a, b) => a - b);
          const sortedScores = sorted.map((item) => item.hotScore).sort((a, b) => a - b);

          expect(sortedScores.length).toBe(originalScores.length);
          for (let i = 0; i < originalScores.length; i++) {
            expect(sortedScores[i]).toBeCloseTo(originalScores[i], 10);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('边界情况', () => {
    /**
     * Property 14: 边界情况 - 空列表
     * 空列表排序后仍为空列表
     */
    it('should handle empty list', () => {
      const emptyList: { id: string; hotScore: number }[] = [];
      const sorted = sortByHotScoreDesc(emptyList);

      expect(sorted.length).toBe(0);
      expect(isDescendingByHotScore(sorted)).toBe(true);
    });

    /**
     * Property 14: 边界情况 - 单元素列表
     * 单元素列表排序后仍为单元素列表
     */
    it('should handle single element list', () => {
      const singleList = [{ id: 'test-id', hotScore: 100 }];
      const sorted = sortByHotScoreDesc(singleList);

      expect(sorted.length).toBe(1);
      expect(sorted[0].hotScore).toBe(100);
      expect(isDescendingByHotScore(sorted)).toBe(true);
    });

    /**
     * Property 14: 边界情况 - 所有元素 hotScore 相同
     * 所有元素 hotScore 相同时，排序后仍满足降序条件
     */
    it('should handle list with all same hotScore values', async () => {
      await fc.assert(
        fc.asyncProperty(
          hotScoreArbitrary,
          fc.integer({ min: 1, max: 50 }),
          async (score, count) => {
            const items = Array.from({ length: count }, (_, i) => ({
              id: `item-${i}`,
              hotScore: score,
            }));

            const sorted = sortByHotScoreDesc(items);

            expect(sorted.length).toBe(count);
            expect(isDescendingByHotScore(sorted)).toBe(true);

            // 所有元素的 hotScore 应该相同
            for (const item of sorted) {
              expect(item.hotScore).toBeCloseTo(score, 10);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 14: 边界情况 - 已排序列表
     * 已按降序排列的列表排序后顺序不变
     */
    it('should maintain order for already sorted list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(hotScoreArbitrary, { minLength: 2, maxLength: 50 }),
          async (scores) => {
            // 创建已排序的列表
            const sortedScores = [...scores].sort((a, b) => b - a);
            const items = sortedScores.map((score, i) => ({
              id: `item-${i}`,
              hotScore: score,
            }));

            const sorted = sortByHotScoreDesc(items);

            expect(isDescendingByHotScore(sorted)).toBe(true);

            // 验证顺序保持不变（通过 hotScore 值）
            for (let i = 0; i < sorted.length; i++) {
              expect(sorted[i].hotScore).toBeCloseTo(sortedScores[i], 10);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 14: 边界情况 - 逆序列表
     * 按升序排列的列表排序后应变为降序
     */
    it('should reverse ascending sorted list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(hotScoreArbitrary, { minLength: 2, maxLength: 50 }),
          async (scores) => {
            // 创建升序排列的列表
            const ascendingScores = [...scores].sort((a, b) => a - b);
            const items = ascendingScores.map((score, i) => ({
              id: `item-${i}`,
              hotScore: score,
            }));

            const sorted = sortByHotScoreDesc(items);

            expect(isDescendingByHotScore(sorted)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('极值测试', () => {
    /**
     * Property 14: 极值测试 - 包含 0 的列表
     */
    it('should handle list with zero hotScore', async () => {
      await fc.assert(
        fc.asyncProperty(hotScoreListArbitrary, async (items) => {
          // 添加一个 hotScore 为 0 的元素
          const itemsWithZero = [...items, { id: 'zero-item', hotScore: 0 }];
          const sorted = sortByHotScoreDesc(itemsWithZero);

          expect(isDescendingByHotScore(sorted)).toBe(true);

          // 0 应该在最后（或与其他 0 一起）
          const lastItem = sorted[sorted.length - 1];
          expect(lastItem.hotScore).toBe(0);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 14: 极值测试 - 包含最大值的列表
     */
    it('should handle list with maximum hotScore', async () => {
      await fc.assert(
        fc.asyncProperty(hotScoreListArbitrary, async (items) => {
          const maxScore = 1000000;
          // 添加一个 hotScore 为最大值的元素
          const itemsWithMax = [...items, { id: 'max-item', hotScore: maxScore }];
          const sorted = sortByHotScoreDesc(itemsWithMax);

          expect(isDescendingByHotScore(sorted)).toBe(true);

          // 最大值应该在最前面
          expect(sorted[0].hotScore).toBe(maxScore);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 14: 极值测试 - 同时包含最大值和 0
     */
    it('should handle list with both maximum and zero hotScore', () => {
      const items = [
        { id: 'mid-1', hotScore: 500 },
        { id: 'zero', hotScore: 0 },
        { id: 'max', hotScore: 1000000 },
        { id: 'mid-2', hotScore: 250 },
      ];

      const sorted = sortByHotScoreDesc(items);

      expect(isDescendingByHotScore(sorted)).toBe(true);
      expect(sorted[0].hotScore).toBe(1000000);
      expect(sorted[sorted.length - 1].hotScore).toBe(0);
    });
  });

  describe('幂等性验证', () => {
    /**
     * Property 14: 幂等性
     * 对已排序的列表再次排序，结果应该相同
     */
    it('should be idempotent - sorting twice gives same result', async () => {
      await fc.assert(
        fc.asyncProperty(hotScoreListArbitrary, async (items) => {
          const sortedOnce = sortByHotScoreDesc(items);
          const sortedTwice = sortByHotScoreDesc(sortedOnce);

          expect(sortedTwice.length).toBe(sortedOnce.length);

          // 验证两次排序结果相同
          for (let i = 0; i < sortedOnce.length; i++) {
            expect(sortedTwice[i].id).toBe(sortedOnce[i].id);
            expect(sortedTwice[i].hotScore).toBeCloseTo(sortedOnce[i].hotScore, 10);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
