/**
 * Wenku8 阅读器修复 - 探索性测试
 *
 * Property 1: Fault Condition - Wenku8 数据源请求失败
 *
 * 目标: 在实施修复前验证 Bug 存在
 * Bug 条件: 对 wenku8.net/wenku8.cc 的任何数据请求都会失败
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { Test, TestingModule } from '@nestjs/testing';
import { Wenku8ProxyService } from './wenku8-proxy.service.js';
import { CacheService } from '../../redis/cache.service.js';

describe('Wenku8ProxyService - Bug Condition Exploration', () => {
  let service: Wenku8ProxyService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    // Mock CacheService 返回 null 以确保测试真实请求
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CacheService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Wenku8ProxyService,
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<Wenku8ProxyService>(Wenku8ProxyService);
  });

  /**
   * Property 1: Fault Condition - 搜索功能失败
   *
   * Bug 条件: searchNovels() 请求 wenku8.net/wenku8.cc 失败
   * 期望行为: 修复后应从 mojimoon/wenku8 成功获取数据
   *
   * 在未修复代码上: 预期失败（返回空数组或抛出异常）
   * 在修复后代码上: 预期通过（返回有效搜索结果）
   */
  describe('Property 1: Fault Condition - searchNovels', () => {
    it('should return valid search results for keyword "刀剑"', async () => {
      const results = await service.searchNovels('刀剑');

      // 期望行为: 返回非空数组，包含有效的搜索结果
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // 验证返回格式符合 NovelSearchResult 接口
      results.forEach((result) => {
        expect(result).toHaveProperty('id');
        expect(result).toHaveProperty('title');
        expect(result).toHaveProperty('author');
        expect(typeof result.id).toBe('string');
        expect(typeof result.title).toBe('string');
        expect(typeof result.author).toBe('string');
      });
    }, 30000);
  });

  /**
   * Property 1: Fault Condition - 小说详情获取失败
   *
   * Bug 条件: getNovelInfo() 请求 wenku8.net/wenku8.cc 失败
   * 期望行为: 修复后应从 mojimoon/wenku8 成功获取数据
   */
  describe('Property 1: Fault Condition - getNovelInfo', () => {
    it('should return valid novel info for a known novel ID', async () => {
      // 使用已知存在的小说 ID
      const novelInfo = await service.getNovelInfo('1');

      // 期望行为: 返回有效的小说信息
      expect(novelInfo).toHaveProperty('id');
      expect(novelInfo).toHaveProperty('title');
      expect(novelInfo).toHaveProperty('author');
      expect(novelInfo).toHaveProperty('volumes');
      expect(Array.isArray(novelInfo.volumes)).toBe(true);

      // 验证至少有一个卷和章节
      expect(novelInfo.volumes.length).toBeGreaterThan(0);
      expect(novelInfo.volumes[0].chapters.length).toBeGreaterThan(0);
    }, 30000);
  });

  /**
   * Property 1: Fault Condition - 小说列表获取失败
   *
   * Bug 条件: getNovelList() 请求 wenku8.net/wenku8.cc 失败
   * 期望行为: 修复后应从 mojimoon/wenku8 成功获取数据
   */
  describe('Property 1: Fault Condition - getNovelList', () => {
    it('should return valid novel list', async () => {
      const result = await service.getNovelList('lastupdate', 1);

      // 期望行为: 返回有效的小说列表
      expect(result).toHaveProperty('novels');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('totalPages');
      expect(Array.isArray(result.novels)).toBe(true);
      expect(result.novels.length).toBeGreaterThan(0);

      // 验证列表项格式
      result.novels.forEach((novel) => {
        expect(novel).toHaveProperty('id');
        expect(novel).toHaveProperty('title');
      });
    }, 30000);
  });
});

/**
 * Property 2: Preservation - API 契约和缓存机制保持
 *
 * 目标: 验证修复后 API 契约和缓存机制保持不变
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
describe('Wenku8ProxyService - Preservation Properties', () => {
  let service: Wenku8ProxyService;
  let cacheService: jest.Mocked<CacheService>;

  beforeEach(async () => {
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CacheService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Wenku8ProxyService,
        { provide: CacheService, useValue: cacheService },
      ],
    }).compile();

    service = module.get<Wenku8ProxyService>(Wenku8ProxyService);
  });

  /**
   * Property 2: Preservation - 缓存键格式保持
   *
   * 验证缓存键格式保持不变:
   * - wenku8:search:{keyword}
   * - wenku8:novel:{novelId}
   * - wenku8:chapter:{novelId}:{chapterId}
   * - wenku8:list:{type}:{page}
   */
  describe('Property 2: Preservation - Cache Key Format', () => {
    it('should use correct cache key format for searchNovels', async () => {
      try {
        await service.searchNovels('test');
      } catch {
        // 忽略错误，只验证缓存键
      }
      expect(cacheService.get).toHaveBeenCalledWith('wenku8:search:test');
    });

    it('should use correct cache key format for getNovelInfo', async () => {
      try {
        await service.getNovelInfo('123');
      } catch {
        // 忽略错误，只验证缓存键
      }
      expect(cacheService.get).toHaveBeenCalledWith('wenku8:novel:123');
    });

    it('should use correct cache key format for getChapterContent', async () => {
      try {
        await service.getChapterContent('123', '456');
      } catch {
        // 忽略错误，只验证缓存键
      }
      expect(cacheService.get).toHaveBeenCalledWith('wenku8:chapter:123:456');
    });

    it('should use correct cache key format for getNovelList', async () => {
      try {
        await service.getNovelList('lastupdate', 1);
      } catch {
        // 忽略错误，只验证缓存键
      }
      expect(cacheService.get).toHaveBeenCalledWith('wenku8:list:lastupdate:1');
    });
  });

  /**
   * Property 2: Preservation - 缓存命中时直接返回
   *
   * 验证缓存命中时不发起新请求
   */
  describe('Property 2: Preservation - Cache Hit Behavior', () => {
    it('should return cached search results without fetching', async () => {
      const cachedResults = [{ id: '1', title: 'Test', author: 'Author' }];
      cacheService.get.mockResolvedValue(cachedResults);

      const results = await service.searchNovels('test');

      expect(results).toEqual(cachedResults);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return cached novel info without fetching', async () => {
      const cachedInfo = {
        id: '1',
        title: 'Test',
        author: 'Author',
        description: '',
        coverUrl: '',
        status: '',
        lastUpdate: '',
        tags: [],
        volumes: [],
      };
      cacheService.get.mockResolvedValue(cachedInfo);

      const info = await service.getNovelInfo('1');

      expect(info).toEqual(cachedInfo);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return cached chapter content without fetching', async () => {
      const cachedContent = {
        novelId: '1',
        chapterId: '1',
        title: 'Chapter 1',
        content: 'Content',
      };
      cacheService.get.mockResolvedValue(cachedContent);

      const content = await service.getChapterContent('1', '1');

      expect(content).toEqual(cachedContent);
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should return cached novel list without fetching', async () => {
      const cachedList = {
        novels: [{ id: '1', title: 'Test' }],
        page: 1,
        totalPages: 1,
      };
      cacheService.get.mockResolvedValue(cachedList);

      const list = await service.getNovelList('lastupdate', 1);

      expect(list).toEqual(cachedList);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });
});
