import {
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { LibraryType } from '@prisma/client';

/**
 * 排序字段枚举
 */
export enum LibrarySortBy {
  HOT_SCORE = 'hotScore',
  CREATED_AT = 'createdAt',
  BRANCH_COUNT = 'branchCount',
}

/**
 * 排序方向枚举
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 获取小说库列表查询 DTO
 *
 * 需求7验收标准2: WHEN 展示小说库列表时，THE Ranking_System SHALL 支持按热度分数降序排序
 */
export class GetLibrariesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码不能小于1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量不能小于1' })
  @Max(100, { message: '每页数量不能超过100' })
  limit?: number = 20;

  @IsOptional()
  @IsEnum(LibrarySortBy, {
    message: '排序字段无效，必须是 hotScore、createdAt 或 branchCount',
  })
  sortBy?: LibrarySortBy = LibrarySortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder, { message: '排序方向无效，必须是 asc 或 desc' })
  sortOrder?: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsEnum(LibraryType, { message: '库类型无效，必须是 ORIGINAL 或 SHARED' })
  libraryType?: LibraryType;

  @IsOptional()
  @IsUUID('4', { message: '拥有者ID必须是有效的UUID' })
  ownerId?: string;
}
