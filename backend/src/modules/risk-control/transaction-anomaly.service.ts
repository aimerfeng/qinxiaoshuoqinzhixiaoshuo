import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { RiskLevel } from './dto/related-account.dto.js';
import {
  AnomalyType,
  type TransactionAnomaly,
  type UserAnomaliesResult,
  type CircularTransferResult,
  type CircularTransferCycle,
  type ConcentratedReceiptsResult,
  type TransactionPatternResult,
  type TransactionPattern,
  type PatternAnomaly,
  type SuspiciousTransaction,
  type FlaggedTransactionsResult,
} from './dto/transaction-anomaly.dto.js';

/**
 * 交易异常检测服务
 *
 * 需求19: 风控与反作弊系统 - 交易异常检测
 *
 * 检测模式:
 * - 固定金额循环转账 (HIGH RISK)
 * - 新账户集中收币 (HIGH RISK)
 * - 短时间内大量小额交易 (MEDIUM RISK)
 * - 异常时间段交易 (LOW RISK)
 * - 单向高频打赏 (MEDIUM RISK)
 */
@Injectable()
export class TransactionAnomalyService {
  private readonly logger = new Logger(TransactionAnomalyService.name);

  // 阈值配置
  private readonly THRESHOLDS = {
    // 新账户定义：注册天数
    NEW_ACCOUNT_DAYS: 7,
    // 集中收币阈值：新账户在短时间内收到的交易数
    CONCENTRATED_RECEIPTS_COUNT: 10,
    // 集中收币阈值：唯一发送者数量
    CONCENTRATED_RECEIPTS_SENDERS: 5,
    // 小额交易阈值
    SMALL_TRANSACTION_AMOUNT: 10,
    // 高频交易阈值：每小时交易数
    HIGH_FREQUENCY_PER_HOUR: 10,
    // 异常时间段：凌晨2-6点
    UNUSUAL_HOURS_START: 2,
    UNUSUAL_HOURS_END: 6,
    // 单向高频打赏阈值：同一对用户间的交易数
    ONE_WAY_FREQUENCY_THRESHOLD: 5,
    // 循环转账检测：最小环大小
    CIRCULAR_MIN_CYCLE_SIZE: 2,
    // 循环转账检测：金额容差（允许的金额差异百分比）
    CIRCULAR_AMOUNT_TOLERANCE: 0.05,
  };

