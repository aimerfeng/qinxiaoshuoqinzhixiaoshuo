import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
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
import { WorksService } from './works.service.js';
import {
  CreateWorkDto,
  CreateWorkResponseDto,
  UpdateWorkDto,
  UpdateWorkResponseDto,
  WorkDetailResponseDto,
  DeleteWorkResponseDto,
  ListWorksQueryDto,
  WorkResponseDto,
} from './dto/index.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';

/**
 * 作品控制器
 * 处理作品管理相关的 HTTP 请求
 *
 * API 路径: /api/v1/works
 *
 * 需求2: 作品管理与版本控制（类Git共创系统）
 */
@Controller('works')
export class WorksController {
  constructor(private readonly worksService: WorksService) {}

  /**
   * 创建新作品
   * POST /api/v1/works
   *
   * 需求2验收标准1: WHEN Creator 创建新作品 THEN System SHALL 初始化 Main_Branch 并生成唯一作品标识
   * 需求2验收标准6: WHILE 作品处于草稿状态 THEN System SHALL 仅对 Creator 可见
   * 需求2验收标准7: WHEN Creator 设置作品元信息 THEN System SHALL 保存标题、简介、封面、标签等信息
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createWork(
    @Request() req: any,
    @Body() createWorkDto: CreateWorkDto,
  ): Promise<CreateWorkResponseDto> {
    const authorId = req.user.userId as string;
    return this.worksService.createWork(authorId, createWorkDto);
  }

  /**
   * 获取作品列表（分页、筛选、排序）
   * GET /api/v1/works
   *
   * 需求8验收标准2: WHEN 用户浏览作品列表 THEN System SHALL 支持按分类、标签、热度、更新时间筛选
   * 需求8验收标准5: WHEN 用户查看作品标签 THEN System SHALL 支持点击标签查看同类作品
   *
   * 支持的查询参数:
   * - page: 页码（默认1）
   * - limit: 每页数量（默认20，最大100）
   * - contentType: 作品类型（NOVEL/MANGA）
   * - status: 作品状态（仅作者查看自己作品时有效）
   * - tag: 标签名称
   * - authorId: 作者ID
   * - sortBy: 排序字段（createdAt/updatedAt/viewCount/likeCount）
   * - sortOrder: 排序方向（asc/desc）
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async listWorks(
    @Query() query: ListWorksQueryDto,
    @Request() req: any,
  ): Promise<PaginatedResult<WorkResponseDto>> {
    const requesterId = req.user?.userId as string | undefined;
    return this.worksService.listWorks(query, requesterId);
  }

  /**
   * 获取作品详情
   * GET /api/v1/works/:id
   *
   * 需求2验收标准6: WHILE 作品处于草稿状态 THEN System SHALL 仅对 Creator 可见
   * 需求2验收标准7: WHEN Creator 设置作品元信息 THEN System SHALL 保存标题、简介、封面、标签等信息
   * 需求8验收标准3: WHEN 用户查看作品详情页 THEN System SHALL 显示作品信息、章节目录和统计数据
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  async getWorkById(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: any,
  ): Promise<WorkDetailResponseDto> {
    const requesterId = req.user?.userId as string | undefined;
    return this.worksService.getWorkById(id, requesterId);
  }

  /**
   * 更新作品信息
   * PATCH /api/v1/works/:id
   *
   * 需求2验收标准7: WHEN Creator 设置作品元信息 THEN System SHALL 保存标题、简介、封面、标签等信息
   *
   * 仅作者可以更新自己的作品。支持部分更新。
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateWork(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: any,
    @Body() updateWorkDto: UpdateWorkDto,
  ): Promise<UpdateWorkResponseDto> {
    const authorId = req.user.userId as string;
    return this.worksService.updateWork(id, authorId, updateWorkDto);
  }

  /**
   * 删除作品（软删除）
   * DELETE /api/v1/works/:id
   *
   * 需求10: 实现软删除机制
   * 仅作者可以删除自己的作品。实际执行软删除（设置 isDeleted=true）。
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteWork(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Request() req: any,
  ): Promise<DeleteWorkResponseDto> {
    const authorId = req.user.userId as string;
    return this.worksService.deleteWork(id, authorId);
  }
}
