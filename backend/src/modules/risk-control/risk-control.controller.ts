import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { RiskDeviceFingerprintService } from './device-fingerprint.service.js';
import { RelatedAccountService } from './related-account.service.js';
import { TransactionAnomalyService } from './transaction-anomaly.service.js';
import { RateLimitService } from './rate-limit.service.js';
import { RiskAlertService } from './risk-alert.service.js';
import { PunishmentService } from './punishment.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RecordFingerprintDto } from './dto/device-fingerprint.dto.js';
import type {
  DeviceRecordResponse,
  UserDeviceHistoryResponse,
  MultiAccountDetection,
} from './dto/device-fingerprint.dto.js';
import type {
  RelatedAccountsResult,
  RelationScoreResult,
  SuspiciousClustersResult,
} from './dto/related-account.dto.js';
import { RelationStrength, RiskLevel } from './dto/related-account.dto.js';
import type {
  UserAnomaliesResult,
  CircularTransferResult,
  ConcentratedReceiptsResult,
  TransactionPatternResult,
  FlaggedTransactionsResult,
} from './dto/transaction-anomaly.dto.js';
import {
  CheckRateLimitDto,
  RateLimitAction,
  type RateLimitCheckResult,
  type RateLimitStatusResponse,
} from './dto/rate-limit.dto.js';
import {
  CreateAlertDto,
  UpdateAlertStatusDto,
  AssignAlertDto,
  AddAlertNoteDto,
  AlertFiltersDto,
  AlertType,
  AlertSeverity,
  AlertStatus,
  type RiskAlertResponse,
  type AlertListResponse,
  type AlertStats,
} from './dto/risk-alert.dto.js';
import {
  CreatePunishmentDto,
  RevokePunishmentDto,
  ExecutePunishmentFromAlertDto,
  PunishmentFiltersDto,
  PunishmentType,
  PunishmentStatus,
  type PunishmentResponse,
  type PunishmentListResponse,
  type PunishmentCheckResult,
  type UserPunishmentStatus,
  type PunishmentHistoryStats,
} from './dto/punishment.dto.js';

/**
 * 风控控制器
 *
 * 需求19: 风控与反作弊系统
 *
 * API 端点：
 * - POST /api/v1/risk-control/fingerprint - 记录设备指纹（auth flow 调用）
 * - GET /api/v1/risk-control/devices/:userId - 获取用户设备历史（管理员）
 * - GET /api/v1/risk-control/multi-account/fingerprint/:fingerprint - 检测同设备多账户
 * - GET /api/v1/risk-control/multi-account/ip/:ipAddress - 检测同IP多账户
 * - GET /api/v1/risk-control/related-accounts/:userId - 获取关联账户列表
 * - GET /api/v1/risk-control/relation-score - 计算两账户关联分数
 * - GET /api/v1/risk-control/suspicious-clusters - 检测可疑账户集群
 * - GET /api/v1/risk-control/transaction-anomalies/:userId - 检测用户交易异常
 * - GET /api/v1/risk-control/circular-transfers - 检测循环转账
 * - GET /api/v1/risk-control/concentrated-receipts/:userId - 检测集中收币
 * - GET /api/v1/risk-control/transaction-pattern/:userId - 分析交易模式
 * - GET /api/v1/risk-control/suspicious-transactions - 标记可疑交易
 * - POST /api/v1/risk-control/rate-limit/check - 检查频率限制
 * - GET /api/v1/risk-control/rate-limit/status/:key - 获取频率限制状态
 * - DELETE /api/v1/risk-control/rate-limit/:key - 重置频率限制
 * - POST /api/v1/risk-control/rate-limit/block/:key - 封禁指定key
 * - DELETE /api/v1/risk-control/rate-limit/block/:key - 解除封禁
 * - POST /api/v1/risk-control/alerts - 创建告警
 * - GET /api/v1/risk-control/alerts - 获取告警列表
 * - GET /api/v1/risk-control/alerts/stats - 获取告警统计
 * - GET /api/v1/risk-control/alerts/:id - 获取告警详情
 * - PATCH /api/v1/risk-control/alerts/:id/status - 更新告警状态
 * - PATCH /api/v1/risk-control/alerts/:id/assign - 分配告警
 * - POST /api/v1/risk-control/alerts/:id/notes - 添加告警备注
 * - POST /api/v1/risk-control/punishments - 创建惩罚
 * - GET /api/v1/risk-control/punishments/user/:userId - 获取用户惩罚列表
 * - GET /api/v1/risk-control/punishments/user/:userId/active - 获取用户活跃惩罚
 * - GET /api/v1/risk-control/punishments/user/:userId/status - 获取用户惩罚状态
 * - GET /api/v1/risk-control/punishments/user/:userId/history - 获取用户惩罚历史
 * - GET /api/v1/risk-control/punishments/user/:userId/stats - 获取用户惩罚统计
 * - GET /api/v1/risk-control/punishments/:id - 获取惩罚详情
 * - POST /api/v1/risk-control/punishments/:id/revoke - 撤销惩罚
 * - GET /api/v1/risk-control/punishments/check/:userId/:type - 检查用户是否有特定惩罚
 * - GET /api/v1/risk-control/punishments/muted/:userId - 检查用户是否被禁言
 * - GET /api/v1/risk-control/punishments/banned/:userId - 检查用户是否被封禁
 * - POST /api/v1/risk-control/punishments/execute-from-alert - 从告警执行惩罚
 */
