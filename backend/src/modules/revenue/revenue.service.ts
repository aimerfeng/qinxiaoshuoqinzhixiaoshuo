import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  TipBranchDto,
  TipResultDto,
  RevenueDistribution,
} from './dto/index.js';

/**
 * 收益分配服务
 *
 * 需求6: 收益分配系统
 * - 打赏收益在平台、库拥有者、分支创作者之间的分配
 * - 平台固定 30%
 * - 库拥有者 0-30%（可配置）
 * - 分支创作者 40-70%（剩余部分）
 *
 * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
 */
@Injectable()
export class RevenueService {
  private readonly logger = new Logger(RevenueService.name);

  /**
   * 平台固定抽成比例 (30%)
   */
  private readonly PLATFORM_PERCENT = 30;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 计算收益分配
   *
   * Property 12: 打赏收益分配
   * - platformAmount = totalAmount × 30%
   * - ownerAmount = totalAmount × ownerCutPercent%
   * - creatorAmount = totalAmount × (70% - ownerCutPercent%)
   * - platformAmount + ownerAmount + creatorAmount = totalAmount
   *
   * @param totalAmount 总金额
   * @param ownerCutPercent 库拥有者抽成比例 (0-30)
   * @returns 收益分配结果
   *
   * _Requirements: 6.1, 6.2, 6.5_
   */
  calculateRevenueDistribution(
    totalAmount: number,
    ownerCutPercent: number = 0,
  ): RevenueDistribution {
    // 确保 ownerCutPercent 在有效范围内
    const validOwnerPercent = Math.max(0, Math.min(30, ownerCutPercent));

    // 计算各方比例
    const platformPercent = this.PLATFORM_PERCENT;
    const ownerPercent = validOwnerPercent;
    const creatorPercent = 100 - platformPercent - ownerPercent;

    // 计算各方金额（使用 Math.floor 确保整数，避免浮点数问题）
    const platformAmount = Math.floor((totalAmount * platformPercent) / 100);
    const ownerAmount = Math.floor((totalAmount * ownerPercent) / 100);
    // 创作者获得剩余部分，确保总和等于 totalAmount
    const creatorAmount = totalAmount - platformAmount - ownerAmount;

    return {
      totalAmount,
      platformAmount,
      ownerAmount,
      creatorAmount,
      platformPercent,
      ownerPercent,
      creatorPercent,
    };
  }

