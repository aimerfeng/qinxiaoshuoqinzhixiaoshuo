import { IsArray, IsUUID, ArrayMinSize, ArrayNotEmpty } from 'class-validator';

/**
 * 章节排序 DTO
 * 需求2验收标准8: WHEN Creator 调整章节顺序 THEN System SHALL 更新排序并维护Anchor_ID映射
 */
export class ReorderChaptersDto {
  @IsArray({ message: '章节ID列表必须是数组' })
  @ArrayNotEmpty({ message: '章节ID列表不能为空' })
  @ArrayMinSize(1, { message: '至少需要一个章节ID' })
  @IsUUID('4', { each: true, message: '每个章节ID必须是有效的UUID' })
  chapterIds!: string[];
}

/**
 * 章节排序响应 DTO
 */
export interface ReorderChaptersResponseDto {
  message: string;
  updatedCount: number;
}