@Controller('risk-control')
export class RiskControlController {
  constructor(
    private readonly deviceFingerprintService: RiskDeviceFingerprintService,
    private readonly relatedAccountService: RelatedAccountService,
    private readonly transactionAnomalyService: TransactionAnomalyService,
    private readonly rateLimitService: RateLimitService,
    private readonly riskAlertService: RiskAlertService,
    private readonly punishmentService: PunishmentService,
  ) {}

  /**
   * 记录设备指纹
   * POST /api/v1/risk-control/fingerprint
   *
   * 需求19验收标准1: WHEN 用户注册 THEN System SHALL 采集设备指纹并建立用户画像
   * 需求19验收标准2: WHEN 用户登录 THEN System SHALL 更新设备和IP记录
   *
   * 由认证流程调用，记录用户的设备指纹和IP信息。
   */
  @Post('fingerprint')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async recordFingerprint(@Body() dto: RecordFingerprintDto): Promise<{
    message: string;
    data: { isNewDevice: boolean; record: DeviceRecordResponse };
  }> {
    const result = await this.deviceFingerprintService.recordFingerprint({
      userId: dto.userId,
      fingerprint: dto.fingerprint,
      userAgent: dto.userAgent,
      ipAddress: dto.ipAddress,
      deviceInfo: dto.deviceInfo,
    });

    return {
      message: result.isNewDevice ? '新设备已记录' : '设备信息已更新',
      data: result,
    };
  }

  /**
   * 获取用户设备历史
   * GET /api/v1/risk-control/devices/:userId
   *
   * 管理员接口，查看指定用户的所有设备记录。
   */
  @Get('devices/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserDeviceHistory(
    @Param('userId') userId: string,
  ): Promise<{ message: string; data: UserDeviceHistoryResponse }> {
    const history =
      await this.deviceFingerprintService.getUserDeviceHistory(userId);

    return {
      message: '获取设备历史成功',
      data: history,
    };
  }

  /**
   * 检测同设备多账户
   * GET /api/v1/risk-control/multi-account/fingerprint/:fingerprint
   *
   * 风控检测维度: 设备关联 - 同设备多账户 (中风险)
   */
  @Get('multi-account/fingerprint/:fingerprint')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async detectMultiAccountByFingerprint(
    @Param('fingerprint') fingerprint: string,
  ): Promise<{ message: string; data: MultiAccountDetection | null }> {
    const detection =
      await this.deviceFingerprintService.detectMultiAccountByFingerprint(
        fingerprint,
      );

    return {
      message: detection ? '检测到多账户关联' : '未检测到多账户关联',
      data: detection,
    };
  }

  /**
   * 检测同IP多账户
   * GET /api/v1/risk-control/multi-account/ip/:ipAddress
   *
   * 风控检测维度: 设备关联 - 同IP多账户 (中风险)
   */
  @Get('multi-account/ip/:ipAddress')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async detectMultiAccountByIp(
    @Param('ipAddress') ipAddress: string,
  ): Promise<{ message: string; data: MultiAccountDetection | null }> {
    const detection =
      await this.deviceFingerprintService.detectMultiAccountByIp(ipAddress);

    return {
      message: detection ? '检测到多账户关联' : '未检测到多账户关联',
      data: detection,
    };
  }

  // ==================== 关联账户检测 API ====================

