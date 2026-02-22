import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MemberLevel } from '@prisma/client';

/**
 * 用户状态筛选枚举
 */
export enum UserStatusFilter {
  ALL = 'all',
  ACTIVE = 'active',
  BANNED = 'banned',
}

/**
 * 用户角色筛选枚举
 */
export enum UserRoleFilter {
  ALL = 'all',
  ADMIN = 'admin',
  USER = 'user',
}

/**
 * 排序字段枚举
 */
export enum UserSortField {
  CREATED_AT = 'createdAt',
  LAST_LOGIN_AT = 'lastLoginAt',
  CONTRIBUTION_SCORE = 'contributionScore',
  USERNAME = 'username',
}

/**
 * 排序方向枚举
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 用户列表查询 DTO
 * 支持分页、搜索、筛选和排序
 *
 * 需求18验收标准3: WHEN 运营人员搜索用户 THEN System SHALL 支持按ID、昵称、邮箱等条件查询
 */
export class UserListQueryDto {
  /**
   * 页码（从1开始）
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码最小为1' })
  page?: number = 1;

  /**
   * 每页数量
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量最小为1' })
  @Max(100, { message: '每页数量最大为100' })
  limit?: number = 20;

  /**
   * 搜索关键词（支持用户名、邮箱、显示名）
   */
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  /**
   * 用户状态筛选
   */
  @IsOptional()
  @IsEnum(UserStatusFilter, { message: '无效的用户状态筛选值' })
  status?: UserStatusFilter = UserStatusFilter.ALL;

  /**
   * 用户角色筛选
   */
  @IsOptional()
  @IsEnum(UserRoleFilter, { message: '无效的用户角色筛选值' })
  role?: UserRoleFilter = UserRoleFilter.ALL;

  /**
   * 会员等级筛选
   */
  @IsOptional()
  @IsEnum(MemberLevel, { message: '无效的会员等级' })
  memberLevel?: MemberLevel;

  /**
   * 排序字段
   */
  @IsOptional()
  @IsEnum(UserSortField, { message: '无效的排序字段' })
  sortBy?: UserSortField = UserSortField.CREATED_AT;

  /**
   * 排序方向
   */
  @IsOptional()
  @IsEnum(SortOrder, { message: '无效的排序方向' })
  sortOrder?: SortOrder = SortOrder.DESC;
}

/**
 * 用户更新 DTO
 * 用于管理员更新用户信息
 *
 * 需求18验收标准5: WHEN 运营人员封禁用户 THEN System SHALL 记录原因、生效时间并通知用户
 */
export class UserUpdateDto {
  /**
   * 是否激活（false表示封禁）
   */
  @IsOptional()
  @IsBoolean({ message: 'isActive必须是布尔值' })
  isActive?: boolean;

  /**
   * 是否为管理员
   */
  @IsOptional()
  @IsBoolean({ message: 'isAdmin必须是布尔值' })
  isAdmin?: boolean;

  /**
   * 会员等级
   */
  @IsOptional()
  @IsEnum(MemberLevel, { message: '无效的会员等级' })
  memberLevel?: MemberLevel;

  /**
   * 封禁/操作原因
   */
  @IsOptional()
  @IsString({ message: '原因必须是字符串' })
  reason?: string;
}

/**
 * 用户列表项响应 DTO
 */
export interface UserListItemDto {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isEmailVerified: boolean;
  isActive: boolean;
  isAdmin: boolean;
  memberLevel: MemberLevel;
  contributionScore: number;
  lastLoginAt: Date | null;
  createdAt: Date;
}

/**
 * 用户详情响应 DTO
 *
 * 需求18验收标准4: WHEN 运营人员查看用户详情 THEN System SHALL 显示资料、行为记录、处罚历史
 */
export interface UserDetailDto extends UserListItemDto {
  bio: string | null;
  profile: {
    backgroundImage: string | null;
    website: string | null;
    location: string | null;
    birthday: Date | null;
    gender: string | null;
  } | null;
  stats: {
    worksCount: number;
    cardsCount: number;
    followersCount: number;
    followingCount: number;
    totalReadingTime: number;
  };
  updatedAt: Date;
}

/**
 * 用户列表响应 DTO
 */
export interface UserListResponseDto {
  users: UserListItemDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 用户操作结果响应 DTO
 */
export interface UserOperationResultDto {
  success: boolean;
  message: string;
  user?: UserListItemDto;
}
