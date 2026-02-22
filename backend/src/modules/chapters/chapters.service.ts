import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateChapterDto,
  UpdateChapterDto,
  ChapterResponseDto,
  CreateChapterResponseDto,
  UpdateChapterResponseDto,
  DeleteChapterResponseDto,
  ReorderChaptersDto,
  ReorderChaptersResponseDto,
  ChapterVersionListResponseDto,
  ChapterVersionDetailResponseDto,
  ChapterVersionItemDto,
  RollbackChapterDto,
  RollbackChapterResponseDto,
  CreateMangaChapterDto,
  UpdateMangaChapterDto,
  MangaChapterResponseDto,
  MangaPageResponseDto,
  CreateMangaChapterResponseDto,
  UpdateMangaChapterResponseDto,
  MangaChapterListItemDto,
  MangaChapterListResponseDto,
} from './dto/index.js';
import { ChapterStatus, ContentType } from '@prisma/client';
import { ParagraphsService } from '../paragraphs/paragraphs.service.js';

/**
 * 章节服务
 * 处理章节管理相关业务逻辑
 *
 * 需求2: 作品管理与版本控制
 */
@Injectable()
export class ChaptersService {
  private readonly logger = new Logger(ChaptersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paragraphsService: ParagraphsService,
  ) {}