  /**
   * 获取用户的关联账户列表
   * GET /api/v1/risk-control/related-accounts/:userId
   *
   * 需求19: 风控与反作弊系统 - 关联账户检测
   *
   * 综合多个维度检测可能的关联账户:
   * - 同设备指纹
   * - 同IP地址
   * - 互相关注关系
   * - 互相打赏记录
   * - 相似注册模式
   */
  @Get('related-accounts/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getRelatedAccounts(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('minScore') minScore?: string,
  ): Promise<{ message: string; data: RelatedAccountsResult }> {
    const result = await this.relatedAccountService.findRelatedAccounts(
      userId,
      {
        limit: limit ? parseInt(limit, 10) : 20,
        minScore: minScore ? parseInt(minScore, 10) : 30,
      },
    );

    return {
      message: `找到 ${result.totalCount} 个关联账户`,
      data: result,
    };
  }

  /**
   * 计算两个账户之间的关联分数
   * GET /api/v1/risk-control/relation-score
   *
   * 需求19: 风控与反作弊系统 - 关联账户检测
   *
   * 关联账户判定规则:
   * - 强关联 (95%): 同设备登录 + 互相转账
   * - 强关联 (90%): 同IP + 相似昵称 + 单向转账
   * - 中关联 (70%): 同IP + 高频互动
   * - 弱关联 (30%): 仅同IP或仅互相关注
   */
  @Get('relation-score')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async calculateRelationScore(
    @Query('userIdA') userIdA: string,
    @Query('userIdB') userIdB: string,
  ): Promise<{ message: string; data: RelationScoreResult }> {
    if (!userIdA || !userIdB) {
      const emptyResult: RelationScoreResult = {
        userIdA: userIdA ?? '',
        userIdB: userIdB ?? '',
        totalScore: 0,
        strength: RelationStrength.WEAK,
        riskLevel: RiskLevel.LOW,
        factors: [],
        isSuspicious: false,
        analyzedAt: new Date(),
      };
      return {
        message: '缺少必要参数 userIdA 和 userIdB',
        data: emptyResult,
      };
    }

    const result = await this.relatedAccountService.calculateRelationScore(
      userIdA,
      userIdB,
    );

    return {
      message: result.isSuspicious ? '检测到可疑关联' : '关联分数计算完成',
      data: result,
    };
  }

  /**
   * 检测可疑账户集群
   * GET /api/v1/risk-control/suspicious-clusters
   *
   * 需求19: 风控与反作弊系统 - 关联账户检测
   *
   * 使用并查集算法将高度关联的账户分组，
   * 识别可能的刷量、互刷等作弊行为。
   */
  @Get('suspicious-clusters')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getSuspiciousClusters(
    @Query('minClusterSize') minClusterSize?: string,
    @Query('minAvgScore') minAvgScore?: string,
  ): Promise<{ message: string; data: SuspiciousClustersResult }> {
    const result = await this.relatedAccountService.flagSuspiciousClusters({
      minClusterSize: minClusterSize ? parseInt(minClusterSize, 10) : 3,
      minAvgScore: minAvgScore ? parseInt(minAvgScore, 10) : 60,
    });

    return {
      message: `检测到 ${result.totalClusters} 个可疑账户集群`,
      data: result,
    };
  }

  // ==================== 交易异常检测 API ====================

  /**
   * 检测用户的交易异常
   * GET /api/v1/risk-control/transaction-anomalies/:userId
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
  @Get('transaction-anomalies/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async detectTransactionAnomalies(
    @Param('userId') userId: string,
    @Query('daysToAnalyze') daysToAnalyze?: string,
  ): Promise<{ message: string; data: UserAnomaliesResult }> {
    const result = await this.transactionAnomalyService.detectAnomalies(
      userId,
      {
        daysToAnalyze: daysToAnalyze ? parseInt(daysToAnalyze, 10) : 30,
      },
    );

    return {
      message: `检测到 ${result.totalAnomalies} 个交易异常`,
      data: result,
    };
  }

  /**
   * 检测循环转账模式
   * GET /api/v1/risk-control/circular-transfers
   *
   * 需求19: 风控与反作弊系统 - 交易异常检测
   *
   * 查找固定金额在多个账户间循环转账的模式
   */
  @Get('circular-transfers')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async detectCircularTransfers(
    @Query('daysToAnalyze') daysToAnalyze?: string,
  ): Promise<{ message: string; data: CircularTransferResult }> {
    const result = await this.transactionAnomalyService.detectCircularTransfers({
      daysToAnalyze: daysToAnalyze ? parseInt(daysToAnalyze, 10) : 7,
    });

    return {
      message: result.detected
        ? `检测到 ${result.totalCycles} 个循环转账模式`
        : '未检测到循环转账模式',
      data: result,
    };
  }

