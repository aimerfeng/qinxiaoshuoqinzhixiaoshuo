import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { RiskDeviceFingerprintService } from './device-fingerprint.service.js';
import {
  RelationType,
  RelationStrength,
  RiskLevel,
  type RelationFactor,
  type RelatedAccount,
  type RelatedAccountsResult,
  type RelationScoreResult,
  type SuspiciousCluster,
  type SuspiciousClustersResult,
} from './dto/related-account.dto.js';

/**
 * 关联账户检测服务
 *
 * 需求19: 风控与反作弊系统 - 关联账户检测
 *
 * 检测维度:
 * - 设备关联: 同设备/IP多账户 (中风险)
 * - 行为相似: 登录时间、操作习惯相似 (中风险)
 * - 社交关联: 单向高频互动、互相关注后立即转账 (高风险)
 * - 内容相似: 评论文本高度相似 (中风险)
 * - 交易异常: 固定金额循环转账、新账户集中收币 (高风险)
 *
 * 关联账户判定规则:
 * - 强关联 (95%): 同设备登录 + 互相转账
 * - 强关联 (90%): 同IP + 相似昵称 + 单向转账
 * - 中关联 (70%): 同IP + 高频互动
 * - 弱关联 (30%): 仅同IP或仅互相关注
 */
@Injectable()
export class RelatedAccountService {
  private readonly logger = new Logger(RelatedAccountService.name);

  // 关联因素权重配置
  private readonly FACTOR_WEIGHTS = {
    [RelationType.SAME_DEVICE]: 40, // 同设备权重最高
    [RelationType.SAME_IP]: 25, // 同IP权重
    [RelationType.MUTUAL_TIP]: 30, // 互相打赏权重高
    [RelationType.MUTUAL_FOLLOW]: 15, // 互相关注权重
    [RelationType.SIMILAR_REGISTRATION]: 20, // 相似注册模式
    [RelationType.BEHAVIORAL_PATTERN]: 15, // 行为模式相似
  };

