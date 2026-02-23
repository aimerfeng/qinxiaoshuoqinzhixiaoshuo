import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import {
  AlertType,
  AlertSeverity,
  AlertStatus,
  type CreateAlertDto,
  type AlertFiltersDto,
  type RiskAlertResponse,
  type AlertListResponse,
  type AlertStats,
  type TriggerAlertParams,
  type AlertNotification,
  type AlertNote,
} from './dto/risk-alert.dto.js';

/**
 * 风控告警服务
 *
 * 需求19: 风控与反作弊系统 - 风控告警服务
 *
 * 功能:
 * - 创建和管理风控告警
 * - 告警状态流转（待处理 → 调查中 → 已解决/已忽略）
 * - 告警分配给管理员
 * - 告警备注管理
 * - 告警统计分析
 * - 实时告警通知（Redis Pub/Sub）
 *
 * 告警类型:
 * - MULTI_ACCOUNT_DETECTED: 同设备/IP多账户
 * - SUSPICIOUS_TRANSACTION: 可疑交易模式
 * - RATE_LIMIT_EXCEEDED: 频率限制违规
 * - CIRCULAR_TRANSFER: 循环转账检测
 * - CONCENTRATED_RECEIPTS: 新账户集中收币
 * - ACCOUNT_CLUSTER: 可疑账户集群
 */
@Injectable()
export class RiskAlertService {
  private readonly logger = new Logger(RiskAlertService.name);