  /**
   * 检测新账户集中收币
   * GET /api/v1/risk-control/concentrated-receipts/:userId
   *
   * 需求19: 风控与反作弊系统 - 交易异常检测
   *
   * 检测新注册账户在短时间内收到大量打赏的情况
   */
  @Get('concentrated-receipts/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async detectConcentratedReceipts(
    @Param('userId') userId: string,
    @Query('daysToAnalyze') daysToAnalyze?: string,
  ): Promise<{ message: string; data: ConcentratedReceiptsResult }> {
    const result = await this.transactionAnomalyService.detectConcentratedReceipts(
      userId,
      {
        daysToAnalyze: daysToAnalyze ? parseInt(daysToAnalyze, 10) : 7,
      },
    );

    return {
      message: result.isSuspicious
        ? '检测到可疑的集中收币行为'
        : '未检测到异常收币行为',
      data: result,
    };
  }

  /**
   * 分析用户交易模式
   * GET /api/v1/risk-control/transaction-pattern/:userId
   *
   * 需求19: 风控与反作弊系统 - 交易异常检测
   *
   * 分析用户的交易行为模式，识别异常特征
   */
  @Get('transaction-pattern/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async analyzeTransactionPattern(
    @Param('userId') userId: string,
    @Query('daysToAnalyze') daysToAnalyze?: string,
  ): Promise<{ message: string; data: TransactionPatternResult }> {
    const result = await this.transactionAnomalyService.analyzeTransactionPattern(
      userId,
      {
        daysToAnalyze: daysToAnalyze ? parseInt(daysToAnalyze, 10) : 30,
      },
    );

    return {
      message: `交易模式分析完成，风险分数: ${result.riskScore}`,
      data: result,
    };
  }

  /**
   * 标记可疑交易
   * GET /api/v1/risk-control/suspicious-transactions
   *
   * 需求19: 风控与反作弊系统 - 交易异常检测
   *
   * 扫描所有交易并标记可疑的交易记录供人工审核
   */
  @Get('suspicious-transactions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async flagSuspiciousTransactions(
    @Query('daysToAnalyze') daysToAnalyze?: string,
    @Query('minRiskScore') minRiskScore?: string,
  ): Promise<{ message: string; data: FlaggedTransactionsResult }> {
    const result = await this.transactionAnomalyService.flagSuspiciousTransactions({
      daysToAnalyze: daysToAnalyze ? parseInt(daysToAnalyze, 10) : 7,
      minRiskScore: minRiskScore ? parseInt(minRiskScore, 10) : 50,
    });

    return {
      message: `标记了 ${result.totalFlagged} 笔可疑交易`,
      data: result,
    };
  }

  // ==================== 频率限制 API ====================

  /**
   * 检查频率限制
   * POST /api/v1/risk-control/rate-limit/check
   *
   * 需求19: 风控与反作弊系统 - 频率限制服务
   *
   * 检查指定 key 是否超过频率限制
   */
  @Post('rate-limit/check')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async checkRateLimit(
    @Body() dto: CheckRateLimitDto,
  ): Promise<{ message: string; data: RateLimitCheckResult }> {
    const result = await this.rateLimitService.checkRateLimit(
      dto.key,
      dto.limit,
      dto.windowSeconds,
    );

    return {
      message: result.allowed ? '允许操作' : '超过频率限制',
      data: result,
    };
  }

  /**
   * 检查并增加计数
   * POST /api/v1/risk-control/rate-limit/check-and-increment
   *
   * 需求19: 风控与反作弊系统 - 频率限制服务
   *
   * 检查频率限制并增加计数（原子操作）
   */
  @Post('rate-limit/check-and-increment')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async checkAndIncrement(
    @Body() dto: CheckRateLimitDto & { blockDurationSeconds?: number },
  ): Promise<{ message: string; data: RateLimitCheckResult }> {
    const result = await this.rateLimitService.checkAndIncrement(
      dto.key,
      dto.limit,
      dto.windowSeconds,
      dto.blockDurationSeconds,
    );

    return {
      message: result.allowed ? '允许操作' : '超过频率限制',
      data: result,
    };
  }

