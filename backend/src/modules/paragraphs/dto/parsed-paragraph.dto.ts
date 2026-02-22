/**
 * 解析后的段落数据结构
 *
 * 需求3验收标准1: WHEN Chapter 发布 THEN System SHALL 为每个 Paragraph 生成格式为
 * `{work_id}:{chapter_id}:{paragraph_index}` 的 Anchor_ID
 */
export interface ParsedParagraph {
  /**
   * 段落在章节中的顺序索引（从0开始）
   */
  index: number;

  /**
   * 段落内容（已去除首尾空白）
   */
  content: string;

  /**
   * 段落字数
   * 中文字符按1个字计算，英文单词按1个字计算
   */
  wordCount: number;
}
