import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * 拒绝修订建议 DTO
 *
 * 需求5验收标准6: WHEN 用户提交修订建议时，THE Suggestion_System SHALL 以卡片形式发送给分支内容的创作者审核
 */
export class RejectSuggestionDto {
  /**
   * 审核备注（可选）
   */
  @IsOptional()
  @IsString({ message: '审核备注必须是字符串' })
  @MaxLength(500, { message: '审核备注不能超过500个字符' })
  reviewNote?: string;
}