  /**
   * 检查操作频率限制
   * GET /api/v1/risk-control/rate-limit/action/:action/:identifier
   *
   * 需求19: 风控与反作弊系统 - 频率限制服务
   *
   * 使用预定义配置检查操作频率限制
   */
  @Get('rate-limit/action/:action/:identifier')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async checkActionRateLimit(
    @Param('action') action: string,
    @Param('identifier') identifier: string,
  ): Promise<{ message: string; data: RateLimitCheckResult }> {
    const result = await this.rateLimitService.checkActionRateLimit(
      action as RateLimitAction,
      identifier,
    );

    return {
      message: result.allowed ? '允许操作' : '超过频率限制',
      data: result,
    };
  }

  /**
   * 获取频率限制状态
   * GET /api/v1/risk-control/rate-limit/status
   *
   * 需求19: 风控与反作弊系统 - 频率限制服务
   *
   * 获取指定 key 的频率限制状态
   */
  @Get('rate-limit/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getRateLimitStatus(
    @Query('key') key: string,
    @Query('action') action: string,
    @Query('limit') limit: string,
    @Query('windowSeconds') windowSeconds: string,
  ): Promise<{ message: string; data: RateLimitStatusResponse }> {
    const result = await this.rateLimitService.getStatus(
      key,
      action,
      parseInt(limit, 10),
      parseInt(windowSeconds, 10),
    );

    return {
      message: '获取状态成功',
      data: result,
    };
  }

  /**
   * 获取剩余配额
   * GET /api/v1/risk-control/rate-limit/remaining
   *
   * 需求19: 风控与反作弊系统 - 频率限制服务
   *
   * 获取指定 key 的剩余配额
   */
  @Get('rate-limit/remaining')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getRemainingQuota(
    @Query('key') key: string,
    @Query('limit') limit: string,
    @Query('windowSeconds') windowSeconds: string,
  ): Promise<{ message: string; data: { remaining: number } }> {
    const remaining = await this.rateLimitService.getRemainingQuota(
      key,
      parseInt(limit, 10),
      parseInt(windowSeconds, 10),
    );

    return {
      message: '获取剩余配额成功',
      data: { remaining },
    };
  }

  /**
   * 重置频率限制
   * DELETE /api/v1/risk-control/rate-limit/:key
   *
   * 需求19: 风控与反作弊系统 - 频率限制服务
   *
   * 重置指定 key 的频率限制计数
   */
  @Delete('rate-limit/:key')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async resetRateLimit(
    @Param('key') key: string,
  ): Promise<{ message: string }> {
    await this.rateLimitService.resetRateLimit(key);

    return {
      message: '频率限制已重置',
    };
  }

  /**
   * 检查是否被封禁
   * GET /api/v1/risk-control/rate-limit/blocked/:key
   *
   * 需求19: 风控与反作弊系统 - 频率限制服务
   *
   * 检查指定 key 是否被封禁
   */
  @Get('rate-limit/blocked/:key')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async isBlocked(
    @Param('key') key: string,
  ): Promise<{ message: string; data: { blocked: boolean } }> {
    const blocked = await this.rateLimitService.isBlocked(key);

    return {
      message: blocked ? '已被封禁' : '未被封禁',
      data: { blocked },
    };
  }

  /**
   * 封禁指定 key
   * POST /api/v1/risk-control/rate-limit/block/:key
   *
   * 需求19: 风控与反作弊系统 - 频率限制服务
   *
   * 封禁指定 key 一段时间
   */
  @Post('rate-limit/block/:key')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async blockKey(
    @Param('key') key: string,
    @Query('durationSeconds') durationSeconds: string,
  ): Promise<{ message: string }> {
    const duration = parseInt(durationSeconds, 10) || 3600;
    await this.rateLimitService.blockKey(key, duration);

    return {
      message: `已封禁 ${duration} 秒`,
    };
  }

  /**
   * 解除封禁
   * DELETE /api/v1/risk-control/rate-limit/block/:key
   *
   * 需求19: 风控与反作弊系统 - 频率限制服务
   *
   * 解除指定 key 的封禁
   */
  @Delete('rate-limit/block/:key')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unblockKey(
    @Param('key') key: string,
  ): Promise<{ message: string }> {
    await this.rateLimitService.unblockKey(key);

    return {
      message: '封禁已解除',
    };
  }