  // Redis 配置
  private readonly ALERT_CHANNEL = 'risk:alerts';
  private readonly STATS_CACHE_KEY = 'risk:alert:stats';
  private readonly STATS_CACHE_TTL = 300; // 5分钟缓存

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}


  /**
   * 创建新告警
   *
   * @param dto 创建告警参数
   * @returns 创建的告警
   */
  async createAlert(dto: CreateAlertDto): Promise<RiskAlertResponse> {
    this.logger.log(`Creating alert: ${dto.type} - ${dto.title}`);

    try {
      const alert = await (this.prisma as any).riskAlert.create({
        data: {
          type: dto.type,
          severity: dto.severity,
          title: dto.title,
          description: dto.description,
          data: dto.data ?? {},
          affectedUserIds: dto.affectedUserIds ?? [],
          sourceService: dto.sourceService,
        },
        include: {
          notes: true,
        },
      });

      const response = this.mapAlertToResponse(alert);

      // 发布实时通知
      await this.publishAlertNotification({
        alertId: response.id,
        type: response.type,
        severity: response.severity,
        title: response.title,
        description: response.description,
        createdAt: response.createdAt,
      });

      // 清除统计缓存
      await this.invalidateStatsCache();

      return response;
    } catch (error) {
      this.logger.error(`Failed to create alert: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取告警列表
   *
   * @param filters 过滤条件
   * @returns 告警列表
   */
  async getAlerts(filters: AlertFiltersDto = {}): Promise<AlertListResponse> {
    const { type, severity, status, assignedTo, limit = 20, offset = 0 } = filters;

    try {
      const where: any = {};

      if (type) where.type = type;
      if (severity) where.severity = severity;
      if (status) where.status = status;
      if (assignedTo) where.assignedTo = assignedTo;

      const [alerts, total] = await Promise.all([
        (this.prisma as any).riskAlert.findMany({
          where,
          include: { notes: true },
          orderBy: [
            { severity: 'asc' }, // CRITICAL first
            { createdAt: 'desc' },
          ],
          take: limit,
          skip: offset,
        }),
        (this.prisma as any).riskAlert.count({ where }),
      ]);

      return {
        alerts: alerts.map((a: any) => this.mapAlertToResponse(a)),
        total,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error(`Failed to get alerts: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取单个告警详情
   *
   * @param id 告警ID
   * @returns 告警详情
   */
  async getAlertById(id: string): Promise<RiskAlertResponse> {
    try {
      const alert = await (this.prisma as any).riskAlert.findUnique({
        where: { id },
        include: { notes: true },
      });

      if (!alert) {
        throw new NotFoundException(`Alert with ID ${id} not found`);
      }

      return this.mapAlertToResponse(alert);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get alert ${id}: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 更新告警状态
   *
   * @param id 告警ID
   * @param status 新状态
   * @param note 可选备注
   * @param userId 操作用户ID
   * @returns 更新后的告警
   */
  async updateAlertStatus(
    id: string,
    status: AlertStatus,
    note?: string,
    userId?: string,
  ): Promise<RiskAlertResponse> {
    this.logger.log(`Updating alert ${id} status to ${status}`);

    try {
      const updateData: any = { status };

      // 如果状态变为已解决或已忽略，记录解决信息
      if (status === AlertStatus.RESOLVED || status === AlertStatus.DISMISSED) {
        updateData.resolvedAt = new Date();
        if (userId) updateData.resolvedBy = userId;
      }

      const alert = await (this.prisma as any).riskAlert.update({
        where: { id },
        data: updateData,
        include: { notes: true },
      });

      // 如果有备注，添加备注
      if (note && userId) {
        await this.addAlertNote(id, note, userId);
      }

      // 清除统计缓存
      await this.invalidateStatsCache();

      return this.mapAlertToResponse(alert);
    } catch (error) {
      this.logger.error(`Failed to update alert status: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 分配告警给管理员
   *
   * @param id 告警ID
   * @param adminId 管理员ID
   * @returns 更新后的告警
   */
  async assignAlert(id: string, adminId: string): Promise<RiskAlertResponse> {
    this.logger.log(`Assigning alert ${id} to admin ${adminId}`);

    try {
      const alert = await (this.prisma as any).riskAlert.update({
        where: { id },
        data: {
          assignedTo: adminId,
          status: AlertStatus.INVESTIGATING, // 自动变为调查中
        },
        include: { notes: true },
      });

      // 清除统计缓存
      await this.invalidateStatsCache();

      return this.mapAlertToResponse(alert);
    } catch (error) {
      this.logger.error(`Failed to assign alert: ${String(error)}`);
      throw error;
    }
  }


  /**
   * 添加告警备注
   *
   * @param alertId 告警ID
   * @param content 备注内容
   * @param authorId 作者ID
   * @returns 创建的备注
   */
  async addAlertNote(
    alertId: string,
    content: string,
    authorId: string,
  ): Promise<AlertNote> {
    this.logger.debug(`Adding note to alert ${alertId}`);

    try {
      const note = await (this.prisma as any).riskAlertNote.create({
        data: {
          alertId,
          content,
          authorId,
        },
      });

      return {
        id: note.id,
        content: note.content,
        authorId: note.authorId,
        createdAt: note.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to add alert note: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取告警统计
   *
   * @returns 告警统计数据
   */
  async getAlertStats(): Promise<AlertStats> {
    // 尝试从缓存获取
    const cached = await this.redis.get(this.STATS_CACHE_KEY);
    if (cached) {
      try {
        return JSON.parse(cached) as AlertStats;
      } catch {
        // 缓存解析失败，继续计算
      }
    }

    this.logger.debug('Calculating alert statistics');

    try {
      const now = new Date();
      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 并行查询各项统计
      const [
        total,
        pendingCount,
        investigatingCount,
        resolvedCount,
        dismissedCount,
        criticalCount,
        highCount,
        mediumCount,
        lowCount,
        last24HoursCount,
        last7DaysCount,
        typeStats,
        resolvedAlerts,
      ] = await Promise.all([
        (this.prisma as any).riskAlert.count(),
        (this.prisma as any).riskAlert.count({ where: { status: 'PENDING' } }),
        (this.prisma as any).riskAlert.count({ where: { status: 'INVESTIGATING' } }),
        (this.prisma as any).riskAlert.count({ where: { status: 'RESOLVED' } }),
        (this.prisma as any).riskAlert.count({ where: { status: 'DISMISSED' } }),
        (this.prisma as any).riskAlert.count({ where: { severity: 'CRITICAL' } }),
        (this.prisma as any).riskAlert.count({ where: { severity: 'HIGH' } }),
        (this.prisma as any).riskAlert.count({ where: { severity: 'MEDIUM' } }),
        (this.prisma as any).riskAlert.count({ where: { severity: 'LOW' } }),
        (this.prisma as any).riskAlert.count({ where: { createdAt: { gte: last24Hours } } }),
        (this.prisma as any).riskAlert.count({ where: { createdAt: { gte: last7Days } } }),
        (this.prisma as any).riskAlert.groupBy({
          by: ['type'],
          _count: { type: true },
        }),
        (this.prisma as any).riskAlert.findMany({
          where: {
            status: 'RESOLVED',
            resolvedAt: { not: null },
          },
          select: {
            createdAt: true,
            resolvedAt: true,
          },
          take: 100,
          orderBy: { resolvedAt: 'desc' },
        }),
      ]);

      // 计算按类型统计
      const byType: Record<AlertType, number> = {
        [AlertType.MULTI_ACCOUNT_DETECTED]: 0,
        [AlertType.SUSPICIOUS_TRANSACTION]: 0,
        [AlertType.RATE_LIMIT_EXCEEDED]: 0,
        [AlertType.CIRCULAR_TRANSFER]: 0,
        [AlertType.CONCENTRATED_RECEIPTS]: 0,
        [AlertType.ACCOUNT_CLUSTER]: 0,
      };

      for (const stat of typeStats as { type: string; _count: { type: number } }[]) {
        byType[stat.type as AlertType] = stat._count.type;
      }

      // 计算平均解决时间
      let avgResolutionTimeHours = 0;
      if (resolvedAlerts.length > 0) {
        const totalHours = resolvedAlerts.reduce((sum: number, alert: any) => {
          const created = new Date(alert.createdAt).getTime();
          const resolved = new Date(alert.resolvedAt).getTime();
          return sum + (resolved - created) / (1000 * 60 * 60);
        }, 0);
        avgResolutionTimeHours = Math.round((totalHours / resolvedAlerts.length) * 10) / 10;
      }

      const stats: AlertStats = {
        total,
        byStatus: {
          pending: pendingCount,
          investigating: investigatingCount,
          resolved: resolvedCount,
          dismissed: dismissedCount,
        },
        bySeverity: {
          critical: criticalCount,
          high: highCount,
          medium: mediumCount,
          low: lowCount,
        },
        byType,
        last24Hours: last24HoursCount,
        last7Days: last7DaysCount,
        avgResolutionTimeHours,
      };

      // 缓存结果
      await this.redis.set(this.STATS_CACHE_KEY, JSON.stringify(stats), this.STATS_CACHE_TTL);

      return stats;
    } catch (error) {
      this.logger.error(`Failed to get alert stats: ${String(error)}`);
      throw error;
    }
  }


  /**
   * 触发告警（供其他服务调用）
   *
   * 根据告警类型自动设置默认标题和严重程度
   *
   * @param params 触发参数
   * @returns 创建的告警
   */
  async triggerAlert(params: TriggerAlertParams): Promise<RiskAlertResponse> {
    const { type, data, affectedUserIds, sourceService } = params;

    // 根据类型设置默认值
    const defaults = this.getAlertDefaults(type);
    const severity = params.severity ?? defaults.severity;
    const title = params.title ?? defaults.title;
    const description = params.description ?? defaults.description;

    return this.createAlert({
      type,
      severity,
      title,
      description,
      data,
      affectedUserIds,
      sourceService,
    });
  }

  /**
   * 批量触发告警
   *
   * @param alerts 告警参数列表
   * @returns 创建的告警列表
   */
  async triggerAlerts(alerts: TriggerAlertParams[]): Promise<RiskAlertResponse[]> {
    const results: RiskAlertResponse[] = [];

    for (const params of alerts) {
      try {
        const alert = await this.triggerAlert(params);
        results.push(alert);
      } catch (error) {
        this.logger.error(`Failed to trigger alert: ${String(error)}`);
      }
    }

    return results;
  }

  /**
   * 获取待处理的高优先级告警
   *
   * @param limit 数量限制
   * @returns 告警列表
   */
  async getPendingHighPriorityAlerts(limit: number = 10): Promise<RiskAlertResponse[]> {
    try {
      const alerts = await (this.prisma as any).riskAlert.findMany({
        where: {
          status: 'PENDING',
          severity: { in: ['CRITICAL', 'HIGH'] },
        },
        include: { notes: true },
        orderBy: [
          { severity: 'asc' },
          { createdAt: 'asc' },
        ],
        take: limit,
      });

      return alerts.map((a: any) => this.mapAlertToResponse(a));
    } catch (error) {
      this.logger.error(`Failed to get pending high priority alerts: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取分配给指定管理员的告警
   *
   * @param adminId 管理员ID
   * @param status 可选状态过滤
   * @returns 告警列表
   */
  async getAlertsByAssignee(
    adminId: string,
    status?: AlertStatus,
  ): Promise<RiskAlertResponse[]> {
    try {
      const where: any = { assignedTo: adminId };
      if (status) where.status = status;

      const alerts = await (this.prisma as any).riskAlert.findMany({
        where,
        include: { notes: true },
        orderBy: [
          { severity: 'asc' },
          { createdAt: 'desc' },
        ],
      });

      return alerts.map((a: any) => this.mapAlertToResponse(a));
    } catch (error) {
      this.logger.error(`Failed to get alerts by assignee: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取影响指定用户的告警
   *
   * @param userId 用户ID
   * @returns 告警列表
   */
  async getAlertsByAffectedUser(userId: string): Promise<RiskAlertResponse[]> {
    try {
      const alerts = await (this.prisma as any).riskAlert.findMany({
        where: {
          affectedUserIds: { has: userId },
        },
        include: { notes: true },
        orderBy: { createdAt: 'desc' },
      });

      return alerts.map((a: any) => this.mapAlertToResponse(a));
    } catch (error) {
      this.logger.error(`Failed to get alerts by affected user: ${String(error)}`);
      throw error;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 获取告警类型的默认值
   */
  private getAlertDefaults(type: AlertType): {
    severity: AlertSeverity;
    title: string;
    description: string;
  } {
    const defaults: Record<AlertType, { severity: AlertSeverity; title: string; description: string }> = {
      [AlertType.MULTI_ACCOUNT_DETECTED]: {
        severity: AlertSeverity.MEDIUM,
        title: '检测到多账户关联',
        description: '同一设备或IP地址关联了多个账户',
      },
      [AlertType.SUSPICIOUS_TRANSACTION]: {
        severity: AlertSeverity.HIGH,
        title: '检测到可疑交易',
        description: '交易模式存在异常，可能涉及刷量或洗币行为',
      },
      [AlertType.RATE_LIMIT_EXCEEDED]: {
        severity: AlertSeverity.LOW,
        title: '频率限制超限',
        description: '用户操作频率超过系统限制',
      },
      [AlertType.CIRCULAR_TRANSFER]: {
        severity: AlertSeverity.CRITICAL,
        title: '检测到循环转账',
        description: '发现固定金额在多个账户间循环转账的模式',
      },
      [AlertType.CONCENTRATED_RECEIPTS]: {
        severity: AlertSeverity.HIGH,
        title: '新账户集中收币',
        description: '新注册账户在短时间内收到大量打赏',
      },
      [AlertType.ACCOUNT_CLUSTER]: {
        severity: AlertSeverity.HIGH,
        title: '检测到可疑账户集群',
        description: '发现一组高度关联的账户，可能存在刷量行为',
      },
    };

    return defaults[type];
  }

  /**
   * 映射数据库记录到响应对象
   */
  private mapAlertToResponse(alert: any): RiskAlertResponse {
    return {
      id: alert.id,
      type: alert.type as AlertType,
      severity: alert.severity as AlertSeverity,
      status: alert.status as AlertStatus,
      title: alert.title,
      description: alert.description ?? undefined,
      data: alert.data ?? undefined,
      affectedUserIds: alert.affectedUserIds ?? [],
      sourceService: alert.sourceService ?? undefined,
      assignedTo: alert.assignedTo ?? undefined,
      notes: (alert.notes ?? []).map((n: any) => ({
        id: n.id,
        content: n.content,
        authorId: n.authorId,
        createdAt: n.createdAt,
      })),
      resolvedAt: alert.resolvedAt ?? undefined,
      resolvedBy: alert.resolvedBy ?? undefined,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }

  /**
   * 发布告警通知到 Redis
   */
  private async publishAlertNotification(notification: AlertNotification): Promise<void> {
    try {
      const client = this.redis.getClient();
      await client.publish(this.ALERT_CHANNEL, JSON.stringify(notification));
      this.logger.debug(`Published alert notification: ${notification.alertId}`);
    } catch (error) {
      this.logger.error(`Failed to publish alert notification: ${String(error)}`);
    }
  }

  /**
   * 清除统计缓存
   */
  private async invalidateStatsCache(): Promise<void> {
    try {
      await this.redis.del(this.STATS_CACHE_KEY);
    } catch (error) {
      this.logger.error(`Failed to invalidate stats cache: ${String(error)}`);
    }
  }
}
