import {
  IsString,
  IsOptional,
  IsObject,
  IsNotEmpty,
} from 'class-validator';

/**
 * 记录设备指纹请求 DTO
 *
 * 需求19验收标准1: WHEN 用户注册 THEN System SHALL 采集设备指纹并建立用户画像
 * 需求19验收标准2: WHEN 用户登录 THEN System SHALL 更新设备和IP记录
 */
export class RecordFingerprintDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsString()
  @IsNotEmpty()
  fingerprint!: string;

  @IsString()
  @IsOptional()
  userAgent?: string;

  @IsString()
  @IsOptional()
  ipAddress?: string;

  @IsObject()
  @IsOptional()
  deviceInfo?: DeviceInfoPayload;
}

/**
 * 设备详细信息（浏览器、屏幕、时区等）
 */
export interface DeviceInfoPayload {
  screenResolution?: string;
  timezone?: string;
  language?: string;
  platform?: string;
  colorDepth?: number;
  touchSupport?: boolean;
  cookiesEnabled?: boolean;
  [key: string]: unknown;
}

/**
 * 设备记录响应
 */
export interface DeviceRecordResponse {
  id: string;
  userId: string;
  fingerprint: string;
  userAgent: string | null;
  ipAddress: string | null;
  deviceInfo: DeviceInfoPayload | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
}

/**
 * 多账户关联检测结果
 */
export interface MultiAccountDetection {
  fingerprint: string;
  ipAddress: string | null;
  userIds: string[];
  userCount: number;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * 用户设备历史响应
 */
export interface UserDeviceHistoryResponse {
  userId: string;
  devices: DeviceRecordResponse[];
  totalDevices: number;
}
