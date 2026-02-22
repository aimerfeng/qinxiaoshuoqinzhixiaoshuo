import { Injectable, Logger } from '@nestjs/common';
import type {
  DetectedChapter,
  ChapterDetectionResult,
  ChapterPatternType,
} from './interfaces/detected-chapter.interface.js';

/**
 * 章节模式定义
 * Chapter pattern definition
 */
interface ChapterPattern {
  type: ChapterPatternType;
  regex: RegExp;
  priority: number;
  description: string;
}

/**
 * 章节匹配结果
 * Chapter match result
 */
interface ChapterMatch {
  title: string;
  startIndex: number;
  endIndex: number;
  patternType: ChapterPatternType;
}

/**
 * 章节自动识别服务
 * Service for automatically detecting and splitting chapters from novel text
 *
 * Features:
 * - Support for multiple Chinese chapter formats (第X章, 第X节, 第X卷, etc.)
 * - Support for English chapter formats (Chapter X, Part X, etc.)
 * - Support for numeric prefixes (1. / 1、/ 1：)
 * - Auto-detect the most suitable pattern for the document
 * - Extract preface content before first chapter
 */
@Injectable()
export class ChapterDetectorService {
  private readonly logger = new Logger(ChapterDetectorService.name);

  /**
   * 中文数字映射
   * Chinese number mapping
   */
  private readonly chineseNumbers =
    '零一二三四五六七八九十百千万亿〇壹贰叁肆伍陆柒捌玖拾佰仟';

  /**
   * 章节模式列表（按优先级排序）
   * Chapter patterns list (sorted by priority)
   */
  private readonly patterns: ChapterPattern[] = [
    // Chinese patterns - highest priority
    {
      type: 'chinese_chapter',
      regex: this.buildChinesePattern('章'),
      priority: 100,
      description: '第X章',
    },
    {
      type: 'chinese_section',
      regex: this.buildChinesePattern('节'),
      priority: 95,
      description: '第X节',
    },
    {
      type: 'chinese_volume',
      regex: this.buildChinesePattern('卷'),
      priority: 90,
      description: '第X卷',
    },
    {
      type: 'chinese_part',
      regex: this.buildChinesePattern('部'),
      priority: 85,
      description: '第X部',
    },
    {
      type: 'chinese_episode',
      regex: this.buildChineseEpisodePattern(),
      priority: 80,
      description: '第X话/第X回',
    },
    // English patterns
    {
      type: 'english_chapter',
      regex: /^(?:chapter|chap\.?)\s*(\d+|[IVXLCDM]+)(?:\s*[:\-—]\s*(.+))?$/im,
      priority: 70,
      description: 'Chapter X',
    },
    {
      type: 'english_part',
      regex: /^part\s*(\d+|[IVXLCDM]+)(?:\s*[:\-—]\s*(.+))?$/im,
      priority: 65,
      description: 'Part X',
    },
    {
      type: 'english_volume',
      regex: /^(?:volume|vol\.?)\s*(\d+|[IVXLCDM]+)(?:\s*[:\-—]\s*(.+))?$/im,
      priority: 60,
      description: 'Volume X',
    },
    {
      type: 'english_episode',
      regex: /^(?:episode|ep\.?)\s*(\d+)(?:\s*[:\-—]\s*(.+))?$/im,
      priority: 55,
      description: 'Episode X',
    },
    // Numeric prefix patterns - lower priority
    {
      type: 'numeric_prefix',
      regex: /^(\d+)\s*[.、：:]\s*(.+)$/m,
      priority: 30,
      description: '1. / 1、/ 1：',
    },
  ];

  /**
   * 构建中文章节模式
   * Build Chinese chapter pattern
   */
  private buildChinesePattern(suffix: string): RegExp {
    // 匹配：第X章 标题 或 第X章：标题 或 第X章 - 标题
    // 支持中文数字和阿拉伯数字
    const numPattern = `[${this.chineseNumbers}\\d]+`;
    return new RegExp(
      `^第${numPattern}${suffix}(?:\\s*[:\\-—]?\\s*(.*))?$`,
      'im',
    );
  }

