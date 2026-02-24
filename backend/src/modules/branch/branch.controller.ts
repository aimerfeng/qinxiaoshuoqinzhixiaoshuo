import {
  Controller,
  Post,
  Get,
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
import {
  BranchService,
  BranchResponseDto,
  BranchDetailResponseDto,
  CreateBranchResponseDto,
} from './branch.service.js';
import { CreateBranchDto, GetBranchesQueryDto } from './dto/index.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';

/**
 * 分支控制器
 * 处理分支管理相关的 HTTP 请求
 *
 * API 路径:
 * - /api/v1/libraries/:id/branches - 小说库下的分支操作
 * - /api/v1/branches/:id - 单个分支操作
 *
 * 需求2: 正文分支管理
 * 需求3: 改写分支管理
 * 需求4: 漫画分支管理
 */
@Controller()
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  /**
   * 创建分支
   * POST /api/v1/libraries/:id/branches
   *
   * 需求2验收标准1: WHEN 用户创建正文分支时，THE Branch_System SHALL 记录分支点和分支创作者
   * 需求3验收标准1: WHEN 用户创建改写分支时，THE Branch_System SHALL 要求选择分支类型
   * 需求4验收标准1: WHEN 用户创建漫画分支时，THE Branch_System SHALL 要求上传漫画页面图片并设置阅读方向
   */
  @Post('libraries/:id/branches')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createBranch(
    @Param('id', new ParseUUIDPipe()) libraryId: string,
    @Request() req: { user: { userId: string } },
    @Body() createBranchDto: CreateBranchDto,
  ): Promise<CreateBranchResponseDto> {
    const creatorId = req.user.userId;
    return this.branchService.createBranch(
      libraryId,
      creatorId,
      createBranchDto,
    );
  }

  /**
   * 获取小说库的分支列表（分页、筛选、排序）
   * GET /api/v1/libraries/:id/branches
   *
   * 需求2验收标准2: WHEN 展示正文分支列表时，THE Branch_System SHALL 按（点赞数 + 打赏贡献值）降序排序
   * 需求7验收标准4: WHEN 展示分支列表时，THE Ranking_System SHALL 支持按热度排序
   *
   * 支持的查询参数:
   * - page: 页码（默认1）
   * - limit: 每页数量（默认20，最大100）
   * - branchType: 分支类型（MAIN/DERIVATIVE/MANGA）
   * - sortBy: 排序字段（hotScore/createdAt/likeCount/tipAmount）
   * - sortOrder: 排序方向（asc/desc）
   */
  @Get('libraries/:id/branches')
  @UseGuards(OptionalJwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getBranches(
    @Param('id', new ParseUUIDPipe()) libraryId: string,
    @Query() query: GetBranchesQueryDto,
  ): Promise<PaginatedResult<BranchResponseDto>> {
    return this.branchService.getBranches(libraryId, query);
  }

  /**
   * 获取分支详情
   * GET /api/v1/branches/:id
   *
   * 需求2验收标准3: WHEN 用户阅读正文分支时，THE Branch_System SHALL 显示分支创作者信息和分支点位置
   */
  @Get('branches/:id')
  @UseGuards(OptionalJwtAuthGuard)
  async getBranchById(
    @Param('id', new ParseUUIDPipe()) branchId: string,
  ): Promise<BranchDetailResponseDto> {
    return this.branchService.getBranchById(branchId);
  }

  /**
   * 软删除分支
   * DELETE /api/v1/branches/:id
   *
   * 需求2验收标准4: WHEN 分支被删除时，THE Branch_System SHALL 保留分支元数据但标记为已删除
   *
   * 只有分支创作者或库拥有者可以删除分支
   */
  @Delete('branches/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteBranch(
    @Param('id', new ParseUUIDPipe()) branchId: string,
    @Request() req: { user: { userId: string } },
  ): Promise<{ message: string }> {
    const userId = req.user.userId;
    return this.branchService.deleteBranch(branchId, userId);
  }
}
