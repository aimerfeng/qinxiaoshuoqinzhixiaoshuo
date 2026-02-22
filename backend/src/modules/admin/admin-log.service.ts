import { Injectable, Logger } from '@nestjs/common';

/**
 * 管理操作日志类型
 */
export type AdminActionType =
  | 'ADMIN_LOGIN'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_LOGIN_ATTEMPT_DENIED'
  | 'USER_BAN'
  | 'USER_UNBAN'
  | 'USER_VIEW'
  | 'CONTENT_DELETE'
  | 'CONTENT_RESTORE'
  | 'CONTENT_REVIEW'
  | 'MEMBER_APPROVE'
  | 'MEMBER_REJECT'
  | 'ACTIVITY_APPROVE'
  | 'ACTIVITY_REJECT'
  | 'TRANSACTION_REVIEW'
  | 'SYSTEM_CONFIG_UPDATE';

/**
 * 目标类型
 */
export type TargetType =
  | 'USER'
  | 'WORK'
  | 'CHAPTER'
  | 'CARD'
  | 'COMMENT'
  | 'ACTIVITY'
  | 'TRANSACTION'
  | 'SYSTEM';

/**
 * 管理操作日志参数
 */
export interface AdminLogParams {
  adminId: string;
  actionType: AdminActionType;
  targetType: TargetType;
  targetId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * 管理操作日志查询参数
 */
export interface AdminLogQueryParams {
  adminId?: string;
  actionType?: AdminActionType;
  targetType?: TargetType;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * 管理操作日志服务
 * 记录所有管理员操作，用于审计和追溯
 *
 * 需求18验收标准12: WHEN 管理员修改系统配置 THEN System SHALL 记录变更日志并即时生效
 */
@Injectable()
export class AdminLogService {
  private readonly logger = new Logger(AdminLogService.name);

  /**
   * 记录管理操作日志
   *
   * @param params 日志参数
   */
  logAction(params: AdminLogParams): void {
    const {
      adminId,
      actionType,
      targetType,
      targetId,
      description,
      metadata,
      ipAddress,
      userAgent,
    } = params;

    try {
      // 由于 AdminAuditLog 模型尚未在 Prisma Schema 中定义，
      // 暂时使用日志记录，后续可以添加数据库存储
      this.logger.log({
        message: 'Admin action logged',
        adminId,
        actionType,
        targetType,
        targetId,
        description,
        metadata,
        ipAddress,
        userAgent,
        timestamp: new Date().toISOString(),
      });

      // TODO: 当 AdminAuditLog 模型添加到 Prisma Schema 后，启用数据库存储
      // await this.prisma.adminAuditLog.create({
      //   data: {
      //     adminId,
      //     actionType,
      //     targetType,
      //     targetId,
      //     description,
      //     metadata,
      //     ipAddress,
      //     userAgent,
      //   },
      // });
    } catch (error) {
      // 日志记录失败不应影响主业务流程
      this.logger.error('Failed to log admin action', error);
    }
  }

  /**
   * 查询管理操作日志
   *
   * @param params 查询参数
   * @returns 日志列表和总数
   */
  queryLogs(params: AdminLogQueryParams): {
    logs: unknown[];
    total: number;
  } {
    // TODO: 当 AdminAuditLog 模型添加到 Prisma Schema 后，实现查询功能
    this.logger.log('Query admin logs', params);

    return {
      logs: [],
      total: 0,
    };
  }

  /**
   * 获取管理员最近的操作记录
   *
   * @param adminId 管理员ID
   * @param limit 限制数量
   * @returns 最近的操作记录
   */
  getRecentActions(adminId: string, limit: number = 10): unknown[] {
    // TODO: 当 AdminAuditLog 模型添加到 Prisma Schema 后，实现查询功能
    this.logger.log(`Get recent actions for admin ${adminId}, limit: ${limit}`);

    return [];
  }
}
