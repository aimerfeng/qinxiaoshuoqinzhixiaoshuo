import { IsString, IsEnum, IsOptional, IsObject, IsUUID, IsInt, Min, Max } from 'class-validator';

/**
 * 风控告警类型枚举
 *
 * 需求19: 风控与反作弊系统 - 风控告警服务
 */
export enum AlertType {
  MULTI_ACCOUNT_DETECTED = 'MULTI_ACCOUNT_DETECTED', // 同设备/IP多账户
  SUSPICIOUS_TRANSACTION = 'SUSPICIOUS_TRANSACTION', // 可疑交易模式
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED', // 频率限制违规
  CIRCULAR_TRANSFER = 'CIRCULAR_TRANSFER', // 循环转账检测
  CONCENTRATED_RECEIPTS = 'CONCENTRATED_RECEIPTS', // 新账户集中收币
  ACCOUNT_CLUSTER = 'ACCOUNT_CLUSTER', // 可疑账户集群
}

/**
 * 告警严重程度枚举
 */
export enum AlertSeverity {
  CRITICAL = 'CRITICAL', // 需要立即处理
  HIGH = 'HIGH', // 需要在数小时内处理
  MEDIUM = 'MEDIUM', // 需要在数天内处理
  LOW = 'LOW', // 信息性告警
}

/**
 * 告警状态枚举
 */
export enum AlertStatus {
  PENDING = 'PENDING', // 待处理
  INVESTIGATING = 'INVESTIGATING', // 调查中
  RESOLVED = 'RESOLVED', // 已解决
  DISMISSED = 'DISMISSED', // 已忽略
}

/**
 * 创建告警 DTO
 */
export class CreateAlertDto {
  @IsEnum(AlertType)
  type!: AlertType;

  @IsEnum(AlertSeverity)
  severity!: AlertSeverity;

  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  data?: Record<string, any>;

  @IsString({ each: true })
  @IsOptional()
  affectedUserIds?: string[];

  @IsString()
  @IsOptional()
  sourceService?: string;
}


/**
 * 更新告警状态 DTO
 */
export class UpdateAlertStatusDto {
  @IsEnum(AlertStatus)
  status!: AlertStatus;

  @IsString()
  @IsOptional()
  note?: string;
}

/**
 * 分配告警 DTO
 */
export class AssignAlertDto {
  @IsUUID()
  adminId!: string;
}

/**
 * 添加告警备注 DTO
 */
export class AddAlertNoteDto {
  @IsString()
  note!: string;
}

/**
 * 告警查询过滤器
 */
export class AlertFiltersDto {
  @IsEnum(AlertType)
  @IsOptional()
  type?: AlertType;

  @IsEnum(AlertSeverity)
  @IsOptional()
  severity?: AlertSeverity;

  @IsEnum(AlertStatus)
  @IsOptional()
  status?: AlertStatus;

  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  offset?: number;
}

/**
 * 告警备注接口
 */
export interface AlertNote {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt: Date;
}

/**
 * 告警响应接口
 */
export interface RiskAlertResponse {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description?: string;
  data?: Record<string, any>;
  affectedUserIds: string[];
  sourceService?: string;
  assignedTo?: string;
  assignedToName?: string;
  notes: AlertNote[];
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 告警列表响应接口
 */
export interface AlertListResponse {
  alerts: RiskAlertResponse[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * 告警统计接口
 */
export interface AlertStats {
  total: number;
  byStatus: {
    pending: number;
    investigating: number;
    resolved: number;
    dismissed: number;
  };
  bySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  byType: Record<AlertType, number>;
  last24Hours: number;
  last7Days: number;
  avgResolutionTimeHours: number;
}

/**
 * 触发告警参数接口
 */
export interface TriggerAlertParams {
  type: AlertType;
  severity?: AlertSeverity;
  title?: string;
  description?: string;
  data?: Record<string, any>;
  affectedUserIds?: string[];
  sourceService?: string;
}

/**
 * 实时告警通知接口
 */
export interface AlertNotification {
  alertId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  description?: string;
  createdAt: Date;
}
