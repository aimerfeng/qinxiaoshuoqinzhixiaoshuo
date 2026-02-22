/**
 * 段落变更摘要
 *
 * 需求3验收标准6: WHEN 被引用的 Paragraph 内容更新 THEN System SHALL 在 Card 中标记"内容已更新"提示
 * 需求3验收标准7: IF 被引用的 Paragraph 被删除 THEN System SHALL 在 Card 中显示"原文已不存在"提示
 *
 * 用于追踪章节更新时段落的变更情况
 */
export interface ParagraphChangesSummary {
  /**
   * 新增的段落数量
   * 当新内容的段落数量超过原有段落数量时产生
   */
  added: number;

  /**
   * 修改的段落数量
   * 当同一位置的段落内容发生变化时（contentHash不同）
   */
  modified: number;

  /**
   * 删除的段落数量
   * 当新内容的段落数量少于原有段落数量时产生
   */
  deleted: number;

  /**
   * 未变更的段落数量
   * 当同一位置的段落内容相同时（contentHash相同）
   */
  unchanged: number;
}
