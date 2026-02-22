import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 关注/粉丝列表查询参数 DTO
 * 需求17验收标准: 关注/粉丝列表 API
 */
export class FollowListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;
}

/**
 * 用户基础信息（用于关注/粉丝列表）
 */
export interface FollowUserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
}

/**
 * 关注/粉丝列表项
 */
export interface FollowListItem {
  user: FollowUserInfo;
  followedAt: Date;
  isFollowing: boolean | null; // 当前用户是否关注了该用户（未登录时为null）
  isFollowedBy: boolean | null; // 该用户是否关注了当前用户（未登录时为null）
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 关注/粉丝列表响应 DTO
 */
export interface FollowListResponseDto {
  items: FollowListItem[];
  pagination: PaginationInfo;
}

/**
 * 关注操作响应 DTO
 */
export interface FollowActionResponseDto {
  message: string;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

/**
 * 关注状态响应 DTO
 */
export interface FollowStatusResponseDto {
  isFollowing: boolean;
  isFollowedBy: boolean;
}
