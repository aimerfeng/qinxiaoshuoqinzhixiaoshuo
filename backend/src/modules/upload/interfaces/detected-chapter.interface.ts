/**
 * 检测到的章节信息接口
 * Detected chapter information interface
 */
export interface DetectedChapter {
  /**
   * 章节标题（原始匹配的标题行）
   * Chapter title (original matched title line)
   */
  title: string;

  /**
   * 章节内容（不包含标题）
   * Chapter content (excluding title)
   */
  content: string;

  /**
   * 章节在原文中的起始位置（字符索引）
   * Start position in original text (character index)
   */
  startIndex: number;

  /**
   * 章节在原文中的结束位置（字符索引）
   * End position in original text (character index)
   */
  endIndex: number;

  /**
   * 章节序号（从1开始）
   * Chapter sequence number (starting from 1)
   */
  sequenceNumber: number;

  /**
   * 匹配的章节模式类型
   * Matched chapter pattern type
   */
  patternType: ChapterPatternType;
}

/**
 * 章节模式类型
 * Chapter pattern types
 */
export type ChapterPatternType =
  | 'chinese_chapter' // 第X章
  | 'chinese_section' // 第X节
  | 'chinese_volume' // 第X卷
  | 'chinese_part' // 第X部
  | 'chinese_episode' // 第X话/第X回
  | 'english_chapter' // Chapter X
  | 'english_part' // Part X
  | 'english_volume' // Volume X
  | 'english_episode' // Episode X
  | 'numeric_prefix' // 1. / 1、/ 1：
  | 'custom'; // 自定义模式

/**
 * 章节检测结果接口
 * Chapter detection result interface
 */
export interface ChapterDetectionResult {
  /**
   * 检测到的章节列表
   * List of detected chapters
   */
  chapters: DetectedChapter[];

  /**
   * 是否成功检测到章节
   * Whether chapters were successfully detected
   */
  hasChapters: boolean;

  /**
   * 检测到的章节数量
   * Number of detected chapters
   */
  chapterCount: number;

  /**
   * 使用的主要模式类型
   * Primary pattern type used
   */
  primaryPatternType: ChapterPatternType | null;

  /**
   * 前言内容（第一章之前的内容）
   * Preface content (content before first chapter)
   */
  preface: string | null;
}
