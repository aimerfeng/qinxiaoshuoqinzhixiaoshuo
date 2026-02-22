/**
 * 章节版本历史 DTOs
 *
 * 需求2验收标准4: WHEN Creator 查看版本历史 THEN System SHALL 展示版本列表并支持查看任意历史版本
 */

/**
 * 版本列表项 DTO
 */
export interface ChapterVersionItemDto {
  /** 版本号 */
  version: number;

  /** 章节标题 */
  title: string;

  /** 字数 */
  wordCount: number;

  /** 创建时间 */
  createdAt: Date;
}

/**
 * 版本列表响应 DTO
 * GET /api/v1/works/:workId/chapters/:chapterId/versions
 */
export interface ChapterVersionListResponseDto {
  /** 响应消息 */
  message: string;

  /** 章节ID */
  chapterId: string;

  /** 当前版本号 */
  currentVersion: number;

  /** 版本列表（按版本号降序） */
  versions: ChapterVersionItemDto[];

  /** 版本总数 */
  totalVersions: number;
}

/**
 * 版本详情响应 DTO
 * GET /api/v1/works/:workId/chapters/:chapterId/versions/:version
 */
export interface ChapterVersionDetailResponseDto {
  /** 响应消息 */
  message: string;

  /** 章节ID */
  chapterId: string;

  /** 版本号 */
  version: number;

  /** 章节标题 */
  title: string;

  /** 章节内容 */
  content: string;

  /** 字数 */
  wordCount: number;

  /** 创建时间 */
  createdAt: Date;
}