  /**
   * 计算文本字数
   * 中文字符按1个字计算，英文单词按1个字计算
   */
  static calculateWordCount(content: string): number {
    if (!content || content.trim().length === 0) {
      return 0;
    }
    const text = content.replace(/<[^>]*>/g, '');
    const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishWords = (
      text.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[a-zA-Z0-9]+/g) || []
    ).length;
    return chineseChars + englishWords;
  }

  async createChapter(
    workId: string,
    authorId: string,
    createChapterDto: CreateChapterDto,
  ): Promise<CreateChapterResponseDto> {
    const work = await this.prisma.work.findUnique({
      where: { id: workId, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    if (work.authorId !== authorId) {
      throw new ForbiddenException('无权为此作品创建章节');
    }

    const { title, content, status } = createChapterDto;
    const wordCount = ChaptersService.calculateWordCount(content);
    const chapterStatus = status || ChapterStatus.DRAFT;

    try {
      const chapter = await (this.prisma as any).$transaction(
        async (tx: any) => {
          const lastChapter = await tx.chapter.findFirst({
            where: { workId, isDeleted: false },
            orderBy: { orderIndex: 'desc' },
            select: { orderIndex: true },
          });

          const orderIndex =
            lastChapter !== null ? lastChapter.orderIndex + 1 : 0;

          const newChapter = await tx.chapter.create({
            data: {
              workId,
              authorId,
              title,
              content,
              orderIndex,
              wordCount,
              status: chapterStatus,
              version: 1,
              publishedAt:
                chapterStatus === ChapterStatus.PUBLISHED ? new Date() : null,
            },
          });

          await tx.work.update({
            where: { id: workId },
            data: { wordCount: { increment: wordCount } },
          });

          return newChapter;
        },
      );

      if (chapterStatus === ChapterStatus.PUBLISHED) {
        await this.paragraphsService.createParagraphsForChapter(
          workId,
          chapter.id,
          content,
        );
      }

      this.logger.log(
        `Chapter created: ${chapter.id} for work: ${workId} by author: ${authorId}`,
      );

      return {
        message: '章节创建成功',
        chapter: this.formatChapterResponse(chapter),
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create chapter: ${errorMessage}`);
      throw new InternalServerErrorException('创建章节失败');
    }
  }

  private formatChapterResponse(chapter: any): ChapterResponseDto {
    return {
      id: chapter.id,
      workId: chapter.workId,
      title: chapter.title,
      content: chapter.content,
      orderIndex: chapter.orderIndex,
      wordCount: chapter.wordCount,
      status: chapter.status,
      version: chapter.version,
      publishedAt: chapter.publishedAt,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
    };
  }

  async updateChapter(
    workId: string,
    chapterId: string,
    authorId: string,
    updateChapterDto: UpdateChapterDto,
  ): Promise<UpdateChapterResponseDto> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      include: {
        work: { select: { id: true, authorId: true, wordCount: true } },
      },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    if (chapter.work.authorId !== authorId) {
      throw new ForbiddenException('无权更新此章节');
    }

    const { title, content, status } = updateChapterDto;

    const hasChanges =
      (title !== undefined && title !== chapter.title) ||
      (content !== undefined && content !== chapter.content) ||
      (status !== undefined && status !== chapter.status);

    if (!hasChanges) {
      return {
        message: '章节无变更',
        chapter: this.formatChapterResponse(chapter),
        previousVersion: chapter.version,
      };
    }

    const previousVersion = chapter.version;
    const newVersion = chapter.version + 1;
    const newWordCount =
      content !== undefined
        ? ChaptersService.calculateWordCount(content)
        : chapter.wordCount;
    const wordCountDiff = newWordCount - chapter.wordCount;

    try {
      const updatedChapter = await (this.prisma as any).$transaction(
        async (tx: any) => {
          await tx.chapterVersion.create({
            data: {
              chapterId: chapter.id,
              version: chapter.version,
              title: chapter.title,
              content: chapter.content,
              wordCount: chapter.wordCount,
            },
          });

          const updated = await tx.chapter.update({
            where: { id: chapterId },
            data: {
              title: title ?? chapter.title,
              content: content ?? chapter.content,
              wordCount: newWordCount,
              status: status ?? chapter.status,
              version: newVersion,
              publishedAt:
                status === ChapterStatus.PUBLISHED && !chapter.publishedAt
                  ? new Date()
                  : chapter.publishedAt,
            },
          });

          if (wordCountDiff !== 0) {
            await tx.work.update({
              where: { id: workId },
              data: { wordCount: { increment: wordCountDiff } },
            });
          }

          return updated;
        },
      );

      const finalStatus = status ?? chapter.status;
      const finalContent = content ?? chapter.content;
      const wasPublished = chapter.status === ChapterStatus.PUBLISHED;
      const isNowPublished = finalStatus === ChapterStatus.PUBLISHED;

      if (isNowPublished) {
        if (wasPublished && content !== undefined) {
          await this.paragraphsService.updateParagraphsForChapter(
            workId,
            chapterId,
            finalContent,
          );
        } else if (!wasPublished) {
          await this.paragraphsService.createParagraphsForChapter(
            workId,
            chapterId,
            finalContent,
          );
        }
      } else if (wasPublished && !isNowPublished) {
        await this.paragraphsService.deleteParagraphsForChapter(chapterId);
      }

      this.logger.log(
        `Chapter updated: ${chapterId} (v${previousVersion} -> v${newVersion}) by author: ${authorId}`,
      );

      return {
        message: '章节更新成功',
        chapter: this.formatChapterResponse(updatedChapter),
        previousVersion,
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update chapter: ${errorMessage}`);
      throw new InternalServerErrorException('更新章节失败');
    }
  }

  async deleteChapter(
    workId: string,
    chapterId: string,
    authorId: string,
  ): Promise<DeleteChapterResponseDto> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { work: { select: { id: true, authorId: true } } },
    });

    if (!chapter || chapter.isDeleted) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    if (chapter.work.authorId !== authorId) {
      throw new ForbiddenException('无权删除此章节');
    }

    try {
      await (this.prisma as any).$transaction(async (tx: any) => {
        await tx.chapter.update({
          where: { id: chapterId },
          data: { isDeleted: true },
        });

        await tx.work.update({
          where: { id: workId },
          data: { wordCount: { decrement: chapter.wordCount } },
        });
      });

      this.logger.log(
        `Chapter soft-deleted: ${chapterId} from work: ${workId} by author: ${authorId}`,
      );

      return { message: '章节删除成功' };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete chapter: ${errorMessage}`);
      throw new InternalServerErrorException('删除章节失败');
    }
  }

  async reorderChapters(
    workId: string,
    authorId: string,
    reorderDto: ReorderChaptersDto,
  ): Promise<ReorderChaptersResponseDto> {
    const { chapterIds } = reorderDto;

    const uniqueIds = new Set(chapterIds);
    if (uniqueIds.size !== chapterIds.length) {
      throw new ForbiddenException('章节ID列表中存在重复项');
    }

    const work = await this.prisma.work.findUnique({
      where: { id: workId, isDeleted: false },
      select: { id: true, authorId: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    if (work.authorId !== authorId) {
      throw new ForbiddenException('无权为此作品排序章节');
    }

    const chapters = await this.prisma.chapter.findMany({
      where: { id: { in: chapterIds }, workId, isDeleted: false },
      select: { id: true },
    });

    if (chapters.length !== chapterIds.length) {
      const foundIds = new Set(chapters.map((c) => c.id));
      const invalidIds = chapterIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `以下章节不存在或不属于该作品: ${invalidIds.join(', ')}`,
      );
    }

    try {
      await (this.prisma as any).$transaction(async (tx: any) => {
        for (let i = 0; i < chapterIds.length; i++) {
          await tx.chapter.update({
            where: { id: chapterIds[i] },
            data: { orderIndex: i },
          });
        }
      });

      this.logger.log(
        `Chapters reordered for work: ${workId} by author: ${authorId}, count: ${chapterIds.length}`,
      );

      return { message: '章节排序成功', updatedCount: chapterIds.length };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reorder chapters: ${errorMessage}`);
      throw new InternalServerErrorException('章节排序失败');
    }
  }

  async getChapterVersions(
    workId: string,
    chapterId: string,
    authorId: string,
  ): Promise<ChapterVersionListResponseDto> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      select: {
        id: true,
        workId: true,
        authorId: true,
        version: true,
        title: true,
        wordCount: true,
        createdAt: true,
      },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    if (chapter.authorId !== authorId) {
      throw new ForbiddenException('无权查看此章节的版本历史');
    }

    const historicalVersions = await this.prisma.chapterVersion.findMany({
      where: { chapterId },
      orderBy: { version: 'desc' },
      select: { version: true, title: true, wordCount: true, createdAt: true },
    });

    const versions: ChapterVersionItemDto[] = [
      {
        version: chapter.version,
        title: chapter.title,
        wordCount: chapter.wordCount,
        createdAt: chapter.createdAt,
      },
      ...historicalVersions.map((v) => ({
        version: v.version,
        title: v.title,
        wordCount: v.wordCount,
        createdAt: v.createdAt,
      })),
    ];

    versions.sort((a, b) => b.version - a.version);

    this.logger.log(
      `Retrieved ${versions.length} versions for chapter: ${chapterId} by author: ${authorId}`,
    );

    return {
      message: '获取版本历史成功',
      chapterId,
      currentVersion: chapter.version,
      versions,
      totalVersions: versions.length,
    };
  }

  async getChapterVersionDetail(
    workId: string,
    chapterId: string,
    version: number,
    authorId: string,
  ): Promise<ChapterVersionDetailResponseDto> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      select: {
        id: true,
        workId: true,
        authorId: true,
        version: true,
        title: true,
        content: true,
        wordCount: true,
        createdAt: true,
      },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    if (chapter.authorId !== authorId) {
      throw new ForbiddenException('无权查看此章节的版本详情');
    }

    if (version === chapter.version) {
      this.logger.log(
        `Retrieved current version ${version} for chapter: ${chapterId} by author: ${authorId}`,
      );

      return {
        message: '获取版本详情成功',
        chapterId,
        version: chapter.version,
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount,
        createdAt: chapter.createdAt,
      };
    }

    const chapterVersion = await this.prisma.chapterVersion.findUnique({
      where: { chapterId_version: { chapterId, version } },
      select: {
        version: true,
        title: true,
        content: true,
        wordCount: true,
        createdAt: true,
      },
    });

    if (!chapterVersion) {
      throw new NotFoundException(`版本 ${version} 不存在`);
    }

    this.logger.log(
      `Retrieved historical version ${version} for chapter: ${chapterId} by author: ${authorId}`,
    );

    return {
      message: '获取版本详情成功',
      chapterId,
      version: chapterVersion.version,
      title: chapterVersion.title,
      content: chapterVersion.content,
      wordCount: chapterVersion.wordCount,
      createdAt: chapterVersion.createdAt,
    };
  }

  async rollbackChapterVersion(
    workId: string,
    chapterId: string,
    authorId: string,
    rollbackDto: RollbackChapterDto,
  ): Promise<RollbackChapterResponseDto> {
    const { targetVersion } = rollbackDto;

    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      include: {
        work: { select: { id: true, authorId: true, wordCount: true } },
      },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    if (chapter.work.authorId !== authorId) {
      throw new ForbiddenException('无权回滚此章节');
    }

    if (targetVersion === chapter.version) {
      throw new ForbiddenException('不能回滚到当前版本');
    }

    const targetVersionData = await this.prisma.chapterVersion.findUnique({
      where: { chapterId_version: { chapterId, version: targetVersion } },
      select: { version: true, title: true, content: true, wordCount: true },
    });

    if (!targetVersionData) {
      throw new NotFoundException(`目标版本 ${targetVersion} 不存在`);
    }

    const previousVersion = chapter.version;
    const newVersion = chapter.version + 1;
    const wordCountDiff = targetVersionData.wordCount - chapter.wordCount;

    try {
      await (this.prisma as any).$transaction(async (tx: any) => {
        await tx.chapterVersion.create({
          data: {
            chapterId: chapter.id,
            version: chapter.version,
            title: chapter.title,
            content: chapter.content,
            wordCount: chapter.wordCount,
          },
        });

        await tx.chapter.update({
          where: { id: chapterId },
          data: {
            title: targetVersionData.title,
            content: targetVersionData.content,
            wordCount: targetVersionData.wordCount,
            version: newVersion,
          },
        });

        if (wordCountDiff !== 0) {
          await tx.work.update({
            where: { id: workId },
            data: { wordCount: { increment: wordCountDiff } },
          });
        }
      });

      this.logger.log(
        `Chapter rolled back: ${chapterId} from v${previousVersion} to v${newVersion} (restored from v${targetVersion}) by author: ${authorId}`,
      );

      return {
        message: '章节回滚成功',
        chapterId,
        previousVersion,
        newVersion,
        targetVersion,
        title: targetVersionData.title,
        wordCount: targetVersionData.wordCount,
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to rollback chapter: ${errorMessage}`);
      throw new InternalServerErrorException('章节回滚失败');
    }
  }

  // ==================== 漫画章节管理 API ====================

  private formatMangaPageResponse(page: any): MangaPageResponseDto {
    return {
      id: page.id,
      imageUrl: page.imageUrl,
      thumbnailUrl: page.thumbnailUrl,
      orderIndex: page.orderIndex,
      width: page.width,
      height: page.height,
      fileSize: page.fileSize,
    };
  }

  private formatMangaChapterResponse(
    chapter: any,
    pages: any[],
  ): MangaChapterResponseDto {
    return {
      id: chapter.id,
      workId: chapter.workId,
      title: chapter.title,
      orderIndex: chapter.orderIndex,
      pageCount: pages.length,
      status: chapter.status,
      version: chapter.version,
      publishedAt: chapter.publishedAt,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
      pages: pages.map((p) => this.formatMangaPageResponse(p)),
    };
  }

  async createMangaChapter(
    workId: string,
    authorId: string,
    createMangaChapterDto: CreateMangaChapterDto,
  ): Promise<CreateMangaChapterResponseDto> {
    const work = await this.prisma.work.findUnique({
      where: { id: workId, isDeleted: false },
      select: { id: true, authorId: true, contentType: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    if (work.authorId !== authorId) {
      throw new ForbiddenException('无权为此作品创建章节');
    }

    if (work.contentType !== ContentType.MANGA) {
      throw new ForbiddenException('此作品不是漫画类型，请使用小说章节 API');
    }

    const { title, pages, status } = createMangaChapterDto;
    const chapterStatus = status || ChapterStatus.DRAFT;

    try {
      const result = await (this.prisma as any).$transaction(
        async (tx: any) => {
          const lastChapter = await tx.chapter.findFirst({
            where: { workId, isDeleted: false },
            orderBy: { orderIndex: 'desc' },
            select: { orderIndex: true },
          });

          const orderIndex =
            lastChapter !== null ? lastChapter.orderIndex + 1 : 0;

          const newChapter = await tx.chapter.create({
            data: {
              workId,
              authorId,
              title,
              content: '',
              orderIndex,
              wordCount: 0,
              status: chapterStatus,
              version: 1,
              publishedAt:
                chapterStatus === ChapterStatus.PUBLISHED ? new Date() : null,
            },
          });

          const createdPages = await Promise.all(
            pages.map((page, index) =>
              tx.mangaPage.create({
                data: {
                  chapterId: newChapter.id,
                  imageUrl: page.imageUrl,
                  thumbnailUrl: page.thumbnailUrl || null,
                  orderIndex: index,
                  width: page.width || null,
                  height: page.height || null,
                  fileSize: page.fileSize || null,
                },
              }),
            ),
          );

          await tx.work.update({
            where: { id: workId },
            data: { pageCount: { increment: pages.length } },
          });

          return { chapter: newChapter, pages: createdPages };
        },
      );

      this.logger.log(
        `Manga chapter created: ${result.chapter.id} for work: ${workId} with ${pages.length} pages by author: ${authorId}`,
      );

      return {
        message: '漫画章节创建成功',
        chapter: this.formatMangaChapterResponse(result.chapter, result.pages),
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create manga chapter: ${errorMessage}`);
      throw new InternalServerErrorException('创建漫画章节失败');
    }
  }

  async getMangaChapter(
    workId: string,
    chapterId: string,
    authorId?: string,
  ): Promise<MangaChapterResponseDto> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      include: {
        work: {
          select: { id: true, authorId: true, contentType: true, status: true },
        },
        mangaPages: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    if (chapter.work.contentType !== ContentType.MANGA) {
      throw new ForbiddenException('此章节不是漫画章节');
    }

    if (chapter.status === ChapterStatus.DRAFT) {
      if (!authorId || chapter.work.authorId !== authorId) {
        throw new NotFoundException('章节不存在');
      }
    }

    return this.formatMangaChapterResponse(chapter, chapter.mangaPages);
  }

  async getMangaChapterList(
    workId: string,
    authorId?: string,
  ): Promise<MangaChapterListResponseDto> {
    const work = await this.prisma.work.findUnique({
      where: { id: workId, isDeleted: false },
      select: { id: true, authorId: true, contentType: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    if (work.contentType !== ContentType.MANGA) {
      throw new ForbiddenException('此作品不是漫画类型');
    }

    const isAuthor = authorId && work.authorId === authorId;
    const whereClause: any = { workId, isDeleted: false };

    if (!isAuthor) {
      whereClause.status = ChapterStatus.PUBLISHED;
    }

    const chapters = await this.prisma.chapter.findMany({
      where: whereClause,
      orderBy: { orderIndex: 'asc' },
      include: {
        mangaPages: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
          take: 1,
          select: { thumbnailUrl: true, imageUrl: true },
        },
        _count: {
          select: { mangaPages: { where: { isDeleted: false } } },
        },
      },
    });

    const chapterList: MangaChapterListItemDto[] = chapters.map((chapter) => ({
      id: chapter.id,
      workId: chapter.workId,
      title: chapter.title,
      orderIndex: chapter.orderIndex,
      pageCount: chapter._count.mangaPages,
      status: chapter.status,
      version: chapter.version,
      publishedAt: chapter.publishedAt,
      createdAt: chapter.createdAt,
      updatedAt: chapter.updatedAt,
      thumbnailUrl:
        chapter.mangaPages[0]?.thumbnailUrl ||
        chapter.mangaPages[0]?.imageUrl ||
        null,
    }));

    return {
      message: '获取漫画章节列表成功',
      chapters: chapterList,
      total: chapterList.length,
    };
  }

  async updateMangaChapter(
    workId: string,
    chapterId: string,
    authorId: string,
    updateMangaChapterDto: UpdateMangaChapterDto,
  ): Promise<UpdateMangaChapterResponseDto> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId, isDeleted: false },
      include: {
        work: {
          select: {
            id: true,
            authorId: true,
            contentType: true,
            pageCount: true,
          },
        },
        mangaPages: {
          where: { isDeleted: false },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!chapter) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    if (chapter.work.authorId !== authorId) {
      throw new ForbiddenException('无权更新此章节');
    }

    if (chapter.work.contentType !== ContentType.MANGA) {
      throw new ForbiddenException('此章节不是漫画章节，请使用小说章节 API');
    }

    const { title, pages, status } = updateMangaChapterDto;

    const hasChanges =
      (title !== undefined && title !== chapter.title) ||
      pages !== undefined ||
      (status !== undefined && status !== chapter.status);

    if (!hasChanges) {
      return {
        message: '章节无变更',
        chapter: this.formatMangaChapterResponse(chapter, chapter.mangaPages),
        previousVersion: chapter.version,
      };
    }

    const previousVersion = chapter.version;
    const newVersion = chapter.version + 1;
    const oldPageCount = chapter.mangaPages.length;
    const newPageCount = pages !== undefined ? pages.length : oldPageCount;
    const pageCountDiff = newPageCount - oldPageCount;

    try {
      const result = await (this.prisma as any).$transaction(
        async (tx: any) => {
          const pageSnapshot = JSON.stringify(
            chapter.mangaPages.map((p: any) => ({
              imageUrl: p.imageUrl,
              thumbnailUrl: p.thumbnailUrl,
              orderIndex: p.orderIndex,
              width: p.width,
              height: p.height,
              fileSize: p.fileSize,
            })),
          );

          await tx.chapterVersion.create({
            data: {
              chapterId: chapter.id,
              version: chapter.version,
              title: chapter.title,
              content: pageSnapshot,
              wordCount: oldPageCount,
            },
          });

          const updatedChapter = await tx.chapter.update({
            where: { id: chapterId },
            data: {
              title: title ?? chapter.title,
              status: status ?? chapter.status,
              version: newVersion,
              publishedAt:
                status === ChapterStatus.PUBLISHED && !chapter.publishedAt
                  ? new Date()
                  : chapter.publishedAt,
            },
          });

          let updatedPages = chapter.mangaPages;
          if (pages !== undefined) {
            await tx.mangaPage.updateMany({
              where: { chapterId, isDeleted: false },
              data: { isDeleted: true },
            });

            updatedPages = await Promise.all(
              pages.map((page, index) =>
                tx.mangaPage.create({
                  data: {
                    chapterId,
                    imageUrl: page.imageUrl,
                    thumbnailUrl: page.thumbnailUrl || null,
                    orderIndex: index,
                    width: page.width || null,
                    height: page.height || null,
                    fileSize: page.fileSize || null,
                  },
                }),
              ),
            );

            if (pageCountDiff !== 0) {
              await tx.work.update({
                where: { id: workId },
                data: { pageCount: { increment: pageCountDiff } },
              });
            }
          }

          return { chapter: updatedChapter, pages: updatedPages };
        },
      );

      this.logger.log(
        `Manga chapter updated: ${chapterId} (v${previousVersion} -> v${newVersion}) by author: ${authorId}`,
      );

      return {
        message: '漫画章节更新成功',
        chapter: this.formatMangaChapterResponse(result.chapter, result.pages),
        previousVersion,
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update manga chapter: ${errorMessage}`);
      throw new InternalServerErrorException('更新漫画章节失败');
    }
  }

  async deleteMangaChapter(
    workId: string,
    chapterId: string,
    authorId: string,
  ): Promise<DeleteChapterResponseDto> {
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      include: {
        work: {
          select: { id: true, authorId: true, contentType: true },
        },
        mangaPages: {
          where: { isDeleted: false },
        },
      },
    });

    if (!chapter || chapter.isDeleted) {
      throw new NotFoundException('章节不存在');
    }

    if (chapter.workId !== workId) {
      throw new NotFoundException('章节不属于该作品');
    }

    if ((chapter as any).work.authorId !== authorId) {
      throw new ForbiddenException('无权删除此章节');
    }

    if ((chapter as any).work.contentType !== ContentType.MANGA) {
      throw new ForbiddenException('此章节不是漫画章节');
    }

    const pageCount = (chapter as any).mangaPages.length;

    try {
      await (this.prisma as any).$transaction(async (tx: any) => {
        await tx.mangaPage.updateMany({
          where: { chapterId, isDeleted: false },
          data: { isDeleted: true },
        });

        await tx.chapter.update({
          where: { id: chapterId },
          data: { isDeleted: true },
        });

        if (pageCount > 0) {
          await tx.work.update({
            where: { id: workId },
            data: { pageCount: { decrement: pageCount } },
          });
        }
      });

      this.logger.log(
        `Manga chapter soft-deleted: ${chapterId} from work: ${workId} by author: ${authorId}`,
      );

      return { message: '漫画章节删除成功' };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete manga chapter: ${errorMessage}`);
      throw new InternalServerErrorException('删除漫画章节失败');
    }
  }
}
