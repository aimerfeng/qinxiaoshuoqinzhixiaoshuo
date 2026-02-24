import { IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { BranchType } from '@prisma/client';

/**
 * 分支排序字段枚举
 */
export enum BranchSortBy {
  HOT_SCORE = 'hotScore',
  CREATED_AT = 'createdAt',
  LIKE_COUNT = 'likeCount',
  TIP_AMOUNT = 'tipAmount',
}

/**
 * 排序方向枚举
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 获取分支列表查询 DTO
 *
 * 需求2验收标准2: WHEN 展示正文分支列表时，THE Branch_System SHALL 按（点赞数 + 打赏贡献值）降序排序
 * 需求7验收标准4: WHEN 展示分支列表时，THE Ranking_System SHALL 支持按热度排序（点赞 + 打赏贡献）
 */
export class GetBranchesQueryDto {
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

  /**
   * 分支类型筛选
   * - MAIN: 正文分支
   * - DERIVATIVE: 改写分支
   * - MANGA: 漫画分支
   */
  @IsOptional()
  @IsEnum(BranchType, {
    message: '分支类型无效，必须是 MAIN、DERIVATIVE 或 MANGA',
  })
  branchType?: BranchType;

  /**
   * 排序字段
   * - hotScore: 热度分数
   * - createdAt: 创建时间
   * - likeCount: 点赞数
   * - tipAmount: 打赏金额
   */
  @IsOptional()
  @IsEnum(BranchSortBy, {
    message: '排序字段无效，必须是 hotScore、createdAt、likeCount 或 tipAmount',
  })
  sortBy?: BranchSortBy = BranchSortBy.HOT_SCORE;

  /**
   * 排序方向
   */
  @IsOptional()
  @IsEnum(SortOrder, { message: '排序方向无效，必须是 asc 或 desc' })
  sortOrder?: SortOrder = SortOrder.DESC;
}
