import {
  Controller,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { MangaUploadService } from './manga-upload.service.js';
import {
  BatchMangaUploadResponseDto,
  ReorderMangaPagesDto,
  ReorderMangaPagesResponseDto,
  DeleteMangaPageResponseDto,
  ReplaceMangaPageResponseDto,
} from './dto/manga-upload.dto.js';

/**
 * 漫画图片上传控制器
 * 处理漫画页面的批量上传和管理
 *
 * 任务 3.5.3: 图片批量上传 API
 *
 * 路由前缀: /api/v1/works/:workId/chapters/:chapterId/pages
 */
@Controller('works/:workId/chapters/:chapterId/pages')
export class MangaUploadController {
  constructor(private readonly mangaUploadService: MangaUploadService) {}

  /**
   * 批量上传漫画页面
   * POST /api/v1/works/:workId/chapters/:chapterId/pages
   *
   * 功能：
   * - 支持同时上传多张图片（最多100张）
   * - 自动按文件名排序
   * - 自动生成缩略图
   * - 返回上传结果（成功/失败列表）
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('files', 100))
  @HttpCode(HttpStatus.CREATED)
  async batchUploadPages(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Query('startIndex', new ParseIntPipe({ optional: true }))
    startIndex?: number,
  ): Promise<BatchMangaUploadResponseDto> {
    const authorId = req.user.userId as string;
    const fileInputs = files.map((f) => ({
      buffer: f.buffer,
      originalname: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
    }));
    return this.mangaUploadService.batchUploadPages(
      workId,
      chapterId,
      authorId,
      fileInputs,
      startIndex,
    );
  }

  /**
   * 重新排序漫画页面
   * PATCH /api/v1/works/:workId/chapters/:chapterId/pages/reorder
   *
   * 功能：
   * - 根据提供的页面ID列表重新排序
   * - 验证所有页面都属于该章节
   */
  @Patch('reorder')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reorderPages(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
    @Body() reorderDto: ReorderMangaPagesDto,
  ): Promise<ReorderMangaPagesResponseDto> {
    const authorId = req.user.userId as string;
    return this.mangaUploadService.reorderPages(
      workId,
      chapterId,
      authorId,
      reorderDto.pageIds,
    );
  }

  /**
   * 删除单个漫画页面
   * DELETE /api/v1/works/:workId/chapters/:chapterId/pages/:pageId
   *
   * 功能：
   * - 软删除页面
   * - 更新作品总页数
   * - 异步删除存储文件
   */
  @Delete(':pageId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deletePage(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Param('pageId', new ParseUUIDPipe()) pageId: string,
    @Request() req: any,
  ): Promise<DeleteMangaPageResponseDto> {
    const authorId = req.user.userId as string;
    return this.mangaUploadService.deletePage(
      workId,
      chapterId,
      pageId,
      authorId,
    );
  }

  /**
   * 替换漫画页面图片
   * PATCH /api/v1/works/:workId/chapters/:chapterId/pages/:pageId
   *
   * 功能：
   * - 上传新图片替换现有页面
   * - 保持原有排序位置
   * - 异步删除旧文件
   */
  @Patch(':pageId')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async replacePage(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Param('pageId', new ParseUUIDPipe()) pageId: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ReplaceMangaPageResponseDto> {
    const authorId = req.user.userId as string;
    const fileInput = {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    };
    return this.mangaUploadService.replacePage(
      workId,
      chapterId,
      pageId,
      authorId,
      fileInput,
    );
  }

  /**
   * 上传压缩包并解析图片
   * POST /api/v1/works/:workId/chapters/:chapterId/pages/archive
   *
   * 任务 3.5.4: 压缩包解析（ZIP/RAR）
   *
   * 功能：
   * - 支持 ZIP、CBZ 格式
   * - 自动解析压缩包内的图片
   * - 按文件名自然排序
   * - 返回上传结果和跳过的文件列表
   */
  @Post('archive')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async uploadArchive(
    @Param('workId', new ParseUUIDPipe()) workId: string,
    @Param('chapterId', new ParseUUIDPipe()) chapterId: string,
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Query('startIndex', new ParseIntPipe({ optional: true }))
    startIndex?: number,
  ) {
    const authorId = req.user.userId as string;
    return this.mangaUploadService.uploadArchive(
      workId,
      chapterId,
      authorId,
      file.buffer,
      file.originalname,
      startIndex,
    );
  }

  /**
   * 预览压缩包内容（不上传）
   * POST /api/v1/works/:workId/chapters/:chapterId/pages/archive/preview
   *
   * 功能：
   * - 解析压缩包内容
   * - 返回图片列表和跳过的文件
   * - 不实际上传文件
   */
  @Post('archive/preview')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async previewArchive(@UploadedFile() file: Express.Multer.File) {
    return this.mangaUploadService.previewArchive(
      file.buffer,
      file.originalname,
    );
  }
}