  // 缓存配置
  private readonly CACHE_TTL = 300; // 5分钟缓存
  private readonly CACHE_PREFIX = 'risk:txn:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 检测用户的所有交易异常
   *
   * 综合多个维度检测可能的异常交易行为
   */
  async detectAnomalies(
    userId: string,
    options: { daysToAnalyze?: number } = {},
  ): Promise<UserAnomaliesResult> {
    const { daysToAnalyze = 30 } = options;

    // 尝试从缓存获取
    const cacheKey = `${this.CACHE_PREFIX}anomalies:${userId}:${daysToAnalyze}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as UserAnomaliesResult;
      } catch {
        // 缓存解析失败，继续计算
      }
    }

    this.logger.debug(`Detecting anomalies for user ${userId}`);

    const anomalies: TransactionAnomaly[] = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToAnalyze);

    // 1. 检测集中收币
    const concentratedResult = await this.detectConcentratedReceipts(userId, {
      daysToAnalyze,
    });
    if (concentratedResult.isSuspicious) {
      anomalies.push({
        type: AnomalyType.CONCENTRATED_RECEIPTS,
        riskLevel: concentratedResult.riskLevel,
        description: `新账户(${concentratedResult.accountAgeDays}天)集中收币: ${concentratedResult.transactionCount}笔交易，来自${concentratedResult.uniqueSenders}个不同用户`,
        evidence: {
          count: concentratedResult.transactionCount,
          totalAmount: concentratedResult.totalReceived,
          details: {
            accountAgeDays: concentratedResult.accountAgeDays,
            uniqueSenders: concentratedResult.uniqueSenders,
          },
        },
        detectedAt: new Date(),
      });
    }

    // 2. 检测单向高频打赏
    const oneWayResult = await this.detectOneWayHighFrequency(userId, {
      daysToAnalyze,
    });
    anomalies.push(...oneWayResult);

    // 3. 检测异常时间段交易
    const unusualHoursResult = await this.detectUnusualHoursTransactions(
      userId,
      { daysToAnalyze },
    );
    if (unusualHoursResult) {
      anomalies.push(unusualHoursResult);
    }

    // 4. 检测短时间内大量小额交易
    const highFreqSmallResult = await this.detectHighFrequencySmallTransactions(
      userId,
      { daysToAnalyze },
    );
    if (highFreqSmallResult) {
      anomalies.push(highFreqSmallResult);
    }

    // 计算统计
    const highRiskCount = anomalies.filter(
      (a) => a.riskLevel === RiskLevel.HIGH,
    ).length;
    const mediumRiskCount = anomalies.filter(
      (a) => a.riskLevel === RiskLevel.MEDIUM,
    ).length;
    const lowRiskCount = anomalies.filter(
      (a) => a.riskLevel === RiskLevel.LOW,
    ).length;

    // 计算整体风险等级
    const overallRiskLevel =
      highRiskCount > 0
        ? RiskLevel.HIGH
        : mediumRiskCount > 0
          ? RiskLevel.MEDIUM
          : RiskLevel.LOW;

    const result: UserAnomaliesResult = {
      userId,
      anomalies,
      totalAnomalies: anomalies.length,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      overallRiskLevel,
      analyzedAt: new Date(),
    };

    // 缓存结果
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    return result;
  }


  /**
   * 检测循环转账模式
   *
   * 查找固定金额在多个账户间循环转账的模式
   * 风险等级: HIGH
   */
  async detectCircularTransfers(
    options: { daysToAnalyze?: number } = {},
  ): Promise<CircularTransferResult> {
    const { daysToAnalyze = 7 } = options;

    this.logger.debug('Detecting circular transfers');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToAnalyze);

    try {
      // 获取时间范围内的所有打赏记录
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tipRecords = await (this.prisma as any).tipRecord.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          fromUserId: true,
          toUserId: true,
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // 按金额分组
      const amountGroups = new Map<number, TipRecordData[]>();
      for (const record of tipRecords as TipRecordData[]) {
        const amount = record.amount;
        if (!amountGroups.has(amount)) {
          amountGroups.set(amount, []);
        }
        amountGroups.get(amount)!.push(record);
      }

      const cycles: CircularTransferCycle[] = [];

      // 对每个金额组检测循环
      for (const [amount, records] of amountGroups.entries()) {
        if (records.length < this.THRESHOLDS.CIRCULAR_MIN_CYCLE_SIZE * 2) {
          continue;
        }

        // 构建有向图
        const graph = new Map<string, Set<string>>();
        for (const record of records) {
          if (!graph.has(record.fromUserId)) {
            graph.set(record.fromUserId, new Set());
          }
          graph.get(record.fromUserId)!.add(record.toUserId);
        }

        // 检测环
        const detectedCycles = this.findCyclesInGraph(graph);

        for (const cycle of detectedCycles) {
          if (cycle.length >= this.THRESHOLDS.CIRCULAR_MIN_CYCLE_SIZE) {
            const cycleRecords = records.filter(
              (r) =>
                cycle.includes(r.fromUserId) && cycle.includes(r.toUserId),
            );

            const timeRange = {
              start: new Date(
                Math.min(...cycleRecords.map((r) => r.createdAt.getTime())),
              ),
              end: new Date(
                Math.max(...cycleRecords.map((r) => r.createdAt.getTime())),
              ),
            };

            cycles.push({
              cycleId: `cycle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              userIds: cycle,
              amount,
              transactionCount: cycleRecords.length,
              timeRange,
              riskLevel: RiskLevel.HIGH,
            });
          }
        }
      }

      return {
        detected: cycles.length > 0,
        cycles,
        totalCycles: cycles.length,
        analyzedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to detect circular transfers: ${String(error)}`);
      return {
        detected: false,
        cycles: [],
        totalCycles: 0,
        analyzedAt: new Date(),
      };
    }
  }

  /**
   * 检测新账户集中收币
   *
   * 检测新注册账户在短时间内收到大量打赏的情况
   * 风险等级: HIGH
   */
  async detectConcentratedReceipts(
    userId: string,
    options: { daysToAnalyze?: number } = {},
  ): Promise<ConcentratedReceiptsResult> {
    const { daysToAnalyze = 7 } = options;

    this.logger.debug(`Detecting concentrated receipts for user ${userId}`);

    try {
      // 获取用户信息
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const user = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      });

      if (!user) {
        return this.emptyConcentratedResult(userId);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const accountAgeDays = Math.floor(
        (Date.now() - (user.createdAt as Date).getTime()) / (1000 * 60 * 60 * 24),
      );
      const isNewAccount = accountAgeDays <= this.THRESHOLDS.NEW_ACCOUNT_DAYS;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysToAnalyze);

      // 获取收到的打赏记录
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const receivedTips = await (this.prisma as any).tipRecord.findMany({
        where: {
          toUserId: userId,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          fromUserId: true,
          amount: true,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const transactionCount = receivedTips.length as number;
      const uniqueSenders = new Set(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return
        (receivedTips as any[]).map((t: any) => t.fromUserId),
      ).size;
      const totalReceived = (receivedTips as any[]).reduce(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (sum: number, t: any) => sum + (t.amount as number),
        0,
      );

      // 判断是否可疑
      const isSuspicious =
        isNewAccount &&
        (transactionCount >= this.THRESHOLDS.CONCENTRATED_RECEIPTS_COUNT ||
          uniqueSenders >= this.THRESHOLDS.CONCENTRATED_RECEIPTS_SENDERS);

      const riskLevel = isSuspicious
        ? RiskLevel.HIGH
        : transactionCount > 5
          ? RiskLevel.MEDIUM
          : RiskLevel.LOW;

      return {
        userId,
        isNewAccount,
        accountAgeDays,
        totalReceived,
        uniqueSenders,
        transactionCount,
        riskLevel,
        isSuspicious,
        analyzedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to detect concentrated receipts: ${String(error)}`);
      return this.emptyConcentratedResult(userId);
    }
  }

  /**
   * 分析用户交易模式
   */
  async analyzeTransactionPattern(
    userId: string,
    options: { daysToAnalyze?: number } = {},
  ): Promise<TransactionPatternResult> {
    const { daysToAnalyze = 30 } = options;

    this.logger.debug(`Analyzing transaction pattern for user ${userId}`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToAnalyze);

    try {
      // 获取发出的打赏
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const sentTips = await (this.prisma as any).tipRecord.findMany({
        where: {
          fromUserId: userId,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          toUserId: true,
          amount: true,
          createdAt: true,
        },
      });

      // 获取收到的打赏
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const receivedTips = await (this.prisma as any).tipRecord.findMany({
        where: {
          toUserId: userId,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          fromUserId: true,
          amount: true,
          createdAt: true,
        },
      });

      const allTransactions = [
        ...(sentTips as TipRecordData[]),
        ...(receivedTips as TipRecordData[]),
      ];

      // 计算模式
      const pattern = this.calculatePattern(
        sentTips as TipRecordData[],
        receivedTips as TipRecordData[],
        daysToAnalyze,
      );

      // 检测模式异常
      const anomalies = this.detectPatternAnomalies(pattern, allTransactions);

      // 计算风险分数
      const riskScore = this.calculateRiskScore(anomalies);
      const riskLevel =
        riskScore >= 70
          ? RiskLevel.HIGH
          : riskScore >= 40
            ? RiskLevel.MEDIUM
            : RiskLevel.LOW;

      return {
        userId,
        pattern,
        anomalies,
        riskScore,
        riskLevel,
        analyzedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to analyze transaction pattern: ${String(error)}`);
      return this.emptyPatternResult(userId);
    }
  }


  /**
   * 标记可疑交易
   *
   * 扫描所有交易并标记可疑的交易记录
   */
  async flagSuspiciousTransactions(
    options: { daysToAnalyze?: number; minRiskScore?: number } = {},
  ): Promise<FlaggedTransactionsResult> {
    const { daysToAnalyze = 7, minRiskScore = 50 } = options;

    this.logger.log('Flagging suspicious transactions');

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToAnalyze);

    try {
      // 获取时间范围内的所有打赏记录
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tipRecords = await (this.prisma as any).tipRecord.findMany({
        where: {
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          fromUserId: true,
          toUserId: true,
          amount: true,
          createdAt: true,
        },
      });

      const suspiciousTransactions: SuspiciousTransaction[] = [];

      // 分析每笔交易
      for (const record of tipRecords as TipRecordData[]) {
        const anomalyTypes: AnomalyType[] = [];
        let riskScore = 0;

        // 检查是否是小额交易
        if (record.amount <= this.THRESHOLDS.SMALL_TRANSACTION_AMOUNT) {
          riskScore += 10;
        }

        // 检查是否在异常时间段
        const hour = record.createdAt.getHours();
        if (
          hour >= this.THRESHOLDS.UNUSUAL_HOURS_START &&
          hour < this.THRESHOLDS.UNUSUAL_HOURS_END
        ) {
          anomalyTypes.push(AnomalyType.UNUSUAL_HOURS);
          riskScore += 15;
        }

        // 检查是否是高频交易对
        const pairCount = (tipRecords as TipRecordData[]).filter(
          (t) => t.fromUserId === record.fromUserId && t.toUserId === record.toUserId,
        ).length;

        if (pairCount >= this.THRESHOLDS.ONE_WAY_FREQUENCY_THRESHOLD) {
          anomalyTypes.push(AnomalyType.ONE_WAY_HIGH_FREQUENCY);
          riskScore += 25;
        }

        // 检查发送者是否有大量小额交易
        const senderSmallTxCount = (tipRecords as TipRecordData[]).filter(
          (t) =>
            t.fromUserId === record.fromUserId &&
            t.amount <= this.THRESHOLDS.SMALL_TRANSACTION_AMOUNT,
        ).length;

        if (senderSmallTxCount >= this.THRESHOLDS.HIGH_FREQUENCY_PER_HOUR) {
          anomalyTypes.push(AnomalyType.HIGH_FREQUENCY_SMALL);
          riskScore += 20;
        }

        // 只标记达到阈值的交易
        if (riskScore >= minRiskScore) {
          const riskLevel =
            riskScore >= 70
              ? RiskLevel.HIGH
              : riskScore >= 40
                ? RiskLevel.MEDIUM
                : RiskLevel.LOW;

          suspiciousTransactions.push({
            transactionId: record.id,
            fromUserId: record.fromUserId,
            toUserId: record.toUserId,
            amount: record.amount,
            createdAt: record.createdAt,
            anomalyTypes,
            riskScore,
            riskLevel,
            flaggedAt: new Date(),
          });
        }
      }

      // 按风险分数排序
      suspiciousTransactions.sort((a, b) => b.riskScore - a.riskScore);

      const highRiskCount = suspiciousTransactions.filter(
        (t) => t.riskLevel === RiskLevel.HIGH,
      ).length;
      const mediumRiskCount = suspiciousTransactions.filter(
        (t) => t.riskLevel === RiskLevel.MEDIUM,
      ).length;
      const lowRiskCount = suspiciousTransactions.filter(
        (t) => t.riskLevel === RiskLevel.LOW,
      ).length;

      return {
        transactions: suspiciousTransactions,
        totalFlagged: suspiciousTransactions.length,
        highRiskCount,
        mediumRiskCount,
        lowRiskCount,
        analyzedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to flag suspicious transactions: ${String(error)}`);
      return {
        transactions: [],
        totalFlagged: 0,
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        analyzedAt: new Date(),
      };
    }
  }

  // ==================== 私有方法：检测各类异常 ====================

  /**
   * 检测单向高频打赏
   */
  private async detectOneWayHighFrequency(
    userId: string,
    options: { daysToAnalyze?: number } = {},
  ): Promise<TransactionAnomaly[]> {
    const { daysToAnalyze = 30 } = options;
    const anomalies: TransactionAnomaly[] = [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToAnalyze);

    try {
      // 获取用户发出的打赏，按接收者分组
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const sentTips = await (this.prisma as any).tipRecord.findMany({
        where: {
          fromUserId: userId,
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          toUserId: true,
          amount: true,
          createdAt: true,
        },
      });

      // 按接收者分组统计
      const recipientCounts = new Map<string, { count: number; total: number }>();
      for (const tip of sentTips as TipRecordData[]) {
        const current = recipientCounts.get(tip.toUserId) ?? { count: 0, total: 0 };
        current.count++;
        current.total += tip.amount;
        recipientCounts.set(tip.toUserId, current);
      }

      // 检测高频打赏
      for (const [toUserId, stats] of recipientCounts.entries()) {
        if (stats.count >= this.THRESHOLDS.ONE_WAY_FREQUENCY_THRESHOLD) {
          anomalies.push({
            type: AnomalyType.ONE_WAY_HIGH_FREQUENCY,
            riskLevel: stats.count >= 10 ? RiskLevel.HIGH : RiskLevel.MEDIUM,
            description: `单向高频打赏: 向用户 ${toUserId.substring(0, 8)}... 打赏 ${stats.count} 次，共 ${stats.total} 零芥子`,
            evidence: {
              count: stats.count,
              totalAmount: stats.total,
              details: { toUserId },
            },
            detectedAt: new Date(),
            affectedUserIds: [userId, toUserId],
          });
        }
      }
    } catch (error) {
      this.logger.error(`Failed to detect one-way high frequency: ${String(error)}`);
    }

    return anomalies;
  }

  /**
   * 检测异常时间段交易
   */
  private async detectUnusualHoursTransactions(
    userId: string,
    options: { daysToAnalyze?: number } = {},
  ): Promise<TransactionAnomaly | null> {
    const { daysToAnalyze = 30 } = options;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToAnalyze);

    try {
      // 获取用户的所有交易
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const allTips = await (this.prisma as any).tipRecord.findMany({
        where: {
          OR: [{ fromUserId: userId }, { toUserId: userId }],
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
      });

      // 统计异常时间段的交易
      const unusualHoursTips = (allTips as TipRecordData[]).filter((tip) => {
        const hour = tip.createdAt.getHours();
        return (
          hour >= this.THRESHOLDS.UNUSUAL_HOURS_START &&
          hour < this.THRESHOLDS.UNUSUAL_HOURS_END
        );
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const totalTips = allTips.length as number;
      const unusualCount = unusualHoursTips.length;
      const unusualRatio = totalTips > 0 ? unusualCount / totalTips : 0;

      // 如果异常时间段交易占比超过30%，标记为异常
      if (unusualRatio > 0.3 && unusualCount >= 3) {
        const totalAmount = unusualHoursTips.reduce(
          (sum, t) => sum + t.amount,
          0,
        );

        return {
          type: AnomalyType.UNUSUAL_HOURS,
          riskLevel: RiskLevel.LOW,
          description: `异常时间段交易: ${unusualCount}/${totalTips} 笔交易发生在凌晨2-6点 (${(unusualRatio * 100).toFixed(1)}%)`,
          evidence: {
            count: unusualCount,
            totalAmount,
            pattern: `${this.THRESHOLDS.UNUSUAL_HOURS_START}:00-${this.THRESHOLDS.UNUSUAL_HOURS_END}:00`,
            details: { ratio: unusualRatio, totalTransactions: totalTips },
          },
          detectedAt: new Date(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to detect unusual hours transactions: ${String(error)}`);
    }

    return null;
  }

  /**
   * 检测短时间内大量小额交易
   */
  private async detectHighFrequencySmallTransactions(
    userId: string,
    options: { daysToAnalyze?: number } = {},
  ): Promise<TransactionAnomaly | null> {
    const { daysToAnalyze = 7 } = options;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToAnalyze);

    try {
      // 获取用户发出的小额交易
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const smallTips = await (this.prisma as any).tipRecord.findMany({
        where: {
          fromUserId: userId,
          amount: { lte: this.THRESHOLDS.SMALL_TRANSACTION_AMOUNT },
          createdAt: { gte: startDate },
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const smallTipCount = smallTips.length as number;

      // 检测每小时的交易频率
      const hourlyGroups = new Map<string, number>();
      for (const tip of smallTips as TipRecordData[]) {
        const hourKey = `${tip.createdAt.toISOString().substring(0, 13)}`;
        hourlyGroups.set(hourKey, (hourlyGroups.get(hourKey) ?? 0) + 1);
      }

      // 找出最高频率的小时
      let maxHourlyCount = 0;
      for (const count of hourlyGroups.values()) {
        if (count > maxHourlyCount) {
          maxHourlyCount = count;
        }
      }

      // 如果某小时内小额交易超过阈值
      if (maxHourlyCount >= this.THRESHOLDS.HIGH_FREQUENCY_PER_HOUR) {
        const totalAmount = (smallTips as TipRecordData[]).reduce(
          (sum, t) => sum + t.amount,
          0,
        );

        return {
          type: AnomalyType.HIGH_FREQUENCY_SMALL,
          riskLevel: RiskLevel.MEDIUM,
          description: `短时间内大量小额交易: ${smallTipCount}笔小额交易(≤${this.THRESHOLDS.SMALL_TRANSACTION_AMOUNT}零芥子)，最高${maxHourlyCount}笔/小时`,
          evidence: {
            count: smallTipCount,
            totalAmount,
            pattern: `最高 ${maxHourlyCount} 笔/小时`,
            details: {
              threshold: this.THRESHOLDS.SMALL_TRANSACTION_AMOUNT,
              maxHourlyCount,
            },
          },
          detectedAt: new Date(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to detect high frequency small transactions: ${String(error)}`);
    }

    return null;
  }


  // ==================== 私有方法：辅助函数 ====================

  /**
   * 在有向图中查找环
   */
  private findCyclesInGraph(graph: Map<string, Set<string>>): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: string[] = [];

    const dfs = (node: string): void => {
      visited.add(node);
      recStack.add(node);
      path.push(node);

      const neighbors = graph.get(node) ?? new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor);
        } else if (recStack.has(neighbor)) {
          // 找到环
          const cycleStart = path.indexOf(neighbor);
          if (cycleStart !== -1) {
            const cycle = path.slice(cycleStart);
            if (cycle.length >= this.THRESHOLDS.CIRCULAR_MIN_CYCLE_SIZE) {
              cycles.push([...cycle]);
            }
          }
        }
      }

      path.pop();
      recStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }

    return cycles;
  }

  /**
   * 计算交易模式
   */
  private calculatePattern(
    sentTips: TipRecordData[],
    receivedTips: TipRecordData[],
    daysToAnalyze: number,
  ): TransactionPattern {
    const allAmounts = [
      ...sentTips.map((t) => t.amount),
      ...receivedTips.map((t) => t.amount),
    ];

    const totalSent = sentTips.reduce((sum, t) => sum + t.amount, 0);
    const totalReceived = receivedTips.reduce((sum, t) => sum + t.amount, 0);
    const totalTransactions = sentTips.length + receivedTips.length;

    // 计算活跃时段
    const hourCounts = new Array(24).fill(0) as number[];
    for (const tip of [...sentTips, ...receivedTips]) {
      const hour = tip.createdAt.getHours();
      hourCounts[hour]++;
    }

    const activeHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter((h) => h.count > 0)
      .map((h) => h.hour);

    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    // 计算唯一收款人和付款人
    const uniqueRecipients = new Set(sentTips.map((t) => t.toUserId)).size;
    const uniqueSenders = new Set(receivedTips.map((t) => t.fromUserId)).size;

    return {
      totalTransactions,
      totalSent,
      totalReceived,
      avgTransactionAmount:
        allAmounts.length > 0
          ? allAmounts.reduce((a, b) => a + b, 0) / allAmounts.length
          : 0,
      maxTransactionAmount:
        allAmounts.length > 0 ? Math.max(...allAmounts) : 0,
      minTransactionAmount:
        allAmounts.length > 0 ? Math.min(...allAmounts) : 0,
      activeHours,
      peakHour,
      uniqueRecipients,
      uniqueSenders,
      transactionFrequency: totalTransactions / daysToAnalyze,
    };
  }

  /**
   * 检测模式异常
   */
  private detectPatternAnomalies(
    pattern: TransactionPattern,
    transactions: TipRecordData[],
  ): PatternAnomaly[] {
    const anomalies: PatternAnomaly[] = [];

    // 检测高频交易
    if (pattern.transactionFrequency > 10) {
      anomalies.push({
        type: AnomalyType.HIGH_FREQUENCY_SMALL,
        severity: pattern.transactionFrequency > 20 ? 'high' : 'medium',
        description: '交易频率异常高',
        value: pattern.transactionFrequency.toFixed(2),
        threshold: '10',
      });
    }

    // 检测异常时间段活跃
    const unusualHoursActive = pattern.activeHours.filter(
      (h) =>
        h >= this.THRESHOLDS.UNUSUAL_HOURS_START &&
        h < this.THRESHOLDS.UNUSUAL_HOURS_END,
    );
    if (unusualHoursActive.length > 0) {
      const unusualRatio = unusualHoursActive.length / pattern.activeHours.length;
      if (unusualRatio > 0.3) {
        anomalies.push({
          type: AnomalyType.UNUSUAL_HOURS,
          severity: 'low',
          description: '异常时间段活跃度高',
          value: `${(unusualRatio * 100).toFixed(1)}%`,
          threshold: '30%',
        });
      }
    }

    // 检测收发不平衡
    if (pattern.totalSent > 0 && pattern.totalReceived === 0) {
      anomalies.push({
        type: AnomalyType.ONE_WAY_HIGH_FREQUENCY,
        severity: 'medium',
        description: '只有发出没有收入',
        value: pattern.totalSent.toString(),
        threshold: '0',
      });
    }

    // 检测小额交易占比
    const smallTxCount = transactions.filter(
      (t) => t.amount <= this.THRESHOLDS.SMALL_TRANSACTION_AMOUNT,
    ).length;
    const smallTxRatio =
      transactions.length > 0 ? smallTxCount / transactions.length : 0;
    if (smallTxRatio > 0.8 && smallTxCount >= 5) {
      anomalies.push({
        type: AnomalyType.HIGH_FREQUENCY_SMALL,
        severity: 'medium',
        description: '小额交易占比过高',
        value: `${(smallTxRatio * 100).toFixed(1)}%`,
        threshold: '80%',
      });
    }

    return anomalies;
  }

  /**
   * 计算风险分数
   */
  private calculateRiskScore(anomalies: PatternAnomaly[]): number {
    let score = 0;

    for (const anomaly of anomalies) {
      switch (anomaly.severity) {
        case 'high':
          score += 30;
          break;
        case 'medium':
          score += 20;
          break;
        case 'low':
          score += 10;
          break;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * 返回空的集中收币结果
   */
  private emptyConcentratedResult(userId: string): ConcentratedReceiptsResult {
    return {
      userId,
      isNewAccount: false,
      accountAgeDays: 0,
      totalReceived: 0,
      uniqueSenders: 0,
      transactionCount: 0,
      riskLevel: RiskLevel.LOW,
      isSuspicious: false,
      analyzedAt: new Date(),
    };
  }

  /**
   * 返回空的模式分析结果
   */
  private emptyPatternResult(userId: string): TransactionPatternResult {
    return {
      userId,
      pattern: {
        totalTransactions: 0,
        totalSent: 0,
        totalReceived: 0,
        avgTransactionAmount: 0,
        maxTransactionAmount: 0,
        minTransactionAmount: 0,
        activeHours: [],
        peakHour: 0,
        uniqueRecipients: 0,
        uniqueSenders: 0,
        transactionFrequency: 0,
      },
      anomalies: [],
      riskScore: 0,
      riskLevel: RiskLevel.LOW,
      analyzedAt: new Date(),
    };
  }
}

// 内部类型定义
interface TipRecordData {
  id: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  createdAt: Date;
}