  // ==================== 风控告警 API ====================

  /**
   * 创建告警
   * POST /api/v1/risk-control/alerts
   *
   * 需求19: 风控与反作弊系统 - 风控告警服务
   *
   * 创建新的风控告警
   */
  @Post('alerts')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createAlert(
    @Body() dto: CreateAlertDto,
  ): Promise<{ message: string; data: RiskAlertResponse }> {
    const result = await this.riskAlertService.createAlert(dto);

    return {
      message: '告警创建成功',
      data: result,
    };
  }

  /**
   * 获取告警列表
   * GET /api/v1/risk-control/alerts
   *
   * 需求19: 风控与反作弊系统 - 风控告警服务
   *
   * 获取告警列表，支持过滤和分页
   */
  @Get('alerts')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAlerts(
    @Query('type') type?: AlertType,
    @Query('severity') severity?: AlertSeverity,
    @Query('status') status?: AlertStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ message: string; data: AlertListResponse }> {
    const filters: AlertFiltersDto = {
      type,
      severity,
      status,
      assignedTo,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    const result = await this.riskAlertService.getAlerts(filters);

    return {
      message: `获取到 ${result.total} 条告警`,
      data: result,
    };
  }

  /**
   * 获取告警统计
   * GET /api/v1/risk-control/alerts/stats
   *
   * 需求19: 风控与反作弊系统 - 风控告警服务
   *
   * 获取告警统计数据
   */
  @Get('alerts/stats')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAlertStats(): Promise<{ message: string; data: AlertStats }> {
    const result = await this.riskAlertService.getAlertStats();

    return {
      message: '获取统计成功',
      data: result,
    };
  }

  /**
   * 获取待处理的高优先级告警
   * GET /api/v1/risk-control/alerts/pending-high-priority
   *
   * 需求19: 风控与反作弊系统 - 风控告警服务
   *
   * 获取待处理的 CRITICAL 和 HIGH 级别告警
   */
  @Get('alerts/pending-high-priority')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getPendingHighPriorityAlerts(
    @Query('limit') limit?: string,
  ): Promise<{ message: string; data: RiskAlertResponse[] }> {
    const result = await this.riskAlertService.getPendingHighPriorityAlerts(
      limit ? parseInt(limit, 10) : 10,
    );

    return {
      message: `获取到 ${result.length} 条高优先级告警`,
      data: result,
    };
  }

  /**
   * 获取告警详情
   * GET /api/v1/risk-control/alerts/:id
   *
   * 需求19: 风控与反作弊系统 - 风控告警服务
   *
   * 获取单个告警的详细信息
   */
  @Get('alerts/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAlertById(
    @Param('id') id: string,
  ): Promise<{ message: string; data: RiskAlertResponse }> {
    const result = await this.riskAlertService.getAlertById(id);

    return {
      message: '获取告警详情成功',
      data: result,
    };
  }

  /**
   * 更新告警状态
   * PATCH /api/v1/risk-control/alerts/:id/status
   *
   * 需求19: 风控与反作弊系统 - 风控告警服务
   *
   * 更新告警状态（PENDING → INVESTIGATING → RESOLVED/DISMISSED）
   */
  @Patch('alerts/:id/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateAlertStatus(
    @Param('id') id: string,
    @Body() dto: UpdateAlertStatusDto,
  ): Promise<{ message: string; data: RiskAlertResponse }> {
    const result = await this.riskAlertService.updateAlertStatus(
      id,
      dto.status,
      dto.note,
    );

    return {
      message: `告警状态已更新为 ${dto.status}`,
      data: result,
    };
  }

  /**
   * 分配告警
   * PATCH /api/v1/risk-control/alerts/:id/assign
   *
   * 需求19: 风控与反作弊系统 - 风控告警服务
   *
   * 将告警分配给指定管理员
   */
  @Patch('alerts/:id/assign')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async assignAlert(
    @Param('id') id: string,
    @Body() dto: AssignAlertDto,
  ): Promise<{ message: string; data: RiskAlertResponse }> {
    const result = await this.riskAlertService.assignAlert(id, dto.adminId);

    return {
      message: '告警已分配',
      data: result,
    };
  }

  /**
   * 添加告警备注
   * POST /api/v1/risk-control/alerts/:id/notes
   *
   * 需求19: 风控与反作弊系统 - 风控告警服务
   *
   * 为告警添加备注
   */
  @Post('alerts/:id/notes')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async addAlertNote(
    @Param('id') id: string,
    @Body() dto: AddAlertNoteDto,
    @Query('authorId') authorId: string,
  ): Promise<{ message: string; data: { note: { id: string; content: string; authorId: string; createdAt: Date } } }> {
    const note = await this.riskAlertService.addAlertNote(id, dto.note, authorId);

    return {
      message: '备注添加成功',
      data: { note },
    };
  }

  /**
   * 获取分配给指定管理员的告警
   * GET /api/v1/risk-control/alerts/assignee/:adminId
   *
   * 需求19: 风控与反作弊系统 - 风控告警服务
   *
   * 获取分配给指定管理员的所有告警
   */
  @Get('alerts/assignee/:adminId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAlertsByAssignee(
    @Param('adminId') adminId: string,
    @Query('status') status?: AlertStatus,
  ): Promise<{ message: string; data: RiskAlertResponse[] }> {
    const result = await this.riskAlertService.getAlertsByAssignee(adminId, status);

    return {
      message: `获取到 ${result.length} 条告警`,
      data: result,
    };
  }

  /**
   * 获取影响指定用户的告警
   * GET /api/v1/risk-control/alerts/affected-user/:userId
   *
   * 需求19: 风控与反作弊系统 - 风控告警服务
   *
   * 获取影响指定用户的所有告警
   */
  @Get('alerts/affected-user/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAlertsByAffectedUser(
    @Param('userId') userId: string,
  ): Promise<{ message: string; data: RiskAlertResponse[] }> {
    const result = await this.riskAlertService.getAlertsByAffectedUser(userId);

    return {
      message: `获取到 ${result.length} 条告警`,
      data: result,
    };
  }

  // ==================== 惩罚执行 API ====================

  /**
   * 创建惩罚
   * POST /api/v1/risk-control/punishments
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 创建新的用户惩罚
   */
  @Post('punishments')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createPunishment(
    @Body() dto: CreatePunishmentDto,
  ): Promise<{ message: string; data: PunishmentResponse }> {
    const result = await this.punishmentService.createPunishment(dto);

    return {
      message: '惩罚创建成功',
      data: result,
    };
  }

  /**
   * 获取用户惩罚列表
   * GET /api/v1/risk-control/punishments/user/:userId
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 获取指定用户的所有惩罚记录
   */
  @Get('punishments/user/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getPunishments(
    @Param('userId') userId: string,
    @Query('type') type?: PunishmentType,
    @Query('status') status?: PunishmentStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{ message: string; data: PunishmentListResponse }> {
    const filters: PunishmentFiltersDto = {
      type,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    };

    const result = await this.punishmentService.getPunishments(userId, filters);

    return {
      message: `获取到 ${result.total} 条惩罚记录`,
      data: result,
    };
  }

  /**
   * 获取用户活跃惩罚
   * GET /api/v1/risk-control/punishments/user/:userId/active
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 获取指定用户当前生效的惩罚
   */
  @Get('punishments/user/:userId/active')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getActivePunishments(
    @Param('userId') userId: string,
  ): Promise<{ message: string; data: PunishmentResponse[] }> {
    const result = await this.punishmentService.getActivePunishments(userId);

    return {
      message: `获取到 ${result.length} 条活跃惩罚`,
      data: result,
    };
  }

  /**
   * 获取用户惩罚状态
   * GET /api/v1/risk-control/punishments/user/:userId/status
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 获取用户的惩罚状态汇总
   */
  @Get('punishments/user/:userId/status')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserPunishmentStatus(
    @Param('userId') userId: string,
  ): Promise<{ message: string; data: UserPunishmentStatus }> {
    const result = await this.punishmentService.getUserPunishmentStatus(userId);

    return {
      message: '获取用户惩罚状态成功',
      data: result,
    };
  }

  /**
   * 获取用户惩罚历史
   * GET /api/v1/risk-control/punishments/user/:userId/history
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 获取用户的完整惩罚历史
   */
  @Get('punishments/user/:userId/history')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getPunishmentHistory(
    @Param('userId') userId: string,
  ): Promise<{ message: string; data: PunishmentResponse[] }> {
    const result = await this.punishmentService.getPunishmentHistory(userId);

    return {
      message: `获取到 ${result.length} 条惩罚历史`,
      data: result,
    };
  }

  /**
   * 获取用户惩罚统计
   * GET /api/v1/risk-control/punishments/user/:userId/stats
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 获取用户的惩罚历史统计
   */
  @Get('punishments/user/:userId/stats')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getPunishmentHistoryStats(
    @Param('userId') userId: string,
  ): Promise<{ message: string; data: PunishmentHistoryStats }> {
    const result = await this.punishmentService.getPunishmentHistoryStats(userId);

    return {
      message: '获取惩罚统计成功',
      data: result,
    };
  }

  /**
   * 获取惩罚详情
   * GET /api/v1/risk-control/punishments/:id
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 获取单个惩罚的详细信息
   */
  @Get('punishments/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getPunishmentById(
    @Param('id') id: string,
  ): Promise<{ message: string; data: PunishmentResponse }> {
    const result = await this.punishmentService.getPunishmentById(id);

    return {
      message: '获取惩罚详情成功',
      data: result,
    };
  }

  /**
   * 撤销惩罚
   * POST /api/v1/risk-control/punishments/:id/revoke
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 撤销指定的惩罚
   */
  @Post('punishments/:id/revoke')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async revokePunishment(
    @Param('id') id: string,
    @Body() dto: RevokePunishmentDto,
  ): Promise<{ message: string; data: PunishmentResponse }> {
    const result = await this.punishmentService.revokePunishment(id, dto);

    return {
      message: '惩罚已撤销',
      data: result,
    };
  }

  /**
   * 检查用户是否有特定类型的惩罚
   * GET /api/v1/risk-control/punishments/check/:userId/:type
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 检查用户是否有指定类型的活跃惩罚
   */
  @Get('punishments/check/:userId/:type')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async checkPunishment(
    @Param('userId') userId: string,
    @Param('type') type: PunishmentType,
  ): Promise<{ message: string; data: PunishmentCheckResult }> {
    const result = await this.punishmentService.checkPunishment(userId, type);

    return {
      message: result.hasPunishment ? '用户有该类型惩罚' : '用户无该类型惩罚',
      data: result,
    };
  }

  /**
   * 检查用户是否被禁言
   * GET /api/v1/risk-control/punishments/muted/:userId
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 快速检查用户是否被禁言
   */
  @Get('punishments/muted/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async isUserMuted(
    @Param('userId') userId: string,
  ): Promise<{ message: string; data: { isMuted: boolean } }> {
    const isMuted = await this.punishmentService.isUserMuted(userId);

    return {
      message: isMuted ? '用户已被禁言' : '用户未被禁言',
      data: { isMuted },
    };
  }

  /**
   * 检查用户是否被封禁
   * GET /api/v1/risk-control/punishments/banned/:userId
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 快速检查用户是否被封禁
   */
  @Get('punishments/banned/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async isUserBanned(
    @Param('userId') userId: string,
  ): Promise<{ message: string; data: { isBanned: boolean } }> {
    const isBanned = await this.punishmentService.isUserBanned(userId);

    return {
      message: isBanned ? '用户已被封禁' : '用户未被封禁',
      data: { isBanned },
    };
  }

  /**
   * 从告警执行惩罚
   * POST /api/v1/risk-control/punishments/execute-from-alert
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 基于风控告警对用户执行惩罚
   */
  @Post('punishments/execute-from-alert')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async executePunishmentFromAlert(
    @Body() dto: ExecutePunishmentFromAlertDto,
  ): Promise<{ message: string; data: PunishmentResponse }> {
    const result = await this.punishmentService.executePunishment(dto);

    return {
      message: '惩罚执行成功',
      data: result,
    };
  }

  /**
   * 从告警执行惩罚（对所有受影响用户）
   * POST /api/v1/risk-control/punishments/execute-from-alert-all
   *
   * 需求19: 风控与反作弊系统 - 惩罚执行服务
   *
   * 基于风控告警对所有受影响用户执行惩罚
   */
  @Post('punishments/execute-from-alert-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async executePunishmentForAllAffectedUsers(
    @Body() dto: ExecutePunishmentFromAlertDto,
  ): Promise<{ message: string; data: PunishmentResponse[] }> {
    const result = await this.punishmentService.executePunishmentForAllAffectedUsers(dto);

    return {
      message: `对 ${result.length} 个用户执行了惩罚`,
      data: result,
    };
  }
}
