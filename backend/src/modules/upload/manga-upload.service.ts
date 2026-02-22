import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UploadService, FileInput } from '../../storage/upload.service.js';
import {
  MangaPageUploadResultDto,
  BatchMangaUploadResponseDto,
  ReorderMangaPagesResponseDto,
  DeleteMangaPageResponseDto,
  ReplaceMangaPageResponseDto,
} from './dto/manga-upload.dto.js';
import type {
  ArchiveUploadResponseDto,
  ArchivePreviewResponseDto,
} from './dto/archive-upload.dto.js';
import { ArchiveParserService } from './archive-parser.service.js';
import { ContentType } from '@prisma/client';

/**
 * 漫画图片上传服务
 * 处理漫画页面的批量上传、管理和处理
 *
 * 任务 3.5.3: 图片批量上传 API
 * 任务 3.5.4: 压缩包解析（ZIP/RAR）
 */
@Injectable()
export class MangaUploadService {
  private readonly logger = new Logger(MangaUploadService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly archiveParserService: ArchiveParserService,
  ) {}

  /**
   * 批量上传漫画页面到章节
   */
  async batchUploadPages(
    workId: string,
    chapterId: string,
    authorId: string,
    files: FileInput[],
    startIndex?: number,
  ): Promise<BatchMangaUploadResponseDto> {
    // 验证章节和权限
    await this.validateChapterAccess(workId, chapterId, authorId);

    if (files.length === 0) {
      throw new BadRequestException('请至少上传一张图片');
    }

    if (files.length > 100) {
      throw new BadRequestException('单次最多上传100张图片');
    }

    // 获取当前最大排序索引
    const lastPage = await this.prisma.mangaPage.findFirst({
      where: { chapterId, isDeleted: false },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const baseIndex = startIndex ?? (lastPage ? lastPage.orderIndex + 1 : 0);

    const results: MangaPageUploadResultDto[] = [];
    const failedFiles: string[] = [];

    // 按文件名排序以保持顺序
    const sortedFiles = [...files].sort((a, b) =>
      a.originalname.localeCompare(b.originalname, undefined, {
        numeric: true,
      }),
    );

    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i];
      try {
        const result = await this.uploadSinglePage(
          chapterId,
          authorId,
          file,
          baseIndex + i,
        );
        results.push(result);
      } catch (error) {
        this.logger.warn(
          `Failed to upload page ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        failedFiles.push(file.originalname);
      }
    }

    // 更新作品总页数
    if (results.length > 0) {
      await this.prisma.work.update({
        where: { id: workId },
        data: { pageCount: { increment: results.length } },
      });
    }

    this.logger.log(
      `Batch uploaded ${results.length} pages to chapter ${chapterId}, ${failedFiles.length} failed`,
    );

    return {
      message:
        failedFiles.length === 0
          ? '图片上传成功'
          : `部分图片上传成功，${failedFiles.length} 张失败`,
      pages: results,
      successCount: results.length,
      failedCount: failedFiles.length,
      failedFiles,
    };
  }

  /**
   * 上传单张漫画页面
   */
  async uploadSinglePage(
    chapterId: string,
    _authorId: string,
    file: FileInput,
    orderIndex: number,
  ): Promise<MangaPageUploadResultDto> {
    // 验证文件类型
    this.validateImageFile(file);

    // 上传图片并生成缩略图
    const uploadResult = await this.uploadService.uploadContentImage(
      chapterId,
      file,
    );

    // 获取缩略图 URL（取第一个缩略图）
    const thumbnailUrl =
      uploadResult.thumbnails.length > 0
        ? uploadResult.thumbnails[0].url
        : null;

    // 创建数据库记录
    const page = await this.prisma.mangaPage.create({
      data: {
        chapterId,
        imageUrl: uploadResult.url,
        thumbnailUrl,
        orderIndex,
        width: uploadResult.originalWidth,
        height: uploadResult.originalHeight,
        fileSize: file.size,
      },
    });

    return {
      originalName: file.originalname,
      imageUrl: page.imageUrl,
      thumbnailUrl: page.thumbnailUrl,
      width: page.width,
      height: page.height,
      fileSize: page.fileSize || file.size,
      orderIndex: page.orderIndex,
    };
  }

  /**
   * 重新排序漫画页面
   */
  async reorderPages(
    workId: string,
    chapterId: string,
    authorId: string,
    pageIds: string[],
  ): Promise<ReorderMangaPagesResponseDto> {
    await this.validateChapterAccess(workId, chapterId, authorId);

    // 验证所有页面都属于该章节
    const pages = await this.prisma.mangaPage.findMany({
      where: { id: { in: pageIds }, chapterId, isDeleted: false },
      select: { id: true },
    });

    if (pages.length !== pageIds.length) {
      const foundIds = new Set(pages.map((p) => p.id));
      const invalidIds = pageIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `以下页面不存在或不属于该章节: ${invalidIds.join(', ')}`,
      );
    }

    // 更新排序
    await (this.prisma as any).$transaction(async (tx: any) => {
      for (let i = 0; i < pageIds.length; i++) {
        await tx.mangaPage.update({
          where: { id: pageIds[i] },
          data: { orderIndex: i },
        });
      }
    });

    this.logger.log(
      `Reordered ${pageIds.length} pages in chapter ${chapterId}`,
    );

    return {
      message: '页面排序成功',
      updatedCount: pageIds.length,
    };
  }

  /**
   * 删除单个漫画页面
   */
  async deletePage(
    workId: string,
    chapterId: string,
    pageId: string,
    authorId: string,
  ): Promise<DeleteMangaPageResponseDto> {
    await this.validateChapterAccess(workId, chapterId, authorId);

    const page = await this.prisma.mangaPage.findUnique({
      where: { id: pageId },
    });

    if (!page || page.isDeleted || page.chapterId !== chapterId) {
      throw new NotFoundException('页面不存在');
    }

    // 软删除页面
    await this.prisma.mangaPage.update({
      where: { id: pageId },
      data: { isDeleted: true },
    });

    // 更新作品总页数
    await this.prisma.work.update({
      where: { id: workId },
      data: { pageCount: { decrement: 1 } },
    });

    // 尝试删除存储中的文件（异步，不阻塞响应）
    this.deleteStorageFiles(page.imageUrl, page.thumbnailUrl).catch((err) => {
      this.logger.warn(`Failed to delete storage files: ${err.message}`);
    });

    this.logger.log(`Deleted page ${pageId} from chapter ${chapterId}`);

    return { message: '页面删除成功' };
  }

  /**
   * 替换漫画页面图片
   */
  async replacePage(
    workId: string,
    chapterId: string,
    pageId: string,
    authorId: string,
    file: FileInput,
  ): Promise<ReplaceMangaPageResponseDto> {
    await this.validateChapterAccess(workId, chapterId, authorId);

    const page = await this.prisma.mangaPage.findUnique({
      where: { id: pageId },
    });

    if (!page || page.isDeleted || page.chapterId !== chapterId) {
      throw new NotFoundException('页面不存在');
    }

    // 验证文件类型
    this.validateImageFile(file);

    // 上传新图片
    const uploadResult = await this.uploadService.uploadContentImage(
      chapterId,
      file,
    );

    // 获取缩略图 URL
    const thumbnailUrl =
      uploadResult.thumbnails.length > 0
        ? uploadResult.thumbnails[0].url
        : null;

    // 保存旧的 URL 用于删除
    const oldImageUrl = page.imageUrl;
    const oldThumbnailUrl = page.thumbnailUrl;

    // 更新数据库记录
    const updatedPage = await this.prisma.mangaPage.update({
      where: { id: pageId },
      data: {
        imageUrl: uploadResult.url,
        thumbnailUrl,
        width: uploadResult.originalWidth,
        height: uploadResult.originalHeight,
        fileSize: file.size,
      },
    });

    // 异步删除旧文件
    this.deleteStorageFiles(oldImageUrl, oldThumbnailUrl).catch((err) => {
      this.logger.warn(`Failed to delete old storage files: ${err.message}`);
    });

    this.logger.log(`Replaced page ${pageId} in chapter ${chapterId}`);

    return {
      message: '页面替换成功',
      page: {
        originalName: file.originalname,
        imageUrl: updatedPage.imageUrl,
        thumbnailUrl: updatedPage.thumbnailUrl,
        width: updatedPage.width,
        height: updatedPage.height,
        fileSize: updatedPage.fileSize || file.size,
        orderIndex: updatedPage.orderIndex,
      },
    };
  }

  /**
   * 验证章节访问权限
   */
  private async validateChapterAccess(
    workId: string,
    chapterId: string,
    authorId: string,
  ): Promise<any> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      include: {
        work: {
          select: { id: true, authorId: true, contentType: true },
        },
      },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    if ((chapter as any).work.authorId !== authorId) {
      throw new ForbiddenException('无权操作此章节');
    }

    if ((chapter as any).work.contentType !== ContentType.MANGA) {
      throw new ForbiddenException('此章节不是漫画章节');
    }

    return chapter;
  }

  /**
   * 验证图片文件
   */
  private validateImageFile(file: FileInput): void {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `不支持的图片格式: ${file.mimetype}，支持 JPEG、PNG、WebP、GIF`,
      );
    }

    // 最大 20MB
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `图片大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB，最大 20MB`,
      );
    }
  }

  /**
   * 删除存储中的文件
   */
  private async deleteStorageFiles(
    imageUrl: string,
    thumbnailUrl: string | null,
  ): Promise<void> {
    try {
      await this.uploadService.deleteFile(imageUrl);
      if (thumbnailUrl) {
        await this.uploadService.deleteFile(thumbnailUrl);
      }
    } catch (error) {
      // 记录错误但不抛出
      this.logger.warn(
        `Failed to delete storage files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ==================== 压缩包上传功能 ====================

  /**
   * 预览压缩包内容（不上传）
   */
  async previewArchive(
    buffer: Buffer,
    filename: string,
  ): Promise<ArchivePreviewResponseDto> {
    // 验证压缩包
    this.archiveParserService.validateArchive(buffer, filename);

    // 解析压缩包
    const parseResult = await this.archiveParserService.parseArchive(
      buffer,
      filename,
    );

    return {
      message: '压缩包预览成功',
      images: parseResult.images.map((img) => ({
        filename: img.filename,
        originalPath: img.originalPath,
        size: img.size,
        orderIndex: img.orderIndex,
      })),
      imageCount: parseResult.images.length,
      skippedFiles: parseResult.skippedFiles,
      skippedFileNames: parseResult.skippedFileNames,
      totalFiles: parseResult.totalFiles,
    };
  }

  /**
   * 上传压缩包并解析图片到章节
   */
  async uploadArchive(
    workId: string,
    chapterId: string,
    authorId: string,
    buffer: Buffer,
    filename: string,
    startIndex?: number,
  ): Promise<ArchiveUploadResponseDto> {
    // 验证章节和权限
    await this.validateChapterAccess(workId, chapterId, authorId);

    // 验证压缩包
    this.archiveParserService.validateArchive(buffer, filename);

    // 解析压缩包
    const parseResult = await this.archiveParserService.parseArchive(
      buffer,
      filename,
    );

    if (parseResult.images.length === 0) {
      throw new BadRequestException('压缩包中没有找到支持的图片文件');
    }

    // 获取当前最大排序索引
    const lastPage = await this.prisma.mangaPage.findFirst({
      where: { chapterId, isDeleted: false },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true },
    });

    const baseIndex = startIndex ?? (lastPage ? lastPage.orderIndex + 1 : 0);

    const results: MangaPageUploadResultDto[] = [];
    const failedFiles: string[] = [];

    // 上传每张图片
    for (const image of parseResult.images) {
      try {
        const fileInput: FileInput = {
          buffer: image.buffer,
          originalname: image.filename,
          mimetype: image.mimetype,
          size: image.size,
        };

        const result = await this.uploadSinglePage(
          chapterId,
          authorId,
          fileInput,
          baseIndex + image.orderIndex,
        );
        results.push(result);
      } catch (error) {
        this.logger.warn(
          `Failed to upload page ${image.filename} from archive: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        failedFiles.push(image.filename);
      }
    }

    // 更新作品总页数
    if (results.length > 0) {
      await this.prisma.work.update({
        where: { id: workId },
        data: { pageCount: { increment: results.length } },
      });
    }

    this.logger.log(
      `Uploaded ${results.length} pages from archive to chapter ${chapterId}, ${failedFiles.length} failed`,
    );

    return {
      message:
        failedFiles.length === 0
          ? '压缩包上传成功'
          : `部分图片上传成功，${failedFiles.length} 张失败`,
      pages: results,
      successCount: results.length,
      failedCount: failedFiles.length,
      failedFiles,
      skippedFiles: parseResult.skippedFiles,
      skippedFileNames: parseResult.skippedFileNames,
      totalFilesInArchive: parseResult.totalFiles,
    };
  }
}
