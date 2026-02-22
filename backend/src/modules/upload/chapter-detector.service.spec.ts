import { Test, TestingModule } from '@nestjs/testing';
import { ChapterDetectorService } from './chapter-detector.service.js';
import type { ChapterPatternType } from './interfaces/detected-chapter.interface.js';

describe('ChapterDetectorService', () => {
  let service: ChapterDetectorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChapterDetectorService],
    }).compile();

    service = module.get<ChapterDetectorService>(ChapterDetectorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('detectChapters', () => {
    describe('Chinese chapter patterns (第X章)', () => {
      it('should detect chapters with 第X章 format', () => {
        const content = `
第一章 开始
这是第一章的内容。

第二章 发展
这是第二章的内容。

第三章 结局
这是第三章的内容。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(3);
        expect(result.primaryPatternType).toBe('chinese_chapter');
        expect(result.chapters[0].title).toBe('第一章 开始');
        expect(result.chapters[1].title).toBe('第二章 发展');
        expect(result.chapters[2].title).toBe('第三章 结局');
      });

      it('should detect chapters with Arabic numerals', () => {
        const content = `
第1章 开始
这是第一章的内容。

第2章 发展
这是第二章的内容。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(2);
        expect(result.primaryPatternType).toBe('chinese_chapter');
      });

      it('should detect chapters with colon separator', () => {
        const content = `
第一章：开始
这是第一章的内容。

第二章：发展
这是第二章的内容。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(2);
      });

      it('should detect chapters without title suffix', () => {
        const content = `
第一章
这是第一章的内容。

第二章
这是第二章的内容。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(2);
      });
    });

    describe('Chinese section patterns (第X节)', () => {
      it('should detect sections with 第X节 format', () => {
        const content = `
第一节 序言
这是序言内容。

第二节 正文
这是正文内容。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(2);
        expect(result.primaryPatternType).toBe('chinese_section');
      });
    });

    describe('Chinese episode patterns (第X话/第X回)', () => {
      it('should detect episodes with 第X话 format', () => {
        const content = `
第一话 相遇
这是第一话的内容。

第二话 冒险
这是第二话的内容。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(2);
        expect(result.primaryPatternType).toBe('chinese_episode');
      });

      it('should detect episodes with 第X回 format', () => {
        const content = `
第一回 开篇
这是第一回的内容。

第二回 发展
这是第二回的内容。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(2);
        expect(result.primaryPatternType).toBe('chinese_episode');
      });
    });

    describe('English chapter patterns', () => {
      it('should detect chapters with "Chapter X" format', () => {
        const content = `
Chapter 1: The Beginning
This is the content of chapter 1.

Chapter 2: The Journey
This is the content of chapter 2.

Chapter 3: The End
This is the content of chapter 3.
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(3);
        expect(result.primaryPatternType).toBe('english_chapter');
      });

      it('should detect chapters with "CHAPTER X" uppercase format', () => {
        const content = `
CHAPTER 1
This is the content of chapter 1.

CHAPTER 2
This is the content of chapter 2.
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(2);
        expect(result.primaryPatternType).toBe('english_chapter');
      });

      it('should detect chapters with Roman numerals', () => {
        const content = `
Chapter I: Introduction
This is the introduction.

Chapter II: Development
This is the development.

Chapter III: Conclusion
This is the conclusion.
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(3);
        expect(result.primaryPatternType).toBe('english_chapter');
      });
    });

    describe('English part patterns', () => {
      it('should detect parts with "Part X" format', () => {
        const content = `
Part 1: Origins
This is part 1 content.

Part 2: Journey
This is part 2 content.
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(2);
        expect(result.primaryPatternType).toBe('english_part');
      });
    });

    describe('Numeric prefix patterns', () => {
      it('should detect chapters with "1." format', () => {
        const content = `
1. Introduction
This is the introduction.

2. Main Content
This is the main content.

3. Conclusion
This is the conclusion.
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(3);
        expect(result.primaryPatternType).toBe('numeric_prefix');
      });

      it('should detect chapters with "1、" Chinese format', () => {
        const content = `
1、开始
这是开始的内容。

2、发展
这是发展的内容。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(2);
        expect(result.primaryPatternType).toBe('numeric_prefix');
      });
    });

    describe('Preface extraction', () => {
      it('should extract preface content before first chapter', () => {
        const content = `
这是一本关于冒险的小说。这是一段比较长的前言内容，用于测试前言提取功能。
作者：某某某
出版日期：2024年
版权所有，翻印必究。

第一章 开始
这是第一章的内容。

第二章 发展
这是第二章的内容。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.preface).not.toBeNull();
        expect(result.preface).toContain('这是一本关于冒险的小说');
      });

      it('should not extract preface if content before first chapter is too short', () => {
        const content = `
简介

第一章 开始
这是第一章的内容。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.preface).toBeNull();
      });
    });

    describe('Edge cases', () => {
      it('should handle empty content', () => {
        const result = service.detectChapters('');

        expect(result.hasChapters).toBe(false);
        expect(result.chapterCount).toBe(0);
        expect(result.chapters).toHaveLength(0);
      });

      it('should handle content without chapters', () => {
        const content = `
这是一段没有章节标记的文本。
它只是普通的段落内容。
没有任何章节分隔符。
        `.trim();

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(false);
        expect(result.chapterCount).toBe(1);
        expect(result.chapters[0].title).toBe('正文');
        expect(result.chapters[0].patternType).toBe('custom');
      });

      it('should handle mixed line endings', () => {
        const content =
          '第一章 开始\r\n这是内容。\r\n\r\n第二章 发展\n这是更多内容。';

        const result = service.detectChapters(content);

        expect(result.hasChapters).toBe(true);
        expect(result.chapterCount).toBe(2);
      });

      it('should prefer higher priority patterns when multiple patterns match', () => {
        // Content with both 第X章 and numeric patterns
        const content = `
第一章 开始
1. 第一节
这是内容。

第二章 发展
2. 第二节
这是更多内容。
        `.trim();

        const result = service.detectChapters(content);

        // Should prefer 第X章 (higher priority) over numeric prefix
        expect(result.primaryPatternType).toBe('chinese_chapter');
      });
    });
  });

  describe('detectChaptersWithCustomPattern', () => {
    it('should detect chapters with custom regex pattern', () => {
      const content = `
【第一章】开始
这是第一章的内容。

【第二章】发展
这是第二章的内容。
      `.trim();

      const result = service.detectChaptersWithCustomPattern(
        content,
        '^【第.+章】',
      );

      expect(result.hasChapters).toBe(true);
      expect(result.chapterCount).toBe(2);
      expect(result.primaryPatternType).toBe('custom');
    });

    it('should handle invalid regex pattern gracefully', () => {
      const content = '第一章 开始\n这是内容。';

      const result = service.detectChaptersWithCustomPattern(
        content,
        '[invalid',
      );

      // Should fall back to single chapter result
      expect(result.chapterCount).toBe(1);
    });
  });

  describe('previewChapters', () => {
    it('should truncate chapter content for preview', () => {
      const longContent = 'A'.repeat(500);
      const content = `
第一章 开始
${longContent}

第二章 发展
${longContent}
      `.trim();

      const result = service.previewChapters(content, 100);

      expect(result.chapters[0].content.length).toBeLessThanOrEqual(103); // 100 + '...'
      expect(result.chapters[0].content.endsWith('...')).toBe(true);
    });
  });

  describe('hasDetectableChapters', () => {
    it('should return true when chapters are detectable', () => {
      const content = `
第一章 开始
内容

第二章 发展
内容
      `.trim();

      expect(service.hasDetectableChapters(content)).toBe(true);
    });

    it('should return false when no chapters are detectable', () => {
      const content = '这是一段普通文本，没有章节标记。';

      expect(service.hasDetectableChapters(content)).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(service.hasDetectableChapters('')).toBe(false);
    });
  });

  describe('getSupportedPatterns', () => {
    it('should return list of supported patterns', () => {
      const patterns = service.getSupportedPatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns.some((p) => p.type === 'chinese_chapter')).toBe(true);
      expect(patterns.some((p) => p.type === 'english_chapter')).toBe(true);
    });
  });

  describe('getChapterStatistics', () => {
    it('should calculate chapter statistics correctly', () => {
      const content = `
第一章 开始
短内容

第二章 发展
这是一段比较长的内容，用于测试统计功能。

第三章 结局
中等长度的内容。
      `.trim();

      const detectionResult = service.detectChapters(content);
      const stats = service.getChapterStatistics(detectionResult);

      expect(stats.totalChapters).toBe(3);
      expect(stats.totalCharacters).toBeGreaterThan(0);
      expect(stats.averageChapterLength).toBeGreaterThan(0);
      expect(stats.shortestChapter).not.toBeNull();
      expect(stats.longestChapter).not.toBeNull();
    });

    it('should handle empty result', () => {
      const emptyResult = service.detectChapters('');
      const stats = service.getChapterStatistics(emptyResult);

      expect(stats.totalChapters).toBe(0);
      expect(stats.totalCharacters).toBe(0);
      expect(stats.shortestChapter).toBeNull();
      expect(stats.longestChapter).toBeNull();
    });
  });
});
