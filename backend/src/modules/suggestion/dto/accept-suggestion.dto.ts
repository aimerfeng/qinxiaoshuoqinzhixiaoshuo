import {
  IsOptional,
  IsInt,
  IsBoolean,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * 采纳修订建议 DTO
 *
 * 需求5验收标准7: WHEN 内容创作者采纳建议时，THE Suggestion_System SHALL 奖励建议提交者贡献积分
 * 需求5验收标准8: WHEN 建议被采纳时，THE Suggestion_System SHALL 自动生成社区动态卡片（可编辑后发布）
 */
export class AcceptSuggestionDto {
  /**
   * 奖励积分（可选）
   */
  @IsOptional()
  @IsInt({ message: '奖励积分必须是整数' })
  @Min(0, { message: '奖励积分不能为负数' })
  rewardAmount?: number;

  /**
   * 是否发布动态卡片
   */
  @IsOptional()
  @IsBoolean({ message: 'publishCard 必须是布尔值' })
  publishCard?: boolean;

  /**
   * 卡片内容（可编辑）
   */
  @IsOptional()
  @IsString({ message: '卡片内容必须是字符串' })
  @MaxLength(2000, { message: '卡片内容不能超过2000个字符' })
  cardContent?: string;
}
