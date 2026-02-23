import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { RiskAlertService } from './risk-alert.service.js';
import {
  PunishmentType,
  PunishmentStatus,
  type CreatePunishmentDto,
  type RevokePunishmentDto,
  type ExecutePunishmentFromAlertDto,
  type PunishmentFiltersDto,
  type PunishmentResponse,
  type PunishmentListResponse,
  type PunishmentCheckResult,
  type UserPunishmentStatus,
  type PunishmentHistoryStats,
  PUNISHMENT_TYPE_DEFAULTS,
} from './dto/punishment.dto.js';
import { AlertStatus } from './dto/risk-alert.dto.js';

/**
 * 惩罚执行服务
 *
 * 需求19: 风控与反作弊系统 - 惩罚执行服务
 *
 * 功能:
 * - 创建和管理用户惩罚
 * - 支持多种惩罚类型（警告、禁言、功能限制、冻结、封禁）
 * - 支持临时和永久惩罚
 * - 惩罚状态检查（使用 Redis 缓存加速）
 * - 与风控告警系统集成
 * - 惩罚撤销和历史记录
 *
 * 惩罚类型:
 * - WARNING: 警告（记录但不限制）
 * - MUTE: 禁言（限制发言、评论、弹幕）
 * - FEATURE_RESTRICT: 功能限制（限制特定功能如打赏、发布）
 * - ACCOUNT_FREEZE: 账户冻结（暂停账户活动）
 * - ACCOUNT_BAN: 账户封禁（永久封禁）
 */
@Injectable()
export class PunishmentService {
  private readonly logger = new Logger(PunishmentService.name);

