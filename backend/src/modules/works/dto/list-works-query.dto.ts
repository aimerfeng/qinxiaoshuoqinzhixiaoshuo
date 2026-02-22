import { IsOptional, IsEnum, IsString, IsUUID, IsIn } from 'class-validator';
import { ContentType, WorkStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

/**
 * 作品排序字段
 */
export type WorkSortField =
  | 'createdAt'
  | 'updatedAt'
  | 'viewCount'
  | 'likeCount';

/**
 * 作品列表查询 DTO
 *
 * 需求8验收标准2: WHEN 用户浏览作品列表 THEN System SHALL 支持按分类、标签、热度、更新时间筛选
 * 需求8验收标准5: WHEN 用户查看作品标签 THEN System SHALL 支持点击标签查看同类作品
 */
export class ListWorksQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ContentType, { message: '作品类型无效，必须是 NOVEL 或 MANGA' })
  contentType?: ContentType;

  @IsOptional()
  @IsEnum(WorkStatus, { message: '作品状态无效' })
  status?: WorkStatus;

  @IsOptional()
  @IsString({ message: '标签必须是字符串' })
  tag?: string;

  @IsOptional()
  @IsUUID('4', { message: '作者ID格式无效' })
  authorId?: string;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'viewCount', 'likeCount'], {
    message: '排序字段无效，可选值: createdAt, updatedAt, viewCount, likeCount',
  })
  sortBy?: WorkSortField = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: '排序方向无效，可选值: asc, desc' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
