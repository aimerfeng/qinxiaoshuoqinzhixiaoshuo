import {
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReadingListStatus } from '@prisma/client';

/**
 * 添加到阅读列表 DTO
 */
export class AddToReadingListDto {
  @IsString()
  workId!: string;

  @IsOptional()
  @IsEnum(ReadingListStatus)
  status?: ReadingListStatus = ReadingListStatus.WANT_TO_READ;

  @IsOptional()
  @IsString()
  note?: string;
}

/**
 * 更新阅读列表项 DTO
 */
export class UpdateReadingListItemDto {
  @IsOptional()
  @IsEnum(ReadingListStatus)
  status?: ReadingListStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsBoolean()
  hasUpdate?: boolean;
}

/**
 * 阅读列表查询 DTO
 */
export class ReadingListQueryDto {
  @IsOptional()
  @IsEnum(ReadingListStatus)
  status?: ReadingListStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  hasUpdate?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;

  @IsOptional()
  @IsString()
  sortBy?: 'lastReadAt' | 'createdAt' | 'updatedAt' = 'lastReadAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * 批量操作 DTO
 */
export class BatchUpdateDto {
  @IsString({ each: true })
  itemIds!: string[];

  @IsOptional()
  @IsEnum(ReadingListStatus)
  status?: ReadingListStatus;

  @IsOptional()
  @IsBoolean()
  markAsRead?: boolean;
}

/**
 * 阅读列表项响应 DTO
 */
export class ReadingListItemResponseDto {
  id!: string;
  workId!: string;
  status!: ReadingListStatus;
  lastReadChapterId?: string | null;
  lastReadAt?: Date | null;
  hasUpdate!: boolean;
  note?: string | null;
  rating?: number | null;
  createdAt!: Date;
  updatedAt!: Date;
  work?: {
    id: string;
    title: string;
    coverImage?: string | null;
    authorId: string;
    status: string;
    contentType: string;
    wordCount: number;
    author?: {
      id: string;
      username: string;
      displayName?: string | null;
    };
  };
}

/**
 * 阅读列表响应 DTO
 */
export class ReadingListResponseDto {
  items!: ReadingListItemResponseDto[];
  total!: number;
  statusCounts!: Record<ReadingListStatus, number>;
}
