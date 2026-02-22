import { IsString, IsUUID, IsNotEmpty } from 'class-validator';

/**
 * 创建引用请求 DTO
 *
 * 需求3验收标准3: WHEN 用户执行引用操作 THEN System SHALL 创建包含 Anchor_ID 引用的 Card 草稿
 * 需求3验收标准4: WHEN Card 包含 Anchor_ID 引用被发布到 Plaza THEN System SHALL 渲染原文预览并提供跳转链接
 */
export class CreateQuoteDto {
  /**
   * 引用该锚点的 Card ID
   * Card 必须已存在且属于当前用户
   */
  @IsString()
  @IsUUID()
  @IsNotEmpty({ message: 'cardId 不能为空' })
  cardId: string;
}

/**
 * 创建引用响应 DTO
 */
export class CreateQuoteResponseDto {
  /**
   * 创建的引用记录 ID
   */
  id: string;

  /**
   * 关联的 Card ID
   */
  cardId: string;

  /**
   * 关联的段落 ID
   */
  paragraphId: string;

  /**
   * 引用时的原文快照
   */
  originalContent: string;

  /**
   * 创建时间
   */
  createdAt: string;

  /**
   * 锚点信息
   */
  anchor: {
    anchorId: string;
    quoteCount: number;
  };
}