  /**
   * 构建中文话/回模式
   * Build Chinese episode pattern (话/回)
   */
  private buildChineseEpisodePattern(): RegExp {
    const numPattern = `[${this.chineseNumbers}\\d]+`;
    return new RegExp(`^第${numPattern}[话回](?:\\s*[:\\-—]?\\s*(.*))?$`, 'im');
  }

  /**
   * 检测并分割章节
   * Detect and split chapters from text content
   *
   * @param content - Raw text content to analyze
   * @returns ChapterDetectionResult with detected chapters
   */
  detectChapters(content: string): ChapterDetectionResult {
    if (!content || content.trim().length === 0) {
      return this.createEmptyResult();
    }

    this.logger.debug(
      `Starting chapter detection, content length: ${content.length} chars`,
    );

    // Normalize line endings
    const normalizedContent = this.normalizeContent(content);

    // Find all potential chapter matches
    const allMatches = this.findAllMatches(normalizedContent);

    if (allMatches.length === 0) {
      this.logger.debug('No chapter patterns detected');
      return this.createSingleChapterResult(normalizedContent);
    }

    // Determine the best pattern to use
    const bestPattern = this.determineBestPattern(allMatches);
    this.logger.debug(`Best pattern determined: ${bestPattern}`);

    // Filter matches to only use the best pattern
    const filteredMatches = allMatches.filter(
      (m) => m.patternType === bestPattern,
    );

    // Sort matches by position
    filteredMatches.sort((a, b) => a.startIndex - b.startIndex);

    // Build chapters from matches
    const chapters = this.buildChapters(normalizedContent, filteredMatches);

    // Extract preface (content before first chapter)
    const preface = this.extractPreface(normalizedContent, filteredMatches);

    this.logger.log(
      `Chapter detection complete: ${chapters.length} chapters found using pattern "${bestPattern}"`,
    );

    return {
      chapters,
      hasChapters: chapters.length > 0,
      chapterCount: chapters.length,
      primaryPatternType: bestPattern,
      preface,
    };
  }

  /**
   * 标准化内容
   * Normalize content
   */
  private normalizeContent(content: string): string {
    // Normalize line endings
    return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }

  /**
   * 查找所有匹配
   * Find all pattern matches in content
   */
  private findAllMatches(content: string): ChapterMatch[] {
    const matches: ChapterMatch[] = [];
    const lines = content.split('\n');
    let currentIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.length > 0 && trimmedLine.length <= 100) {
        // Chapter titles should be reasonably short
        for (const pattern of this.patterns) {
          if (pattern.regex.test(trimmedLine)) {
            matches.push({
              title: trimmedLine,
              startIndex: currentIndex,
              endIndex: currentIndex + line.length,
              patternType: pattern.type,
            });
            break; // Only match one pattern per line
          }
        }
      }

