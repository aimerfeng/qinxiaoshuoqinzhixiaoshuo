import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../redis/cache.service';
import {
  CreateCardDto,
  UpdateCardDto,
  FeedQueryDto,
  FeedType,
  CardQueryDto,
} from './dto';

@Injectable()
export class PlazaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  // ==================== Card CRUD ====================

  /**
   * 创建 Card
   */
  async createCard(authorId: string, dto: CreateCardDto) {
    const { content, quoteAnchorId } = dto;

    // 如果有引用，验证段落是否存在
    let quote = null;
    if (quoteAnchorId) {
      const paragraph = await this.prisma.paragraph.findUnique({
        where: { anchorId: quoteAnchorId },
        include: {
          chapter: {
            include: {
              work: true,
            },
          },
        },
      });

      if (!paragraph || paragraph.isDeleted) {
        throw new BadRequestException('引用的段落不存在');
      }

      quote = {
        paragraphId: paragraph.id,
        originalContent: paragraph.content,
      };
    }

    // 创建 Card
    const card = await this.prisma.card.create({
      data: {
        authorId,
        content,
        quotes: quote
          ? {
              create: {
                paragraphId: quote.paragraphId,
                originalContent: quote.originalContent,
              },
            }
          : undefined,
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
        quotes: {
          include: {
            paragraph: {
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
            },
          },
        },
      },
    });

    // 更新段落引用计数
    if (quote) {
      await this.prisma.paragraph.update({
        where: { id: quote.paragraphId },
        data: { quoteCount: { increment: 1 } },
      });
    }

    // 清除信息流缓存
    await this.invalidateFeedCache();

    return this.formatCardResponse(card, authorId);
  }

  /**
   * 获取单个 Card
   */
  async getCard(cardId: string, userId?: string) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId, isDeleted: false },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        quotes: {
          include: {
            paragraph: {
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
            },
          },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Card 不存在');
    }

    return this.formatCardResponse(card, userId);
  }

  /**
   * 更新 Card
   */
  async updateCard(cardId: string, userId: string, dto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card || card.isDeleted) {
      throw new NotFoundException('Card 不存在');
    }

    if (card.authorId !== userId) {
      throw new ForbiddenException('无权修改此 Card');
    }

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: { content: dto.content },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        quotes: {
          include: {
            paragraph: {
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
            },
          },
        },
      },
    });

    return this.formatCardResponse(updated, userId);
  }

  /**
   * 删除 Card（软删除）
   */
  async deleteCard(cardId: string, userId: string) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { quotes: true },
    });

    if (!card || card.isDeleted) {
      throw new NotFoundException('Card 不存在');
    }

    if (card.authorId !== userId) {
      throw new ForbiddenException('无权删除此 Card');
    }

    // 软删除
    await this.prisma.card.update({
      where: { id: cardId },
      data: { isDeleted: true },
    });

    // 减少段落引用计数
    for (const quote of card.quotes) {
      await this.prisma.paragraph.update({
        where: { id: quote.paragraphId },
        data: { quoteCount: { decrement: 1 } },
      });
    }

    // 清除缓存
    await this.invalidateFeedCache();

    return { message: 'Card 已删除' };
  }

  /**
   * 获取用户的 Card 列表
   */
  async getUserCards(
    userId: string,
    query: CardQueryDto,
    currentUserId?: string,
  ) {
    const { cursor, limit = 20 } = query;

    const where = {
      authorId: userId,
      isDeleted: false,
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    };

    const cards = await this.prisma.card.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        quotes: {
          include: {
            paragraph: {
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
            },
          },
        },
      },
    });

    const hasMore = cards.length > limit;
    const items = hasMore ? cards.slice(0, -1) : cards;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    const formattedCards = await Promise.all(
      items.map((card) => this.formatCardResponse(card, currentUserId)),
    );

    return {
      cards: formattedCards,
      nextCursor,
    };
  }

  // ==================== Feed ====================

  /**
   * 获取信息流
   */
  async getFeed(userId: string | undefined, query: FeedQueryDto) {
    const { type = FeedType.RECOMMEND, cursor, limit = 20 } = query;

    switch (type) {
      case FeedType.FOLLOWING:
        return this.getFollowingFeed(userId, cursor, limit);
      case FeedType.TRENDING:
        return this.getTrendingFeed(cursor, limit, userId);
      case FeedType.RECOMMEND:
      default:
        return this.getRecommendFeed(cursor, limit, userId);
    }
  }

  /**
   * 推荐流 - 基于热度和时间衰减
   */
  private async getRecommendFeed(
    cursor: string | undefined,
    limit: number,
    userId?: string,
  ) {
    const cursorData = cursor ? this.decodeCursor(cursor) : null;

    const where = {
      isDeleted: false,
      ...(cursorData && {
        OR: [
          { hotScore: { lt: cursorData.hotScore } },
          {
            hotScore: cursorData.hotScore,
            createdAt: { lt: new Date(cursorData.createdAt) },
          },
        ],
      }),
    };

    const cards = await this.prisma.card.findMany({
      where,
      take: limit + 1,
      orderBy: [{ hotScore: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        quotes: {
          include: {
            paragraph: {
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
            },
          },
        },
      },
    });

    const hasMore = cards.length > limit;
    const items = hasMore ? cards.slice(0, -1) : cards;
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? this.encodeCursor({
            hotScore: lastItem.hotScore,
            createdAt: lastItem.createdAt.toISOString(),
          })
        : null;

    const formattedCards = await Promise.all(
      items.map((card) => this.formatCardResponse(card, userId)),
    );

    return {
      cards: formattedCards,
      nextCursor,
      meta: {
        feedType: 'recommend',
        refreshedAt: new Date().toISOString(),
        personalizationScore: 0.5,
      },
    };
  }

  /**
   * 关注流 - 按时间倒序
   */
  private async getFollowingFeed(
    userId: string | undefined,
    cursor: string | undefined,
    limit: number,
  ) {
    // TODO: 实现关注系统后，这里需要获取关注用户列表
    // 目前返回空列表
    if (!userId) {
      return {
        cards: [],
        nextCursor: null,
        meta: {
          feedType: 'following',
          refreshedAt: new Date().toISOString(),
          personalizationScore: 0,
        },
      };
    }

    // 暂时返回所有 Card（后续实现关注系统后修改）
    const where = {
      isDeleted: false,
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    };

    const cards = await this.prisma.card.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        quotes: {
          include: {
            paragraph: {
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
            },
          },
        },
      },
    });

    const hasMore = cards.length > limit;
    const items = hasMore ? cards.slice(0, -1) : cards;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    const formattedCards = await Promise.all(
      items.map((card) => this.formatCardResponse(card, userId)),
    );

    return {
      cards: formattedCards,
      nextCursor,
      meta: {
        feedType: 'following',
        refreshedAt: new Date().toISOString(),
        personalizationScore: 1,
      },
    };
  }

  /**
   * 热门流 - 实时热度排行
   */
  private async getTrendingFeed(
    cursor: string | undefined,
    limit: number,
    userId?: string,
  ) {
    // 获取最近24小时内的热门 Card
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const cursorData = cursor ? this.decodeCursor(cursor) : null;

    const where = {
      isDeleted: false,
      createdAt: { gte: oneDayAgo },
      ...(cursorData && {
        OR: [
          { hotScore: { lt: cursorData.hotScore } },
          {
            hotScore: cursorData.hotScore,
            createdAt: { lt: new Date(cursorData.createdAt) },
          },
        ],
      }),
    };

    const cards = await this.prisma.card.findMany({
      where,
      take: limit + 1,
      orderBy: [{ hotScore: 'desc' }, { createdAt: 'desc' }],
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        quotes: {
          include: {
            paragraph: {
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
            },
          },
        },
      },
    });

    const hasMore = cards.length > limit;
    const items = hasMore ? cards.slice(0, -1) : cards;
    const lastItem = items[items.length - 1];
    const nextCursor =
      hasMore && lastItem
        ? this.encodeCursor({
            hotScore: lastItem.hotScore,
            createdAt: lastItem.createdAt.toISOString(),
          })
        : null;

    const formattedCards = await Promise.all(
      items.map((card) => this.formatCardResponse(card, userId)),
    );

    return {
      cards: formattedCards,
      nextCursor,
      meta: {
        feedType: 'trending',
        refreshedAt: new Date().toISOString(),
        personalizationScore: 0,
      },
    };
  }

  // ==================== Helper Methods ====================

  /**
   * 格式化 Card 响应
   */
  private async formatCardResponse(card: any, userId?: string) {
    // 检查用户是否点赞
    let isLiked = false;
    if (userId) {
      const like = await this.prisma.like.findUnique({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: 'CARD',
            targetId: card.id,
          },
        },
      });
      isLiked = !!like;
    }

    // 格式化引用信息
    const quote = card.quotes?.[0];
    let quoteInfo = null;
    if (quote) {
      const paragraph = quote.paragraph;
      // isValid 为 false 当段落被删除或 Quote 标记为 contentDeleted
      const isValid = !paragraph.isDeleted && !quote.contentDeleted;
      const contentUpdated = quote.contentUpdated;

      quoteInfo = {
        anchorId: paragraph.anchorId,
        paragraphContent: quote.originalContent,
        workTitle: paragraph.chapter?.work?.title || '',
        chapterTitle: paragraph.chapter?.title || '',
        isValid,
        contentUpdated,
      };
    }

    return {
      id: card.id,
      author: {
        id: card.author.id,
        username: card.author.username,
        displayName: card.author.displayName,
        avatar: card.author.avatar,
      },
      content: card.content,
      quote: quoteInfo,
      likeCount: card.likeCount,
      commentCount: card.commentCount,
      shareCount: card.quoteCount,
      isLiked,
      isSaved: false, // TODO: 实现收藏功能
      createdAt: card.createdAt.toISOString(),
      engagement: {
        predictedViralScore: card.hotScore,
        trendingRank: undefined,
      },
    };
  }

  /**
   * 编码游标
   */
  private encodeCursor(data: { hotScore: number; createdAt: string }): string {
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  /**
   * 解码游标
   */
  private decodeCursor(
    cursor: string,
  ): { hotScore: number; createdAt: string } | null {
    try {
      return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    } catch {
      return null;
    }
  }

  /**
   * 清除信息流缓存
   */
  private async invalidateFeedCache() {
    // TODO: 实现更精细的缓存失效策略
    try {
      await this.cacheService.del('feed:recommend:*');
      await this.cacheService.del('feed:trending:*');
    } catch {
      // 忽略缓存错误
    }
  }
}
