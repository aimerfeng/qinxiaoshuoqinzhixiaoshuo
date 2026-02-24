import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SuggestionType } from '@prisma/client';

/**
 * 创建修订建议 DTO
 *
 * 需求5验收标准1: WHEN 用户选择段落并创建修订建议时，THE Suggestion_System SHALL 显示侧边栏编辑界面
 * 需求5验收标准3: THE Suggestion_System SHALL 支持在选中段落前后添加新段落
 * 需求5验收标准4: THE Suggestion_System SHALL 支持修改选中段落的内容
 * 需求5验收标准5: THE Suggestion_System SHALL 支持在段落中插入插图（富文本编辑）
 */
export class CreateSuggestionDto {
  /**
   * 分支ID
   */
  @IsUUID('4', { message: '分支ID必须是有效的UUID' })
  branchId!: string;

  /**
   * 建议类型
   * - MODIFY: 修改段落内容
   * - INSERT_BEFORE: 在段落前插入
   * - INSERT_AFTER: 在段落后插入
   * - ADD_IMAGE: 添加插图
   */
  @IsEnum(SuggestionType, {
    message: '建议类型无效，必须是 MODIFY、INSERT_BEFORE、INSERT_AFTER 或 ADD_IMAGE',
  })
  suggestionType!: SuggestionType;

  /**
   * 建议内容（MODIFY, INSERT_BEFORE, INSERT_AFTER 类型使用）
   */
  @IsOptional()
  @IsString({ message: '建议内容必须是字符串' })
  @MaxLength(10000, { message: '建议内容不能超过10000个字符' })
  suggestedContent?: string;

  /**
   * 插图URL（ADD_IMAGE 类型使用）
   */
  @IsOptional()
  @IsString({ message: '图片URL必须是字符串' })
  @MaxLength(500, { message: '图片URL不能超过500个字符' })
  imageUrl?: string;
}
