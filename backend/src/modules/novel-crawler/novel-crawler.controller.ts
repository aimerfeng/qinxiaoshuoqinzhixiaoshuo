import { Controller, Get, Post, Query, Param, Body } from '@nestjs/common';
import { NovelCrawlerService } from './novel-crawler.service.js';
import { Public } from '../../common/decorators/index.js';

@Controller('novel-crawler')
export class NovelCrawlerController {
  constructor(private readonly novelCrawlerService: NovelCrawlerService) {}

  @Public()
  @Get('health')
  async healthCheck() {
    const healthy = await this.novelCrawlerService.healthCheck();
    return { status: healthy ? 'ok' : 'unavailable' };
  }

  @Public()
  @Get('sources')
  async getSources() {
    return this.novelCrawlerService.getSources();
  }

  @Public()
  @Get('search')
  async search(@Query('q') query: string, @Query('source') sourceUrl?: string) {
    if (!query) {
      return { error: 'Query parameter is required' };
    }
    return this.novelCrawlerService.searchNovels(query, sourceUrl);
  }

  @Public()
  @Get('novel')
  async getNovelInfo(@Query('url') novelUrl: string) {
    if (!novelUrl) {
      return { error: 'URL parameter is required' };
    }
    return this.novelCrawlerService.getNovelInfo(novelUrl);
  }

  @Public()
  @Get('chapter')
  async getChapter(
    @Query('url') novelUrl: string,
    @Query('id') chapterId: string,
  ) {
    if (!novelUrl || !chapterId) {
      return { error: 'URL and ID parameters are required' };
    }
    return this.novelCrawlerService.getChapterContent(
      novelUrl,
      parseInt(chapterId, 10),
    );
  }

  @Post('crawl')
  async startCrawl(
    @Body('url') novelUrl: string,
    @Body('format') format?: string,
  ) {
    if (!novelUrl) {
      return { error: 'URL is required' };
    }
    return this.novelCrawlerService.startCrawlJob(novelUrl, format);
  }

  @Get('crawl/:jobId')
  async getCrawlStatus(@Param('jobId') jobId: string) {
    return this.novelCrawlerService.getCrawlJobStatus(jobId);
  }
}
