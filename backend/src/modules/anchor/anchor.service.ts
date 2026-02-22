import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  AnchorDetailDto,
  AnchorReferencesQueryDto,
  AnchorReferencesResponseDto,
  ReferenceCardDto,
  CreateQuoteDto,
  CreateQuoteResponseDto,
  AnchorContextQueryDto,
  AnchorContextResponseDto,
  ContextParagraphDto,
} from './dto/index.js';

/**
 * 锚点服务
 * 处理锚点（段落）相关的业务逻辑
 *
 * 需求3: 段落锚点精准引用体系（Anchor Network）
 */
@Injectable()
export class AnchorService {
  private readonly logger = new Logger(AnchorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据锚点ID获取锚点详情
   *
   * 需求3验收标准8: WHEN 用户查看 Paragraph 详情 THEN System SHALL 显示该段落被引用的次数和引用列表
   *
   * @param anchorId 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index})
   * @returns 锚点详情，包含段落内容、章节信息、作品信息、作者信息
   * @throws NotFoundException 当锚点不存在时
   */
  async getAnchorDetail(anchorId: string): Promise<AnchorDetailDto> {
    this.logger.log(`Getting anchor detail for: ${anchorId}`);

    // 查询段落及其关联的章节、作品、作者信息
    const paragraph = await this.prisma.paragraph.findUnique({
      where: { anchorId },
      include: {
        chapter: {
          include: {
            work: {
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
            },
          },
        },
      },
    });

    // 如果段落不存在，抛出404错误
    if (!paragraph) {
      this.logger.warn(`Anchor not found: ${anchorId}`);
      throw new NotFoundException(`锚点不存在: ${anchorId}`);
    }

    const { chapter } = paragraph;
    const { work } = chapter;
    const { author } = work;

    // 构建响应DTO
    const result: AnchorDetailDto = {
      id: paragraph.id,
      anchorId: paragraph.anchorId,
      content: paragraph.content,
      orderIndex: paragraph.orderIndex,
      quoteCount: paragraph.quoteCount,
      isDeleted: paragraph.isDeleted,
      createdAt: paragraph.createdAt,
      updatedAt: paragraph.updatedAt,
      chapter: {
        id: chapter.id,
        title: chapter.title,
        orderIndex: chapter.orderIndex,
        status: chapter.status,
        publishedAt: chapter.publishedAt,
      },
      work: {
        id: work.id,
        title: work.title,
        description: work.description,
        coverImage: work.coverImage,
        status: work.status,
        contentType: work.contentType,
      },
      author: {
        id: author.id,
        username: author.username,
        displayName: author.displayName,
        avatar: author.avatar,
      },
    };

    this.logger.log(`Successfully retrieved anchor detail for: ${anchorId}`);
    return result;
  }

  /**
   * 获取引用指定锚点的 Card 列表
   *
   * 需求3验收标准8: WHEN 用户查看 Paragraph 详情 THEN System SHALL 显示该段落被引用的次数和引用列表
   *
   * @param anchorId 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index})
   * @param query 分页查询参数
   * @returns 引用该锚点的 Card 列表（分页）
   * @throws NotFoundException 当锚点不存在时
   */
  async getAnchorReferences(
    anchorId: string,
    query: AnchorReferencesQueryDto,
  ): Promise<AnchorReferencesResponseDto> {
    this.logger.log(`Getting anchor references for: ${anchorId}`);

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // 首先验证锚点是否存在
    const paragraph = await this.prisma.paragraph.findUnique({
      where: { anchorId },
      select: { id: true, isDeleted: true },
    });

    if (!paragraph) {
      this.logger.warn(`Anchor not found: ${anchorId}`);
      throw new NotFoundException(`锚点不存在: ${anchorId}`);
    }

    // 查询引用该段落的 Quote 记录，并关联 Card 和作者信息
    const [quotes, total] = await Promise.all([
      this.prisma.quote.findMany({
        where: {
          paragraph: { anchorId },
          card: { isDeleted: false },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          card: {
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
          },
        },
      }),
      this.prisma.quote.count({
        where: {
          paragraph: { anchorId },
          card: { isDeleted: false },
        },
      }),
    ]);

    // 格式化响应
    const cards: ReferenceCardDto[] = quotes.map((quote) => ({
      id: quote.card.id,
      content: quote.card.content,
      author: {
        id: quote.card.author.id,
        username: quote.card.author.username,
        displayName: quote.card.author.displayName,
        avatar: quote.card.author.avatar,
      },
      likeCount: quote.card.likeCount,
      commentCount: quote.card.commentCount,
      originalContent: quote.originalContent,
      contentUpdated: quote.contentUpdated,
      createdAt: quote.createdAt.toISOString(),
    }));

    const totalPages = Math.ceil(total / limit);

    this.logger.log(
      `Successfully retrieved ${cards.length} references for anchor: ${anchorId}`,
    );

    return {
      cards,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
      },
    };
  }

  /**
   * 创建引用记录
   *
   * 当用户在 Card 中引用某个段落时，创建 Quote 记录并存储原文快照。
   *
   * 需求3验收标准3: WHEN 用户执行引用操作 THEN System SHALL 创建包含 Anchor_ID 引用的 Card 草稿
   * 需求3验收标准4: WHEN Card 包含 Anchor_ID 引用被发布到 Plaza THEN System SHALL 渲染原文预览并提供跳转链接
   *
   * @param anchorId 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index})
   * @param dto 创建引用请求参数
   * @param userId 当前用户ID
   * @returns 创建的引用记录
   * @throws NotFoundException 当锚点或 Card 不存在时
   * @throws ForbiddenException 当 Card 不属于当前用户时
   * @throws BadRequestException 当该 Card 已引用过该锚点时
   */
  async createQuote(
    anchorId: string,
    dto: CreateQuoteDto,
    userId: string,
  ): Promise<CreateQuoteResponseDto> {
    this.logger.log(
      `Creating quote for anchor: ${anchorId}, card: ${dto.cardId}, user: ${userId}`,
    );

    // 1. 验证锚点（段落）是否存在
    const paragraph = await this.prisma.paragraph.findUnique({
      where: { anchorId },
      select: {
        id: true,
        content: true,
        isDeleted: true,
        quoteCount: true,
      },
    });

    if (!paragraph) {
      this.logger.warn(`Anchor not found: ${anchorId}`);
      throw new NotFoundException(`锚点不存在: ${anchorId}`);
    }

    if (paragraph.isDeleted) {
      this.logger.warn(`Anchor is deleted: ${anchorId}`);
      throw new NotFoundException(`锚点已被删除: ${anchorId}`);
    }

    // 2. 验证 Card 是否存在且属于当前用户
    const card = await this.prisma.card.findUnique({
      where: { id: dto.cardId },
      select: {
        id: true,
        authorId: true,
        isDeleted: true,
      },
    });

    if (!card) {
      this.logger.warn(`Card not found: ${dto.cardId}`);
      throw new NotFoundException(`Card 不存在: ${dto.cardId}`);
    }

    if (card.isDeleted) {
      this.logger.warn(`Card is deleted: ${dto.cardId}`);
      throw new NotFoundException(`Card 已被删除: ${dto.cardId}`);
    }

    if (card.authorId !== userId) {
      this.logger.warn(
        `User ${userId} is not the author of card ${dto.cardId}`,
      );
      throw new ForbiddenException('只能在自己的 Card 中创建引用');
    }

    // 3. 检查是否已存在相同的引用（同一 Card 不能重复引用同一段落）
    const existingQuote = await this.prisma.quote.findFirst({
      where: {
        cardId: dto.cardId,
        paragraphId: paragraph.id,
      },
    });

    if (existingQuote) {
      this.logger.warn(
        `Quote already exists for card ${dto.cardId} and anchor ${anchorId}`,
      );
      throw new BadRequestException('该 Card 已引用过此段落');
    }

    // 4. 使用事务创建引用并更新引用计数
    const result = await this.prisma.$transaction(async (tx) => {
      // 创建 Quote 记录，存储原文快照
      const quote = await tx.quote.create({
        data: {
          cardId: dto.cardId,
          paragraphId: paragraph.id,
          originalContent: paragraph.content, // 存储引用时的原文快照
          contentUpdated: false,
          contentDeleted: false,
        },
      });

      // 更新段落的引用计数
      const updatedParagraph = await tx.paragraph.update({
        where: { id: paragraph.id },
        data: {
          quoteCount: { increment: 1 },
        },
        select: {
          quoteCount: true,
        },
      });

      // 更新 Card 的引用计数
      await tx.card.update({
        where: { id: dto.cardId },
        data: {
          quoteCount: { increment: 1 },
        },
      });

      return {
        quote,
        newQuoteCount: updatedParagraph.quoteCount,
      };
    });

    this.logger.log(
      `Successfully created quote ${result.quote.id} for anchor: ${anchorId}`,
    );

    return {
      id: result.quote.id,
      cardId: result.quote.cardId,
      paragraphId: result.quote.paragraphId,
      originalContent: result.quote.originalContent,
      createdAt: result.quote.createdAt.toISOString(),
      anchor: {
        anchorId,
        quoteCount: result.newQuoteCount,
      },
    };
  }

  /**
   * 检测锚点内容变更并更新引用状态
   *
   * 当段落内容被编辑后，检测所有引用该段落的 Quote 记录，
   * 比较当前内容与引用时的原文快照，更新 contentUpdated 标志。
   *
   * 需求3验收标准6: WHEN 被引用的 Paragraph 内容更新 THEN System SHALL 在 Card 中标记"内容已更新"提示
   * 需求3验收标准7: IF 被引用的 Paragraph 被删除 THEN System SHALL 在 Card 中显示"原文已不存在"提示
   *
   * @param anchorId 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index})
   * @returns 更新结果，包含更新的引用数量
   * @throws NotFoundException 当锚点不存在时
   */
  async checkContentUpdates(anchorId: string): Promise<{
    anchorId: string;
    isDeleted: boolean;
    currentContent: string | null;
    totalQuotes: number;
    updatedQuotes: number;
    deletedQuotes: number;
  }> {
    this.logger.log(`Checking content updates for anchor: ${anchorId}`);

    // 1. 获取段落当前状态
    const paragraph = await this.prisma.paragraph.findUnique({
      where: { anchorId },
      select: {
        id: true,
        content: true,
        isDeleted: true,
      },
    });

    if (!paragraph) {
      this.logger.warn(`Anchor not found: ${anchorId}`);
      throw new NotFoundException(`锚点不存在: ${anchorId}`);
    }

    // 2. 获取所有引用该段落的 Quote 记录
    const quotes = await this.prisma.quote.findMany({
      where: { paragraphId: paragraph.id },
      select: {
        id: true,
        originalContent: true,
        contentUpdated: true,
        contentDeleted: true,
      },
    });

    if (quotes.length === 0) {
      this.logger.log(`No quotes found for anchor: ${anchorId}`);
      return {
        anchorId,
        isDeleted: paragraph.isDeleted,
        currentContent: paragraph.isDeleted ? null : paragraph.content,
        totalQuotes: 0,
        updatedQuotes: 0,
        deletedQuotes: 0,
      };
    }

    // 3. 检测并更新每个 Quote 的状态
    let updatedQuotes = 0;
    let deletedQuotes = 0;

    const updatePromises = quotes.map(async (quote) => {
      // 判断段落是否被删除
      const shouldMarkDeleted = paragraph.isDeleted && !quote.contentDeleted;

      // 判断内容是否变更（仅在段落未删除时检测）
      const shouldMarkUpdated =
        !paragraph.isDeleted &&
        !quote.contentUpdated &&
        quote.originalContent !== paragraph.content;

      if (shouldMarkDeleted) {
        await this.prisma.quote.update({
          where: { id: quote.id },
          data: { contentDeleted: true },
        });
        deletedQuotes++;
        this.logger.debug(`Marked quote ${quote.id} as content deleted`);
      } else if (shouldMarkUpdated) {
        await this.prisma.quote.update({
          where: { id: quote.id },
          data: { contentUpdated: true },
        });
        updatedQuotes++;
        this.logger.debug(`Marked quote ${quote.id} as content updated`);
      }
    });

    await Promise.all(updatePromises);

    this.logger.log(
      `Content update check completed for anchor ${anchorId}: ` +
        `${updatedQuotes} updated, ${deletedQuotes} deleted out of ${quotes.length} quotes`,
    );

    return {
      anchorId,
      isDeleted: paragraph.isDeleted,
      currentContent: paragraph.isDeleted ? null : paragraph.content,
      totalQuotes: quotes.length,
      updatedQuotes,
      deletedQuotes,
    };
  }

  /**
   * 批量检测多个锚点的内容变更
   *
   * 用于定时任务或批量检测场景，一次性检测多个锚点的内容变更状态。
   *
   * @param anchorIds 锚点ID列表
   * @returns 每个锚点的更新结果
   */
  async checkContentUpdatesBatch(anchorIds: string[]): Promise<{
    results: Array<{
      anchorId: string;
      success: boolean;
      updatedQuotes?: number;
      deletedQuotes?: number;
      error?: string;
    }>;
    summary: {
      total: number;
      successful: number;
      failed: number;
      totalUpdatedQuotes: number;
      totalDeletedQuotes: number;
    };
  }> {
    this.logger.log(
      `Batch checking content updates for ${anchorIds.length} anchors`,
    );

    const results = await Promise.all(
      anchorIds.map(async (anchorId) => {
        try {
          const result = await this.checkContentUpdates(anchorId);
          return {
            anchorId,
            success: true,
            updatedQuotes: result.updatedQuotes,
            deletedQuotes: result.deletedQuotes,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(
            `Failed to check content updates for anchor ${anchorId}: ${errorMessage}`,
          );
          return {
            anchorId,
            success: false,
            error: errorMessage,
          };
        }
      }),
    );

    const summary = {
      total: anchorIds.length,
      successful: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      totalUpdatedQuotes: results.reduce(
        (sum, r) => sum + (r.updatedQuotes || 0),
        0,
      ),
      totalDeletedQuotes: results.reduce(
        (sum, r) => sum + (r.deletedQuotes || 0),
        0,
      ),
    };

    this.logger.log(
      `Batch content update check completed: ${summary.successful}/${summary.total} successful, ` +
        `${summary.totalUpdatedQuotes} quotes updated, ${summary.totalDeletedQuotes} quotes deleted`,
    );

    return { results, summary };
  }

  /**
   * 获取锚点上下文（周围段落）
   *
   * 当用户预览引用时，可以查看目标段落及其周围的段落，
   * 以便更好地理解上下文。
   *
   * @param anchorId 锚点ID (格式: {work_id}:{chapter_id}:{paragraph_index})
   * @param query 查询参数 (before: 前面段落数, after: 后面段落数)
   * @returns 目标段落及其周围段落的上下文信息
   * @throws NotFoundException 当锚点不存在时
   */
  async getAnchorContext(
    anchorId: string,
    query: AnchorContextQueryDto,
  ): Promise<AnchorContextResponseDto> {
    this.logger.log(`Getting anchor context for: ${anchorId}`);

    const { before = 1, after = 1 } = query;

    // 1. 获取目标段落及其章节、作品信息
    const targetParagraph = await this.prisma.paragraph.findUnique({
      where: { anchorId },
      include: {
        chapter: {
          include: {
            work: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!targetParagraph) {
      this.logger.warn(`Anchor not found: ${anchorId}`);
      throw new NotFoundException(`锚点不存在: ${anchorId}`);
    }

    const { chapter } = targetParagraph;
    const { work } = chapter;
    const targetOrderIndex = targetParagraph.orderIndex;

    // 2. 获取目标段落之前的段落
    const beforeParagraphs =
      before > 0
        ? await this.prisma.paragraph.findMany({
            where: {
              chapterId: chapter.id,
              orderIndex: {
                gte: Math.max(0, targetOrderIndex - before),
                lt: targetOrderIndex,
              },
              isDeleted: false,
            },
            orderBy: { orderIndex: 'asc' },
            select: {
              anchorId: true,
              content: true,
              orderIndex: true,
            },
          })
        : [];

    // 3. 获取目标段落之后的段落
    const afterParagraphs =
      after > 0
        ? await this.prisma.paragraph.findMany({
            where: {
              chapterId: chapter.id,
              orderIndex: {
                gt: targetOrderIndex,
                lte: targetOrderIndex + after,
              },
              isDeleted: false,
            },
            orderBy: { orderIndex: 'asc' },
            select: {
              anchorId: true,
              content: true,
              orderIndex: true,
            },
          })
        : [];

    // 4. 构建响应
    const target: ContextParagraphDto = {
      anchorId: targetParagraph.anchorId,
      content: targetParagraph.content,
      orderIndex: targetParagraph.orderIndex,
    };

    const beforeList: ContextParagraphDto[] = beforeParagraphs.map((p) => ({
      anchorId: p.anchorId,
      content: p.content,
      orderIndex: p.orderIndex,
    }));

    const afterList: ContextParagraphDto[] = afterParagraphs.map((p) => ({
      anchorId: p.anchorId,
      content: p.content,
      orderIndex: p.orderIndex,
    }));

    this.logger.log(
      `Successfully retrieved anchor context for: ${anchorId} ` +
        `(${beforeList.length} before, ${afterList.length} after)`,
    );

    return {
      target,
      before: beforeList,
      after: afterList,
      chapter: {
        id: chapter.id,
        title: chapter.title,
      },
      work: {
        id: work.id,
        title: work.title,
      },
    };
  }
}
