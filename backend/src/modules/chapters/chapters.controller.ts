import {
  Controller,
  Post,
  Patch,
  Delete,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ChaptersService } from './chapters.service.js';
import { ScheduledPublishService } from './scheduled-publish.service.js';
import {
  CreateChapterDto,
  CreateChapterResponseDto,
  UpdateChapterDto,
  UpdateChapterResponseDto,
  DeleteChapterResponseDto,
  ReorderChaptersDto,
  ReorderChaptersResponseDto,
  ChapterVersionListResponseDto,
  ChapterVersionDetailResponseDto,
  RollbackChapterDto,
  RollbackChapterResponseDto,
  CreateMangaChapterDto,
  CreateMangaChapterResponseDto,
  UpdateMangaChapterDto,
  UpdateMangaChapterResponseDto,
  MangaChapterResponseDto,
  MangaChapterListResponseDto,
} from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import {
  BatchImportService,
  BatchImportDto,
  BatchImportResponseDto,
  PreviewChaptersDto,
  PreviewChaptersResponseDto,
} from '../upload/index.js';

/**
 * 章节控制器
 * 处理章节管理相关的 HTTP 请求
 *
 * API 路径: /api/v1/works/:workId/chapters
 *
 * 需求2: 作品管理与版本控制
 * 需求6验收标准14: 定时发布功能
 */
@Controller('works/:workId/chapters')
export class ChaptersController {
  constructor(
    private readonly chaptersService: ChaptersService,
    private readonly batchImportService: BatchImportService,
    private readonly scheduledPublishService: ScheduledPublishService,
  ) {}

  /**
   * 创建新章节
   * POST /api/v1/works/:workId/chapters
   *
   * 需求2验收标准2: WHEN Creator 发布章节到 Main_Branch THEN System SHALL 为每个 Paragraph 自动生成 Anchor_ID
   * 需求2验收标准6: WHILE 作品处于草稿状态 THEN System SHALL 仅对 Creator 可见
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createChapter(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Request() req: any,
    @Body() createChapterDto: CreateChapterDto,
  ): Promise<CreateChapterResponseDto> {
    const authorId = req.user.userId as string;
    return this.chaptersService.createChapter(
      workId,
      authorId,
      createChapterDto,
    );
  }

  /**
   * 更新章节（自动创建版本）
   * PATCH /api/v1/works/:workId/chapters/:chapterId
   *
   * 需求2验收标准3: WHEN Creator 编辑已发布章节 THEN System SHALL 创建新版本快照并保留历史记录
   */
  @Patch(':chapterId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateChapter(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
    @Body() updateChapterDto: UpdateChapterDto,
  ): Promise<UpdateChapterResponseDto> {
    const authorId = req.user.userId as string;
    return this.chaptersService.updateChapter(
      workId,
      chapterId,
      authorId,
      updateChapterDto,
    );
  }

  /**
   * 删除章节（软删除）
   * DELETE /api/v1/works/:workId/chapters/:chapterId
   *
   * 需求10: 实现软删除机制（设置 isDeleted=true）
   */
  @Delete(':chapterId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteChapter(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
  ): Promise<DeleteChapterResponseDto> {
    const authorId = req.user.userId as string;
    return this.chaptersService.deleteChapter(workId, chapterId, authorId);
  }

  /**
   * 重新排序章节
   * PATCH /api/v1/works/:workId/chapters/reorder
   *
   * 需求2验收标准8: WHEN Creator 调整章节顺序 THEN System SHALL 更新排序并维护Anchor_ID映射
   */
  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async reorderChapters(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Request() req: any,
    @Body() reorderDto: ReorderChaptersDto,
  ): Promise<ReorderChaptersResponseDto> {
    const authorId = req.user.userId as string;
    return this.chaptersService.reorderChapters(workId, authorId, reorderDto);
  }

  /**
   * 获取章节版本历史列表
   * GET /api/v1/works/:workId/chapters/:chapterId/versions
   *
   * 需求2验收标准4: WHEN Creator 查看版本历史 THEN System SHALL 展示版本列表并支持查看任意历史版本
   *
   * 返回版本列表（版本号、标题、字数、创建时间），按版本号降序排列
   * 仅章节作者可查看
   */
  @Get(':chapterId/versions')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getChapterVersions(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
  ): Promise<ChapterVersionListResponseDto> {
    const authorId = req.user.userId as string;
    return this.chaptersService.getChapterVersions(workId, chapterId, authorId);
  }

  /**
   * 获取章节特定版本详情
   * GET /api/v1/works/:workId/chapters/:chapterId/versions/:version
   *
   * 需求2验收标准4: WHEN Creator 查看版本历史 THEN System SHALL 展示版本列表并支持查看任意历史版本
   *
   * 返回指定版本的完整内容
   * 仅章节作者可查看
   */
  @Get(':chapterId/versions/:version')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getChapterVersionDetail(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Param('version', new ParseIntPipe()) version: number,
    @Request() req: any,
  ): Promise<ChapterVersionDetailResponseDto> {
    const authorId = req.user.userId as string;
    return this.chaptersService.getChapterVersionDetail(
      workId,
      chapterId,
      version,
      authorId,
    );
  }