      currentIndex += line.length + 1; // +1 for newline
    }

    return matches;
  }

  /**
   * 确定最佳模式
   * Determine the best pattern to use based on matches
   *
   * Strategy:
   * 1. Count matches per pattern type
   * 2. Consider pattern priority
   * 3. Prefer patterns with more consistent matches
   */
  private determineBestPattern(matches: ChapterMatch[]): ChapterPatternType {
    // Count matches per pattern type
    const patternCounts = new Map<ChapterPatternType, number>();

    for (const match of matches) {
      const count = patternCounts.get(match.patternType) || 0;
      patternCounts.set(match.patternType, count + 1);
    }

    // Find pattern with highest score (count * priority)
    let bestPattern: ChapterPatternType = matches[0].patternType;
    let bestScore = 0;

    for (const [patternType, count] of patternCounts) {
      const pattern = this.patterns.find((p) => p.type === patternType);
      if (pattern) {
        // Score = count * priority factor
        // Higher priority patterns get a boost
        const score = count * (pattern.priority / 50);

        if (score > bestScore) {
          bestScore = score;
          bestPattern = patternType;
        }
      }
    }

    return bestPattern;
  }

  /**
   * 构建章节列表
   * Build chapter list from matches
   */
  private buildChapters(
    content: string,
    matches: ChapterMatch[],
  ): DetectedChapter[] {
    const chapters: DetectedChapter[] = [];

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      const nextMatch = matches[i + 1];

      // Chapter content starts after the title line
      const contentStartIndex = match.endIndex + 1;

      // Chapter content ends at the start of next chapter or end of content
      const contentEndIndex = nextMatch
        ? nextMatch.startIndex - 1
        : content.length;

      // Extract chapter content
      const chapterContent = content
        .substring(contentStartIndex, contentEndIndex)
        .trim();

      chapters.push({
        title: match.title,
        content: chapterContent,
        startIndex: match.startIndex,
        endIndex: contentEndIndex,
        sequenceNumber: i + 1,
        patternType: match.patternType,
      });
    }

    return chapters;
  }

  /**
   * 提取前言内容
   * Extract preface content (before first chapter)
   */
  private extractPreface(
    content: string,
    matches: ChapterMatch[],
  ): string | null {
    if (matches.length === 0) {
      return null;
    }

    const firstMatch = matches[0];
    const prefaceContent = content.substring(0, firstMatch.startIndex).trim();

    // Only return preface if it has meaningful content
    if (prefaceContent.length > 50) {
      return prefaceContent;
    }

    return null;
  }

  /**
   * 创建空结果
   * Create empty result
   */
  private createEmptyResult(): ChapterDetectionResult {
    return {
      chapters: [],
      hasChapters: false,
      chapterCount: 0,
      primaryPatternType: null,
      preface: null,
    };
  }

  /**
   * 创建单章节结果（无法检测到章节时）
   * Create single chapter result (when no chapters detected)
   */
  private createSingleChapterResult(content: string): ChapterDetectionResult {
    // Treat entire content as a single chapter
    const chapter: DetectedChapter = {
      title: '正文',
      content: content.trim(),
      startIndex: 0,
      endIndex: content.length,
      sequenceNumber: 1,
      patternType: 'custom',
    };

    return {
      chapters: [chapter],
      hasChapters: false, // No chapters were "detected", this is a fallback
      chapterCount: 1,
      primaryPatternType: null,
      preface: null,
    };
  }

  /**
   * 使用自定义模式检测章节
   * Detect chapters using a custom regex pattern
   *
   * @param content - Raw text content to analyze
   * @param customPattern - Custom regex pattern string
   * @returns ChapterDetectionResult with detected chapters
   */
  detectChaptersWithCustomPattern(
    content: string,
    customPattern: string,
  ): ChapterDetectionResult {
    if (!content || content.trim().length === 0) {
      return this.createEmptyResult();
    }

    try {
      const regex = new RegExp(customPattern, 'gim');
      const normalizedContent = this.normalizeContent(content);
      const matches: ChapterMatch[] = [];
      const lines = normalizedContent.split('\n');
      let currentIndex = 0;

      for (const line of lines) {
        const trimmedLine = line.trim();

        if (trimmedLine.length > 0 && trimmedLine.length <= 100) {
          regex.lastIndex = 0; // Reset regex state
          if (regex.test(trimmedLine)) {
            matches.push({
              title: trimmedLine,
              startIndex: currentIndex,
              endIndex: currentIndex + line.length,
              patternType: 'custom',
            });
          }
        }

        currentIndex += line.length + 1;
      }

      if (matches.length === 0) {
        return this.createSingleChapterResult(normalizedContent);
      }

      matches.sort((a, b) => a.startIndex - b.startIndex);
      const chapters = this.buildChapters(normalizedContent, matches);
      const preface = this.extractPreface(normalizedContent, matches);

      return {
        chapters,
        hasChapters: chapters.length > 0,
        chapterCount: chapters.length,
        primaryPatternType: 'custom',
        preface,
      };
    } catch (error) {
      this.logger.error(`Invalid custom pattern: ${customPattern}`, error);
      return this.createSingleChapterResult(this.normalizeContent(content));
    }
  }

  /**
   * 预览章节检测结果（不返回完整内容）
   * Preview chapter detection result (without full content)
   *
   * @param content - Raw text content to analyze
   * @param maxPreviewLength - Maximum length of content preview per chapter
   * @returns ChapterDetectionResult with truncated content
   */
  previewChapters(
    content: string,
    maxPreviewLength: number = 200,
  ): ChapterDetectionResult {
    const result = this.detectChapters(content);

    // Truncate chapter content for preview
    result.chapters = result.chapters.map((chapter) => ({
      ...chapter,
      content:
        chapter.content.length > maxPreviewLength
          ? chapter.content.substring(0, maxPreviewLength) + '...'
          : chapter.content,
    }));

    // Truncate preface for preview
    if (result.preface && result.preface.length > maxPreviewLength) {
      result.preface = result.preface.substring(0, maxPreviewLength) + '...';
    }

    return result;
  }

  /**
   * 获取支持的章节模式列表
   * Get list of supported chapter patterns
   */
  getSupportedPatterns(): Array<{
    type: ChapterPatternType;
    description: string;
    example: string;
  }> {
    return [
      {
        type: 'chinese_chapter',
        description: '中文章节',
        example: '第一章 开始',
      },
      {
        type: 'chinese_section',
        description: '中文小节',
        example: '第一节 序言',
      },
      { type: 'chinese_volume', description: '中文卷', example: '第一卷 起源' },
      { type: 'chinese_part', description: '中文部', example: '第一部 黎明' },
      {
        type: 'chinese_episode',
        description: '中文话/回',
        example: '第一话 相遇',
      },
      {
        type: 'english_chapter',
        description: 'English Chapter',
        example: 'Chapter 1: Beginning',
      },
      {
        type: 'english_part',
        description: 'English Part',
        example: 'Part I: Origins',
      },
      {
        type: 'english_volume',
        description: 'English Volume',
        example: 'Volume 1',
      },
      {
        type: 'english_episode',
        description: 'English Episode',
        example: 'Episode 1',
      },
      { type: 'numeric_prefix', description: '数字前缀', example: '1. 第一章' },
    ];
  }

  /**
   * 验证内容是否包含可识别的章节
   * Validate if content contains recognizable chapters
   *
   * @param content - Raw text content to analyze
   * @returns boolean indicating if chapters can be detected
   */
  hasDetectableChapters(content: string): boolean {
    if (!content || content.trim().length === 0) {
      return false;
    }

    const normalizedContent = this.normalizeContent(content);
    const matches = this.findAllMatches(normalizedContent);

    // Consider chapters detectable if we find at least 2 matches
    return matches.length >= 2;
  }

  /**
   * 获取章节统计信息
   * Get chapter statistics
   *
   * @param result - Chapter detection result
   * @returns Statistics about the detected chapters
   */
  getChapterStatistics(result: ChapterDetectionResult): {
    totalChapters: number;
    totalCharacters: number;
    averageChapterLength: number;
    shortestChapter: { title: string; length: number } | null;
    longestChapter: { title: string; length: number } | null;
    hasPreface: boolean;
    prefaceLength: number;
  } {
    const chapters = result.chapters;

    if (chapters.length === 0) {
      return {
        totalChapters: 0,
        totalCharacters: 0,
        averageChapterLength: 0,
        shortestChapter: null,
        longestChapter: null,
        hasPreface: false,
        prefaceLength: 0,
      };
    }

    const lengths = chapters.map((c) => c.content.length);
    const totalCharacters = lengths.reduce((sum, len) => sum + len, 0);
    const minLength = Math.min(...lengths);
    const maxLength = Math.max(...lengths);

    const shortestChapter = chapters.find(
      (c) => c.content.length === minLength,
    );
    const longestChapter = chapters.find((c) => c.content.length === maxLength);

    return {
      totalChapters: chapters.length,
      totalCharacters,
      averageChapterLength: Math.round(totalCharacters / chapters.length),
      shortestChapter: shortestChapter
        ? {
            title: shortestChapter.title,
            length: shortestChapter.content.length,
          }
        : null,
      longestChapter: longestChapter
        ? { title: longestChapter.title, length: longestChapter.content.length }
        : null,
      hasPreface: result.preface !== null,
      prefaceLength: result.preface?.length || 0,
    };
  }
}
