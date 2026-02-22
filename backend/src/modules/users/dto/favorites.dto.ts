import {
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReadingListStatus } from '@prisma/client';

/**
 * 用户收藏列表查询 DTO
 * 用于公开的用户主页收藏列表查询
 */
export class UserFavoritesQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  pageSize?: number = 20;

  @IsOptional()
  @IsEnum(ReadingListStatus)
  status?: ReadingListStatus;
}

/**
 * 收藏列表中的作品信息
 */
export interface FavoriteWorkInfo {
  id: string;
  title: string;
  coverImage: string | null;
  contentType: string;
  status: string;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatar: string | null;
  };
}

/**
 * 收藏列表项响应
 */
export interface FavoriteItemResponse {
  id: string;
  work: FavoriteWorkInfo;
  readingStatus: ReadingListStatus;
  addedAt: Date;
}

/**
 * 用户收藏列表响应 DTO
 */
export interface UserFavoritesResponseDto {
  items: FavoriteItemResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
