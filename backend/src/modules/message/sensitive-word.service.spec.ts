import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  SensitiveWordService,
  FilterMode,
  FilterResult,
} from './sensitive-word.service';

describe('SensitiveWordService', () => {
  let service: SensitiveWordService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(async () => {
    mockConfigService = {
      get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
        const config: Record<string, unknown> = {
          'sensitiveWord.enabled': true,
          'sensitiveWord.mode': 'replace',
          'sensitiveWord.replacementChar': '*',
        };
        return config[key] ?? defaultValue;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SensitiveWordService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<SensitiveWordService>(SensitiveWordService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with default sensitive words', () => {
      const words = service.getSensitiveWords();
      expect(words.length).toBeGreaterThan(0);
    });

    it('should have filter enabled by default', () => {
      expect(service.isFilterEnabled()).toBe(true);
    });

    it('should have replace mode by default', () => {
      expect(service.getFilterMode()).toBe(FilterMode.REPLACE);
    });
  });

  describe('filterContent', () => {
    it('should detect and replace Chinese sensitive words', () => {
      const result = service.filterContent('你是傻逼吗');
      expect(result.containsSensitiveWords).toBe(true);
      expect(result.detectedWords).toContain('傻逼');
      expect(result.filteredContent).toBe('你是**吗');
    });

    it('should detect and replace English sensitive words', () => {
      const result = service.filterContent('what the fuck');
      expect(result.containsSensitiveWords).toBe(true);
      expect(result.detectedWords).toContain('fuck');
      expect(result.filteredContent).toBe('what the ****');
    });

    it('should handle case-insensitive matching', () => {
      const result = service.filterContent('FUCK you');
      expect(result.containsSensitiveWords).toBe(true);
      expect(result.detectedWords).toContain('fuck');
      expect(result.filteredContent).toBe('**** you');
    });

    it('should detect multiple sensitive words', () => {
      const result = service.filterContent('傻逼和混蛋');
      expect(result.containsSensitiveWords).toBe(true);
      expect(result.detectedWords).toContain('傻逼');
      expect(result.detectedWords).toContain('混蛋');
      expect(result.filteredContent).toBe('**和**');
    });

    it('should return original content when no sensitive words found', () => {
      const result = service.filterContent('这是一条正常的消息');
      expect(result.containsSensitiveWords).toBe(false);
      expect(result.filteredContent).toBe('这是一条正常的消息');
      expect(result.detectedWords).toHaveLength(0);
    });

    it('should handle empty content', () => {
      const result = service.filterContent('');
      expect(result.containsSensitiveWords).toBe(false);
      expect(result.filteredContent).toBe('');
    });

    it('should preserve original content in result', () => {
      const original = '你是傻逼';
      const result = service.filterContent(original);
      expect(result.originalContent).toBe(original);
    });
  });

  describe('containsSensitiveWords', () => {
    it('should return true when content contains sensitive words', () => {
      expect(service.containsSensitiveWords('傻逼')).toBe(true);
      expect(service.containsSensitiveWords('fuck')).toBe(true);
    });

    it('should return false when content is clean', () => {
      expect(service.containsSensitiveWords('正常消息')).toBe(false);
      expect(service.containsSensitiveWords('hello world')).toBe(false);
    });

    it('should return false for empty content', () => {
      expect(service.containsSensitiveWords('')).toBe(false);
    });
  });

  describe('word management', () => {
    it('should add new sensitive word', () => {
      const initialCount = service.getWordCount();
      service.addWord('测试敏感词');
      expect(service.getWordCount()).toBe(initialCount + 1);
      expect(service.containsSensitiveWords('测试敏感词')).toBe(true);
    });

    it('should remove sensitive word', () => {
      service.addWord('临时敏感词');
      expect(service.containsSensitiveWords('临时敏感词')).toBe(true);
      
      service.removeWord('临时敏感词');
      expect(service.containsSensitiveWords('临时敏感词')).toBe(false);
    });

    it('should add multiple words at once', () => {
      const initialCount = service.getWordCount();
      service.addWords(['新词1', '新词2', '新词3']);
      expect(service.getWordCount()).toBe(initialCount + 3);
    });

    it('should remove multiple words at once', () => {
      service.addWords(['删除词1', '删除词2']);
      service.removeWords(['删除词1', '删除词2']);
      expect(service.containsSensitiveWords('删除词1')).toBe(false);
      expect(service.containsSensitiveWords('删除词2')).toBe(false);
    });

    it('should clear all words', () => {
      service.clearWords();
      expect(service.getWordCount()).toBe(0);
    });

    it('should reset to default words', () => {
      service.clearWords();
      expect(service.getWordCount()).toBe(0);
      
      service.resetToDefault();
      expect(service.getWordCount()).toBeGreaterThan(0);
    });

    it('should ignore empty words', () => {
      const initialCount = service.getWordCount();
      service.addWord('');
      service.addWord('   ');
      expect(service.getWordCount()).toBe(initialCount);
    });

    it('should normalize words to lowercase', () => {
      service.addWord('UPPERCASE');
      expect(service.containsSensitiveWords('uppercase')).toBe(true);
      expect(service.containsSensitiveWords('UPPERCASE')).toBe(true);
    });
  });

  describe('filter mode', () => {
    it('should change filter mode', () => {
      service.setFilterMode(FilterMode.BLOCK);
      expect(service.getFilterMode()).toBe(FilterMode.BLOCK);
      
      service.setFilterMode(FilterMode.REPLACE);
      expect(service.getFilterMode()).toBe(FilterMode.REPLACE);
    });
  });

  describe('enable/disable', () => {
    it('should disable filtering', () => {
      service.setEnabled(false);
      expect(service.isFilterEnabled()).toBe(false);
      
      // When disabled, should not detect sensitive words
      const result = service.filterContent('傻逼');
      expect(result.containsSensitiveWords).toBe(false);
      expect(result.filteredContent).toBe('傻逼');
    });

    it('should re-enable filtering', () => {
      service.setEnabled(false);
      service.setEnabled(true);
      expect(service.isFilterEnabled()).toBe(true);
      
      const result = service.filterContent('傻逼');
      expect(result.containsSensitiveWords).toBe(true);
    });
  });

  describe('getSensitiveWords', () => {
    it('should return array of sensitive words', () => {
      const words = service.getSensitiveWords();
      expect(Array.isArray(words)).toBe(true);
      expect(words.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle overlapping sensitive words', () => {
      service.addWord('测试');
      service.addWord('测试词');
      
      const result = service.filterContent('这是测试词语');
      expect(result.containsSensitiveWords).toBe(true);
    });

    it('should handle sensitive word at start of content', () => {
      const result = service.filterContent('傻逼你好');
      expect(result.containsSensitiveWords).toBe(true);
      expect(result.filteredContent).toBe('**你好');
    });

    it('should handle sensitive word at end of content', () => {
      const result = service.filterContent('你好傻逼');
      expect(result.containsSensitiveWords).toBe(true);
      expect(result.filteredContent).toBe('你好**');
    });

    it('should handle content that is only sensitive word', () => {
      const result = service.filterContent('傻逼');
      expect(result.containsSensitiveWords).toBe(true);
      expect(result.filteredContent).toBe('**');
    });

    it('should handle repeated sensitive words', () => {
      const result = service.filterContent('傻逼傻逼傻逼');
      expect(result.containsSensitiveWords).toBe(true);
      expect(result.filteredContent).toBe('******');
    });
  });
});
