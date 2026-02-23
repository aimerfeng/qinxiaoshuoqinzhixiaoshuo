import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * 关联账户检测 DTO
 *
 * 需求19: 风控与反作弊系统 - 关联账户检测
 *
 * 关联账户判定规则:
 * - 强关联 (95%): 同设备登录 + 互相转账
 * - 强关联 (90%): 同IP + 相似昵称 + 单向转账
 * - 中关联 (70%): 同IP + 高频互动
 * - 弱关联 (30%): 仅同IP或仅互相关注
 */

/**
 * 关联类型枚举
 */
export enum RelationType {
  SAME_DEVICE = 'SAME_DEVICE', // 同设备
  SAME_IP = 'SAME_IP', // 同IP
  MUTUAL_FOLLOW = 'MUTUAL_FOLLOW', // 互相关注
  MUTUAL_TIP = 'MUTUAL_TIP', // 互相打赏
  SIMILAR_REGISTRATION = 'SIMILAR_REGISTRATION', // 相似注册模式
  BEHAVIORAL_PATTERN = 'BEHAVIORAL_PATTERN', // 行为模式相似
}

/**
 * 关联强度等级
 */
export enum RelationStrength {
  STRONG = 'STRONG', // 强关联 (>=80%)
  MEDIUM = 'MEDIUM', // 中关联 (50-79%)
  WEAK = 'WEAK', // 弱关联 (<50%)
}

/**
 * 风险等级
 */
export enum RiskLevel {
  HIGH = 'HIGH', // 高风险
  MEDIUM = 'MEDIUM', // 中风险
  LOW = 'LOW', // 低风险
}

/**
 * 查询关联账户请求 DTO
 */
export class FindRelatedAccountsDto {
  @IsString()
  userId!: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  minScore?: number = 30; // 最低关联分数阈值
}

/**
 * 计算关联分数请求 DTO
 */
export class CalculateRelationScoreDto {
  @IsString()
  userIdA!: string;

  @IsString()
  userIdB!: string;
}

/**
 * 单个关联因素
 */
export interface RelationFactor {
  type: RelationType;
  weight: number; // 权重 0-100
  evidence: string; // 证据描述
  detectedAt?: Date;
}

/**
 * 关联账户信息
 */
export interface RelatedAccount {
  userId: string;
  username?: string;
  email?: string;
  relationScore: number; // 0-100
  relationStrength: RelationStrength;
  factors: RelationFactor[];
  riskLevel: RiskLevel;
  firstDetectedAt: Date;
  lastActivityAt?: Date;
}

/**
 * 关联账户检测结果
 */
export interface RelatedAccountsResult {
  targetUserId: string;
  relatedAccounts: RelatedAccount[];
  totalCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  analyzedAt: Date;
}

/**
 * 两账户关联分数计算结果
 */
export interface RelationScoreResult {
  userIdA: string;
  userIdB: string;
  totalScore: number; // 0-100
  strength: RelationStrength;
  riskLevel: RiskLevel;
  factors: RelationFactor[];
  isSuspicious: boolean;
  analyzedAt: Date;
}

/**
 * 可疑账户集群
 */
export interface SuspiciousCluster {
  clusterId: string;
  userIds: string[];
  clusterSize: number;
  avgRelationScore: number;
  riskLevel: RiskLevel;
  primaryFactors: RelationType[];
  detectedAt: Date;
}

/**
 * 可疑集群检测结果
 */
export interface SuspiciousClustersResult {
  clusters: SuspiciousCluster[];
  totalClusters: number;
  totalSuspiciousUsers: number;
  analyzedAt: Date;
}
