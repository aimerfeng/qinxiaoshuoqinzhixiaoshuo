import { IsInt, Min } from 'class-validator';

/**
 * 章节版本回滚 DTOs
 *
 * 需求2验收标准5: WHEN Creator 回滚到历史版本 THEN System SHALL 恢复内容并创建新版本记录
 */

/**
 * 回滚章节请求 DTO
 * POST /api/v1/works/:workId/chapters/:chapterId/rollback
 */
export class RollbackChapterDto {
  /**
   * 目标版本号
   * 要回滚到的历史版本号
   */
  @IsInt({ message: '目标版本号必须是整数' })
  @Min(1, { message: '目标版本号必须大于0' })
  targetVersion!: number;
}

/**
 * 回滚章节响应 DTO
 */
export interface RollbackChapterResponseDto {
  /** 响应消息 */
  message: string;

  /** 章节ID */
  chapterId: string;

  /** 回滚前的版本号 */
  previousVersion: number;

  /** 回滚后的新版本号 */
  newVersion: number;

  /** 目标版本号（回滚到的版本） */
  targetVersion: number;

  /** 恢复的章节标题 */
  title: string;

  /** 恢复的字数 */
  wordCount: number;
}
