import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Logger,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AnchorService } from './anchor.service.js';
import {
  AnchorDetailDto,
  AnchorReferencesQueryDto,
  AnchorReferencesResponseDto,
  CreateQuoteDto,
  CreateQuoteResponseDto,
  AnchorContextQueryDto,
  AnchorContextResponseDto,
} from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * 锚点控制器
 * 提供锚点（段落）相关的 API 端点
 *
 * 需求3: 段落锚点精准引用体系（Anchor Network）
 */
@Controller('api/v1/anchors')
export class AnchorController {
  private readonly logger = new Logger(AnchorController.name);

  constructor(private readonly anchorService: AnchorService) {}

  /**
   * 获取锚点详情
   *
   * GET /api/v1/anchors/:anchorId
   *
   * 返回锚点（段落）的完整信息，包括：
   * - 段落内容
   * - 章节信息
   * - 作品信息
   * - 作者信息
   *
   * 需求3验收标准8: WHEN 用户查看 Paragraph 详情 THEN System SHALL 显示该段落被引用的次数和引用列表
   *
   * @param anchorId 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index})
   * @returns 锚点详情
   */
  @Get(':anchorId')
  async getAnchorDetail(
    @Param('anchorId') anchorId: string,
  ): Promise<AnchorDetailDto> {
    this.logger.log(`GET /api/v1/anchors/${anchorId}`);
    return this.anchorService.getAnchorDetail(anchorId);
  }

  /**
   * 获取锚点引用列表
   *
   * GET /api/v1/anchors/:anchorId/references
   *
   * 返回引用该锚点（段落）的所有 Card 列表，支持分页。
   * 每个 Card 包含：
   * - Card 内容
   * - 作者信息
   * - 点赞数、评论数
   * - 引用时的原文快照
   *
   * 需求3验收标准8: WHEN 用户查看 Paragraph 详情 THEN System SHALL 显示该段落被引用的次数和引用列表
   *
   * @param anchorId 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index})
   * @param query 分页查询参数 (page, limit)
   * @returns 引用该锚点的 Card 列表（分页）
   */
  @Get(':anchorId/references')
  async getAnchorReferences(
    @Param('anchorId') anchorId: string,
    @Query() query: AnchorReferencesQueryDto,
  ): Promise<AnchorReferencesResponseDto> {
    this.logger.log(
      `GET /api/v1/anchors/${anchorId}/references?page=${query.page}&limit=${query.limit}`,
    );
    return this.anchorService.getAnchorReferences(anchorId, query);
  }

  /**
   * 获取锚点上下文
   *
   * GET /api/v1/anchors/:anchorId/context
   *
   * 返回目标段落及其周围段落的上下文信息，用于引用预览时展示更多上下文。
   *
   * Query 参数:
   * - before: 目标段落之前的段落数量 (默认: 1, 最大: 10)
   * - after: 目标段落之后的段落数量 (默认: 1, 最大: 10)
   *
   * @param anchorId 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index})
   * @param query 查询参数 (before, after)
   * @returns 目标段落及其周围段落的上下文信息
   */
  @Get(':anchorId/context')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getAnchorContext(
    @Param('anchorId') anchorId: string,
    @Query() query: AnchorContextQueryDto,
  ): Promise<AnchorContextResponseDto> {
    this.logger.log(
      `GET /api/v1/anchors/${anchorId}/context?before=${query.before}&after=${query.after}`,
    );
    return this.anchorService.getAnchorContext(anchorId, query);
  }

  /**
   * 创建引用
   *
   * POST /api/v1/anchors/:anchorId/quote
   *
   * 当用户在 Card 中引用某个段落时，创建 Quote 记录。
   * - 存储引用时的原文快照
   * - 增加段落的引用计数
   * - 需要用户认证
   *
   * 需求3验收标准3: WHEN 用户执行引用操作 THEN System SHALL 创建包含 Anchor_ID 引用的 Card 草稿
   * 需求3验收标准4: WHEN Card 包含 Anchor_ID 引用被发布到 Plaza THEN System SHALL 渲染原文预览并提供跳转链接
   *
   * @param anchorId 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index})
   * @param dto 创建引用请求参数 { cardId: string }
   * @param req 请求对象（包含用户信息）
   * @returns 创建的引用记录
   */
  @Post(':anchorId/quote')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createQuote(
    @Param('anchorId') anchorId: string,
    @Body() dto: CreateQuoteDto,
    @Request() req: any,
  ): Promise<CreateQuoteResponseDto> {
    this.logger.log(
      `POST /api/v1/anchors/${anchorId}/quote by user ${req.user.id}`,
    );
    return this.anchorService.createQuote(anchorId, dto, req.user.id);
  }
}
