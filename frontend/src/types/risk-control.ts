/**
 * 风控系统类型定义
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 */

// 告警类型枚举
export enum AlertType {
  MULTI_ACCOUNT_DETECTED = 'MULTI_ACCOUNT_DETECTED', // 同设备/IP多账户
  SUSPICIOUS_TRANSACTION = 'SUSPICIOUS_TRANSACTION', // 可疑交易模式
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED', // 频率限制违规
  CIRCULAR_TRANSFER = 'CIRCULAR_TRANSFER', // 循环转账检测
  CONCENTRATED_RECEIPTS = 'CONCENTRATED_RECEIPTS', // 新账户集中收币
  ACCOUNT_CLUSTER = 'ACCOUNT_CLUSTER', // 可疑账户集群
}

// 告警严重程度枚举
export enum AlertSeverity {
  CRITICAL = 'CRITICAL', // 需要立即处理
  HIGH = 'HIGH', // 需要在数小时内处理
  MEDIUM = 'MEDIUM', // 需要在数天内处理
  LOW = 'LOW', // 信息性告警
}

// 告警状态枚举
export enum AlertStatus {
  PENDING = 'PENDING', // 待处理
  INVESTIGATING = 'INVESTIGATING', // 调查中
  RESOLVED = 'RESOLVED', // 已解决
  DISMISSED = 'DISMISSED', // 已忽略
}

// 告警备注接口
export interface AlertNote {
  id: string;
  content: string;
  authorId: string;
  authorName?: string;
  createdAt: string;
}

// 告警响应接口
export interface RiskAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description?: string;
  data?: Record<string, unknown>;
  affectedUserIds: string[];
  sourceService?: string;
  assignedTo?: string;
  assignedToName?: string;
  notes: AlertNote[];
  resolvedAt?: string;
  resolvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// 告警列表响应接口
export interface AlertListResponse {
  alerts: RiskAlert[];
  total: number;
  limit: number;
  offset: number;
}

// 告警统计接口
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

// 告警过滤器接口
export interface AlertFilters {
  type?: AlertType;
  severity?: AlertSeverity;
  status?: AlertStatus;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

// 告警类型显示名称映射
export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  [AlertType.MULTI_ACCOUNT_DETECTED]: '多账户关联',
  [AlertType.SUSPICIOUS_TRANSACTION]: '可疑交易',
  [AlertType.RATE_LIMIT_EXCEEDED]: '频率超限',
  [AlertType.CIRCULAR_TRANSFER]: '循环转账',
  [AlertType.CONCENTRATED_RECEIPTS]: '集中收币',
  [AlertType.ACCOUNT_CLUSTER]: '账户集群',
};

// 告警严重程度显示名称映射
export const ALERT_SEVERITY_LABELS: Record<AlertSeverity, string> = {
  [AlertSeverity.CRITICAL]: '紧急',
  [AlertSeverity.HIGH]: '高',
  [AlertSeverity.MEDIUM]: '中',
  [AlertSeverity.LOW]: '低',
};

// 告警状态显示名称映射
export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  [AlertStatus.PENDING]: '待处理',
  [AlertStatus.INVESTIGATING]: '调查中',
  [AlertStatus.RESOLVED]: '已解决',
  [AlertStatus.DISMISSED]: '已忽略',
};

// 惩罚类型枚举
export enum PunishmentType {
  WARNING = 'WARNING',
  MUTE = 'MUTE',
  FEATURE_RESTRICT = 'FEATURE_RESTRICT',
  ACCOUNT_FREEZE = 'ACCOUNT_FREEZE',
  ACCOUNT_BAN = 'ACCOUNT_BAN',
}

// 惩罚类型显示名称映射
export const PUNISHMENT_TYPE_LABELS: Record<PunishmentType, string> = {
  [PunishmentType.WARNING]: '警告',
  [PunishmentType.MUTE]: '禁言',
  [PunishmentType.FEATURE_RESTRICT]: '功能限制',
  [PunishmentType.ACCOUNT_FREEZE]: '账户冻结',
  [PunishmentType.ACCOUNT_BAN]: '账户封禁',
};

