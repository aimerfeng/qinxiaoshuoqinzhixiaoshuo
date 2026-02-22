import { Test, TestingModule } from '@nestjs/testing';
import { ParagraphsService } from './paragraphs.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('ParagraphsService', () => {
  let service: ParagraphsService;

  const mockPrismaService = {
    paragraph: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    quote: {
      updateMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParagraphsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ParagraphsService>(ParagraphsService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('calculateWordCount', () => {
    it('should return 0 for empty content', () => {
      expect(ParagraphsService.calculateWordCount('')).toBe(0);
      expect(ParagraphsService.calculateWordCount('   ')).toBe(0);
      expect(ParagraphsService.calculateWordCount(null as any)).toBe(0);
      expect(ParagraphsService.calculateWordCount(undefined as any)).toBe(0);
    });

    it('should count Chinese characters correctly', () => {
      expect(ParagraphsService.calculateWordCount('你好世界')).toBe(4);
      expect(ParagraphsService.calculateWordCount('这是一个测试')).toBe(6);
    });

    it('should count English words correctly', () => {
      expect(ParagraphsService.calculateWordCount('hello world')).toBe(2);
      expect(ParagraphsService.calculateWordCount('this is a test')).toBe(4);
    });

    it('should count mixed Chinese and English correctly', () => {
      expect(ParagraphsService.calculateWordCount('你好 world')).toBe(3); // 2 Chinese + 1 English
      expect(ParagraphsService.calculateWordCount('Hello 世界')).toBe(3); // 1 English + 2 Chinese
    });

    it('should handle numbers as words', () => {
      expect(ParagraphsService.calculateWordCount('test123')).toBe(1);
      expect(ParagraphsService.calculateWordCount('123 456')).toBe(2);
    });

    it('should strip HTML tags', () => {
      expect(ParagraphsService.calculateWordCount('<p>hello</p>')).toBe(1);
      expect(
        ParagraphsService.calculateWordCount(
          '<div>你好<span>世界</span></div>',
        ),
      ).toBe(4);
    });
  });

  describe('calculateContentHash', () => {
    it('should generate consistent hash for same content', () => {
      const content = '这是测试内容';
      const hash1 = ParagraphsService.calculateContentHash(content);
      const hash2 = ParagraphsService.calculateContentHash(content);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different content', () => {
      const hash1 = ParagraphsService.calculateContentHash('内容1');
      const hash2 = ParagraphsService.calculateContentHash('内容2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return a 64-character hex string (SHA-256)', () => {
      const hash = ParagraphsService.calculateContentHash('test');
      expect(hash).toHaveLength(64);
      expect(/^[a-f0-9]+$/.test(hash)).toBe(true);
    });
  });

  describe('generateAnchorId', () => {
    it('should generate anchor ID in correct format', () => {
      const anchorId = ParagraphsService.generateAnchorId(
        'work-123',
        'chapter-456',
        0,
      );
      expect(anchorId).toBe('work-123:chapter-456:0');
    });

    it('should handle different paragraph indices', () => {
      expect(ParagraphsService.generateAnchorId('w1', 'c1', 0)).toBe('w1:c1:0');
      expect(ParagraphsService.generateAnchorId('w1', 'c1', 5)).toBe('w1:c1:5');
      expect(ParagraphsService.generateAnchorId('w1', 'c1', 100)).toBe(
        'w1:c1:100',
      );
    });
  });

  describe('parseChapterContent', () => {
    it('should return empty array for empty content', () => {
      expect(service.parseChapterContent('')).toEqual([]);
      expect(service.parseChapterContent('   ')).toEqual([]);
      expect(service.parseChapterContent(null as any)).toEqual([]);
      expect(service.parseChapterContent(undefined as any)).toEqual([]);
    });

    it('should parse single paragraph', () => {
      const result = service.parseChapterContent('这是一个段落');
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        index: 0,
        content: '这是一个段落',
        wordCount: 6,
      });
    });

    it('should split by double newlines', () => {
      const content = '第一段\n\n第二段\n\n第三段';
      const result = service.parseChapterContent(content);

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('第一段');
      expect(result[0].index).toBe(0);
      expect(result[1].content).toBe('第二段');
      expect(result[1].index).toBe(1);
      expect(result[2].content).toBe('第三段');
      expect(result[2].index).toBe(2);
    });

    it('should handle multiple consecutive newlines', () => {
      const content = '第一段\n\n\n\n第二段';
      const result = service.parseChapterContent(content);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('第一段');
      expect(result[1].content).toBe('第二段');
    });

    it('should trim whitespace from paragraphs', () => {
      const content = '  第一段  \n\n  第二段  ';
      const result = service.parseChapterContent(content);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('第一段');
      expect(result[1].content).toBe('第二段');
    });

    it('should filter out empty paragraphs', () => {
      const content = '第一段\n\n   \n\n第二段\n\n\n\n第三段';
      const result = service.parseChapterContent(content);

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('第一段');
      expect(result[1].content).toBe('第二段');
      expect(result[2].content).toBe('第三段');
    });

    it('should calculate word count for each paragraph', () => {
      const content = '你好世界\n\nHello World\n\n混合 content 测试';
      const result = service.parseChapterContent(content);

      expect(result).toHaveLength(3);
      expect(result[0].wordCount).toBe(4); // 4 Chinese characters
      expect(result[1].wordCount).toBe(2); // 2 English words
      expect(result[2].wordCount).toBe(5); // 2 Chinese + 2 English + 1 English (content)
    });

    it('should handle single newlines within paragraphs', () => {
      const content = '第一行\n第二行\n\n新段落';
      const result = service.parseChapterContent(content);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('第一行\n第二行');
      expect(result[1].content).toBe('新段落');
    });

    it('should handle real-world novel content', () => {
      const content = `第一章 开始

这是第一段的内容，描述了故事的开始。主人公站在窗前，望着远方的天空。

"你好，"他说道，"今天天气真好。"

第二段继续讲述故事的发展。`;

      const result = service.parseChapterContent(content);

      expect(result).toHaveLength(4);
      expect(result[0].content).toBe('第一章 开始');
      expect(result[1].content).toContain('这是第一段的内容');
      expect(result[2].content).toContain('"你好，"');
      expect(result[3].content).toContain('第二段继续');
    });
  });

  describe('createParagraphsForChapter', () => {
    const workId = 'work-123';
    const chapterId = 'chapter-456';
    const content = '第一段\n\n第二段\n\n第三段';

    beforeEach(() => {
      mockPrismaService.paragraph.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.paragraph.createMany.mockResolvedValue({ count: 3 });
    });

    it('should delete existing paragraphs before creating new ones', async () => {
      await service.createParagraphsForChapter(workId, chapterId, content);

      expect(mockPrismaService.paragraph.deleteMany).toHaveBeenCalledWith({
        where: { chapterId },
      });
    });

    it('should create paragraphs with correct data', async () => {
      await service.createParagraphsForChapter(workId, chapterId, content);

      expect(mockPrismaService.paragraph.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            chapterId,
            anchorId: `${workId}:${chapterId}:0`,
            content: '第一段',
            orderIndex: 0,
          }),
          expect.objectContaining({
            chapterId,
            anchorId: `${workId}:${chapterId}:1`,
            content: '第二段',
            orderIndex: 1,
          }),
          expect.objectContaining({
            chapterId,
            anchorId: `${workId}:${chapterId}:2`,
            content: '第三段',
            orderIndex: 2,
          }),
        ]),
      });
    });

    it('should return the number of created paragraphs', async () => {
      const count = await service.createParagraphsForChapter(
        workId,
        chapterId,
        content,
      );
      expect(count).toBe(3);
    });

    it('should return 0 for empty content', async () => {
      const count = await service.createParagraphsForChapter(
        workId,
        chapterId,
        '',
      );
      expect(count).toBe(0);
      expect(mockPrismaService.paragraph.deleteMany).not.toHaveBeenCalled();
      expect(mockPrismaService.paragraph.createMany).not.toHaveBeenCalled();
    });

    it('should include content hash in paragraph data', async () => {
      await service.createParagraphsForChapter(workId, chapterId, content);

      const createManyCall =
        mockPrismaService.paragraph.createMany.mock.calls[0][0];
      expect(createManyCall.data[0]).toHaveProperty('contentHash');
      expect(createManyCall.data[0].contentHash).toHaveLength(64);
    });
  });

  describe('deleteParagraphsForChapter', () => {
    it('should delete all paragraphs for a chapter', async () => {
      mockPrismaService.paragraph.deleteMany.mockResolvedValue({ count: 5 });

      const count = await service.deleteParagraphsForChapter('chapter-123');

      expect(mockPrismaService.paragraph.deleteMany).toHaveBeenCalledWith({
        where: { chapterId: 'chapter-123' },
      });
      expect(count).toBe(5);
    });

    it('should return 0 if no paragraphs exist', async () => {
      mockPrismaService.paragraph.deleteMany.mockResolvedValue({ count: 0 });

      const count = await service.deleteParagraphsForChapter('chapter-123');
      expect(count).toBe(0);
    });
  });

  describe('updateParagraphsForChapter', () => {
    const workId = 'work-123';
    const chapterId = 'chapter-456';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return all unchanged when content is identical', async () => {
      const content = '第一段\n\n第二段';
      const hash1 = ParagraphsService.calculateContentHash('第一段');
      const hash2 = ParagraphsService.calculateContentHash('第二段');

      mockPrismaService.paragraph.findMany.mockResolvedValue([
        {
          id: 'p1',
          orderIndex: 0,
          contentHash: hash1,
          anchorId: `${workId}:${chapterId}:0`,
        },
        {
          id: 'p2',
          orderIndex: 1,
          contentHash: hash2,
          anchorId: `${workId}:${chapterId}:1`,
        },
      ]);

      const summary = await service.updateParagraphsForChapter(
        workId,
        chapterId,
        content,
      );

      expect(summary).toEqual({
        added: 0,
        modified: 0,
        deleted: 0,
        unchanged: 2,
      });
      expect(mockPrismaService.paragraph.update).not.toHaveBeenCalled();
      expect(mockPrismaService.paragraph.create).not.toHaveBeenCalled();
    });

    it('should detect modified paragraphs when content changes', async () => {
      const newContent = '修改后的第一段\n\n第二段';
      const oldHash1 = ParagraphsService.calculateContentHash('第一段');
      const hash2 = ParagraphsService.calculateContentHash('第二段');

      mockPrismaService.paragraph.findMany.mockResolvedValue([
        {
          id: 'p1',
          orderIndex: 0,
          contentHash: oldHash1,
          anchorId: `${workId}:${chapterId}:0`,
        },
        {
          id: 'p2',
          orderIndex: 1,
          contentHash: hash2,
          anchorId: `${workId}:${chapterId}:1`,
        },
      ]);
      mockPrismaService.paragraph.update.mockResolvedValue({});

      const summary = await service.updateParagraphsForChapter(
        workId,
        chapterId,
        newContent,
      );

      expect(summary).toEqual({
        added: 0,
        modified: 1,
        deleted: 0,
        unchanged: 1,
      });
      expect(mockPrismaService.paragraph.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.paragraph.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: {
          content: '修改后的第一段',
          contentHash: ParagraphsService.calculateContentHash('修改后的第一段'),
        },
      });
    });

    it('should detect added paragraphs when new content has more paragraphs', async () => {
      const newContent = '第一段\n\n第二段\n\n新增的第三段';
      const hash1 = ParagraphsService.calculateContentHash('第一段');
      const hash2 = ParagraphsService.calculateContentHash('第二段');

      mockPrismaService.paragraph.findMany.mockResolvedValue([
        {
          id: 'p1',
          orderIndex: 0,
          contentHash: hash1,
          anchorId: `${workId}:${chapterId}:0`,
        },
        {
          id: 'p2',
          orderIndex: 1,
          contentHash: hash2,
          anchorId: `${workId}:${chapterId}:1`,
        },
      ]);
      mockPrismaService.paragraph.create.mockResolvedValue({});

      const summary = await service.updateParagraphsForChapter(
        workId,
        chapterId,
        newContent,
      );

      expect(summary).toEqual({
        added: 1,
        modified: 0,
        deleted: 0,
        unchanged: 2,
      });
      expect(mockPrismaService.paragraph.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.paragraph.create).toHaveBeenCalledWith({
        data: {
          chapterId,
          anchorId: `${workId}:${chapterId}:2`,
          content: '新增的第三段',
          contentHash: ParagraphsService.calculateContentHash('新增的第三段'),
          orderIndex: 2,
        },
      });
    });

    it('should soft delete paragraphs when new content has fewer paragraphs', async () => {
      const newContent = '第一段';
      const hash1 = ParagraphsService.calculateContentHash('第一段');
      const hash2 = ParagraphsService.calculateContentHash('第二段');

      mockPrismaService.paragraph.findMany.mockResolvedValue([
        {
          id: 'p1',
          orderIndex: 0,
          contentHash: hash1,
          anchorId: `${workId}:${chapterId}:0`,
        },
        {
          id: 'p2',
          orderIndex: 1,
          contentHash: hash2,
          anchorId: `${workId}:${chapterId}:1`,
        },
      ]);
      mockPrismaService.paragraph.update.mockResolvedValue({});

      const summary = await service.updateParagraphsForChapter(
        workId,
        chapterId,
        newContent,
      );

      expect(summary).toEqual({
        added: 0,
        modified: 0,
        deleted: 1,
        unchanged: 1,
      });
      expect(mockPrismaService.paragraph.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaService.paragraph.update).toHaveBeenCalledWith({
        where: { id: 'p2' },
        data: { isDeleted: true },
      });
    });

    it('should handle mixed changes (add, modify, delete, unchanged)', async () => {
      // Old: 段落A, 段落B, 段落C
      // New: 修改后的段落A, 段落B, 新段落D
      // Result: A modified, B unchanged, C deleted, D added
      const newContent = '修改后的段落A\n\n段落B\n\n新段落D';
      const oldHashA = ParagraphsService.calculateContentHash('段落A');
      const hashB = ParagraphsService.calculateContentHash('段落B');
      const hashC = ParagraphsService.calculateContentHash('段落C');

      mockPrismaService.paragraph.findMany.mockResolvedValue([
        {
          id: 'p1',
          orderIndex: 0,
          contentHash: oldHashA,
          anchorId: `${workId}:${chapterId}:0`,
        },
        {
          id: 'p2',
          orderIndex: 1,
          contentHash: hashB,
          anchorId: `${workId}:${chapterId}:1`,
        },
        {
          id: 'p3',
          orderIndex: 2,
          contentHash: hashC,
          anchorId: `${workId}:${chapterId}:2`,
        },
      ]);
      mockPrismaService.paragraph.update.mockResolvedValue({});
      mockPrismaService.paragraph.create.mockResolvedValue({});

      const summary = await service.updateParagraphsForChapter(
        workId,
        chapterId,
        newContent,
      );

      expect(summary).toEqual({
        added: 0,
        modified: 2, // A modified, C's position now has D (different content)
        deleted: 0,
        unchanged: 1, // B unchanged
      });
    });

    it('should handle empty new content by soft deleting all paragraphs', async () => {
      const hash1 = ParagraphsService.calculateContentHash('第一段');

      mockPrismaService.paragraph.findMany.mockResolvedValue([
        {
          id: 'p1',
          orderIndex: 0,
          contentHash: hash1,
          anchorId: `${workId}:${chapterId}:0`,
        },
      ]);
      mockPrismaService.paragraph.update.mockResolvedValue({});

      const summary = await service.updateParagraphsForChapter(
        workId,
        chapterId,
        '',
      );

      expect(summary).toEqual({
        added: 0,
        modified: 0,
        deleted: 1,
        unchanged: 0,
      });
      expect(mockPrismaService.paragraph.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { isDeleted: true },
      });
    });

    it('should handle no existing paragraphs by creating all new', async () => {
      const newContent = '第一段\n\n第二段';

      mockPrismaService.paragraph.findMany.mockResolvedValue([]);
      mockPrismaService.paragraph.create.mockResolvedValue({});

      const summary = await service.updateParagraphsForChapter(
        workId,
        chapterId,
        newContent,
      );

      expect(summary).toEqual({
        added: 2,
        modified: 0,
        deleted: 0,
        unchanged: 0,
      });
      expect(mockPrismaService.paragraph.create).toHaveBeenCalledTimes(2);
    });
  });
});
