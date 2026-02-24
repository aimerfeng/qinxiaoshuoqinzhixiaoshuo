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
import {
  SuggestionService,
  SuggestionResponseDto,
  CreateSuggestionResponseDto,
} from './suggestion.service.js';
import {
  CreateSuggestionDto,
  AcceptSuggestionDto,
  RejectSuggestionDto,
  GetSuggestionsQueryDto,
} from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';

/**
 * 修订建议控制器
 * 处理修订建议相关的 HTTP 请求
 *
 * API 路径:
 * - POST /api/v1/paragraphs/:id/suggestions - 创建修订建议
 * - GET /api/v1/branches/:id/suggestions - 获取分支的建议列表
 * - PATCH /api/v1/suggestions/:id/accept - 采纳建议
 * - PATCH /api/v1/suggestions/:id/reject - 拒绝建议
 *
 * 需求5: 修订建议系统
 */
@Controller()
export class SuggestionController {
  constructor(private readonly suggestionService: SuggestionService) {}

  /**
   * 创建修订建议
   * POST /api/v1/paragraphs/:id/suggestions
   *
   * 需求5验收标准1: WHEN 用户选择段落并创建修订建议时，THE Suggestion_System SHALL 显示侧边栏编辑界面
   * 需求5验收标准3: THE Suggestion_System SHALL 支持在选中段落前后添加新段落
   * 需求5验收标准4: THE Suggestion_System SHALL 支持修改选中段落的内容
   * 需求5验收标准5: THE Suggestion_System SHALL 支持在段落中插入插图（富文本编辑）
   *
   * _Requirements: 5.1_
   */
  @Post('paragraphs/:id/suggestions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createSuggestion(
    @Param('id', new ParseUUIDPipe()) paragraphId: string,
    @Request() req: { user: { userId: string } },
    @Body() createSuggestionDto: CreateSuggestionDto,
  ): Promise<CreateSuggestionResponseDto> {
    const suggesterId = req.user.userId;
    return this.suggestionService.createSuggestion(
      paragraphId,
      suggesterId,
      createSuggestionDto,
    );
  }

  /**
   * 获取分支的建议列表
   * GET /api/v1/branches/:id/suggestions
   *
   * 支持的查询参数:
   * - status: 建议状态筛选（PENDING/ACCEPTED/REJECTED）
   *
   * _Requirements: 5.6_
   */
  @Get('branches/:id/suggestions')
  @UseGuards(OptionalJwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getSuggestionsByBranch(
    @Param('id', new ParseUUIDPipe()) branchId: string,
    @Query() query: GetSuggestionsQueryDto,
  ): Promise<SuggestionResponseDto[]> {
    return this.suggestionService.getSuggestionsByBranch(
      branchId,
      query.status,
    );
  }

  /**
   * 采纳修订建议
   * PATCH /api/v1/suggestions/:id/accept
   *
   * 需求5验收标准6: WHEN 用户提交修订建议时，THE Suggestion_System SHALL 以卡片形式发送给分支内容的创作者审核
   * 需求5验收标准7: WHEN 内容创作者采纳建议时，THE Suggestion_System SHALL 奖励建议提交者贡献积分
   * 需求5验收标准8: WHEN 建议被采纳时，THE Suggestion_System SHALL 自动生成社区动态卡片（可编辑后发布）
   *
   * _Requirements: 5.6, 5.7, 5.8_
   */
  @Patch('suggestions/:id/accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async acceptSuggestion(
    @Param('id', new ParseUUIDPipe()) suggestionId: string,
    @Request() req: { user: { userId: string } },
    @Body() acceptSuggestionDto: AcceptSuggestionDto,
  ): Promise<SuggestionResponseDto> {
    const reviewerId = req.user.userId;
    return this.suggestionService.acceptSuggestion(
      suggestionId,
      reviewerId,
      acceptSuggestionDto,
    );
  }

  /**
   * 拒绝修订建议
   * PATCH /api/v1/suggestions/:id/reject
   *
   * 需求5验收标准6: WHEN 用户提交修订建议时，THE Suggestion_System SHALL 以卡片形式发送给分支内容的创作者审核
   *
   * _Requirements: 5.6_
   */
  @Patch('suggestions/:id/reject')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async rejectSuggestion(
    @Param('id', new ParseUUIDPipe()) suggestionId: string,
    @Request() req: { user: { userId: string } },
    @Body() rejectSuggestionDto: RejectSuggestionDto,
  ): Promise<SuggestionResponseDto> {
    const reviewerId = req.user.userId;
    return this.suggestionService.rejectSuggestion(
      suggestionId,
      reviewerId,
      rejectSuggestionDto,
    );
  }
}
