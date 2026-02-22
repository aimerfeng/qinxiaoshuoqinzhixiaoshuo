import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LikeTargetType } from '@prisma/client';
import { CreateCommentDto, UpdateCommentDto, CardQueryDto } from './dto';
import { HotScoreService } from './hot-score.service';

@Injectable()
export class CommentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hotScoreService: HotScoreService,
  ) {}

  /**
   * 创建评论
   */
  async createComment(userId: string, cardId: string, dto: CreateCommentDto) {
    const { content, parentCommentId } = dto;

    // 检查 Card 是否存在
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card || card.isDeleted) {
      throw new NotFoundException('Card 不存在');
    }

    // 如果是回复，检查父评论是否存在
    if (parentCommentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: parentCommentId },
      });

      if (!parentComment || parentComment.isDeleted) {
        throw new NotFoundException('回复的评论不存在');
      }

      if (parentComment.cardId !== cardId) {
        throw new BadRequestException('父评论不属于此 Card');
      }
    }

    // 创建评论
    const comment = await this.prisma.comment.create({
      data: {
        cardId,
        authorId: userId,
        parentId: parentCommentId,
        content,
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
        parent: {
          select: {
            id: true,
            authorId: true,
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

    // 更新 Card 评论数
    await this.prisma.card.update({
      where: { id: cardId },
      data: { commentCount: { increment: 1 } },
    });

    // 更新热度分数
    await this.hotScoreService.updateCardHotScore(cardId);

    return this.formatCommentResponse(comment, userId);
  }

  /**
   * 获取 Card 的评论列表
   */
  async getComments(cardId: string, query: CardQueryDto, userId?: string) {
    const { cursor, limit = 20 } = query;

    // 检查 Card 是否存在
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card || card.isDeleted) {
      throw new NotFoundException('Card 不存在');
    }

    // 获取顶级评论（非回复）
    const where = {
      cardId,
      parentId: null,
      isDeleted: false,
      ...(cursor && { createdAt: { lt: new Date(cursor) } }),
    };

    const comments = await this.prisma.comment.findMany({
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
        replies: {
          where: { isDeleted: false },
          take: 3, // 只显示前3条回复
          orderBy: { createdAt: 'asc' },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            parent: {
              select: {
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
        },
        _count: {
          select: { replies: true },
        },
      },
    });

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, -1) : comments;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    // 获取热门评论（点赞数最高的前3条）
    const hotComments = await this.prisma.comment.findMany({
      where: {
        cardId,
        isDeleted: false,
        likeCount: { gt: 0 },
      },
      take: 3,
      orderBy: { likeCount: 'desc' },
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

    const formattedComments = await Promise.all(
      items.map((comment) => this.formatCommentWithReplies(comment, userId)),
    );

    const formattedHotComments = await Promise.all(
      hotComments.map((comment) => this.formatCommentResponse(comment, userId)),
    );

    return {
      comments: formattedComments,
      nextCursor,
      hotComments: formattedHotComments,
    };
  }

  /**
   * 获取评论的回复列表
   */
  async getReplies(commentId: string, query: CardQueryDto, userId?: string) {
    const { cursor, limit = 20 } = query;

    // 检查评论是否存在
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('评论不存在');
    }

    const where = {
      parentId: commentId,
      isDeleted: false,
      ...(cursor && { createdAt: { gt: new Date(cursor) } }),
    };

    const replies = await this.prisma.comment.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'asc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        parent: {
          select: {
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

    const hasMore = replies.length > limit;
    const items = hasMore ? replies.slice(0, -1) : replies;
    const nextCursor = hasMore
      ? items[items.length - 1].createdAt.toISOString()
      : null;

    const formattedReplies = await Promise.all(
      items.map((reply) => this.formatCommentResponse(reply, userId)),
    );

    return {
      replies: formattedReplies,
      nextCursor,
    };
  }

  /**
   * 更新评论
   */
  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('无权修改此评论');
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
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
      },
    });

    return this.formatCommentResponse(updated, userId);
  }

  /**
   * 删除评论（软删除）
   */
  async deleteComment(commentId: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.authorId !== userId) {
      throw new ForbiddenException('无权删除此评论');
    }

    // 软删除评论
    await this.prisma.comment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });

    // 更新 Card 评论数
    await this.prisma.card.update({
      where: { id: comment.cardId },
      data: { commentCount: { decrement: 1 } },
    });

    // 更新热度分数
    await this.hotScoreService.updateCardHotScore(comment.cardId);

    return { message: '评论已删除' };
  }

  /**
   * 格式化评论响应
   */
  private async formatCommentResponse(comment: any, userId?: string) {
    let isLiked = false;
    if (userId) {
      const like = await this.prisma.like.findUnique({
        where: {
          userId_targetType_targetId: {
            userId,
            targetType: LikeTargetType.COMMENT,
            targetId: comment.id,
          },
        },
      });
      isLiked = !!like;
    }

    return {
      id: comment.id,
      author: {
        id: comment.author.id,
        username: comment.author.username,
        displayName: comment.author.displayName,
        avatar: comment.author.avatar,
      },
      content: comment.content,
      likeCount: comment.likeCount,
      isLiked,
      replyTo: comment.parent?.author
        ? {
            id: comment.parent.author.id,
            username: comment.parent.author.username,
            displayName: comment.parent.author.displayName,
          }
        : null,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    };
  }

  /**
   * 格式化带回复的评论响应
   */
  private async formatCommentWithReplies(comment: any, userId?: string) {
    const formatted = await this.formatCommentResponse(comment, userId);

    const formattedReplies = await Promise.all(
      (comment.replies || []).map((reply: any) =>
        this.formatCommentResponse(reply, userId),
      ),
    );

    return {
      ...formatted,
      replies: formattedReplies,
      replyCount: comment._count?.replies || 0,
    };
  }
}
