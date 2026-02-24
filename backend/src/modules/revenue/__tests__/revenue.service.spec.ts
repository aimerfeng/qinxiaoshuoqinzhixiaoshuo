import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RevenueService } from '../revenue.service.js';
import { PrismaService } from '../../../prisma/prisma.service.js';

/**
 * RevenueService 单元测试
 *
 * 测试场景：
 * - 打赏金额为 0（边界情况）
 * - 打赏金额超过余额（边界情况）
 * - 成功打赏应创建正确的交易记录
 *
 * _Requirements: 6.1, 6.3_
 */
describe('RevenueService', () => {
  let service: RevenueService;

  const mockUserId = 'user-123';
  const mockBranchId = 'branch-456';
  const mockLibraryId = 'library-789';
  const mockOwnerId = 'owner-111';
  const mockCreatorId = 'creator-222';

  const mockBranch = {
    id: mockBranchId,
    creatorId: mockCreatorId,
    libraryId: mockLibraryId,
    library: {
      id: mockLibraryId,
      ownerId: mockOwnerId,
      ownerCutPercent: 10,
    },
  };

  const mockUserWallet = {
    id: 'wallet-user',
    userId: mockUserId,
    balance: 1000,
  };

  // Create mock functions that we can reference
  const mockFindUniqueBranch = jest.fn();
  const mockFindUniqueWallet = jest.fn();
  const mockUpdateWallet = jest.fn();
  const mockUpsertWallet = jest.fn();
  const mockCreateTransaction = jest.fn();
  const mockCreateBranchTransaction = jest.fn();
  const mockCreateTipRecord = jest.fn();
  const mockUpdateBranch = jest.fn();
  const mockUpdateLibrary = jest.fn();

  const mockPrismaService = {
    libraryBranch: {
      findUnique: mockFindUniqueBranch,
      update: mockUpdateBranch,
    },
    library: {
      update: mockUpdateLibrary,
    },
    wallet: {
      findUnique: mockFindUniqueWallet,
      upsert: mockUpsertWallet,
      update: mockUpdateWallet,
    },
    transaction: {
      create: mockCreateTransaction,
    },
    branchTransaction: {
      create: mockCreateBranchTransaction,
      findMany: jest.fn(),
      count: jest.fn(),
    },
    tipRecord: {
      create: mockCreateTipRecord,
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RevenueService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RevenueService>(RevenueService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('tipBranch', () => {
    describe('打赏金额为 0（边界情况）', () => {
      /**
       * 测试打赏金额为 0 时应被拒绝
       * 需求6验收标准1: 打赏金额必须大于 0
       */
      it('should reject tip with amount 0', async () => {
        const result = await service.tipBranch(mockBranchId, mockUserId, {
          amount: 0,
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe('打赏金额必须大于 0');
        expect(result.data).toBeUndefined();

        // 验证没有调用任何数据库操作
        expect(mockFindUniqueBranch).not.toHaveBeenCalled();
        expect(mockFindUniqueWallet).not.toHaveBeenCalled();
        expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      });

      /**
       * 测试打赏金额为负数时应被拒绝
       */
      it('should reject tip with negative amount', async () => {
        const result = await service.tipBranch(mockBranchId, mockUserId, {
          amount: -100,
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe('打赏金额必须大于 0');
        expect(result.data).toBeUndefined();
      });
    });

    describe('打赏金额超过余额（边界情况）', () => {
      /**
       * 测试打赏金额超过用户余额时应被拒绝
       * 需求6: 用户余额不足时应拒绝打赏
       */
      it('should reject tip when amount exceeds user balance', async () => {
        mockFindUniqueBranch.mockResolvedValue(mockBranch);
        mockFindUniqueWallet.mockResolvedValue({
          ...mockUserWallet,
          balance: 100, // 余额只有 100
        });

        const result = await service.tipBranch(mockBranchId, mockUserId, {
          amount: 500, // 打赏 500，超过余额
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe('余额不足，当前余额 100 零芥子');
        expect(result.data).toBeUndefined();

        // 验证没有执行事务
        expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
      });

      /**
       * 测试打赏金额刚好等于余额时应成功
       */
      it('should accept tip when amount equals user balance', async () => {
        const exactBalance = 500;
        mockFindUniqueBranch.mockResolvedValue(mockBranch);
        mockFindUniqueWallet.mockResolvedValue({
          ...mockUserWallet,
          balance: exactBalance,
        });

        // Mock transaction to execute the callback
        mockPrismaService.$transaction.mockImplementation(
          async (callback: (tx: typeof mockPrismaService) => Promise<unknown>) => {
            // Create a transaction context with the same mocks
            const txContext = {
              wallet: {
                update: mockUpdateWallet.mockResolvedValue({
                  id: 'wallet-user',
                  balance: 0,
                }),
                upsert: mockUpsertWallet.mockResolvedValue({
                  id: 'wallet-owner',
                  balance: 100,
                }),
              },
              transaction: {
                create: mockCreateTransaction.mockResolvedValue({
                  id: 'tx-123',
                }),
              },
              branchTransaction: {
                create: mockCreateBranchTransaction.mockResolvedValue({
                  id: 'branch-tx-123',
                }),
              },
              tipRecord: {
                create: mockCreateTipRecord.mockResolvedValue({
                  id: 'tip-123',
                }),
              },
              libraryBranch: {
                update: mockUpdateBranch.mockResolvedValue({}),
              },
              library: {
                update: mockUpdateLibrary.mockResolvedValue({}),
              },
            };
            return callback(txContext as unknown as typeof mockPrismaService);
          },
        );

        const result = await service.tipBranch(mockBranchId, mockUserId, {
          amount: exactBalance,
        });

        expect(result.success).toBe(true);
        expect(result.message).toBe(`成功打赏 ${exactBalance} 零芥子`);
      });

      /**
       * 测试打赏金额刚好超过余额 1 时应被拒绝
       */
      it('should reject tip when amount exceeds balance by 1', async () => {
        mockFindUniqueBranch.mockResolvedValue(mockBranch);
        mockFindUniqueWallet.mockResolvedValue({
          ...mockUserWallet,
          balance: 100,
        });

        const result = await service.tipBranch(mockBranchId, mockUserId, {
          amount: 101, // 超过余额 1
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe('余额不足，当前余额 100 零芥子');
      });
    });

    describe('成功打赏场景', () => {
      /**
       * 测试成功打赏应创建正确的交易记录
       * 需求6验收标准3: 打赏交易完成时，分别记录到各方钱包
       * 需求6验收标准4: 在打赏记录中保存完整的分配明细
       */
      it('should create proper transactions on successful tip', async () => {
        const tipAmount = 1000;
        const ownerCutPercent = 10;

        mockFindUniqueBranch.mockResolvedValue(mockBranch);
        mockFindUniqueWallet.mockResolvedValue(mockUserWallet);

        const mockBranchTransactionResult = {
          id: 'branch-tx-123',
          branchId: mockBranchId,
          userId: mockUserId,
          transactionType: 'TIP',
          totalAmount: tipAmount,
          platformAmount: 300, // 30%
          ownerAmount: 100, // 10%
          creatorAmount: 600, // 60%
        };

        mockPrismaService.$transaction.mockImplementation(
          async (callback: (tx: typeof mockPrismaService) => Promise<unknown>) => {
            const txContext = {
              wallet: {
                update: mockUpdateWallet.mockResolvedValue({
                  id: 'wallet-user',
                  balance: 0,
                }),
                upsert: mockUpsertWallet.mockResolvedValue({
                  id: 'wallet-owner',
                  balance: 100,
                }),
              },
              transaction: {
                create: mockCreateTransaction.mockResolvedValue({
                  id: 'tx-123',
                }),
              },
              branchTransaction: {
                create: mockCreateBranchTransaction.mockResolvedValue(
                  mockBranchTransactionResult,
                ),
              },
              tipRecord: {
                create: mockCreateTipRecord.mockResolvedValue({
                  id: 'tip-123',
                }),
              },
              libraryBranch: {
                update: mockUpdateBranch.mockResolvedValue({}),
              },
              library: {
                update: mockUpdateLibrary.mockResolvedValue({}),
              },
            };
            return callback(txContext as unknown as typeof mockPrismaService);
          },
        );

        const result = await service.tipBranch(mockBranchId, mockUserId, {
          amount: tipAmount,
          message: '支持创作者！',
        });

        expect(result.success).toBe(true);
        expect(result.message).toBe(`成功打赏 ${tipAmount} 零芥子`);
        expect(result.data).toBeDefined();
        expect(result.data?.transactionId).toBe('branch-tx-123');
        expect(result.data?.totalAmount).toBe(tipAmount);

        // 验证收益分配
        // 平台 30% = 300
        expect(result.data?.platformAmount).toBe(300);
        // 库拥有者 10% = 100
        expect(result.data?.ownerAmount).toBe(100);
        // 创作者 60% = 600
        expect(result.data?.creatorAmount).toBe(600);

        // 验证事务被调用
        expect(mockPrismaService.$transaction).toHaveBeenCalled();
      });

      /**
       * 测试打赏时库拥有者抽成为 0% 的情况
       * 需求6验收标准5: 若库拥有者未设置抽成比例，默认为 0%
       */
      it('should give creator 70% when ownerCutPercent is 0', async () => {
        const tipAmount = 1000;

        const branchWithZeroOwnerCut = {
          ...mockBranch,
          library: {
            ...mockBranch.library,
            ownerCutPercent: 0,
          },
        };

        mockFindUniqueBranch.mockResolvedValue(branchWithZeroOwnerCut);
        mockFindUniqueWallet.mockResolvedValue(mockUserWallet);

        const mockBranchTransactionResult = {
          id: 'branch-tx-123',
          totalAmount: tipAmount,
          platformAmount: 300, // 30%
          ownerAmount: 0, // 0%
          creatorAmount: 700, // 70%
        };

        mockPrismaService.$transaction.mockImplementation(
          async (callback: (tx: typeof mockPrismaService) => Promise<unknown>) => {
            const txContext = {
              wallet: {
                update: mockUpdateWallet.mockResolvedValue({ id: 'wallet-user' }),
                upsert: mockUpsertWallet.mockResolvedValue({ id: 'wallet-owner' }),
              },
              transaction: {
                create: mockCreateTransaction.mockResolvedValue({ id: 'tx-123' }),
              },
              branchTransaction: {
                create: mockCreateBranchTransaction.mockResolvedValue(
                  mockBranchTransactionResult,
                ),
              },
              tipRecord: {
                create: mockCreateTipRecord.mockResolvedValue({ id: 'tip-123' }),
              },
              libraryBranch: {
                update: mockUpdateBranch.mockResolvedValue({}),
              },
              library: {
                update: mockUpdateLibrary.mockResolvedValue({}),
              },
            };
            return callback(txContext as unknown as typeof mockPrismaService);
          },
        );

        const result = await service.tipBranch(mockBranchId, mockUserId, {
          amount: tipAmount,
        });

        expect(result.success).toBe(true);
        expect(result.data?.platformAmount).toBe(300);
        expect(result.data?.ownerAmount).toBe(0);
        expect(result.data?.creatorAmount).toBe(700);
      });

      /**
       * 测试打赏时库拥有者抽成为最大值 30% 的情况
       */
      it('should give creator 40% when ownerCutPercent is 30', async () => {
        const tipAmount = 1000;

        const branchWithMaxOwnerCut = {
          ...mockBranch,
          library: {
            ...mockBranch.library,
            ownerCutPercent: 30,
          },
        };

        mockFindUniqueBranch.mockResolvedValue(branchWithMaxOwnerCut);
        mockFindUniqueWallet.mockResolvedValue(mockUserWallet);

        const mockBranchTransactionResult = {
          id: 'branch-tx-123',
          totalAmount: tipAmount,
          platformAmount: 300, // 30%
          ownerAmount: 300, // 30%
          creatorAmount: 400, // 40%
        };

        mockPrismaService.$transaction.mockImplementation(
          async (callback: (tx: typeof mockPrismaService) => Promise<unknown>) => {
            const txContext = {
              wallet: {
                update: mockUpdateWallet.mockResolvedValue({ id: 'wallet-user' }),
                upsert: mockUpsertWallet.mockResolvedValue({ id: 'wallet-owner' }),
              },
              transaction: {
                create: mockCreateTransaction.mockResolvedValue({ id: 'tx-123' }),
              },
              branchTransaction: {
                create: mockCreateBranchTransaction.mockResolvedValue(
                  mockBranchTransactionResult,
                ),
              },
              tipRecord: {
                create: mockCreateTipRecord.mockResolvedValue({ id: 'tip-123' }),
              },
              libraryBranch: {
                update: mockUpdateBranch.mockResolvedValue({}),
              },
              library: {
                update: mockUpdateLibrary.mockResolvedValue({}),
              },
            };
            return callback(txContext as unknown as typeof mockPrismaService);
          },
        );

        const result = await service.tipBranch(mockBranchId, mockUserId, {
          amount: tipAmount,
        });

        expect(result.success).toBe(true);
        expect(result.data?.platformAmount).toBe(300);
        expect(result.data?.ownerAmount).toBe(300);
        expect(result.data?.creatorAmount).toBe(400);
      });
    });

    describe('错误处理', () => {
      /**
       * 测试分支不存在时应抛出 NotFoundException
       */
      it('should throw NotFoundException when branch does not exist', async () => {
        mockFindUniqueBranch.mockResolvedValue(null);

        await expect(
          service.tipBranch(mockBranchId, mockUserId, { amount: 100 }),
        ).rejects.toThrow(NotFoundException);
      });

      /**
       * 测试用户不能给自己的分支打赏
       */
      it('should reject tip to own branch', async () => {
        const ownBranch = {
          ...mockBranch,
          creatorId: mockUserId, // 创作者就是打赏者
        };

        mockFindUniqueBranch.mockResolvedValue(ownBranch);

        const result = await service.tipBranch(mockBranchId, mockUserId, {
          amount: 100,
        });

        expect(result.success).toBe(false);
        expect(result.message).toBe('不能给自己的分支打赏');
      });

      /**
       * 测试用户钱包不存在时应抛出 BadRequestException
       */
      it('should throw BadRequestException when user wallet does not exist', async () => {
        mockFindUniqueBranch.mockResolvedValue(mockBranch);
        mockFindUniqueWallet.mockResolvedValue(null);

        await expect(
          service.tipBranch(mockBranchId, mockUserId, { amount: 100 }),
        ).rejects.toThrow('用户钱包不存在，请先创建钱包');
      });
    });
  });

  describe('calculateRevenueDistribution', () => {
    /**
     * 测试收益分配计算的正确性
     */
    it('should calculate revenue distribution correctly', () => {
      const distribution = service.calculateRevenueDistribution(1000, 10);

      expect(distribution.totalAmount).toBe(1000);
      expect(distribution.platformAmount).toBe(300); // 30%
      expect(distribution.ownerAmount).toBe(100); // 10%
      expect(distribution.creatorAmount).toBe(600); // 60%
      expect(distribution.platformPercent).toBe(30);
      expect(distribution.ownerPercent).toBe(10);
      expect(distribution.creatorPercent).toBe(60);
    });

    /**
     * 测试默认 ownerCutPercent 为 0
     */
    it('should use 0 as default ownerCutPercent', () => {
      const distribution = service.calculateRevenueDistribution(1000);

      expect(distribution.ownerAmount).toBe(0);
      expect(distribution.ownerPercent).toBe(0);
      expect(distribution.creatorAmount).toBe(700); // 70%
    });

    /**
     * 测试分配总和等于总金额
     */
    it('should ensure sum equals total amount', () => {
      const distribution = service.calculateRevenueDistribution(999, 15);

      const sum =
        distribution.platformAmount +
        distribution.ownerAmount +
        distribution.creatorAmount;

      expect(sum).toBe(999);
    });
  });
});
