import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 黑名单用户信息
 */
export interface BlacklistUserDto {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 黑名单条目
 */
export interface BlacklistEntryDto {
  id: string;
  blockedUserId: string;
  blockedUser: BlacklistUserDto;
  reason: string | null;
  createdAt: Date;
}

/**
 * 获取黑名单列表查询参数
 */
export class GetBlacklistQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * 获取黑名单列表响应
 */
export interface GetBlacklistResponseDto {
  success: boolean;
  data: {
    users: BlacklistEntryDto[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

/**
 * 添加用户到黑名单请求
 */
export class AddToBlacklistDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * 添加用户到黑名单响应
 */
export interface AddToBlacklistResponseDto {
  success: boolean;
  message: string;
  data: BlacklistEntryDto;
}

/**
 * 从黑名单移除用户响应
 */
export interface RemoveFromBlacklistResponseDto {
  success: boolean;
  message: string;
}

/**
 * 检查用户是否在黑名单响应
 */
export interface CheckBlacklistResponseDto {
  success: boolean;
  data: {
    isBlocked: boolean;
    blockedAt?: Date;
    reason?: string | null;
  };
}
