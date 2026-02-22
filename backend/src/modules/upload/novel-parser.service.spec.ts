import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import * as iconv from 'iconv-lite';
import {
  NovelParserService,
  SUPPORTED_ENCODINGS,
} from './novel-parser.service.js';

describe('NovelParserService', () => {
  let service: NovelParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NovelParserService],
    }).compile();

    service = module.get<NovelParserService>(NovelParserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseTxtFile', () => {
    describe('UTF-8 content', () => {
      it('should parse UTF-8 content without BOM', () => {
        const content = 'Hello, World!\n这是一段中文内容。';
        const buffer = Buffer.from(content, 'utf8');

        const result = service.parseTxtFile(buffer);

        expect(result.rawContent).toBe(content);
        expect(result.encoding).toBe('UTF-8');
        expect(result.fileSize).toBe(buffer.length);
      });

      it('should parse UTF-8 content with BOM', () => {
        const content = 'Hello, World!\n这是一段中文内容。';
        const bom = Buffer.from([0xef, 0xbb, 0xbf]);
        const contentBuffer = Buffer.from(content, 'utf8');
        const buffer = Buffer.concat([bom, contentBuffer]);

        const result = service.parseTxtFile(buffer);

        expect(result.rawContent).toBe(content);
        expect(result.encoding).toBe('UTF-8');
        expect(result.fileSize).toBe(buffer.length);
      });

      it('should parse pure ASCII content as UTF-8', () => {
        const content = 'Hello, World! This is ASCII content.';
        const buffer = Buffer.from(content, 'utf8');

        const result = service.parseTxtFile(buffer);

        expect(result.rawContent).toBe(content);
        expect(result.encoding).toBe('UTF-8');
      });
    });

    describe('GBK/GB2312 content', () => {
      it('should parse GBK encoded content', () => {
        const content = '这是一段GBK编码的中文内容。第一章 开始';
        const buffer = iconv.encode(content, 'gbk');

        const result = service.parseTxtFile(buffer);

        expect(result.rawContent).toBe(content);
        expect(result.encoding).toBe('GBK');
        expect(result.fileSize).toBe(buffer.length);
      });

      it('should parse GB2312 encoded content', () => {
        const content = '这是一段GB2312编码的中文内容。';
        const buffer = iconv.encode(content, 'gb2312');

        const result = service.parseTxtFile(buffer);

        expect(result.rawContent).toBe(content);
        // GB2312 is a subset of GBK, so it may be detected as GBK
        expect(['GBK', 'GB2312']).toContain(result.encoding);
      });

      it('should use specified encoding when provided', () => {
        const content = '这是一段中文内容。';
        const buffer = iconv.encode(content, 'gbk');

        const result = service.parseTxtFile(buffer, 'GBK');

        expect(result.rawContent).toBe(content);
        expect(result.encoding).toBe('GBK');
      });
    });

    describe('error handling', () => {
      it('should throw BadRequestException for empty buffer', () => {
        const buffer = Buffer.alloc(0);

        expect(() => service.parseTxtFile(buffer)).toThrow(BadRequestException);
        expect(() => service.parseTxtFile(buffer)).toThrow('File is empty');
      });

      it('should throw BadRequestException for null buffer', () => {
        expect(() => service.parseTxtFile(null as unknown as Buffer)).toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException for whitespace-only content', () => {
        const buffer = Buffer.from('   \n\t\r\n   ', 'utf8');

        expect(() => service.parseTxtFile(buffer)).toThrow(BadRequestException);
        expect(() => service.parseTxtFile(buffer)).toThrow(
          'File content is empty after decoding',
        );
      });
    });

    describe('novel content scenarios', () => {
      it('should parse typical novel chapter content', () => {
        const content = `第一章 初遇

在一个阳光明媚的早晨，主角走出了家门。

"今天是个好日子。"他自言自语道。

街道上人来人往，热闹非凡。`;
        const buffer = Buffer.from(content, 'utf8');

        const result = service.parseTxtFile(buffer);

        expect(result.rawContent).toBe(content);
        expect(result.rawContent).toContain('第一章');
        expect(result.rawContent).toContain('初遇');
      });

      it('should preserve line breaks and formatting', () => {
        const content = '第一行\n第二行\r\n第三行\n\n空行后的内容';
        const buffer = Buffer.from(content, 'utf8');

        const result = service.parseTxtFile(buffer);

        expect(result.rawContent).toBe(content);
        expect(result.rawContent.split('\n').length).toBeGreaterThan(1);
      });

      it('should handle large content', () => {
        // Generate ~100KB of content
        const paragraph = '这是一段测试内容，用于测试大文件的解析能力。'.repeat(
          100,
        );
        const content = Array(50).fill(paragraph).join('\n\n');
        const buffer = Buffer.from(content, 'utf8');

        const result = service.parseTxtFile(buffer);

        expect(result.rawContent).toBe(content);
        expect(result.fileSize).toBeGreaterThan(100000);
      });
    });
  });

  describe('detectEncoding', () => {
    it('should detect UTF-8 BOM', () => {
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const content = Buffer.from('Hello', 'utf8');
      const buffer = Buffer.concat([bom, content]);

      const encoding = service.detectEncoding(buffer);

      expect(encoding).toBe('UTF-8');
    });

    it('should detect valid UTF-8 without BOM', () => {
      const buffer = Buffer.from('Hello, 世界！', 'utf8');

      const encoding = service.detectEncoding(buffer);

      expect(encoding).toBe('UTF-8');
    });

    it('should fall back to GBK for non-UTF-8 content', () => {
      const content = '这是GBK编码的内容';
      const buffer = iconv.encode(content, 'gbk');

      const encoding = service.detectEncoding(buffer);

      expect(encoding).toBe('GBK');
    });
  });

  describe('isEncodingSupported', () => {
    it('should return true for supported encodings', () => {
      expect(service.isEncodingSupported('UTF-8')).toBe(true);
      expect(service.isEncodingSupported('utf8')).toBe(true);
      expect(service.isEncodingSupported('GBK')).toBe(true);
      expect(service.isEncodingSupported('gbk')).toBe(true);
      expect(service.isEncodingSupported('GB2312')).toBe(true);
    });

    it('should return true for other common encodings', () => {
      expect(service.isEncodingSupported('GB18030')).toBe(true);
      expect(service.isEncodingSupported('BIG5')).toBe(true);
    });
  });

  describe('getSupportedEncodings', () => {
    it('should return the list of supported encodings', () => {
      const encodings = service.getSupportedEncodings();

      expect(encodings).toEqual(SUPPORTED_ENCODINGS);
      expect(encodings).toContain('UTF-8');
      expect(encodings).toContain('GBK');
      expect(encodings).toContain('GB2312');
    });
  });
});
