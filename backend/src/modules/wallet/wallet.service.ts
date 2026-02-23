import { Injectable, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  DAILY_CLAIM_AMOUNTS,
  BALANCE_LIMITS,
  MEMBER_LEVEL_NAMES,
  TIP_LIMITS,
  TRANSACTION_TYPE_NAMES,
  type DailyClaimResultDto,
  type DailyClaimStatusDto,
  type WalletInfoDto,
  type TipRequestDto,
  type TipResultDto,
  type TipStatusDto,
  type TransactionQueryDto,
  type TransactionListDto,
  type TransactionItemDto,
  type SimpleBalanceDto,
  type DetailedBalanceDto,
  type SourceStatItemDto,
} from './dto/wallet.dto.js';

/**
 * 钱包服务
 *
 * 需求15: 零芥子代币系统
 * 任务15.1.2: 每日领取 API
 *
 * 功能：
 * - 每日领取零芥子
 * - 检查领取状态
 * - 获取钱包信息
 * - 自动创建钱包
 */
@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * 获取或创建用户钱包
   *
   * 如果用户没有钱包，自动创建一个
   *
   * @param userId 用户ID
   * @returns 钱包信息
   */
  async getOrCreateWallet(userId: string) {
    // 先尝试获取现有钱包
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    // 如果不存在，创建新钱包
    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: {
          userId,
          balance: 0,
          totalReceived: 0,
          totalSent: 0,
        },
      });
    }

    return wallet;
  }

  /**
   * 获取用户会员等级
   *
   * @param userId 用户ID
   * @returns 会员等级字符串
   */
  async getUserMemberLevel(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { memberLevel: true },
    });

    if (!user) {
      throw new BadRequestException('用户不存在');
    }

    return user.memberLevel;
  }

  /**
   * 检查今日是否已领取
   *
   * @param userId 用户ID
   * @returns 是否已领取
   */
  async hasClaimedToday(userId: string): Promise<boolean> {
    const today = this.getTodayDate();

    const record = await this.prisma.dailyClaimRecord.findUnique({
      where: {
        userId_claimDate: {
          userId,
          claimDate: today,
        },
      },
    });

    return !!record;
  }

  /**
   * 获取每日领取状态
   *
   * 需求15验收标准1: WHEN 正式会员每日首次登录 THEN System SHALL 显示领取零芥子入口
   *
   * @param userId 用户ID
   * @returns 领取状态
   */
  async getDailyClaimStatus(userId: string): Promise<DailyClaimStatusDto> {
    const memberLevel = await this.getUserMemberLevel(userId);
    const wallet = await this.getOrCreateWallet(userId);
    const hasClaimed = await this.hasClaimedToday(userId);

    const claimAmount = DAILY_CLAIM_AMOUNTS[memberLevel] || 0;
    const balanceLimit = BALANCE_LIMITS[memberLevel] || 0;
    const isBalanceLimitReached = wallet.balance >= balanceLimit;

    // 判断是否可以领取
    let canClaim = false;
    let reason: string | undefined;

    if (memberLevel === 'REGULAR') {
      reason = '普通会员无法领取零芥子，请先升级为正式会员';
    } else if (hasClaimed) {
      reason = '今日已领取，请明天再来';
    } else if (isBalanceLimitReached) {
      reason = `余额已达上限 ${balanceLimit} 零芥子，请先使用后再领取`;
    } else {
      canClaim = true;
    }

    return {
      canClaim,
      hasClaimed,
      claimAmount,
      reason,
      memberLevel,
      memberLevelName: MEMBER_LEVEL_NAMES[memberLevel] || memberLevel,
      currentBalance: wallet.balance,
      balanceLimit,
      isBalanceLimitReached,
    };
  }

  /**
   * 执行每日领取
   *
   * 需求15验收标准2: WHEN 用户点击领取 THEN System SHALL 增加账户余额并记录领取日志
   *
   * @param userId 用户ID
   * @returns 领取结果
   */
  async claimDaily(userId: string): Promise<DailyClaimResultDto> {
    // 获取领取状态
    const status = await this.getDailyClaimStatus(userId);

    // 检查是否可以领取
    if (!status.canClaim) {
      return {
        success: false,
        amount: 0,
        newBalance: status.currentBalance,
        claimDate: this.getTodayDateString(),
        message: status.reason || '无法领取',
      };
    }

    const claimAmount = status.claimAmount;
    const today = this.getTodayDate();

    // 使用事务确保数据一致性
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 创建每日领取记录
      await tx.dailyClaimRecord.create({
        data: {
          userId,
          claimDate: today,
          amount: claimAmount,
        },
      });

      // 2. 更新钱包余额
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: { increment: claimAmount },
          totalReceived: { increment: claimAmount },
        },
      });

      // 3. 创建交易记录
      await tx.transaction.create({
        data: {
          walletId: updatedWallet.id,
          type: 'DAILY_CLAIM',
          amount: claimAmount,
          description: `每日领取 ${claimAmount} 零芥子`,
        },
      });

      return updatedWallet;
    });

    return {
      success: true,
      amount: claimAmount,
      newBalance: result.balance,
      claimDate: this.getTodayDateString(),
      message: `成功领取 ${claimAmount} 零芥子`,
    };
  }

  /**
   * 获取钱包信息
   *
   * 需求15验收标准5: WHEN 用户查看零芥子钱包 THEN System SHALL 显示余额、收支明细、来源统计
   *
   * @param userId 用户ID
   * @returns 钱包信息
   */
  async getWalletInfo(userId: string): Promise<{
    wallet: WalletInfoDto;
    memberLevel: string;
    memberLevelName: string;
  }> {
    const memberLevel = await this.getUserMemberLevel(userId);
    const wallet = await this.getOrCreateWallet(userId);
    const balanceLimit = BALANCE_LIMITS[memberLevel] || 0;

    return {
      wallet: {
        id: wallet.id,
        balance: wallet.balance,
        totalReceived: wallet.totalReceived,
        totalSent: wallet.totalSent,
        balanceLimit,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },
      memberLevel,
      memberLevelName: MEMBER_LEVEL_NAMES[memberLevel] || memberLevel,
    };
  }

  // ==================== 余额查询相关方法 ====================

  /**
   * 获取简单余额信息
   *
   * 任务15.1.5: 余额查询 API - 简单余额查询
   * 用于快速获取余额信息，不包含来源统计
   *
   * @param userId 用户ID
   * @returns 简单余额信息
   */
  async getSimpleBalance(userId: string): Promise<SimpleBalanceDto> {
    const memberLevel = await this.getUserMemberLevel(userId);
    const wallet = await this.getOrCreateWallet(userId);
    const balanceLimit = BALANCE_LIMITS[memberLevel] || 0;

    return {
      balance: wallet.balance,
      totalReceived: wallet.totalReceived,
      totalSent: wallet.totalSent,
      balanceLimit,
    };
  }

  /**
   * 获取来源统计
   *
   * 任务15.1.5: 余额查询 API - 来源统计
   * 按交易类型统计收支情况
   *
   * @param userId 用户ID
   * @returns 来源统计列表
   */
  async getSourceStats(userId: string): Promise<SourceStatItemDto[]> {
    const wallet = await this.getOrCreateWallet(userId);

    // 按交易类型分组统计
    const stats = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: {
        walletId: wallet.id,
      },
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
    });

    // 转换为 DTO 格式
    const sourceStats: SourceStatItemDto[] = stats.map((stat) => ({
      type: stat.type as SourceStatItemDto['type'],
      typeName: TRANSACTION_TYPE_NAMES[stat.type] || stat.type,
      totalAmount: stat._sum.amount || 0,
      count: stat._count.id,
    }));

    // 按金额绝对值排序（收入在前，支出在后）
    sourceStats.sort(
      (a, b) => Math.abs(b.totalAmount) - Math.abs(a.totalAmount),
    );

    return sourceStats;
  }

  /**
   * 获取详细余额信息（含来源统计）
   *
   * 任务15.1.5: 余额查询 API - 详细余额查询
   * 包含余额信息和按交易类型的来源统计
   *
   * @param userId 用户ID
   * @returns 详细余额信息
   */
  async getDetailedBalance(userId: string): Promise<DetailedBalanceDto> {
    const simpleBalance = await this.getSimpleBalance(userId);
    const sourceStats = await this.getSourceStats(userId);

    return {
      ...simpleBalance,
      sourceStats,
    };
  }

  /**
   * 获取今天的日期（只有日期部分，用于数据库查询）
   */
  private getTodayDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * 获取今天的日期字符串（YYYY-MM-DD格式）
   */
  private getTodayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  // ==================== 打赏相关方法 ====================

  /**
   * 获取用户今日已打赏总额
   *
   * @param userId 用户ID
   * @returns 今日已打赏金额
   */
  async getTodayTippedAmount(userId: string): Promise<number> {
    const today = this.getTodayDate();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await this.prisma.tipRecord.aggregate({
      where: {
        fromUserId: userId,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  /**
   * 获取打赏状态
   *
   * 检查用户是否可以进行打赏
   *
   * @param userId 用户ID
   * @returns 打赏状态
   */
  async getTipStatus(userId: string): Promise<TipStatusDto> {
    const wallet = await this.getOrCreateWallet(userId);
    const todayTipped = await this.getTodayTippedAmount(userId);
    const remainingDailyLimit = Math.max(
      0,
      TIP_LIMITS.DAILY_TIP_LIMIT - todayTipped,
    );

    let canTip = true;
    let reason: string | undefined;

    if (wallet.balance <= 0) {
      canTip = false;
      reason = '余额不足，无法打赏';
    } else if (remainingDailyLimit <= 0) {
      canTip = false;
      reason = `今日打赏已达上限 ${TIP_LIMITS.DAILY_TIP_LIMIT} 零芥子`;
    }

    return {
      canTip,
      currentBalance: wallet.balance,
      todayTipped,
      remainingDailyLimit,
      reason,
    };
  }

  /**
   * 验证打赏请求
   *
   * @param fromUserId 打赏者ID
   * @param request 打赏请求
   * @returns 验证结果，包含是否有效和错误消息
   */
  async validateTipRequest(
    fromUserId: string,
    request: TipRequestDto,
  ): Promise<{ valid: boolean; error?: string }> {
    const { toUserId, amount } = request;

    // 1. 检查是否给自己打赏
    if (fromUserId === toUserId) {
      return { valid: false, error: '不能给自己打赏' };
    }

    // 2. 检查打赏金额范围
    if (amount < TIP_LIMITS.MIN_TIP_AMOUNT) {
      return {
        valid: false,
        error: `打赏金额不能少于 ${TIP_LIMITS.MIN_TIP_AMOUNT} 零芥子`,
      };
    }

    if (amount > TIP_LIMITS.MAX_TIP_AMOUNT) {
      return {
        valid: false,
        error: `单次打赏不能超过 ${TIP_LIMITS.MAX_TIP_AMOUNT} 零芥子`,
      };
    }

    // 3. 检查被打赏用户是否存在
    const toUser = await this.prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true },
    });

    if (!toUser) {
      return { valid: false, error: '被打赏用户不存在' };
    }

    // 4. 检查余额是否充足
    const wallet = await this.getOrCreateWallet(fromUserId);
    if (wallet.balance < amount) {
      return { valid: false, error: '余额不足' };
    }

    // 5. 检查每日打赏限额
    const todayTipped = await this.getTodayTippedAmount(fromUserId);
    if (todayTipped + amount > TIP_LIMITS.DAILY_TIP_LIMIT) {
      const remaining = TIP_LIMITS.DAILY_TIP_LIMIT - todayTipped;
      return {
        valid: false,
        error: `今日打赏已达上限，剩余可打赏 ${remaining} 零芥子`,
      };
    }

    return { valid: true };
  }

  /**
   * 执行打赏
   *
   * 需求15验收标准3: WHEN 用户打赏作品/章节 THEN System SHALL 扣除零芥子并通知创作者
   * 需求15验收标准8: WHEN 发生零芥子交易 THEN System SHALL 生成包含双方信息的交易记录
   *
   * @param fromUserId 打赏者ID
   * @param request 打赏请求
   * @returns 打赏结果
   */
  async tip(fromUserId: string, request: TipRequestDto): Promise<TipResultDto> {
    const { toUserId, amount, workId, chapterId, message } = request;

    // 验证打赏请求
    const validation = await this.validateTipRequest(fromUserId, request);
    if (!validation.valid) {
      return {
        success: false,
        amount: 0,
        newBalance: (await this.getOrCreateWallet(fromUserId)).balance,
        message: validation.error || '打赏失败',
      };
    }

    // 使用事务确保数据一致性
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. 获取双方钱包
      const fromWallet = await tx.wallet.findUnique({
        where: { userId: fromUserId },
      });

      if (!fromWallet) {
        throw new BadRequestException('打赏者钱包不存在');
      }

      // 确保接收者有钱包
      let toWallet = await tx.wallet.findUnique({
        where: { userId: toUserId },
      });

      if (!toWallet) {
        toWallet = await tx.wallet.create({
          data: {
            userId: toUserId,
            balance: 0,
            totalReceived: 0,
            totalSent: 0,
          },
        });
      }

      // 2. 创建打赏记录
      const tipRecord = await tx.tipRecord.create({
        data: {
          fromUserId,
          toUserId,
          workId: workId || null,
          chapterId: chapterId || null,
          amount,
          message: message || null,
        },
      });

      // 3. 更新打赏者钱包（扣除余额）
      const updatedFromWallet = await tx.wallet.update({
        where: { userId: fromUserId },
        data: {
          balance: { decrement: amount },
          totalSent: { increment: amount },
        },
      });

      // 4. 更新被打赏者钱包（增加余额）
      await tx.wallet.update({
        where: { userId: toUserId },
        data: {
          balance: { increment: amount },
          totalReceived: { increment: amount },
        },
      });

      // 5. 创建打赏者的交易记录（TIP_SENT）
      await tx.transaction.create({
        data: {
          walletId: fromWallet.id,
          type: 'TIP_SENT',
          amount: -amount, // 负数表示支出
          referenceId: tipRecord.id,
          referenceType: 'tip',
          description: `打赏 ${amount} 零芥子`,
        },
      });

      // 6. 创建被打赏者的交易记录（TIP_RECEIVED）
      await tx.transaction.create({
        data: {
          walletId: toWallet.id,
          type: 'TIP_RECEIVED',
          amount: amount, // 正数表示收入
          referenceId: tipRecord.id,
          referenceType: 'tip',
          description: `收到打赏 ${amount} 零芥子`,
        },
      });

      return {
        tipRecordId: tipRecord.id,
        newBalance: updatedFromWallet.balance,
      };
    });

    // 触发打赏成就事件
    this.emitTipAchievementEvents(fromUserId, toUserId);

    return {
      success: true,
      amount,
      newBalance: result.newBalance,
      tipRecordId: result.tipRecordId,
      message: `成功打赏 ${amount} 零芥子`,
    };
  }

  /**
   * 触发打赏成就事件
   * 
   * 需求24.5.4: 打赏成就（给予/获得）
   * 
   * 在打赏成功后调用此方法，触发成就事件
   * 
   * @param fromUserId 打赏者ID
   * @param toUserId 被打赏者ID
   */
  private emitTipAchievementEvents(fromUserId: string, toUserId: string): void {
    // 触发打赏给予成就事件
    this.eventEmitter.emit('achievement.tip_given', {
      userId: fromUserId,
      eventType: 'achievement.tip_given',
      value: 1,
    });

    // 触发打赏获得成就事件
    this.eventEmitter.emit('achievement.tip_received', {
      userId: toUserId,
      eventType: 'achievement.tip_received',
      value: 1,
    });
  }

  // ==================== 交易记录相关方法 ====================

  /**
   * 获取交易记录列表
   *
   * 需求15验收标准5: WHEN 用户查看零芥子钱包 THEN System SHALL 显示余额、收支明细、来源统计
   * 任务15.1.4: 交易记录 API
   *
   * @param userId 用户ID
   * @param query 查询参数
   * @returns 交易记录列表和分页信息
   */
  async getTransactionHistory(
    userId: string,
    query: TransactionQueryDto,
  ): Promise<TransactionListDto> {
    // 获取用户钱包
    const wallet = await this.getOrCreateWallet(userId);

    // 解析查询参数
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize || 20));
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: {
      walletId: string;
      type?: typeof query.type;
      createdAt?: { gte?: Date; lte?: Date };
    } = {
      walletId: wallet.id,
    };

    // 交易类型过滤
    if (query.type) {
      where.type = query.type;
    }

    // 日期范围过滤
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        // 结束日期设置为当天的最后一刻
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // 查询总数
    const total = await this.prisma.transaction.count({ where });

    // 查询交易记录
    const transactions = await this.prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    });

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    // 转换为 DTO
    const transactionItems: TransactionItemDto[] = transactions.map((tx) => ({
      id: tx.id,
      type: tx.type as TransactionItemDto['type'],
      amount: tx.amount,
      description: tx.description,
      referenceId: tx.referenceId,
      referenceType: tx.referenceType,
      createdAt: tx.createdAt,
    }));

    return {
      transactions: transactionItems,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }
}
