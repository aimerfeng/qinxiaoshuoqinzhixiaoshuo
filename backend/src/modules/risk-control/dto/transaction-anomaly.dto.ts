import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { RiskLevel } from './related-account.dto.js';

/**
 * 交易异常检测 DTO
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

/**
 * 异常类型枚举
 */
export enum AnomalyType {
  CIRCULAR_TRANSFER = 'CIRCULAR_TRANSFER', // 固定金额循环转账
  CONCENTRATED_RECEIPTS = 'CONCENTRATED_RECEIPTS', // 新账户集中收币
  HIGH_FREQUENCY_SMALL = 'HIGH_FREQUENCY_SMALL', // 短时间内大量小额交易
  UNUSUAL_HOURS = 'UNUSUAL_HOURS', // 异常时间段交易
  ONE_WAY_HIGH_FREQUENCY = 'ONE_WAY_HIGH_FREQUENCY', // 单向高频打赏
}

/**
 * 检测异常请求 DTO
 */
export class DetectAnomaliesDto {
  @IsString()
  userId!: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(90)
  daysToAnalyze?: number = 30; // 分析的天数范围
}

/**
 * 分析交易模式请求 DTO
 */
export class AnalyzePatternDto {
  @IsString()
  userId!: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(90)
  daysToAnalyze?: number = 30;
}

/**
 * 标记可疑交易请求 DTO
 */
export class FlagTransactionsDto {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(90)
  daysToAnalyze?: number = 7;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  minRiskScore?: number = 50;
}

/**
 * 单个异常检测结果
 */
export interface TransactionAnomaly {
  type: AnomalyType;
  riskLevel: RiskLevel;
  description: string;
  evidence: AnomalyEvidence;
  detectedAt: Date;
  affectedUserIds?: string[];
  affectedTransactionIds?: string[];
}

/**
 * 异常证据
 */
export interface AnomalyEvidence {
  count?: number; // 相关交易数量
  totalAmount?: number; // 涉及总金额
  timeRange?: { start: Date; end: Date }; // 时间范围
  pattern?: string; // 模式描述
  details?: Record<string, unknown>; // 其他详细信息
}

/**
 * 用户异常检测结果
 */
export interface UserAnomaliesResult {
  userId: string;
  anomalies: TransactionAnomaly[];
  totalAnomalies: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  overallRiskLevel: RiskLevel;
  analyzedAt: Date;
}

/**
 * 循环转账检测结果
 */
export interface CircularTransferResult {
  detected: boolean;
  cycles: CircularTransferCycle[];
  totalCycles: number;
  analyzedAt: Date;
}

/**
 * 循环转账环
 */
export interface CircularTransferCycle {
  cycleId: string;
  userIds: string[];
  amount: number; // 固定金额
  transactionCount: number;
  timeRange: { start: Date; end: Date };
  riskLevel: RiskLevel;
}

/**
 * 集中收币检测结果
 */
export interface ConcentratedReceiptsResult {
  userId: string;
  isNewAccount: boolean;
  accountAgeDays: number;
  totalReceived: number;
  uniqueSenders: number;
  transactionCount: number;
  riskLevel: RiskLevel;
  isSuspicious: boolean;
  analyzedAt: Date;
}

/**
 * 交易模式分析结果
 */
export interface TransactionPatternResult {
  userId: string;
  pattern: TransactionPattern;
  anomalies: PatternAnomaly[];
  riskScore: number; // 0-100
  riskLevel: RiskLevel;
  analyzedAt: Date;
}

/**
 * 交易模式
 */
export interface TransactionPattern {
  totalTransactions: number;
  totalSent: number;
  totalReceived: number;
  avgTransactionAmount: number;
  maxTransactionAmount: number;
  minTransactionAmount: number;
  activeHours: number[]; // 活跃时段 (0-23)
  peakHour: number; // 最活跃时段
  uniqueRecipients: number; // 唯一收款人数
  uniqueSenders: number; // 唯一付款人数
  transactionFrequency: number; // 每日平均交易次数
}

/**
 * 模式异常
 */
export interface PatternAnomaly {
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high';
  description: string;
  value: number | string;
  threshold: number | string;
}

/**
 * 可疑交易
 */
export interface SuspiciousTransaction {
  transactionId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  createdAt: Date;
  anomalyTypes: AnomalyType[];
  riskScore: number;
  riskLevel: RiskLevel;
  flaggedAt: Date;
}

/**
 * 可疑交易标记结果
 */
export interface FlaggedTransactionsResult {
  transactions: SuspiciousTransaction[];
  totalFlagged: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  analyzedAt: Date;
}

/**
 * 导出 RiskLevel 以便其他模块使用
 */
export { RiskLevel };
