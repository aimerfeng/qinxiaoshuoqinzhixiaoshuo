/**
 * 解析后的小说内容接口
 * Parsed novel content interface
 */
export interface ParsedNovelContent {
  /**
   * 原始文本内容
   * Raw text content from the file
   */
  rawContent: string;

  /**
   * 检测到或使用的编码
   * Detected or specified encoding
   */
  encoding: string;

  /**
   * 原始文件大小（字节）
   * Original file size in bytes
   */
  fileSize: number;
}
