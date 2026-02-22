import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ReadingListStatus, Prisma } from '@prisma/client';
import {
  AddToReadingListDto,
  UpdateReadingListItemDto,
  ReadingListQueryDto,
  ReadingListItemResponseDto,
  ReadingListResponseDto,
} from './dto';

/**
 * 阅读列表服务
 *
 * 需求12: 阅读列表管理
 * - 12.1.1 阅读列表 CRUD API
 * - 12.1.2 阅读状态自动更新
 * - 12.1.3 更新提醒逻辑
 */
@Injectable()
export class ReadingListService {
  private readonly logger = new Logger(ReadingListService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 添加作品到阅读列表
   */
  async addToList(
    userId: string,
    dto: AddToReadingListDto,
  ): Promise<ReadingListItemResponseDto> {
    // 检查作品是否存在
    const work = await this.prisma.work.findUnique({
      where: { id: dto.workId },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    // 检查是否已在列表中
    const existing = await this.prisma.readingListItem.findUnique({
      where: {
        userId_workId: { userId, workId: dto.workId },
      },
    });

    if (existing) {
      throw new ConflictException('作品已在阅读列表中');
    }

    const item = await this.prisma.readingListItem.create({
      data: {
        userId,
        workId: dto.workId,
        status: dto.status || ReadingListStatus.WANT_TO_READ,
        note: dto.note,
      },
      include: {
        work: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            authorId: true,
            status: true,
            contentType: true,
            wordCount: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    this.logger.debug(
      `User ${userId} added work ${dto.workId} to reading list`,
    );

    return this.toResponseDto(item);
  }

  /**
   * 获取用户阅读列表
   */
  async getList(
    userId: string,
    query: ReadingListQueryDto,
  ): Promise<ReadingListResponseDto> {
    const {
      status,
      hasUpdate,
      limit = 20,
      offset = 0,
      sortBy = 'lastReadAt',
      sortOrder = 'desc',
    } = query;

    const where: Prisma.ReadingListItemWhereInput = {
      userId,
      ...(status && { status }),
      ...(hasUpdate !== undefined && { hasUpdate }),
    };

    const orderBy: Prisma.ReadingListItemOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    const [items, total, statusCounts] = await Promise.all([
      this.prisma.readingListItem.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          work: {
            select: {
              id: true,
              title: true,
              coverImage: true,
              authorId: true,
              status: true,
              contentType: true,
              wordCount: true,
              author: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.readingListItem.count({ where }),
      this.getStatusCounts(userId),
    ]);

    return {
      items: items.map((item) => this.toResponseDto(item)),
      total,
      statusCounts,
    };
  }

  /**
   * 获取单个阅读列表项
   */
  async getItem(
    userId: string,
    workId: string,
  ): Promise<ReadingListItemResponseDto | null> {
    const item = await this.prisma.readingListItem.findUnique({
      where: {
        userId_workId: { userId, workId },
      },
      include: {
        work: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            authorId: true,
            status: true,
            contentType: true,
            wordCount: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    return item ? this.toResponseDto(item) : null;
  }

  /**
   * 更新阅读列表项
   */
  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateReadingListItemDto,
  ): Promise<ReadingListItemResponseDto> {
    const item = await this.prisma.readingListItem.findFirst({
      where: { id: itemId, userId },
    });

    if (!item) {
      throw new NotFoundException('阅读列表项不存在');
    }

    const updated = await this.prisma.readingListItem.update({
      where: { id: itemId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.note !== undefined && { note: dto.note }),
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.hasUpdate !== undefined && { hasUpdate: dto.hasUpdate }),
      },
      include: {
        work: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            authorId: true,
            status: true,
            contentType: true,
            wordCount: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
        },
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * 从阅读列表移除
   */
  async removeFromList(userId: string, itemId: string): Promise<boolean> {
    const result = await this.prisma.readingListItem.deleteMany({
      where: { id: itemId, userId },
    });

    return result.count > 0;
  }

  /**
   * 更新阅读进度时自动更新阅读列表状态
   * 需求 12.1.2: 阅读状态自动更新
   */
  async updateReadingProgress(
    userId: string,
    workId: string,
    chapterId: string,
  ): Promise<void> {
    const item = await this.prisma.readingListItem.findUnique({
      where: {
        userId_workId: { userId, workId },
      },
    });

    if (!item) return;

    // 如果是"想读"状态，自动更新为"在读"
    const newStatus =
      item.status === ReadingListStatus.WANT_TO_READ
        ? ReadingListStatus.READING
        : item.status;

    await this.prisma.readingListItem.update({
      where: { id: item.id },
      data: {
        status: newStatus,
        lastReadChapterId: chapterId,
        lastReadAt: new Date(),
        hasUpdate: false, // 清除更新标记
      },
    });

    this.logger.debug(
      `Updated reading progress for user ${userId}, work ${workId}`,
    );
  }

  /**
   * 标记作品有更新
   * 需求 12.1.3: 更新提醒逻辑
   */
  async markWorkUpdated(workId: string): Promise<number> {
    const result = await this.prisma.readingListItem.updateMany({
      where: {
        workId,
        status: { in: [ReadingListStatus.READING, ReadingListStatus.ON_HOLD] },
      },
      data: {
        hasUpdate: true,
      },
    });

    this.logger.debug(
      `Marked ${result.count} reading list items as updated for work ${workId}`,
    );

    return result.count;
  }

  /**
   * 批量更新状态
   */
  async batchUpdateStatus(
    userId: string,
    itemIds: string[],
    status: ReadingListStatus,
  ): Promise<number> {
    const result = await this.prisma.readingListItem.updateMany({
      where: {
        id: { in: itemIds },
        userId,
      },
      data: { status },
    });

    return result.count;
  }

  /**
   * 批量清除更新标记
   */
  async batchClearUpdates(userId: string, itemIds: string[]): Promise<number> {
    const result = await this.prisma.readingListItem.updateMany({
      where: {
        id: { in: itemIds },
        userId,
      },
      data: { hasUpdate: false },
    });

    return result.count;
  }

  /**
   * 获取各状态数量
   */
  private async getStatusCounts(
    userId: string,
  ): Promise<Record<ReadingListStatus, number>> {
    const counts = await this.prisma.readingListItem.groupBy({
      by: ['status'],
      where: { userId },
      _count: { status: true },
    });

    const result: Record<ReadingListStatus, number> = {
      [ReadingListStatus.WANT_TO_READ]: 0,
      [ReadingListStatus.READING]: 0,
      [ReadingListStatus.COMPLETED]: 0,
      [ReadingListStatus.DROPPED]: 0,
      [ReadingListStatus.ON_HOLD]: 0,
    };

    counts.forEach((c) => {
      result[c.status] = c._count.status;
    });

    return result;
  }

  /**
   * 检查作品是否在用户阅读列表中
   */
  async isInList(userId: string, workId: string): Promise<boolean> {
    const count = await this.prisma.readingListItem.count({
      where: { userId, workId },
    });
    return count > 0;
  }

  /**
   * 转换为响应 DTO
   */
  private toResponseDto(item: {
    id: string;
    workId: string;
    status: ReadingListStatus;
    lastReadChapterId: string | null;
    lastReadAt: Date | null;
    hasUpdate: boolean;
    note: string | null;
    rating: number | null;
    createdAt: Date;
    updatedAt: Date;
    work?: {
      id: string;
      title: string;
      coverImage: string | null;
      authorId: string;
      status: string;
      contentType: string;
      wordCount: number;
      author?: {
        id: string;
        username: string;
        displayName: string | null;
      } | null;
    } | null;
  }): ReadingListItemResponseDto {
    return {
      id: item.id,
      workId: item.workId,
      status: item.status,
      lastReadChapterId: item.lastReadChapterId,
      lastReadAt: item.lastReadAt,
      hasUpdate: item.hasUpdate,
      note: item.note,
      rating: item.rating,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      work: item.work
        ? {
            id: item.work.id,
            title: item.work.title,
            coverImage: item.work.coverImage,
            authorId: item.work.authorId,
            status: item.work.status,
            contentType: item.work.contentType,
            wordCount: item.work.wordCount,
            author: item.work.author
              ? {
                  id: item.work.author.id,
                  username: item.work.author.username,
                  displayName: item.work.author.displayName,
                }
              : undefined,
          }
        : undefined,
    };
  }
}