  // 缓存配置
  private readonly CACHE_TTL = 300; // 5分钟缓存
  private readonly CACHE_PREFIX = 'risk:related:';

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly deviceFingerprintService: RiskDeviceFingerprintService,
  ) {}

  /**
   * 查找指定用户的关联账户
   *
   * 综合多个维度检测可能的关联账户:
   * 1. 同设备指纹
   * 2. 同IP地址
   * 3. 互相关注关系
   * 4. 互相打赏记录
   * 5. 相似注册模式
   */
  async findRelatedAccounts(
    userId: string,
    options: { limit?: number; minScore?: number } = {},
  ): Promise<RelatedAccountsResult> {
    const { limit = 20, minScore = 30 } = options;

    // 尝试从缓存获取
    const cacheKey = `${this.CACHE_PREFIX}user:${userId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as RelatedAccountsResult;
      } catch {
        // 缓存解析失败，继续计算
      }
    }

    this.logger.debug(`Finding related accounts for user ${userId}`);

    // 收集所有可能的关联用户
    const relatedUserMap = new Map<string, RelationFactor[]>();

    // 1. 检测同设备关联
    await this.detectSameDeviceRelations(userId, relatedUserMap);

    // 2. 检测同IP关联
    await this.detectSameIpRelations(userId, relatedUserMap);

    // 3. 检测互相关注关系
    await this.detectMutualFollowRelations(userId, relatedUserMap);

    // 4. 检测互相打赏关系
    await this.detectMutualTipRelations(userId, relatedUserMap);

    // 5. 检测相似注册模式
    await this.detectSimilarRegistrationPatterns(userId, relatedUserMap);

    // 计算每个关联用户的分数
    const relatedAccounts: RelatedAccount[] = [];

    for (const [relatedUserId, factors] of relatedUserMap.entries()) {
      if (relatedUserId === userId) continue; // 排除自己

      const totalScore = this.calculateTotalScore(factors);
      if (totalScore < minScore) continue; // 过滤低分关联

      const strength = this.getRelationStrength(totalScore);
      const riskLevel = this.getRiskLevel(totalScore, factors);

      // 获取用户基本信息
      const userInfo = await this.getUserBasicInfo(relatedUserId);

      relatedAccounts.push({
        userId: relatedUserId,
        username: userInfo?.username,
        email: userInfo?.email,
        relationScore: totalScore,
        relationStrength: strength,
        factors,
        riskLevel,
        firstDetectedAt: this.getEarliestDetectionDate(factors),
        lastActivityAt: userInfo?.lastLoginAt ?? undefined,
      });
    }

    // 按分数降序排序并限制数量
    relatedAccounts.sort((a, b) => b.relationScore - a.relationScore);
    const limitedAccounts = relatedAccounts.slice(0, limit);

    const result: RelatedAccountsResult = {
      targetUserId: userId,
      relatedAccounts: limitedAccounts,
      totalCount: relatedAccounts.length,
      highRiskCount: relatedAccounts.filter((a) => a.riskLevel === RiskLevel.HIGH).length,
      mediumRiskCount: relatedAccounts.filter((a) => a.riskLevel === RiskLevel.MEDIUM).length,
      lowRiskCount: relatedAccounts.filter((a) => a.riskLevel === RiskLevel.LOW).length,
      analyzedAt: new Date(),
    };

    // 缓存结果
    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);

    return result;
  }


  /**
   * 计算两个账户之间的关联分数
   */
  async calculateRelationScore(
    userIdA: string,
    userIdB: string,
  ): Promise<RelationScoreResult> {
    this.logger.debug(`Calculating relation score between ${userIdA} and ${userIdB}`);

    const factors: RelationFactor[] = [];

    // 1. 检查同设备
    const sameDevice = await this.checkSameDevice(userIdA, userIdB);
    if (sameDevice) {
      factors.push(sameDevice);
    }

    // 2. 检查同IP
    const sameIp = await this.checkSameIp(userIdA, userIdB);
    if (sameIp) {
      factors.push(sameIp);
    }

    // 3. 检查互相关注
    const mutualFollow = await this.checkMutualFollow(userIdA, userIdB);
    if (mutualFollow) {
      factors.push(mutualFollow);
    }

    // 4. 检查互相打赏
    const mutualTip = await this.checkMutualTip(userIdA, userIdB);
    if (mutualTip) {
      factors.push(mutualTip);
    }

    // 5. 检查相似注册模式
    const similarReg = await this.checkSimilarRegistration(userIdA, userIdB);
    if (similarReg) {
      factors.push(similarReg);
    }

    const totalScore = this.calculateTotalScore(factors);
    const strength = this.getRelationStrength(totalScore);
    const riskLevel = this.getRiskLevel(totalScore, factors);

    return {
      userIdA,
      userIdB,
      totalScore,
      strength,
      riskLevel,
      factors,
      isSuspicious: totalScore >= 70 || riskLevel === RiskLevel.HIGH,
      analyzedAt: new Date(),
    };
  }

  /**
   * 检测可疑账户集群
   *
   * 使用并查集算法将高度关联的账户分组
   */
  async flagSuspiciousClusters(
    options: { minClusterSize?: number; minAvgScore?: number } = {},
  ): Promise<SuspiciousClustersResult> {
    const { minClusterSize = 3, minAvgScore = 60 } = options;

    this.logger.log('Starting suspicious cluster detection');

    // 获取所有有设备指纹记录的用户
    const deviceRecords = await this.getAllDeviceRecords();

    // 构建用户关联图
    const userGraph = new Map<string, Set<string>>();
    const edgeScores = new Map<string, number>();

    // 按设备指纹分组
    const fingerprintGroups = new Map<string, string[]>();
    for (const record of deviceRecords) {
      const fp = record.fingerprint;
      if (!fingerprintGroups.has(fp)) {
        fingerprintGroups.set(fp, []);
      }
      fingerprintGroups.get(fp)!.push(record.userId);
    }

    // 按IP分组
    const ipGroups = new Map<string, string[]>();
    for (const record of deviceRecords) {
      if (record.ipAddress) {
        if (!ipGroups.has(record.ipAddress)) {
          ipGroups.set(record.ipAddress, []);
        }
        const users = ipGroups.get(record.ipAddress)!;
        if (!users.includes(record.userId)) {
          users.push(record.userId);
        }
      }
    }

    // 构建边（同设备）
    for (const [, users] of fingerprintGroups) {
      if (users.length > 1) {
        for (let i = 0; i < users.length; i++) {
          for (let j = i + 1; j < users.length; j++) {
            this.addEdge(userGraph, users[i], users[j]);
            const edgeKey = this.getEdgeKey(users[i], users[j]);
            edgeScores.set(edgeKey, (edgeScores.get(edgeKey) ?? 0) + 40);
          }
        }
      }
    }

    // 构建边（同IP）
    for (const [, users] of ipGroups) {
      if (users.length > 1) {
        for (let i = 0; i < users.length; i++) {
          for (let j = i + 1; j < users.length; j++) {
            this.addEdge(userGraph, users[i], users[j]);
            const edgeKey = this.getEdgeKey(users[i], users[j]);
            edgeScores.set(edgeKey, (edgeScores.get(edgeKey) ?? 0) + 25);
          }
        }
      }
    }

    // 使用并查集找连通分量
    const clusters = this.findConnectedComponents(userGraph);

    // 过滤和评估集群
    const suspiciousClusters: SuspiciousCluster[] = [];

    for (const userIds of clusters) {
      if (userIds.length < minClusterSize) continue;

      // 计算集群平均关联分数
      let totalScore = 0;
      let edgeCount = 0;
      const factorTypes = new Set<RelationType>();

      for (let i = 0; i < userIds.length; i++) {
        for (let j = i + 1; j < userIds.length; j++) {
          const edgeKey = this.getEdgeKey(userIds[i], userIds[j]);
          const score = edgeScores.get(edgeKey) ?? 0;
          if (score > 0) {
            totalScore += score;
            edgeCount++;
            if (score >= 40) factorTypes.add(RelationType.SAME_DEVICE);
            if (score >= 25 && score < 40) factorTypes.add(RelationType.SAME_IP);
          }
        }
      }

      const avgScore = edgeCount > 0 ? totalScore / edgeCount : 0;
      if (avgScore < minAvgScore) continue;

      const riskLevel = avgScore >= 80 ? RiskLevel.HIGH : avgScore >= 50 ? RiskLevel.MEDIUM : RiskLevel.LOW;

      suspiciousClusters.push({
        clusterId: `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userIds,
        clusterSize: userIds.length,
        avgRelationScore: Math.round(avgScore),
        riskLevel,
        primaryFactors: Array.from(factorTypes),
        detectedAt: new Date(),
      });
    }

    // 按风险等级和大小排序
    suspiciousClusters.sort((a, b) => {
      const riskOrder = { [RiskLevel.HIGH]: 0, [RiskLevel.MEDIUM]: 1, [RiskLevel.LOW]: 2 };
      if (riskOrder[a.riskLevel] !== riskOrder[b.riskLevel]) {
        return riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
      }
      return b.clusterSize - a.clusterSize;
    });

    const totalSuspiciousUsers = new Set(suspiciousClusters.flatMap((c) => c.userIds)).size;

    return {
      clusters: suspiciousClusters,
      totalClusters: suspiciousClusters.length,
      totalSuspiciousUsers,
      analyzedAt: new Date(),
    };
  }

  // ==================== 私有方法：检测各类关联 ====================

  /**
   * 检测同设备关联
   */
  private async detectSameDeviceRelations(
    userId: string,
    relatedUserMap: Map<string, RelationFactor[]>,
  ): Promise<void> {
    try {
      // 获取用户的所有设备指纹
      const userDevices = await this.deviceFingerprintService.getUserDeviceHistory(userId);

      for (const device of userDevices.devices) {
        // 查找使用相同指纹的其他用户
        const sameDeviceUsers = await this.deviceFingerprintService.getUsersByFingerprint(
          device.fingerprint,
        );

        for (const record of sameDeviceUsers) {
          if (record.userId === userId) continue;

          const factor: RelationFactor = {
            type: RelationType.SAME_DEVICE,
            weight: this.FACTOR_WEIGHTS[RelationType.SAME_DEVICE],
            evidence: `共享设备指纹: ${device.fingerprint.substring(0, 8)}...`,
            detectedAt: record.lastSeenAt,
          };

          this.addFactorToMap(relatedUserMap, record.userId, factor);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to detect same device relations: ${error}`);
    }
  }

  /**
   * 检测同IP关联
   */
  private async detectSameIpRelations(
    userId: string,
    relatedUserMap: Map<string, RelationFactor[]>,
  ): Promise<void> {
    try {
      // 获取用户的所有IP地址
      const userDevices = await this.deviceFingerprintService.getUserDeviceHistory(userId);
      const userIps = new Set(
        userDevices.devices.filter((d) => d.ipAddress).map((d) => d.ipAddress!),
      );

      for (const ip of userIps) {
        const detection = await this.deviceFingerprintService.detectMultiAccountByIp(ip);
        if (detection && detection.userIds.length > 1) {
          for (const relatedUserId of detection.userIds) {
            if (relatedUserId === userId) continue;

            const factor: RelationFactor = {
              type: RelationType.SAME_IP,
              weight: this.FACTOR_WEIGHTS[RelationType.SAME_IP],
              evidence: `共享IP地址: ${this.maskIp(ip)}`,
              detectedAt: new Date(),
            };

            this.addFactorToMap(relatedUserMap, relatedUserId, factor);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Failed to detect same IP relations: ${error}`);
    }
  }


  /**
   * 检测互相关注关系
   */
  private async detectMutualFollowRelations(
    userId: string,
    relatedUserMap: Map<string, RelationFactor[]>,
  ): Promise<void> {
    try {
      // 查找互相关注的用户
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mutualFollows = await (this.prisma as any).$queryRaw`
        SELECT f1.following_id as user_id
        FROM follows f1
        INNER JOIN follows f2 ON f1.follower_id = f2.following_id AND f1.following_id = f2.follower_id
        WHERE f1.follower_id = ${userId}
      `;

      for (const record of mutualFollows as { user_id: string }[]) {
        const factor: RelationFactor = {
          type: RelationType.MUTUAL_FOLLOW,
          weight: this.FACTOR_WEIGHTS[RelationType.MUTUAL_FOLLOW],
          evidence: '互相关注',
          detectedAt: new Date(),
        };

        this.addFactorToMap(relatedUserMap, record.user_id, factor);
      }
    } catch (error) {
      this.logger.error(`Failed to detect mutual follow relations: ${error}`);
    }
  }

  /**
   * 检测互相打赏关系
   */
  private async detectMutualTipRelations(
    userId: string,
    relatedUserMap: Map<string, RelationFactor[]>,
  ): Promise<void> {
    try {
      // 查找互相打赏的用户
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const mutualTips = await (this.prisma as any).$queryRaw`
        SELECT t1.to_user_id as user_id, 
               COUNT(*) as tip_count,
               SUM(t1.amount) as total_amount
        FROM tip_records t1
        INNER JOIN tip_records t2 ON t1.from_user_id = t2.to_user_id AND t1.to_user_id = t2.from_user_id
        WHERE t1.from_user_id = ${userId}
        GROUP BY t1.to_user_id
      `;

      for (const record of mutualTips as { user_id: string; tip_count: bigint; total_amount: bigint }[]) {
        const tipCount = Number(record.tip_count);
        const totalAmount = Number(record.total_amount);

        // 根据打赏频率和金额调整权重
        let adjustedWeight = this.FACTOR_WEIGHTS[RelationType.MUTUAL_TIP];
        if (tipCount >= 5) adjustedWeight += 10; // 高频打赏加权
        if (totalAmount >= 100) adjustedWeight += 10; // 大额打赏加权

        const factor: RelationFactor = {
          type: RelationType.MUTUAL_TIP,
          weight: Math.min(adjustedWeight, 50), // 最高50分
          evidence: `互相打赏 ${tipCount} 次，总计 ${totalAmount} 零芥子`,
          detectedAt: new Date(),
        };

        this.addFactorToMap(relatedUserMap, record.user_id, factor);
      }
    } catch (error) {
      this.logger.error(`Failed to detect mutual tip relations: ${error}`);
    }
  }

  /**
   * 检测相似注册模式
   */
  private async detectSimilarRegistrationPatterns(
    userId: string,
    relatedUserMap: Map<string, RelationFactor[]>,
  ): Promise<void> {
    try {
      // 获取目标用户信息
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const targetUser = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          createdAt: true,
        },
      });

      if (!targetUser) return;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const targetEmail = targetUser.email as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const targetCreatedAt = targetUser.createdAt as Date;
      const emailDomain = targetEmail.split('@')[1];

      // 查找相似注册模式的用户:
      // 1. 同一邮箱域名
      // 2. 注册时间相近（1小时内）
      const timeWindowStart = new Date(targetCreatedAt.getTime() - 60 * 60 * 1000);
      const timeWindowEnd = new Date(targetCreatedAt.getTime() + 60 * 60 * 1000);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const similarUsers = await (this.prisma as any).user.findMany({
        where: {
          id: { not: userId },
          OR: [
            { email: { endsWith: `@${emailDomain}` } },
            {
              createdAt: {
                gte: timeWindowStart,
                lte: timeWindowEnd,
              },
            },
          ],
        },
        select: {
          id: true,
          email: true,
          createdAt: true,
        },
      });

      for (const user of similarUsers as { id: string; email: string; createdAt: Date }[]) {
        const factors: string[] = [];
        let weight = 0;

        // 检查邮箱域名
        if (user.email.endsWith(`@${emailDomain}`)) {
          factors.push(`同邮箱域名: ${emailDomain}`);
          weight += 10;
        }

        // 检查注册时间
        const timeDiff = Math.abs(user.createdAt.getTime() - targetCreatedAt.getTime());
        if (timeDiff <= 60 * 60 * 1000) {
          // 1小时内
          factors.push(`注册时间相近: ${Math.round(timeDiff / 60000)} 分钟内`);
          weight += 10;
        }

        if (weight > 0) {
          const factor: RelationFactor = {
            type: RelationType.SIMILAR_REGISTRATION,
            weight: Math.min(weight, this.FACTOR_WEIGHTS[RelationType.SIMILAR_REGISTRATION]),
            evidence: factors.join('; '),
            detectedAt: new Date(),
          };

          this.addFactorToMap(relatedUserMap, user.id, factor);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to detect similar registration patterns: ${error}`);
    }
  }

  // ==================== 私有方法：单对检查 ====================

  private async checkSameDevice(userIdA: string, userIdB: string): Promise<RelationFactor | null> {
    try {
      const devicesA = await this.deviceFingerprintService.getUserDeviceHistory(userIdA);
      const devicesB = await this.deviceFingerprintService.getUserDeviceHistory(userIdB);

      const fingerprintsA = new Set(devicesA.devices.map((d) => d.fingerprint));
      const fingerprintsB = new Set(devicesB.devices.map((d) => d.fingerprint));

      const sharedFingerprints = [...fingerprintsA].filter((fp) => fingerprintsB.has(fp));

      if (sharedFingerprints.length > 0) {
        return {
          type: RelationType.SAME_DEVICE,
          weight: this.FACTOR_WEIGHTS[RelationType.SAME_DEVICE],
          evidence: `共享 ${sharedFingerprints.length} 个设备指纹`,
          detectedAt: new Date(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to check same device: ${error}`);
    }
    return null;
  }

  private async checkSameIp(userIdA: string, userIdB: string): Promise<RelationFactor | null> {
    try {
      const devicesA = await this.deviceFingerprintService.getUserDeviceHistory(userIdA);
      const devicesB = await this.deviceFingerprintService.getUserDeviceHistory(userIdB);

      const ipsA = new Set(devicesA.devices.filter((d) => d.ipAddress).map((d) => d.ipAddress!));
      const ipsB = new Set(devicesB.devices.filter((d) => d.ipAddress).map((d) => d.ipAddress!));

      const sharedIps = [...ipsA].filter((ip) => ipsB.has(ip));

      if (sharedIps.length > 0) {
        return {
          type: RelationType.SAME_IP,
          weight: this.FACTOR_WEIGHTS[RelationType.SAME_IP],
          evidence: `共享 ${sharedIps.length} 个IP地址`,
          detectedAt: new Date(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to check same IP: ${error}`);
    }
    return null;
  }


  private async checkMutualFollow(userIdA: string, userIdB: string): Promise<RelationFactor | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const followAtoB = await (this.prisma as any).follow.findUnique({
        where: {
          followerId_followingId: { followerId: userIdA, followingId: userIdB },
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const followBtoA = await (this.prisma as any).follow.findUnique({
        where: {
          followerId_followingId: { followerId: userIdB, followingId: userIdA },
        },
      });

      if (followAtoB && followBtoA) {
        return {
          type: RelationType.MUTUAL_FOLLOW,
          weight: this.FACTOR_WEIGHTS[RelationType.MUTUAL_FOLLOW],
          evidence: '互相关注',
          detectedAt: new Date(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to check mutual follow: ${error}`);
    }
    return null;
  }

  private async checkMutualTip(userIdA: string, userIdB: string): Promise<RelationFactor | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tipsAtoB = await (this.prisma as any).tipRecord.findMany({
        where: { fromUserId: userIdA, toUserId: userIdB },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const tipsBtoA = await (this.prisma as any).tipRecord.findMany({
        where: { fromUserId: userIdB, toUserId: userIdA },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (tipsAtoB.length > 0 && tipsBtoA.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const totalTips = tipsAtoB.length + tipsBtoA.length;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
        const totalAmount = [...tipsAtoB, ...tipsBtoA].reduce((sum: number, t: any) => sum + t.amount, 0);

        let adjustedWeight = this.FACTOR_WEIGHTS[RelationType.MUTUAL_TIP];
        if (totalTips >= 5) adjustedWeight += 10;
        if (totalAmount >= 100) adjustedWeight += 10;

        return {
          type: RelationType.MUTUAL_TIP,
          weight: Math.min(adjustedWeight, 50),
          evidence: `互相打赏 ${totalTips} 次，总计 ${totalAmount} 零芥子`,
          detectedAt: new Date(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to check mutual tip: ${error}`);
    }
    return null;
  }

  private async checkSimilarRegistration(
    userIdA: string,
    userIdB: string,
  ): Promise<RelationFactor | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const userA = await (this.prisma as any).user.findUnique({
        where: { id: userIdA },
        select: { email: true, createdAt: true },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const userB = await (this.prisma as any).user.findUnique({
        where: { id: userIdB },
        select: { email: true, createdAt: true },
      });

      if (!userA || !userB) return null;

      const factors: string[] = [];
      let weight = 0;

      // 检查邮箱域名
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const domainA = (userA.email as string).split('@')[1];
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const domainB = (userB.email as string).split('@')[1];
      if (domainA === domainB) {
        factors.push(`同邮箱域名: ${domainA}`);
        weight += 10;
      }

      // 检查注册时间
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const timeDiff = Math.abs((userA.createdAt as Date).getTime() - (userB.createdAt as Date).getTime());
      if (timeDiff <= 60 * 60 * 1000) {
        factors.push(`注册时间相近: ${Math.round(timeDiff / 60000)} 分钟内`);
        weight += 10;
      }

      if (weight > 0) {
        return {
          type: RelationType.SIMILAR_REGISTRATION,
          weight: Math.min(weight, this.FACTOR_WEIGHTS[RelationType.SIMILAR_REGISTRATION]),
          evidence: factors.join('; '),
          detectedAt: new Date(),
        };
      }
    } catch (error) {
      this.logger.error(`Failed to check similar registration: ${error}`);
    }
    return null;
  }

  // ==================== 私有方法：辅助函数 ====================

  private addFactorToMap(
    map: Map<string, RelationFactor[]>,
    userId: string,
    factor: RelationFactor,
  ): void {
    if (!map.has(userId)) {
      map.set(userId, []);
    }
    // 避免重复添加相同类型的因素
    const existing = map.get(userId)!;
    if (!existing.some((f) => f.type === factor.type)) {
      existing.push(factor);
    }
  }

  private calculateTotalScore(factors: RelationFactor[]): number {
    // 使用加权求和，但限制最高100分
    const total = factors.reduce((sum, f) => sum + f.weight, 0);
    return Math.min(total, 100);
  }

  private getRelationStrength(score: number): RelationStrength {
    if (score >= 80) return RelationStrength.STRONG;
    if (score >= 50) return RelationStrength.MEDIUM;
    return RelationStrength.WEAK;
  }

  private getRiskLevel(score: number, factors: RelationFactor[]): RiskLevel {
    // 高风险条件：
    // 1. 分数>=80
    // 2. 同时存在同设备+互相打赏
    // 3. 同时存在同IP+互相打赏
    const hasSameDevice = factors.some((f) => f.type === RelationType.SAME_DEVICE);
    const hasSameIp = factors.some((f) => f.type === RelationType.SAME_IP);
    const hasMutualTip = factors.some((f) => f.type === RelationType.MUTUAL_TIP);

    if (score >= 80) return RiskLevel.HIGH;
    if ((hasSameDevice || hasSameIp) && hasMutualTip) return RiskLevel.HIGH;
    if (score >= 50) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private getEarliestDetectionDate(factors: RelationFactor[]): Date {
    const dates = factors.filter((f) => f.detectedAt).map((f) => f.detectedAt!);
    if (dates.length === 0) return new Date();
    return new Date(Math.min(...dates.map((d) => d.getTime())));
  }

  private async getUserBasicInfo(
    userId: string,
  ): Promise<{ username: string; email: string; lastLoginAt: Date | null } | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const user = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: {
          username: true,
          email: true,
          lastLoginAt: true,
        },
      });
      return user as { username: string; email: string; lastLoginAt: Date | null } | null;
    } catch {
      return null;
    }
  }

  private maskIp(ip: string): string {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    return ip.substring(0, ip.length / 2) + '***';
  }

  private async getAllDeviceRecords(): Promise<
    { userId: string; fingerprint: string; ipAddress: string | null }[]
  > {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const records = await (this.prisma as any).deviceFingerprint.findMany({
        select: {
          userId: true,
          fingerprint: true,
          ipAddress: true,
        },
      });
      return records as { userId: string; fingerprint: string; ipAddress: string | null }[];
    } catch {
      return [];
    }
  }

  private addEdge(graph: Map<string, Set<string>>, nodeA: string, nodeB: string): void {
    if (!graph.has(nodeA)) graph.set(nodeA, new Set());
    if (!graph.has(nodeB)) graph.set(nodeB, new Set());
    graph.get(nodeA)!.add(nodeB);
    graph.get(nodeB)!.add(nodeA);
  }

  private getEdgeKey(nodeA: string, nodeB: string): string {
    return [nodeA, nodeB].sort().join(':');
  }

  private findConnectedComponents(graph: Map<string, Set<string>>): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];

    for (const node of graph.keys()) {
      if (visited.has(node)) continue;

      const component: string[] = [];
      const queue = [node];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;

        visited.add(current);
        component.push(current);

        const neighbors = graph.get(current) ?? new Set();
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }

      if (component.length > 0) {
        components.push(component);
      }
    }

    return components;
  }
}
