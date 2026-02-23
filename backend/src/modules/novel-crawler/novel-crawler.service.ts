import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../redis/cache.service.js';
import {
  NovelSource,
  NovelSearchResult,
  NovelInfo,
  ChapterContent,
  CrawlJobStatus,
} from './dto/index.js';

@Injectable()
export class NovelCrawlerService {
  private readonly logger = new Logger(NovelCrawlerService.name);
  private readonly LNCRAWL_BASE_URL =
    process.env.LNCRAWL_URL || 'http://localhost:8088';

  private readonly CACHE_TTL = {
    SOURCES: 3600,
    SEARCH: 600,
    NOVEL_INFO: 1800,
    CHAPTER: 86400,
  };

  constructor(private readonly cacheService: CacheService) {}

  /**
   * 获取所有支持的小说源
   */
  async getSources(): Promise<NovelSource[]> {
    const cacheKey = 'lncrawl:sources';
    const cached = await this.cacheService.get<NovelSource[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(`${this.LNCRAWL_BASE_URL}/api/sources`);
      if (!response.ok) {
        throw new Error(`Failed to fetch sources: ${response.status}`);
      }
      const sources = (await response.json()) as NovelSource[];
      await this.cacheService.set(cacheKey, sources, this.CACHE_TTL.SOURCES);
      return sources;
    } catch (error) {
      this.logger.error('Failed to fetch sources from lncrawl', error);
      return [];
    }
  }

  /**
   * 搜索小说
   */
  async searchNovels(
    query: string,
    sourceUrl?: string,
  ): Promise<NovelSearchResult[]> {
    const cacheKey = `lncrawl:search:${query}:${sourceUrl || 'all'}`;
    const cached = await this.cacheService.get<NovelSearchResult[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({ q: query });
      if (sourceUrl) params.append('source', sourceUrl);

      const response = await fetch(
        `${this.LNCRAWL_BASE_URL}/api/search?${params}`,
      );
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }
      const results = (await response.json()) as NovelSearchResult[];
      await this.cacheService.set(cacheKey, results, this.CACHE_TTL.SEARCH);
      return results;
    } catch (error) {
      this.logger.error('Search failed', error);
      return [];
    }
  }

  /**
   * 获取小说详情
   */
  async getNovelInfo(novelUrl: string): Promise<NovelInfo | null> {
    const cacheKey = `lncrawl:novel:${Buffer.from(novelUrl).toString('base64')}`;
    const cached = await this.cacheService.get<NovelInfo>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.LNCRAWL_BASE_URL}/api/novel?url=${encodeURIComponent(novelUrl)}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to get novel info: ${response.status}`);
      }
      const info = (await response.json()) as NovelInfo;
      await this.cacheService.set(cacheKey, info, this.CACHE_TTL.NOVEL_INFO);
      return info;
    } catch (error) {
      this.logger.error('Failed to get novel info', error);
      return null;
    }
  }

  /**
   * 获取章节内容
   */
  async getChapterContent(
    novelUrl: string,
    chapterId: number,
  ): Promise<ChapterContent | null> {
    const cacheKey = `lncrawl:chapter:${Buffer.from(novelUrl).toString('base64')}:${chapterId}`;
    const cached = await this.cacheService.get<ChapterContent>(cacheKey);
    if (cached) return cached;

    try {
      const response = await fetch(
        `${this.LNCRAWL_BASE_URL}/api/chapter?url=${encodeURIComponent(novelUrl)}&id=${chapterId}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to get chapter: ${response.status}`);
      }
      const content = (await response.json()) as ChapterContent;
      await this.cacheService.set(cacheKey, content, this.CACHE_TTL.CHAPTER);
      return content;
    } catch (error) {
      this.logger.error('Failed to get chapter content', error);
      return null;
    }
  }

  /**
   * 启动下载任务
   */
  async startCrawlJob(
    novelUrl: string,
    format: string = 'epub',
  ): Promise<CrawlJobStatus | null> {
    try {
      const response = await fetch(`${this.LNCRAWL_BASE_URL}/api/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: novelUrl, format }),
      });
      if (!response.ok) {
        throw new Error(`Failed to start crawl job: ${response.status}`);
      }
      return (await response.json()) as CrawlJobStatus;
    } catch (error) {
      this.logger.error('Failed to start crawl job', error);
      return null;
    }
  }

  /**
   * 获取下载任务状态
   */
  async getCrawlJobStatus(jobId: string): Promise<CrawlJobStatus | null> {
    try {
      const response = await fetch(
        `${this.LNCRAWL_BASE_URL}/api/crawl/${jobId}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to get job status: ${response.status}`);
      }
      return (await response.json()) as CrawlJobStatus;
    } catch (error) {
      this.logger.error('Failed to get job status', error);
      return null;
    }
  }

  /**
   * 检查服务健康状态
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.LNCRAWL_BASE_URL}/`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
