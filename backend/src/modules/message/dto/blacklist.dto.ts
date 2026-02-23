import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 拉黑用户请求DTO
 */
export class BlockUserDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

/**
 * 获取黑名单列表请求DTO
 */
export class GetBlockedUsersDto {
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
 * 被拉黑用户信息DTO
 */
export interface BlockedUserInfoDto {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 黑名单条目响应DTO
 */
export interface BlockedUserResponseDto {
  id: string;
  blockedUserId: string;
  blockedUser: BlockedUserInfoDto;
  reason: string | null;
  createdAt: Date;
}

/**
 * 黑名单列表响应DTO
 */
export interface BlockedUsersListResponseDto {
  users: BlockedUserResponseDto[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * 检查是否被拉黑响应DTO
 */
export interface IsBlockedResponseDto {
  isBlocked: boolean;
}