  /**
   * 回滚章节到历史版本
   * POST /api/v1/works/:workId/chapters/:chapterId/rollback
   *
   * 需求2验收标准5: WHEN Creator 回滚到历史版本 THEN System SHALL 恢复内容并创建新版本记录
   *
   * 业务逻辑：
   * 1. 验证目标版本存在
   * 2. 将当前内容保存为新版本快照
   * 3. 从目标版本恢复内容
   * 4. 递增版本号
   * 5. 更新作品总字数
   *
   * 仅章节作者可执行回滚操作
   */
  @Post(':chapterId/rollback')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async rollbackChapterVersion(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
    @Body() rollbackDto: RollbackChapterDto,
  ): Promise<RollbackChapterResponseDto> {
    const authorId = req.user.userId as string;
    return this.chaptersService.rollbackChapterVersion(
      workId,
      chapterId,
      authorId,
      rollbackDto,
    );
  }

  /**
   * 批量导入章节
   * POST /api/v1/works/:workId/chapters/import
   *
   * 任务3.4.4: 批量章节导入
   *
   * 功能：
   * - 上传 TXT 或 DOCX 文件
   * - 自动检测章节模式
   * - 批量创建章节到数据库
   * - 支持自定义章节模式
   * - 可选导入前言作为第一章
   *
   * 仅作品作者可执行导入操作
   */
  @Post('import')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimes = [
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const allowedExts = ['.txt', '.docx'];
        const ext = file.originalname
          .toLowerCase()
          .slice(file.originalname.lastIndexOf('.'));

        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('不支持的文件格式。支持的格式: TXT, DOCX'),
            false,
          );
        }
      },
    }),
  )
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async batchImportChapters(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() importDto: BatchImportDto,
  ): Promise<BatchImportResponseDto> {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    const authorId = req.user.userId as string;
    const result = await this.batchImportService.batchImportChapters(
      workId,
      authorId,
      file.buffer,
      file.originalname,
      {
        encoding: importDto.encoding,
        customPattern: importDto.customPattern,
        importPreface: importDto.importPreface,
        status: importDto.status as 'DRAFT' | 'PUBLISHED' | undefined,
      },
    );

    return {
      message: `成功导入 ${result.successCount} 个章节`,
      ...result,
    };
  }

  /**
   * 预览章节检测结果
   * POST /api/v1/works/:workId/chapters/import/preview
   *
   * 任务3.4.4: 批量章节导入 - 预览功能
   *
   * 功能：
   * - 上传 TXT 或 DOCX 文件
   * - 预览检测到的章节（不导入）
   * - 返回章节标题、内容预览、字数统计
   *
   * 仅作品作者可执行预览操作
   */
  @Post('import/preview')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (_req, file, callback) => {
        const allowedMimes = [
          'text/plain',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const allowedExts = ['.txt', '.docx'];
        const ext = file.originalname
          .toLowerCase()
          .slice(file.originalname.lastIndexOf('.'));

        if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('不支持的文件格式。支持的格式: TXT, DOCX'),
            false,
          );
        }
      },
    }),
  )
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async previewChapters(
    @Param('workId', new ParseUUIDPipe()) _workId: string,
    @Request() _req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() previewDto: PreviewChaptersDto,
  ): Promise<PreviewChaptersResponseDto> {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }

    // Note: We don't need to verify work ownership for preview,
    // but we keep the workId param for API consistency
    const result = await this.batchImportService.previewChapters(
      file.buffer,
      file.originalname,
      previewDto.encoding,
      previewDto.customPattern,
    );

    return {
      message: result.hasChapters
        ? `检测到 ${result.chapterCount} 个章节`
        : '未检测到章节模式，将作为单个章节导入',
      ...result,
    };
  }

  // ==================== 漫画章节管理 API ====================

  /**
   * 创建漫画章节
   * POST /api/v1/works/:workId/chapters/manga
   *
   * 任务3.5.2: 漫画章节管理 API
   *
   * 功能：
   * - 创建漫画章节（包含图片页面列表）
   * - 自动更新作品总页数
   * - 支持草稿/发布状态
   *
   * 仅漫画作品的作者可执行此操作
   */
  @Post('manga')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createMangaChapter(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Request() req: any,
    @Body() createMangaChapterDto: CreateMangaChapterDto,
  ): Promise<CreateMangaChapterResponseDto> {
    const authorId = req.user.userId as string;
    return this.chaptersService.createMangaChapter(
      workId,
      authorId,
      createMangaChapterDto,
    );
  }

  /**
   * 获取漫画章节列表
   * GET /api/v1/works/:workId/chapters/manga
   *
   * 任务3.5.2: 漫画章节管理 API
   *
   * 功能：
   * - 获取漫画作品的所有章节列表
   * - 作者可看到草稿章节，其他用户只能看到已发布章节
   * - 返回每章的缩略图和页数
   */
  @Get('manga')
  @HttpCode(HttpStatus.OK)
  async getMangaChapterList(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Request() req: any,
  ): Promise<MangaChapterListResponseDto> {
    const authorId = req.user?.userId as string | undefined;
    return this.chaptersService.getMangaChapterList(workId, authorId);
  }

  /**
   * 获取漫画章节详情
   * GET /api/v1/works/:workId/chapters/manga/:chapterId
   *
   * 任务3.5.2: 漫画章节管理 API
   *
   * 功能：
   * - 获取漫画章节的完整信息（包含所有页面）
   * - 草稿章节仅作者可见
   */
  @Get('manga/:chapterId')
  @HttpCode(HttpStatus.OK)
  async getMangaChapter(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
  ): Promise<MangaChapterResponseDto> {
    const authorId = req.user?.userId as string | undefined;
    return this.chaptersService.getMangaChapter(workId, chapterId, authorId);
  }

  /**
   * 更新漫画章节
   * PATCH /api/v1/works/:workId/chapters/manga/:chapterId
   *
   * 任务3.5.2: 漫画章节管理 API
   *
   * 功能：
   * - 更新漫画章节标题、状态或页面列表
   * - 自动创建版本快照
   * - 更新作品总页数
   *
   * 仅章节作者可执行此操作
   */
  @Patch('manga/:chapterId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateMangaChapter(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
    @Body() updateMangaChapterDto: UpdateMangaChapterDto,
  ): Promise<UpdateMangaChapterResponseDto> {
    const authorId = req.user.userId as string;
    return this.chaptersService.updateMangaChapter(
      workId,
      chapterId,
      authorId,
      updateMangaChapterDto,
    );
  }

  /**
   * 删除漫画章节（软删除）
   * DELETE /api/v1/works/:workId/chapters/manga/:chapterId
   *
   * 任务3.5.2: 漫画章节管理 API
   *
   * 功能：
   * - 软删除漫画章节及其所有页面
   * - 更新作品总页数
   *
   * 仅章节作者可执行此操作
   */
  @Delete('manga/:chapterId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteMangaChapter(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
  ): Promise<DeleteChapterResponseDto> {
    const authorId = req.user.userId as string;
    return this.chaptersService.deleteMangaChapter(workId, chapterId, authorId);
  }

  // ==================== 定时发布 API ====================

  /**
   * 设置章节定时发布
   * POST /api/v1/works/:workId/chapters/:chapterId/schedule
   *
   * 需求6验收标准14: WHEN Creator 设置章节发布时间 THEN System SHALL 支持定时发布功能
   *
   * 功能：
   * - 设置章节的定时发布时间
   * - 到达时间后自动发布
   * - 仅草稿状态的章节可设置
   *
   * 仅章节作者可执行此操作
   */
  @Post(':chapterId/schedule')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async scheduleChapterPublish(
    @Param('workId', new ParseUUIDPipe()) _workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
    @Body() body: { scheduledAt: string },
  ): Promise<{ message: string; scheduledAt: Date | null }> {
    const authorId = req.user.userId as string;
    const scheduledAt = new Date(body.scheduledAt);

    if (isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('无效的发布时间');
    }

    const result = await this.scheduledPublishService.scheduleChapterPublish(
      chapterId,
      scheduledAt,
      authorId,
    );

    return {
      message: `章节已设置为 ${scheduledAt.toLocaleString('zh-CN')} 发布`,
      scheduledAt: result.scheduledAt,
    };
  }

  /**
   * 取消章节定时发布
   * DELETE /api/v1/works/:workId/chapters/:chapterId/schedule
   *
   * 需求6验收标准14: 定时发布功能
   *
   * 功能：
   * - 取消已设置的定时发布
   * - 章节保持草稿状态
   *
   * 仅章节作者可执行此操作
   */
  @Delete(':chapterId/schedule')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelScheduledPublish(
    @Param('workId', new ParseUUIDPipe()) _workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    const authorId = req.user.userId as string;

    await this.scheduledPublishService.cancelScheduledPublish(
      chapterId,
      authorId,
    );

    return {
      message: '已取消定时发布',
    };
  }

  /**
   * 获取用户的所有定时发布章节
   * GET /api/v1/works/:workId/chapters/scheduled
   *
   * 需求6验收标准14: 定时发布功能
   *
   * 功能：
   * - 获取用户所有待定时发布的章节列表
   * - 按发布时间排序
   *
   * 仅返回当前用户的章节
   */
  @Get('scheduled')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getScheduledChapters(
    @Param('workId', new ParseUUIDPipe()) _workId: string,
    @Request() req: any,
  ): Promise<{
    chapters: Array<{
      id: string;
      title: string;
      workId: string;
      workTitle: string;
      scheduledAt: Date;
    }>;
  }> {
    const authorId = req.user.userId as string;
    const chapters =
      await this.scheduledPublishService.getScheduledChapters(authorId);

    return { chapters };
  }
}
