import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 锚点上下文查询参数 DTO
 * 用于获取锚点周围段落的上下文
 */
export class AnchorContextQueryDto {
  /** 目标段落之前的段落数量 (默认: 1) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  before?: number = 1;

  /** 目标段落之后的段落数量 (默认: 1) */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  after?: number = 1;
}

/**
 * 上下文段落信息
 */
export interface ContextParagraphDto {
  /** 锚点ID */
  anchorId: string;

  /** 段落内容 */
  content: string;

  /** 段落在章节中的位置索引 */
  orderIndex: number;
}

/**
 * 章节简要信息
 */
export interface ContextChapterDto {
  /** 章节ID */
  id: string;

  /** 章节标题 */
  title: string;
}

/**
 * 作品简要信息
 */
export interface ContextWorkDto {
  /** 作品ID */
  id: string;

  /** 作品标题 */
  title: string;
}

/**
 * 锚点上下文响应 DTO
 * 返回目标段落及其周围段落的上下文信息
 */
export interface AnchorContextResponseDto {
  /** 目标段落 */
  target: ContextParagraphDto;

  /** 目标段落之前的段落列表 (按 orderIndex 升序) */
  before: ContextParagraphDto[];

  /** 目标段落之后的段落列表 (按 orderIndex 升序) */
  after: ContextParagraphDto[];

  /** 章节信息 */
  chapter: ContextChapterDto;

  /** 作品信息 */
  work: ContextWorkDto;
}
