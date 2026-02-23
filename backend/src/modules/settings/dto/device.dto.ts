/**
 * 登录设备信息 DTO
 *
 * 需求21: 设置中心 - 登录设备管理
 * 需求21验收标准2: WHEN 用户查看登录设备 THEN System SHALL 显示设备名称、登录时间、IP地址
 */
export interface LoginDeviceDto {
  /** 设备ID */
  id: string;

  /** 设备指纹 */
  fingerprint: string;

  /** 设备名称（如 "Chrome on Windows"） */
  deviceName: string | null;

  /** 设备类型（desktop/mobile/tablet） */
  deviceType: string | null;

  /** 浏览器名称 */
  browser: string | null;

  /** 操作系统 */
  os: string | null;

  /** IP地址 */
  ipAddress: string | null;

  /** 地理位置 */
  location: string | null;

  /** 最后活跃时间 */
  lastActiveAt: Date;

  /** 首次登录时间 */
  createdAt: Date;

  /** 是否为当前设备 */
  isCurrentDevice: boolean;
}

/**
 * 获取登录设备列表响应 DTO
 */
export interface GetLoginDevicesResponseDto {
  message: string;
  devices: LoginDeviceDto[];
  total: number;
}

/**
 * 获取单个设备详情响应 DTO
 */
export interface GetDeviceByIdResponseDto {
  message: string;
  device: LoginDeviceDto | null;
}

/**
 * 移除设备响应 DTO
 *
 * 需求21验收标准3: WHEN 用户移除登录设备 THEN System SHALL 使该设备的会话失效
 */
export interface RemoveDeviceResponseDto {
  success: boolean;
  message: string;
}

/**
 * 移除所有其他设备响应 DTO
 */
export interface RemoveAllOtherDevicesResponseDto {
  success: boolean;
  message: string;
  removedCount: number;
}
