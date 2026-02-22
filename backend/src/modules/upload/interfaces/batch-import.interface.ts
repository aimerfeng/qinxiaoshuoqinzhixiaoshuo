/**
 * 批量导入章节结果接口
 * Batch import chapters result interface
 */
export interface BatchImportResult {
  /**
   * 导入成功的章节数量
   * Number of successfully imported chapters
   */
  successCount: number;

  /**
   * 导入失败的章节数量
   * Number of failed chapter imports
   */
  failedCount: number;

  /**
   * 总章节数量
   * Total number of chapters detected
   */
  totalCount: number;

  /**
   * 导入的章节列表
   * List of imported chapters
   */
  chapters: ImportedChapterInfo[];

  /**
   * 失败的章节列表
   * List of failed chapters
   */
  failedChapters: FailedChapterInfo[];

  /**
   * 前言是否被导入
   * Whether preface was imported
   */
  prefaceImported: boolean;

  /**
   * 检测到的章节模式类型
   * Detected chapter pattern type
   */
  patternType: string | null;
}

/**
 * 导入的章节信息
 * Imported chapter information
 */
export interface ImportedChapterInfo {
  /**
   * 章节ID
   * Chapter ID
   */
  id: string;

  /**
   * 章节标题
   * Chapter title
   */
  title: string;

  /**
   * 章节序号
   * Chapter order index
   */
  orderIndex: number;

  /**
   * 字数
   * Word count
   */
  wordCount: number;
}

/**
 * 导入失败的章节信息
 * Failed chapter import information
 */
export interface FailedChapterInfo {
  /**
   * 章节标题
   * Chapter title
   */
  title: string;

  /**
   * 章节序号
   * Chapter sequence number
   */
  sequenceNumber: number;

  /**
   * 失败原因
   * Failure reason
   */
  reason: string;
}

/**
 * 批量导入选项
 * Batch import options
 */
export interface BatchImportOptions {
  /**
   * 文件编码（可选，自动检测）
   * File encoding (optional, auto-detect)
   */
  encoding?: string;

  /**
   * 自定义章节模式（正则表达式）
   * Custom chapter pattern (regex)
   */
  customPattern?: string;

  /**
   * 是否导入前言作为第一章
   * Whether to import preface as first chapter
   */
  importPreface?: boolean;

  /**
   * 章节状态（默认 DRAFT）
   * Chapter status (default DRAFT)
   */
  status?: 'DRAFT' | 'PUBLISHED';
}
