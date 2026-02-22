import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReaderService } from './reader.service.js';
import {
  ChapterContentResponseDto,
  SaveReadingProgressDto,
  SaveReadingProgressResponseDto,
  GetReadingProgressResponseDto,
  GetWorkReadingProgressResponseDto,
  SaveReadingSettingsDto,
  ReadingSettingsResponseDto,
  AdjacentChaptersResponseDto,
  ChapterListResponseDto,
} from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';

/**
 * 阅读器控制器
 * 处理阅读器相关的 HTTP 请求
 *
 * 需求4: 沉浸式阅读器
 */
@Controller()
export class ReaderController {
  constructor(private readonly readerService: ReaderService) {}

  // ==================== 章节内容 API ====================

  /**
   * 获取章节内容
   * GET /api/v1/reader/works/:workId/chapters/:chapterId
   *
   * 任务4.1.1: 章节内容获取 API
   *
   * 需求4验收标准2: WHEN 用户阅读章节 THEN System SHALL 按顺序渲染 Paragraph 并显示对应 Anchor_ID 标记
   *
   * 功能：
   * - 获取章节完整内容（小说返回段落列表，漫画返回页面列表）
   * - 返回作品和作者信息
   * - 返回相邻章节信息
   * - 如果用户已登录，返回阅读进度
   * - 自动增加阅读量
   */
  @Get('reader/works/:workId/chapters/:chapterId')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getChapterContent(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
  ): Promise<ChapterContentResponseDto> {
    const userId = req.user?.userId as string | undefined;
    return this.readerService.getChapterContent(workId, chapterId, userId);
  }

  /**
   * 获取章节目录
   * GET /api/v1/reader/works/:workId/chapters
   *
   * 需求4验收标准12: WHEN 用户查看章节目录 THEN System SHALL 显示侧边栏目录并支持快速跳转
   */
  @Get('reader/works/:workId/chapters')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getChapterList(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Request() req: any,
  ): Promise<ChapterListResponseDto> {
    const userId = req.user?.userId as string | undefined;
    return this.readerService.getChapterList(workId, userId);
  }

  /**
   * 获取相邻章节信息
   * GET /api/v1/reader/works/:workId/chapters/:chapterId/adjacent
   *
   * 任务4.1.4: 相邻章节信息 API
   *
   * 需求4验收标准6: WHEN 用户切换章节 THEN System SHALL 平滑过渡并保持阅读设置
   */
  @Get('reader/works/:workId/chapters/:chapterId/adjacent')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getAdjacentChapters(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
  ): Promise<AdjacentChaptersResponseDto> {
    const userId = req.user?.userId as string | undefined;
    return this.readerService.getAdjacentChapters(workId, chapterId, userId);
  }

  // ==================== 阅读进度 API ====================

  /**
   * 保存阅读进度
   * POST /api/v1/reader/works/:workId/progress
   *
   * 任务4.1.2: 阅读进度保存 API
   *
   * 需求4验收标准5: WHEN 用户滚动阅读 THEN System SHALL 记录阅读进度并支持断点续读
   * 需求4验收标准8: WHEN 用户退出 Reader THEN System SHALL 保存当前阅读位置
   */
  @Post('reader/works/:workId/progress')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async saveReadingProgress(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Request() req: any,
    @Body() saveProgressDto: SaveReadingProgressDto,
  ): Promise<SaveReadingProgressResponseDto> {
    const userId = req.user.userId as string;
    return this.readerService.saveReadingProgress(
      userId,
      workId,
      saveProgressDto,
    );
  }

  /**
   * 获取章节阅读进度
   * GET /api/v1/reader/works/:workId/chapters/:chapterId/progress
   */
  @Get('reader/works/:workId/chapters/:chapterId/progress')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getReadingProgress(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
  ): Promise<GetReadingProgressResponseDto> {
    const userId = req.user.userId as string;
    return this.readerService.getReadingProgress(userId, workId, chapterId);
  }

  /**
   * 获取作品的所有阅读进度
   * GET /api/v1/reader/works/:workId/progress
   */
  @Get('reader/works/:workId/progress')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getWorkReadingProgress(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Request() req: any,
  ): Promise<GetWorkReadingProgressResponseDto> {
    const userId = req.user.userId as string;
    return this.readerService.getWorkReadingProgress(userId, workId);
  }

  // ==================== 阅读设置 API ====================

  /**
   * 保存阅读设置
   * PATCH /api/v1/reader/settings
   *
   * 任务4.1.3: 阅读设置保存 API
   *
   * 需求4验收标准4: WHEN 用户调整阅读设置 THEN System SHALL 应用字体大小、行距、背景色等自定义配置
   */
  @Patch('reader/settings')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async saveReadingSettings(
    @Request() req: any,
    @Body() saveSettingsDto: SaveReadingSettingsDto,
  ): Promise<ReadingSettingsResponseDto> {
    const userId = req.user.userId as string;
    return this.readerService.saveReadingSettings(userId, saveSettingsDto);
  }

  /**
   * 获取阅读设置
   * GET /api/v1/reader/settings
   */
  @Get('reader/settings')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getReadingSettings(
    @Request() req: any,
  ): Promise<ReadingSettingsResponseDto> {
    const userId = req.user.userId as string;
    return this.readerService.getReadingSettings(userId);
  }
}