  // Redis 缓存配置
  private readonly PUNISHMENT_CACHE_PREFIX = 'punishment:';
  private readonly PUNISHMENT_CACHE_TTL = 300; // 5分钟缓存

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly riskAlertService: RiskAlertService,
  ) {}

  /**
   * 创建惩罚
   *
   * @param dto 创建惩罚参数
   * @returns 创建的惩罚记录
   */
  async createPunishment(dto: CreatePunishmentDto): Promise<PunishmentResponse> {
    this.logger.log(`Creating punishment for user ${dto.userId}: ${dto.type}`);

    try {
      // 获取惩罚类型默认配置
      const defaults = PUNISHMENT_TYPE_DEFAULTS[dto.type];

      // 确定是否永久
      const isPermanent = dto.isPermanent ?? defaults.isPermanentByDefault;

      // 计算过期时间
      let expiresAt: Date | null = null;
      if (!isPermanent && dto.type !== PunishmentType.WARNING) {
        const durationMinutes = dto.durationMinutes ?? defaults.defaultDurationMinutes;
        if (durationMinutes > 0) {
          expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
        }
      }

      const punishment = await (this.prisma as any).userPunishment.create({
        data: {
          userId: dto.userId,
          type: dto.type,
          status: PunishmentStatus.ACTIVE,
          reason: dto.reason,
          description: dto.description,
          alertId: dto.alertId,
          isPermanent,
          expiresAt,
          createdBy: dto.createdBy,
        },
      });

      const response = this.mapPunishmentToResponse(punishment);

      // 清除用户惩罚缓存
      await this.invalidateUserPunishmentCache(dto.userId);

      this.logger.log(`Punishment created: ${response.id} for user ${dto.userId}`);

      return response;
    } catch (error) {
      this.logger.error(`Failed to create punishment: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取用户的所有惩罚
   *
   * @param userId 用户ID
   * @param filters 过滤条件
   * @returns 惩罚列表
   */
  async getPunishments(
    userId: string,
    filters: PunishmentFiltersDto = {},
  ): Promise<PunishmentListResponse> {
    const { type, status, limit = 20, offset = 0 } = filters;

    try {
      const where: any = { userId };

      if (type) where.type = type;
      if (status) where.status = status;

      const [punishments, total] = await Promise.all([
        (this.prisma as any).userPunishment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        (this.prisma as any).userPunishment.count({ where }),
      ]);

      return {
        punishments: punishments.map((p: any) => this.mapPunishmentToResponse(p)),
        total,
        limit,
        offset,
      };
    } catch (error) {
      this.logger.error(`Failed to get punishments: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取用户的活跃惩罚
   *
   * @param userId 用户ID
   * @returns 活跃惩罚列表
   */
  async getActivePunishments(userId: string): Promise<PunishmentResponse[]> {
    try {
      // 先检查缓存
      const cacheKey = `${this.PUNISHMENT_CACHE_PREFIX}active:${userId}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached) as PunishmentResponse[];
        } catch {
          // 缓存解析失败，继续查询数据库
        }
      }

      const now = new Date();

      const punishments = await (this.prisma as any).userPunishment.findMany({
        where: {
          userId,
          status: PunishmentStatus.ACTIVE,
          OR: [
            { isPermanent: true },
            { expiresAt: { gt: now } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });

      const response = punishments.map((p: any) => this.mapPunishmentToResponse(p));

      // 缓存结果
      await this.redis.set(cacheKey, JSON.stringify(response), this.PUNISHMENT_CACHE_TTL);

      return response;
    } catch (error) {
      this.logger.error(`Failed to get active punishments: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 撤销惩罚
   *
   * @param id 惩罚ID
   * @param dto 撤销参数
   * @returns 更新后的惩罚记录
   */
  async revokePunishment(id: string, dto: RevokePunishmentDto): Promise<PunishmentResponse> {
    this.logger.log(`Revoking punishment ${id}`);

    try {
      const punishment = await (this.prisma as any).userPunishment.findUnique({
        where: { id },
      });

      if (!punishment) {
        throw new NotFoundException(`Punishment with ID ${id} not found`);
      }

      if (punishment.status !== PunishmentStatus.ACTIVE) {
        throw new BadRequestException(`Punishment is not active, current status: ${punishment.status}`);
      }

      const updated = await (this.prisma as any).userPunishment.update({
        where: { id },
        data: {
          status: PunishmentStatus.REVOKED,
          revokedAt: new Date(),
          revokedBy: dto.revokedBy,
          revokeReason: dto.reason,
        },
      });

      const response = this.mapPunishmentToResponse(updated);

      // 清除用户惩罚缓存
      await this.invalidateUserPunishmentCache(punishment.userId);

      this.logger.log(`Punishment ${id} revoked`);

      return response;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to revoke punishment: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 检查用户是否有特定类型的惩罚
   *
   * @param userId 用户ID
   * @param type 惩罚类型
   * @returns 检查结果
   */
  async checkPunishment(userId: string, type: PunishmentType): Promise<PunishmentCheckResult> {
    try {
      const activePunishments = await this.getActivePunishments(userId);
      const punishment = activePunishments.find((p) => p.type === type);

      if (!punishment) {
        return { hasPunishment: false };
      }

      let remainingMinutes: number | undefined;
      if (!punishment.isPermanent && punishment.expiresAt) {
        const remaining = punishment.expiresAt.getTime() - Date.now();
        remainingMinutes = Math.max(0, Math.ceil(remaining / (60 * 1000)));
      }

      return {
        hasPunishment: true,
        punishment,
        remainingMinutes,
      };
    } catch (error) {
      this.logger.error(`Failed to check punishment: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 检查用户是否被禁言
   *
   * @param userId 用户ID
   * @returns 是否被禁言
   */
  async isUserMuted(userId: string): Promise<boolean> {
    const result = await this.checkPunishment(userId, PunishmentType.MUTE);
    return result.hasPunishment;
  }

  /**
   * 检查用户是否被封禁
   *
   * @param userId 用户ID
   * @returns 是否被封禁
   */
  async isUserBanned(userId: string): Promise<boolean> {
    const result = await this.checkPunishment(userId, PunishmentType.ACCOUNT_BAN);
    return result.hasPunishment;
  }

  /**
   * 检查用户是否被冻结
   *
   * @param userId 用户ID
   * @returns 是否被冻结
   */
  async isUserFrozen(userId: string): Promise<boolean> {
    const result = await this.checkPunishment(userId, PunishmentType.ACCOUNT_FREEZE);
    return result.hasPunishment;
  }

  /**
   * 检查用户是否有功能限制
   *
   * @param userId 用户ID
   * @returns 是否有功能限制
   */
  async hasFeatureRestriction(userId: string): Promise<boolean> {
    const result = await this.checkPunishment(userId, PunishmentType.FEATURE_RESTRICT);
    return result.hasPunishment;
  }

  /**
   * 从风控告警执行惩罚
   *
   * @param dto 执行参数
   * @returns 创建的惩罚记录
   */
  async executePunishment(dto: ExecutePunishmentFromAlertDto): Promise<PunishmentResponse> {
    this.logger.log(`Executing punishment from alert ${dto.alertId}`);

    try {
      // 获取告警信息
      const alert = await this.riskAlertService.getAlertById(dto.alertId);

      if (!alert.affectedUserIds || alert.affectedUserIds.length === 0) {
        throw new BadRequestException('Alert has no affected users');
      }

      // 对第一个受影响用户执行惩罚
      const userId = alert.affectedUserIds[0];

      const punishment = await this.createPunishment({
        userId,
        type: dto.type,
        reason: `基于风控告警: ${alert.title}`,
        description: alert.description,
        alertId: dto.alertId,
        durationMinutes: dto.durationMinutes,
        createdBy: dto.createdBy,
      });

      // 更新告警状态为已解决
      await this.riskAlertService.updateAlertStatus(
        dto.alertId,
        AlertStatus.RESOLVED,
        `已执行惩罚: ${dto.type}`,
        dto.createdBy,
      );

      return punishment;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to execute punishment from alert: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 批量从告警执行惩罚（对所有受影响用户）
   *
   * @param dto 执行参数
   * @returns 创建的惩罚记录列表
   */
  async executePunishmentForAllAffectedUsers(
    dto: ExecutePunishmentFromAlertDto,
  ): Promise<PunishmentResponse[]> {
    this.logger.log(`Executing punishment for all affected users from alert ${dto.alertId}`);

    try {
      const alert = await this.riskAlertService.getAlertById(dto.alertId);

      if (!alert.affectedUserIds || alert.affectedUserIds.length === 0) {
        throw new BadRequestException('Alert has no affected users');
      }

      const punishments: PunishmentResponse[] = [];

      for (const userId of alert.affectedUserIds) {
        try {
          const punishment = await this.createPunishment({
            userId,
            type: dto.type,
            reason: `基于风控告警: ${alert.title}`,
            description: alert.description,
            alertId: dto.alertId,
            durationMinutes: dto.durationMinutes,
            createdBy: dto.createdBy,
          });
          punishments.push(punishment);
        } catch (error) {
          this.logger.error(`Failed to create punishment for user ${userId}: ${String(error)}`);
        }
      }

      // 更新告警状态
      await this.riskAlertService.updateAlertStatus(
        dto.alertId,
        AlertStatus.RESOLVED,
        `已对 ${punishments.length} 个用户执行惩罚: ${dto.type}`,
        dto.createdBy,
      );

      return punishments;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(`Failed to execute punishment for all affected users: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取用户惩罚历史
   *
   * @param userId 用户ID
   * @returns 惩罚历史列表
   */
  async getPunishmentHistory(userId: string): Promise<PunishmentResponse[]> {
    try {
      const punishments = await (this.prisma as any).userPunishment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return punishments.map((p: any) => this.mapPunishmentToResponse(p));
    } catch (error) {
      this.logger.error(`Failed to get punishment history: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取用户惩罚状态汇总
   *
   * @param userId 用户ID
   * @returns 用户惩罚状态
   */
  async getUserPunishmentStatus(userId: string): Promise<UserPunishmentStatus> {
    try {
      const activePunishments = await this.getActivePunishments(userId);
      const totalPunishments = await (this.prisma as any).userPunishment.count({
        where: { userId },
      });

      return {
        userId,
        isMuted: activePunishments.some((p) => p.type === PunishmentType.MUTE),
        isBanned: activePunishments.some((p) => p.type === PunishmentType.ACCOUNT_BAN),
        isFrozen: activePunishments.some((p) => p.type === PunishmentType.ACCOUNT_FREEZE),
        hasFeatureRestriction: activePunishments.some(
          (p) => p.type === PunishmentType.FEATURE_RESTRICT,
        ),
        hasWarning: activePunishments.some((p) => p.type === PunishmentType.WARNING),
        activePunishments,
        totalPunishments,
      };
    } catch (error) {
      this.logger.error(`Failed to get user punishment status: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取用户惩罚历史统计
   *
   * @param userId 用户ID
   * @returns 惩罚历史统计
   */
  async getPunishmentHistoryStats(userId: string): Promise<PunishmentHistoryStats> {
    try {
      const punishments = await (this.prisma as any).userPunishment.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      const byType: Record<PunishmentType, number> = {
        [PunishmentType.WARNING]: 0,
        [PunishmentType.MUTE]: 0,
        [PunishmentType.FEATURE_RESTRICT]: 0,
        [PunishmentType.ACCOUNT_FREEZE]: 0,
        [PunishmentType.ACCOUNT_BAN]: 0,
      };

      const byStatus: Record<PunishmentStatus, number> = {
        [PunishmentStatus.ACTIVE]: 0,
        [PunishmentStatus.EXPIRED]: 0,
        [PunishmentStatus.REVOKED]: 0,
      };

      for (const p of punishments) {
        byType[p.type as PunishmentType]++;
        byStatus[p.status as PunishmentStatus]++;
      }

      return {
        userId,
        totalPunishments: punishments.length,
        byType,
        byStatus,
        firstPunishmentAt: punishments.length > 0 ? punishments[0].createdAt : undefined,
        lastPunishmentAt:
          punishments.length > 0 ? punishments[punishments.length - 1].createdAt : undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get punishment history stats: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 更新过期惩罚状态
   *
   * 定时任务调用，将过期的惩罚状态更新为 EXPIRED
   */
  async updateExpiredPunishments(): Promise<number> {
    this.logger.debug('Updating expired punishments');

    try {
      const now = new Date();

      const result = await (this.prisma as any).userPunishment.updateMany({
        where: {
          status: PunishmentStatus.ACTIVE,
          isPermanent: false,
          expiresAt: { lte: now },
        },
        data: {
          status: PunishmentStatus.EXPIRED,
        },
      });

      if (result.count > 0) {
        this.logger.log(`Updated ${result.count} expired punishments`);
      }

      return result.count;
    } catch (error) {
      this.logger.error(`Failed to update expired punishments: ${String(error)}`);
      throw error;
    }
  }

  /**
   * 获取惩罚详情
   *
   * @param id 惩罚ID
   * @returns 惩罚详情
   */
  async getPunishmentById(id: string): Promise<PunishmentResponse> {
    try {
      const punishment = await (this.prisma as any).userPunishment.findUnique({
        where: { id },
      });

      if (!punishment) {
        throw new NotFoundException(`Punishment with ID ${id} not found`);
      }

      return this.mapPunishmentToResponse(punishment);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to get punishment by id: ${String(error)}`);
      throw error;
    }
  }

  // ==================== 私有方法 ====================

  /**
   * 映射数据库记录到响应对象
   */
  private mapPunishmentToResponse(punishment: any): PunishmentResponse {
    return {
      id: punishment.id,
      userId: punishment.userId,
      type: punishment.type as PunishmentType,
      status: punishment.status as PunishmentStatus,
      reason: punishment.reason,
      description: punishment.description ?? undefined,
      alertId: punishment.alertId ?? undefined,
      isPermanent: punishment.isPermanent,
      expiresAt: punishment.expiresAt ?? undefined,
      revokedAt: punishment.revokedAt ?? undefined,
      revokedBy: punishment.revokedBy ?? undefined,
      revokeReason: punishment.revokeReason ?? undefined,
      createdBy: punishment.createdBy,
      createdAt: punishment.createdAt,
      updatedAt: punishment.updatedAt,
    };
  }

  /**
   * 清除用户惩罚缓存
   */
  private async invalidateUserPunishmentCache(userId: string): Promise<void> {
    try {
      const cacheKey = `${this.PUNISHMENT_CACHE_PREFIX}active:${userId}`;
      await this.redis.del(cacheKey);
    } catch (error) {
      this.logger.error(`Failed to invalidate punishment cache: ${String(error)}`);
    }
  }
}
