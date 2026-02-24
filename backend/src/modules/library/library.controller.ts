import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LibraryService } from './library.service.js';
import {
  CreateLibraryDto,
  UpdateLibrarySettingsDto,
  GetLibrariesQueryDto,
  LibraryResponseDto,
  LibraryDetailResponseDto,
  CreateLibraryResponseDto,
  UpdateLibrarySettingsResponseDto,
  RankingResponseDto,
} from './dto/index.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';

/**
 * 小说库控制器
 * 处理小说库管理相关的 HTTP 请求
 *
 * API 路径: /api/v1/libraries
 *
 * 需求1: 小说库创建与管理
 */
@Controller('libraries')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  /**
   * 创建新小说库
   * POST /api/v1/libraries
   *
   * 需求1验收标准1: WHEN 用户创建新小说库时，THE Library_System SHALL 创建一个包含标题、描述、封面图和库类型的 Library 实体
   * 需求1验收标准2: WHEN 库拥有者设置收益分配时，THE Library_System SHALL 允许设置 0-30% 的额外抽成比例
   * 需求1验收标准3: WHEN 库拥有者设置上传费用时，THE Library_System SHALL 支持按千字或按漫画页数两种计费模式
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createLibrary(
    @Request() req: any,
    @Body() createLibraryDto: CreateLibraryDto,
  ): Promise<CreateLibraryResponseDto> {
    const ownerId = req.user.userId as string;
    return this.libraryService.createLibrary(ownerId, createLibraryDto);
  }

  /**
   * 获取小说库列表（分页、筛选、排序）
   * GET /api/v1/libraries
   *
   * 需求7验收标准2: WHEN 展示小说库列表时，THE Ranking_System SHALL 支持按热度分数降序排序
   *
   * 支持的查询参数:
   * - page: 页码（默认1）
   * - limit: 每页数量（默认20，最大100）
   * - sortBy: 排序字段（hotScore/createdAt/branchCount）
   * - sortOrder: 排序方向（asc/desc）
   * - libraryType: 库类型（ORIGINAL/SHARED）
   * - ownerId: 拥有者ID
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getLibraries(
    @Query() query: GetLibrariesQueryDto,
  ): Promise<PaginatedResult<LibraryResponseDto>> {
    return this.libraryService.getLibraries(query);
  }

  /**
   * 获取热度排行榜 Top 100
   * GET /api/v1/libraries/ranking
   *
   * 需求7验收标准5: THE Ranking_System SHALL 提供热度排行榜页面，展示 Top 100 小说库
   *
   * 返回按热度分数降序排列的前 100 个小说库
   */
  @Get('ranking')
  async getRanking(): Promise<RankingResponseDto> {
    return this.libraryService.getRanking();
  }

  /**
   * 获取小说库详情
   * GET /api/v1/libraries/:id
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getLibraryById(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<LibraryDetailResponseDto> {
    return this.libraryService.getLibraryById(id);
  }

  /**
   * 更新小说库设置
   * PATCH /api/v1/libraries/:id/settings
   *
   * 需求1验收标准2: WHEN 库拥有者设置收益分配时，THE Library_System SHALL 允许设置 0-30% 的额外抽成比例
   * 需求1验收标准3: WHEN 库拥有者设置上传费用时，THE Library_System SHALL 支持按千字或按漫画页数两种计费模式
   *
   * 仅库拥有者可以更新设置。
   */
  @Patch(':id/settings')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateLibrarySettings(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: any,
    @Body() updateDto: UpdateLibrarySettingsDto,
  ): Promise<UpdateLibrarySettingsResponseDto> {
    const ownerId = req.user.userId as string;
    return this.libraryService.updateLibrarySettings(id, ownerId, updateDto);
  }
}
