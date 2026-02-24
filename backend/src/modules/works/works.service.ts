import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  CreateWorkDto,
  UpdateWorkDto,
  UpdateWorkResponseDto,
  WorkCategory,
  WorkResponseDto,
  WorkDetailResponseDto,
  CreateWorkResponseDto,
  DeleteWorkResponseDto,
  AuthorBrief,
  WorkStats,
  ChapterBrief,
  ListWorksQueryDto,
  ReadingDirection,
} from './dto/index.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { WorkStatus, ContentType } from '@prisma/client';
import { AchievementProgressService } from '../achievement/achievement-progress.service.js';

/**
 * 作品服务
 * 处理作品管理相关业务逻辑
 *
 * 需求2: 作品管理与版本控制
 * 需求24.4.1: 发布作品成就集成
 */
@Injectable()
export class WorksService {
  private readonly logger = new Logger(WorksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly achievementProgressService: AchievementProgressService,
  ) {}

  /**
   * 创建新作品
   * 需求2验收标准1: WHEN Creator 创建新作品 THEN System SHALL 初始化 Main_Branch 并生成唯一作品标识
   * 需求2验收标准6: WHILE 作品处于草稿状态 THEN System SHALL 仅对 Creator 可见
   * 需求2验收标准7: WHEN Creator 设置作品元信息 THEN System SHALL 保存标题、简介、封面、标签等信息
   *
   * @param authorId 作者ID
   * @param createWorkDto 创建作品数据
   * @returns 创建的作品信息
   */
  async createWork(
    authorId: string,
    createWorkDto: CreateWorkDto,
  ): Promise<CreateWorkResponseDto> {
    const {
      title,
      description,
      type,
      category,
      tags,
      coverImage,
      readingDirection,
    } = createWorkDto;

    // 验证漫画特有字段
    if (type === ContentType.MANGA && !readingDirection) {
      // 漫画默认使用 RTL（日漫风格）
    }
    if (type === ContentType.NOVEL && readingDirection) {
      throw new BadRequestException('小说类型不支持设置阅读方向');
    }

    try {
      // 使用事务创建作品和关联标签
      const work = await (this.prisma as any).$transaction(async (tx: any) => {
        // 创建作品
        const newWork = await tx.work.create({
          data: {
            authorId,
            uploaderId: authorId, // 默认上传者为作者本人
            title,
            description: description || null,
            contentType: type,
            coverImage: coverImage || null,
            status: WorkStatus.DRAFT,
            wordCount: 0,
            viewCount: 0,
            likeCount: 0,
            quoteCount: 0,
            // Manga-specific fields
            readingDirection:
              type === ContentType.MANGA
                ? readingDirection || 'RTL' // 默认日漫风格
                : null,
            pageCount: 0,
          },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        });

        // 处理标签
        if (tags && tags.length > 0) {
          // 创建或获取标签
          for (const tagName of tags) {
            const normalizedTagName = tagName.trim().toLowerCase();
            if (!normalizedTagName) continue;

            // 创建标签（如果不存在）
            const tag = await tx.tag.upsert({
              where: { name: normalizedTagName },
              update: {
                usageCount: { increment: 1 },
              },
              create: {
                name: normalizedTagName,
                slug: this.generateSlug(normalizedTagName),
                usageCount: 1,
              },
            });

            // 创建作品-标签关联
            await tx.workTag.create({
              data: {
                workId: newWork.id,
                tagId: tag.id,
              },
            });
          }
        }

        // 重新获取作品（包含标签）
        return tx.work.findUnique({
          where: { id: newWork.id },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });
      });

      this.logger.log(
        `Work created successfully: ${work.id} by author: ${authorId}`,
      );

      return {
        message: '作品创建成功',
        work: this.formatWorkResponse(work, category),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create work: ${errorMessage}`);
      throw new InternalServerErrorException('创建作品失败');
    }
  }

  /**
   * 获取作品列表（分页、筛选、排序）
   *
   * 需求8验收标准2: WHEN 用户浏览作品列表 THEN System SHALL 支持按分类、标签、热度、更新时间筛选
   * 需求8验收标准5: WHEN 用户查看作品标签 THEN System SHALL 支持点击标签查看同类作品
   *
   * 默认只返回已发布的作品，除非请求者是作者本人（可查看自己的草稿）。
   *
   * @param query 查询参数（分页、筛选、排序）
   * @param requesterId 请求者ID（可选，用于查看自己的草稿）
   * @returns 分页的作品列表
   */
  async listWorks(
    query: ListWorksQueryDto,
    requesterId?: string,
  ): Promise<PaginatedResult<WorkResponseDto>> {
    const {
      page = 1,
      limit = 20,
      contentType,
      status,
      tag,
      authorId,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // Build where clause
    const where: any = {
      isDeleted: false,
    };

    // Content type filter
    if (contentType) {
      where.contentType = contentType;
    }

    // Author filter
    if (authorId) {
      where.authorId = authorId;
    }

    // Status / visibility logic:
    // - If authorId matches requesterId, allow any status (author viewing own works)
    // - If explicit status is provided and requester is the author, use that status
    // - Otherwise, only show PUBLISHED works
    if (authorId && requesterId && authorId === requesterId) {
      // Author viewing their own works - allow filtering by status
      if (status) {
        where.status = status;
      }
      // No status filter = show all of author's works
    } else {
      // Public view - only show published works (ignore status param)
      where.status = WorkStatus.PUBLISHED;
    }

    // Tag filter
    if (tag) {
      const normalizedTag = tag.trim().toLowerCase();
      where.tags = {
        some: {
          tag: {
            name: normalizedTag,
          },
        },
      };
    }

    // Build orderBy
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    try {
      const skip = (page - 1) * limit;

      const [works, total] = await Promise.all([
        this.prisma.work.findMany({
          where,
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.work.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: works.map((work: any) => this.formatWorkResponse(work)),
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to list works: ${errorMessage}`);
      throw new InternalServerErrorException('获取作品列表失败');
    }
  }

