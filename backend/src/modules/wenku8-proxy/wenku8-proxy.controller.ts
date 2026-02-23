import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Wenku8ProxyService } from './wenku8-proxy.service.js';
import {
  SearchNovelsDto,
  GetNovelListDto,
  NovelSearchResult,
  NovelInfo,
  ChapterContent,
  NovelListResult,
} from './dto/index.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RateLimitGuard } from '../risk-control/guards/rate-limit.guard.js';
import { RateLimit } from '../risk-control/decorators/rate-limit.decorator.js';
import { TimeWindow } from '../risk-control/dto/rate-limit.dto.js';

@Controller('wenku8')
@UseGuards(RateLimitGuard)
export class Wenku8ProxyController {
  private readonly logger = new Logger(Wenku8ProxyController.name);

  constructor(private readonly wenku8Service: Wenku8ProxyService) {}

  /**
   * Search novels by keyword
   * GET /api/v1/wenku8/search?keyword=xxx
   */
  @Get('search')
  @Public()
  @RateLimit({
    action: 'wenku8_search',
    limit: 20,
    windowSeconds: TimeWindow.MINUTE,
    perIp: true,
    errorMessage: '搜索请求过于频繁，请稍后再试',
  })
  async searchNovels(
    @Query() query: SearchNovelsDto,
  ): Promise<NovelSearchResult[]> {
    try {
      return await this.wenku8Service.searchNovels(query.keyword);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Search failed: ${errorMessage}`);
      throw new HttpException(
        '搜索失败，请稍后重试',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get novel info and chapter list
   * GET /api/v1/wenku8/novel/:novelId
   */
  @Get('novel/:novelId')
  @Public()
  @RateLimit({
    action: 'wenku8_novel_info',
    limit: 60,
    windowSeconds: TimeWindow.MINUTE,
    perIp: true,
    errorMessage: '请求过于频繁，请稍后再试',
  })
  async getNovelInfo(@Param('novelId') novelId: string): Promise<NovelInfo> {
    // Validate novelId is numeric
    if (!/^\d+$/.test(novelId)) {
      throw new HttpException('无效的小说ID', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.wenku8Service.getNovelInfo(novelId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Get novel info failed: ${errorMessage}`);
      throw new HttpException(
        '获取小说信息失败，请稍后重试',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get chapter content
   * GET /api/v1/wenku8/novel/:novelId/chapter/:chapterId
   */
  @Get('novel/:novelId/chapter/:chapterId')
  @Public()
  @RateLimit({
    action: 'wenku8_chapter',
    limit: 30,
    windowSeconds: TimeWindow.MINUTE,
    perIp: true,
    errorMessage: '请求过于频繁，请稍后再试',
  })
  async getChapterContent(
    @Param('novelId') novelId: string,
    @Param('chapterId') chapterId: string,
  ): Promise<ChapterContent> {
    // Validate IDs are numeric
    if (!/^\d+$/.test(novelId) || !/^\d+$/.test(chapterId)) {
      throw new HttpException('无效的小说ID或章节ID', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.wenku8Service.getChapterContent(novelId, chapterId);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Get chapter content failed: ${errorMessage}`);
      throw new HttpException(
        '获取章节内容失败，请稍后重试',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get novel lists (toplist, lastupdate, etc.)
   * GET /api/v1/wenku8/list/:type?page=1
   */
  @Get('list/:type')
  @Public()
  @RateLimit({
    action: 'wenku8_list',
    limit: 30,
    windowSeconds: TimeWindow.MINUTE,
    perIp: true,
    errorMessage: '请求过于频繁，请稍后再试',
  })
  async getNovelList(
    @Param('type') type: string,
    @Query() query: GetNovelListDto,
  ): Promise<NovelListResult> {
    // Validate type
    const validTypes = [
      'lastupdate',
      'postdate',
      'goodnum',
      'size',
      'fullflag',
      'allvisit',
      'allvote',
    ];
    if (!validTypes.includes(type)) {
      throw new HttpException(
        `无效的列表类型，支持的类型: ${validTypes.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.wenku8Service.getNovelList(type, query.page ?? 1);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Get novel list failed: ${errorMessage}`);
      throw new HttpException(
        '获取小说列表失败，请稍后重试',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