  /**
   * 打赏分支
   *
   * 需求6验收标准1: WHEN 用户打赏分支内容时，THE Revenue_System SHALL 按比例分配
   * 需求6验收标准3: WHEN 打赏交易完成时，THE Revenue_System SHALL 分别记录到各方钱包
   * 需求6验收标准4: THE Revenue_System SHALL 在打赏记录中保存完整的分配明细
   *
   * Property 12: 打赏收益分配
   * - 使用事务处理：扣除用户余额 + 增加各方余额 + 创建 Transaction + 创建 BranchTransaction + 创建 TipRecord
   *
   * @param branchId 分支ID
   * @param userId 打赏者ID
   * @param tipDto 打赏数据
   * @returns 打赏结果
   *
   * _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 8.4_
   */
  async tipBranch(
    branchId: string,
    userId: string,
    tipDto: TipBranchDto,
  ): Promise<TipResultDto> {
    const { amount, message } = tipDto;

    // 验证打赏金额
    if (amount <= 0) {
      return {
        success: false,
        message: '打赏金额必须大于 0',
      };
    }

    // 获取分支信息（包含库和创作者信息）
    const branch = await this.prisma.libraryBranch.findUnique({
      where: { id: branchId, isDeleted: false },
      select: {
        id: true,
        creatorId: true,
        libraryId: true,
        library: {
          select: {
            id: true,
            ownerId: true,
            ownerCutPercent: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException('分支不存在');
    }

    // 不能给自己打赏
    if (branch.creatorId === userId) {
      return {
        success: false,
        message: '不能给自己的分支打赏',
      };
    }

    // 获取打赏者钱包并验证余额
    const userWallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { id: true, balance: true },
    });

    if (!userWallet) {
      throw new BadRequestException('用户钱包不存在，请先创建钱包');
    }

    if (userWallet.balance < amount) {
      return {
        success: false,
        message: `余额不足，当前余额 ${userWallet.balance} 零芥子`,
      };
    }

    // 计算收益分配
    const distribution = this.calculateRevenueDistribution(
      amount,
      branch.library.ownerCutPercent,
    );

    try {
      // 使用事务处理所有操作
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. 扣除打赏者余额
        const updatedUserWallet = await tx.wallet.update({
          where: { userId },
          data: {
            balance: { decrement: amount },
            totalSent: { increment: amount },
          },
        });

        // 2. 创建打赏者支出交易记录
        const userTransaction = await tx.transaction.create({
          data: {
            walletId: updatedUserWallet.id,
            type: 'TIP_SENT',
            amount: -amount,
            referenceId: branchId,
            referenceType: 'branch_tip',
            description: `打赏分支 ${amount} 零芥子`,
          },
        });

        // 3. 增加库拥有者余额（如果有分成）
        let ownerTransactionId: string | null = null;
        if (distribution.ownerAmount > 0) {
          const ownerWallet = await tx.wallet.upsert({
            where: { userId: branch.library.ownerId },
            create: {
              userId: branch.library.ownerId,
              balance: distribution.ownerAmount,
              totalReceived: distribution.ownerAmount,
            },
            update: {
              balance: { increment: distribution.ownerAmount },
              totalReceived: { increment: distribution.ownerAmount },
            },
          });

          const ownerTransaction = await tx.transaction.create({
            data: {
              walletId: ownerWallet.id,
              type: 'TIP_RECEIVED',
              amount: distribution.ownerAmount,
              referenceId: branchId,
              referenceType: 'branch_tip_owner',
              description: `分支打赏收入（库拥有者分成）${distribution.ownerAmount} 零芥子`,
            },
          });
          ownerTransactionId = ownerTransaction.id;
        }

        // 4. 增加分支创作者余额
        let creatorTransactionId: string | null = null;
        if (distribution.creatorAmount > 0) {
          const creatorWallet = await tx.wallet.upsert({
            where: { userId: branch.creatorId },
            create: {
              userId: branch.creatorId,
              balance: distribution.creatorAmount,
              totalReceived: distribution.creatorAmount,
            },
            update: {
              balance: { increment: distribution.creatorAmount },
              totalReceived: { increment: distribution.creatorAmount },
            },
          });

          const creatorTransaction = await tx.transaction.create({
            data: {
              walletId: creatorWallet.id,
              type: 'TIP_RECEIVED',
              amount: distribution.creatorAmount,
              referenceId: branchId,
              referenceType: 'branch_tip_creator',
              description: `分支打赏收入 ${distribution.creatorAmount} 零芥子`,
            },
          });
          creatorTransactionId = creatorTransaction.id;
        }

        // 5. 创建 BranchTransaction 记录（保存完整分配明细）
        const branchTransaction = await tx.branchTransaction.create({
          data: {
            branchId,
            userId,
            transactionType: 'TIP',
            totalAmount: distribution.totalAmount,
            platformAmount: distribution.platformAmount,
            ownerAmount: distribution.ownerAmount,
            creatorAmount: distribution.creatorAmount,
            userTransactionId: userTransaction.id,
            ownerTransactionId,
            creatorTransactionId,
            message: message || null,
          },
        });

        // 6. 创建 TipRecord 记录
        await tx.tipRecord.create({
          data: {
            fromUserId: userId,
            toUserId: branch.creatorId,
            amount,
            message: message || null,
          },
        });

        // 7. 更新分支的打赏统计
        await tx.libraryBranch.update({
          where: { id: branchId },
          data: {
            tipAmount: { increment: amount },
          },
        });

        // 8. 更新小说库的打赏统计
        await tx.library.update({
          where: { id: branch.libraryId },
          data: {
            totalTipAmount: { increment: amount },
          },
        });

        return branchTransaction;
      });

      this.logger.log(
        `Branch tip successful: ${result.id}, amount: ${amount}, ` +
          `platform: ${distribution.platformAmount}, owner: ${distribution.ownerAmount}, ` +
          `creator: ${distribution.creatorAmount}`,
      );

      return {
        success: true,
        message: `成功打赏 ${amount} 零芥子`,
        data: {
          transactionId: result.id,
          totalAmount: distribution.totalAmount,
          platformAmount: distribution.platformAmount,
          ownerAmount: distribution.ownerAmount,
          creatorAmount: distribution.creatorAmount,
        },
      };
    } catch (error: unknown) {
      // 重新抛出已知的业务异常
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to tip branch: ${errorMessage}`);
      throw new InternalServerErrorException('打赏失败');
    }
  }

  /**
   * 获取分支的打赏记录
   *
   * @param branchId 分支ID
   * @param page 页码
   * @param limit 每页数量
   * @returns 打赏记录列表
   */
  async getBranchTipHistory(
    branchId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.branchTransaction.findMany({
        where: {
          branchId,
          transactionType: 'TIP',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.branchTransaction.count({
        where: {
          branchId,
          transactionType: 'TIP',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: transactions.map((tx) => ({
        id: tx.id,
        amount: tx.totalAmount,
        message: tx.message,
        user: tx.user,
        createdAt: tx.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }
}