  /**
   * 获取作品详情
   * 需求2验收标准6: WHILE 作品处于草稿状态 THEN System SHALL 仅对 Creator 可见
   * 需求2验收标准7: WHEN Creator 设置作品元信息 THEN System SHALL 保存标题、简介、封面、标签等信息
   * 需求8验收标准3: WHEN 用户查看作品详情页 THEN System SHALL 显示作品信息、章节目录和统计数据
   *
   * @param workId 作品ID
   * @param requesterId 请求者ID（可选，用于权限检查）
   * @returns 作品详情
   */
  async getWorkById(
    workId: string,
    requesterId?: string,
  ): Promise<WorkDetailResponseDto> {
    const work = await this.prisma.work.findUnique({
      where: { id: workId, isDeleted: false },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        chapters: {
          where: { isDeleted: false },
          select: {
            id: true,
            title: true,
            orderIndex: true,
            wordCount: true,
            status: true,
            publishedAt: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    // 草稿作品仅对创作者可见
    if (work.status === WorkStatus.DRAFT) {
      if (!requesterId || requesterId !== work.authorId) {
        throw new ForbiddenException('该作品暂未公开');
      }
    }

    return this.formatWorkDetailResponse(work);
  }

  /**
   * 更新作品信息
   * 需求2验收标准7: WHEN Creator 设置作品元信息 THEN System SHALL 保存标题、简介、封面、标签等信息
   *
   * 仅作者可以更新自己的作品。
   * 支持更新标题、简介、封面、标签、状态。
   * 发布时（DRAFT -> PUBLISHED）自动设置 publishedAt。
   *
   * @param workId 作品ID
   * @param authorId 请求者ID（必须是作者）
   * @param updateWorkDto 更新数据
   * @returns 更新后的作品信息
   */
  async updateWork(
    workId: string,
    authorId: string,
    updateWorkDto: UpdateWorkDto,
  ): Promise<UpdateWorkResponseDto> {
    // 查找作品
    const existingWork = await this.prisma.work.findUnique({
      where: { id: workId, isDeleted: false },
      select: { id: true, authorId: true, status: true, contentType: true },
    });

    if (!existingWork) {
      throw new NotFoundException('作品不存在');
    }

    // 仅作者可以更新
    if (existingWork.authorId !== authorId) {
      throw new ForbiddenException('无权更新此作品');
    }

    // 验证状态转换
    if (updateWorkDto.status) {
      this.validateStatusTransition(existingWork.status, updateWorkDto.status);
    }

    const { tags, status, readingDirection, ...directFields } = updateWorkDto;

    // 验证漫画特有字段
    if (readingDirection && existingWork.contentType !== ContentType.MANGA) {
      throw new BadRequestException('小说类型不支持设置阅读方向');
    }

    try {
      const work = await (this.prisma as any).$transaction(async (tx: any) => {
        // 构建更新数据
        const updateData: any = {};

        // 直接字段更新
        if (directFields.title !== undefined)
          updateData.title = directFields.title;
        if (directFields.description !== undefined)
          updateData.description = directFields.description;
        if (directFields.coverImage !== undefined)
          updateData.coverImage = directFields.coverImage;

        // 状态更新
        if (status) {
          updateData.status = status;
          // 首次发布时设置 publishedAt
          if (
            status === WorkStatus.PUBLISHED &&
            existingWork.status === WorkStatus.DRAFT
          ) {
            updateData.publishedAt = new Date();
          }
        }

        // 漫画特有字段更新
        if (readingDirection !== undefined) {
          updateData.readingDirection = readingDirection;
        }

        // 更新作品基本信息
        if (Object.keys(updateData).length > 0) {
          await tx.work.update({
            where: { id: workId },
            data: updateData,
          });
        }

        // 处理标签更新
        if (tags !== undefined) {
          // 删除现有标签关联
          await tx.workTag.deleteMany({
            where: { workId },
          });

          // 创建新标签关联
          if (tags.length > 0) {
            for (const tagName of tags) {
              const normalizedTagName = tagName.trim().toLowerCase();
              if (!normalizedTagName) continue;

              const tag = await tx.tag.upsert({
                where: { name: normalizedTagName },
                update: {
                  usageCount: { increment: 1 },
                },
                create: {
                  name: normalizedTagName,
                  slug: this.generateSlug(normalizedTagName),
                  usageCount: 1,
                },
              });

              await tx.workTag.create({
                data: {
                  workId,
                  tagId: tag.id,
                },
              });
            }
          }
        }

        // 返回更新后的完整作品
        return tx.work.findUnique({
          where: { id: workId },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
        });
      });

      // 需求24.4.1: 发布作品成就集成
      // 当作品从草稿状态发布时，触发发布作品成就进度更新
      if (
        status === WorkStatus.PUBLISHED &&
        existingWork.status === WorkStatus.DRAFT
      ) {
        try {
          const achievementResults = await this.achievementProgressService.trackWorkPublishCount(authorId);
          const unlockedAchievements = achievementResults.filter(r => r.isNewlyUnlocked);
          if (unlockedAchievements.length > 0) {
            this.logger.log(
              `User ${authorId} unlocked ${unlockedAchievements.length} work publish achievement(s)`,
            );
          }
        } catch (achievementError) {
          // 成就更新失败不应影响作品发布
          this.logger.warn(
            `Failed to update work publish achievements for user ${authorId}: ${achievementError}`,
          );
        }
      }

      this.logger.log(
        `Work updated successfully: ${workId} by author: ${authorId}`,
      );

      return {
        message: '作品更新成功',
        work: this.formatWorkResponse(work),
      };
    } catch (error: unknown) {
      // Re-throw known HTTP exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update work: ${errorMessage}`);
      throw new InternalServerErrorException('更新作品失败');
    }
  }

  /**
   * 删除作品（软删除）
   * 需求10: 实现软删除机制（设置 isDeleted=true）
   *
   * 仅作者可以删除自己的作品。
   *
   * @param workId 作品ID
   * @param authorId 请求者ID（必须是作者）
   * @returns 删除成功消息
   */
  async deleteWork(
    workId: string,
    authorId: string,
  ): Promise<DeleteWorkResponseDto> {
    const existingWork = await this.prisma.work.findUnique({
      where: { id: workId },
      select: { id: true, authorId: true, isDeleted: true },
    });

    if (!existingWork || existingWork.isDeleted) {
      throw new NotFoundException('作品不存在');
    }

    if (existingWork.authorId !== authorId) {
      throw new ForbiddenException('无权删除此作品');
    }

    try {
      await this.prisma.work.update({
        where: { id: workId },
        data: { isDeleted: true },
      });

      this.logger.log(`Work soft-deleted: ${workId} by author: ${authorId}`);

      return { message: '作品删除成功' };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete work: ${errorMessage}`);
      throw new InternalServerErrorException('删除作品失败');
    }
  }

  /**
   * 验证作品状态转换是否合法
   * 允许的转换:
   * - DRAFT -> PUBLISHED (发布)
   * - PUBLISHED -> COMPLETED (完结)
   * - PUBLISHED -> HIATUS (暂停)
   * - HIATUS -> PUBLISHED (恢复)
   * - Any -> ABANDONED (放弃)
   */
  private validateStatusTransition(
    currentStatus: WorkStatus,
    newStatus: WorkStatus,
  ): void {
    if (currentStatus === newStatus) return;

    const allowedTransitions: Record<string, WorkStatus[]> = {
      [WorkStatus.DRAFT]: [WorkStatus.PUBLISHED],
      [WorkStatus.PUBLISHED]: [
        WorkStatus.COMPLETED,
        WorkStatus.HIATUS,
        WorkStatus.ABANDONED,
      ],
      [WorkStatus.HIATUS]: [WorkStatus.PUBLISHED, WorkStatus.ABANDONED],
      [WorkStatus.COMPLETED]: [WorkStatus.ABANDONED],
      [WorkStatus.ABANDONED]: [],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `不允许从 ${currentStatus} 状态转换到 ${newStatus} 状态`,
      );
    }
  }

  /**
   * 生成标签的 slug
   * @param name 标签名称
   * @returns slug
   */
  private generateSlug(name: string): string {
    // 简单的 slug 生成：移除特殊字符，用连字符替换空格
    return name
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '') // 保留字母、数字、中文、空格和连字符
      .replace(/\s+/g, '-') // 空格替换为连字符
      .replace(/-+/g, '-') // 多个连字符合并
      .replace(/^-|-$/g, ''); // 移除首尾连字符
  }

  /**
   * 格式化作品响应
   * @param work 数据库作品记录
   * @param category 作品分类
   * @returns 格式化的作品响应
   */
  private formatWorkResponse(
    work: any,
    category?: WorkCategory,
  ): WorkResponseDto {
    const author: AuthorBrief = {
      id: work.author.id,
      username: work.author.username,
      displayName: work.author.displayName,
      avatar: work.author.avatar,
    };

    const stats: WorkStats = {
      wordCount: work.wordCount,
      viewCount: work.viewCount,
      likeCount: work.likeCount,
      quoteCount: work.quoteCount,
      chapterCount: work.chapters?.length || 0,
      pageCount: work.pageCount || 0,
    };

    const tagNames = work.tags?.map((wt: any) => wt.tag.name) || [];

    const response: WorkResponseDto = {
      id: work.id,
      title: work.title,
      description: work.description,
      coverImage: work.coverImage,
      type: work.contentType,
      category: category || null,
      status: work.status,
      tags: tagNames,
      author,
      stats,
      publishedAt: work.publishedAt,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
    };

    // 添加漫画特有字段
    if (work.contentType === ContentType.MANGA) {
      response.readingDirection = work.readingDirection as ReadingDirection;
    }

    return response;
  }

  /**
   * 格式化作品详情响应（包含章节列表）
   * @param work 数据库作品记录（含章节）
   * @returns 格式化的作品详情响应
   */
  private formatWorkDetailResponse(work: any): WorkDetailResponseDto {
    const author: AuthorBrief = {
      id: work.author.id,
      username: work.author.username,
      displayName: work.author.displayName,
      avatar: work.author.avatar,
    };

    const tagNames = work.tags?.map((wt: any) => wt.tag.name) || [];

    const chapters: ChapterBrief[] = (work.chapters || []).map((ch: any) => ({
      id: ch.id,
      title: ch.title,
      orderIndex: ch.orderIndex,
      wordCount: ch.wordCount,
      status: ch.status,
      publishedAt: ch.publishedAt,
      createdAt: ch.createdAt,
      updatedAt: ch.updatedAt,
    }));

    const stats: WorkStats = {
      wordCount: work.wordCount,
      viewCount: work.viewCount,
      likeCount: work.likeCount,
      quoteCount: work.quoteCount,
      chapterCount: chapters.length,
      pageCount: work.pageCount || 0,
    };

    const response: WorkDetailResponseDto = {
      id: work.id,
      title: work.title,
      description: work.description,
      coverImage: work.coverImage,
      type: work.contentType,
      status: work.status,
      tags: tagNames,
      author,
      stats,
      chapters,
      publishedAt: work.publishedAt,
      createdAt: work.createdAt,
      updatedAt: work.updatedAt,
    };

    // 添加漫画特有字段
    if (work.contentType === ContentType.MANGA) {
      response.readingDirection = work.readingDirection as ReadingDirection;
    }

    return response;
  }
}
