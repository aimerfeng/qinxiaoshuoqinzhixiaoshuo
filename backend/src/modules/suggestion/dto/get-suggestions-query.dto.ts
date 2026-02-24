import { IsOptional, IsEnum } from 'class-validator';
import { SuggestionStatus } from '@prisma/client';

/**
 * 获取建议列表查询参数 DTO
 */
export class GetSuggestionsQueryDto {
  /**
   * 建议状态筛选（可选）
   * - PENDING: 待审核
   * - ACCEPTED: 已采纳
   * - REJECTED: 已拒绝
   */
  @IsOptional()
  @IsEnum(SuggestionStatus, {
    message: '状态无效，必须是 PENDING、ACCEPTED 或 REJECTED',
  })
  status?: SuggestionStatus;
}
