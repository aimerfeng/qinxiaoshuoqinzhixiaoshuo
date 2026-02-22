import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SearchService } from './search.service';
import {
  SearchQueryDto,
  AutocompleteQueryDto,
  SearchResponse,
  AutocompleteResponse,
  SearchHistoryItem,
} from './dto/search.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 主搜索接口
   * GET /api/v1/search?q=keyword&type=all|work|user|chapter&page=1&pageSize=20
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async search(
    @Query() query: SearchQueryDto,
    @Request() req: any,
  ): Promise<SearchResponse> {
    const userId = req.user?.id;
    return this.searchService.search(query, userId);
  }

  /**
   * 自动补全/搜索建议
   * GET /api/v1/search/autocomplete?q=prefix&limit=5
   */
  @Get('autocomplete')
  async autocomplete(
    @Query() query: AutocompleteQueryDto,
  ): Promise<AutocompleteResponse> {
    return this.searchService.autocomplete(query);
  }

  /**
   * 获取热门搜索
   * GET /api/v1/search/popular?limit=10
   */
  @Get('popular')
  async getPopularSearches(
    @Query('limit') limit?: number,
  ): Promise<{ searches: string[] }> {
    const searches = await this.searchService.getPopularSearches(limit || 10);
    return { searches };
  }

  /**
   * 获取用户搜索历史
   * GET /api/v1/search/history?limit=10
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getSearchHistory(
    @Request() req: any,
    @Query('limit') limit?: number,
  ): Promise<{ history: SearchHistoryItem[] }> {
    const history = await this.searchService.getSearchHistory(
      req.user.id,
      limit || 10,
    );
    return { history };
  }

  /**
   * 删除用户搜索历史
   * DELETE /api/v1/search/history/:id 或 DELETE /api/v1/search/history (删除全部)
   */
  @Delete('history/:id?')
  @UseGuards(JwtAuthGuard)
  async deleteSearchHistory(
    @Request() req: any,
    @Param('id') historyId?: string,
  ): Promise<{ success: boolean }> {
    await this.searchService.deleteSearchHistory(req.user.id, historyId);
    return { success: true };
  }
}
