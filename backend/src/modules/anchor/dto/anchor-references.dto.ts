import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 锚点引用列表查询参数 DTO
 *
 * 需求3验收标准8: WHEN 用户查看 Paragraph 详情 THEN System SHALL 显示该段落被引用的次数和引用列表
 */
export class AnchorReferencesQueryDto {
  /** 页码，从1开始 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** 每页数量，默认20，最大50 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

/**
 * 引用 Card 的作者信息
 */
export interface ReferenceAuthorDto {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 引用 Card 信息
 */
export interface ReferenceCardDto {
  /** Card ID */
  id: string;

  /** Card 内容 */
  content: string;

  /** 作者信息 */
  author: ReferenceAuthorDto;

  /** 点赞数 */
  likeCount: number;

  /** 评论数 */
  commentCount: number;

  /** 引用时的原文快照 */
  originalContent: string;

  /** 原文是否已更新 */
  contentUpdated: boolean;

  /** 创建时间 */
  createdAt: string;
}

/**
 * 锚点引用列表响应 DTO
 */
export interface AnchorReferencesResponseDto {
  /** 引用该锚点的 Card 列表 */
  cards: ReferenceCardDto[];

  /** 分页信息 */
  pagination: {
    /** 当前页码 */
    page: number;
    /** 每页数量 */
    limit: number;
    /** 总数量 */
    total: number;
    /** 总页数 */
    totalPages: number;
    /** 是否有下一页 */
    hasMore: boolean;
  };
}