// 惩罚时长预设（分钟）
export const PUNISHMENT_DURATION_PRESETS = {
  MUTE_1_HOUR: 60,
  MUTE_6_HOURS: 360,
  MUTE_1_DAY: 1440,
  MUTE_3_DAYS: 4320,
  MUTE_7_DAYS: 10080,
  MUTE_30_DAYS: 43200,
  PERMANENT: -1,
} as const;

// 惩罚时长显示名称映射
export const PUNISHMENT_DURATION_LABELS: Record<number, string> = {
  60: '1 小时',
  360: '6 小时',
  1440: '1 天',
  4320: '3 天',
  10080: '7 天',
  43200: '30 天',
  [-1]: '永久',
};

// 状态变更记录接口
export interface AlertStatusChange {
  id: string;
  alertId: string;
  fromStatus: AlertStatus | null;
  toStatus: AlertStatus;
  changedBy: string;
  changedByName?: string;
  note?: string;
  createdAt: string;
}

// 受影响用户信息接口
export interface AffectedUser {
  id: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}

// 告警详情响应接口（扩展）
export interface AlertDetailResponse extends RiskAlert {
  statusHistory?: AlertStatusChange[];
  affectedUsers?: AffectedUser[];
}


// ============================================
// 风控报告相关类型定义 (Task 19.2.4)
// ============================================

// 时间范围类型
export type TimeRange = 'today' | '7days' | '30days' | 'custom';

// 时间范围配置
export interface TimeRangeConfig {
  range: TimeRange;
  startDate?: string;
  endDate?: string;
}

// 报告统计概览
export interface ReportOverviewStats {
  totalAlerts: number;
  resolvedAlerts: number;
  resolvedRate: number;
  avgResolutionTimeHours: number;
  totalPunishments: number;
  activePunishments: number;
  expiredPunishments: number;
  uniqueAffectedUsers: number;
}

// 按类型统计
export interface AlertsByTypeStats {
  type: AlertType;
  label: string;
  count: number;
  percentage: number;
}

// 按严重程度统计
export interface AlertsBySeverityStats {
  severity: AlertSeverity;
  label: string;
  count: number;
  percentage: number;
}

// 趋势数据点
export interface TrendDataPoint {
  date: string;
  count: number;
  resolved?: number;
  pending?: number;
}

// 告警趋势数据
export interface AlertTrendData {
  daily: TrendDataPoint[];
  weekly?: TrendDataPoint[];
}

// 解决率趋势数据点
export interface ResolutionRateTrendPoint {
  date: string;
  rate: number;
  resolved: number;
  total: number;
}

// 高风险用户
export interface TopRiskUser {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  alertCount: number;
  punishmentCount: number;
  lastAlertDate?: string;
  riskScore: number;
}

// 惩罚统计
export interface PunishmentStats {
  byType: {
    type: PunishmentType;
    label: string;
    count: number;
    percentage: number;
  }[];
  activeCount: number;
  expiredCount: number;
  totalCount: number;
  effectivenessRate: number; // 惩罚后无再犯率
}

// 完整报告数据
export interface RiskControlReportData {
  overview: ReportOverviewStats;
  alertsByType: AlertsByTypeStats[];
  alertsBySeverity: AlertsBySeverityStats[];
  alertTrend: AlertTrendData;
  resolutionRateTrend: ResolutionRateTrendPoint[];
  topRiskUsers: TopRiskUser[];
  punishmentStats: PunishmentStats;
  generatedAt: string;
  timeRange: TimeRangeConfig;
}

// 时间范围显示名称映射
export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  today: '今天',
  '7days': '最近 7 天',
  '30days': '最近 30 天',
  custom: '自定义',
};
