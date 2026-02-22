import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LikeTargetType } from '@prisma/client';
import { HotScoreService } from './hot-score.service';

@Injectable()
export class LikeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hotScoreService: HotScoreService,
  ) {}

  /**
   * 点赞 Card
   */
  async likeCard(userId: string, cardId: string) {
    // 检查 Card 是否存在
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card || card.isDeleted) {
      throw new NotFoundException('Card 不存在');
    }

    // 检查是否已点赞
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: LikeTargetType.CARD,
          targetId: cardId,
        },
      },
    });

    if (existingLike) {
      throw new BadRequestException('已经点赞过了');
    }

    // 创建点赞记录
    await this.prisma.like.create({
      data: {
        userId,
        cardId,
        targetType: LikeTargetType.CARD,
        targetId: cardId,
      },
    });

    // 更新 Card 点赞数
    const updatedCard = await this.prisma.card.update({
      where: { id: cardId },
      data: { likeCount: { increment: 1 } },
    });

    // 更新热度分数
    await this.hotScoreService.updateCardHotScore(cardId);

    return {
      message: '点赞成功',
      likeCount: updatedCard.likeCount,
      isLiked: true,
    };
  }

  /**
   * 取消点赞 Card
   */
  async unlikeCard(userId: string, cardId: string) {
    // 检查 Card 是否存在
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
    });

    if (!card || card.isDeleted) {
      throw new NotFoundException('Card 不存在');
    }

    // 检查是否已点赞
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: LikeTargetType.CARD,
          targetId: cardId,
        },
      },
    });

    if (!existingLike) {
      throw new BadRequestException('尚未点赞');
    }

    // 删除点赞记录
    await this.prisma.like.delete({
      where: { id: existingLike.id },
    });

    // 更新 Card 点赞数
    const updatedCard = await this.prisma.card.update({
      where: { id: cardId },
      data: { likeCount: { decrement: 1 } },
    });

    // 更新热度分数
    await this.hotScoreService.updateCardHotScore(cardId);

    return {
      message: '取消点赞成功',
      likeCount: updatedCard.likeCount,
      isLiked: false,
    };
  }

  /**
   * 点赞评论
   */
  async likeComment(userId: string, commentId: string) {
    // 检查评论是否存在
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('评论不存在');
    }

    // 检查是否已点赞
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: LikeTargetType.COMMENT,
          targetId: commentId,
        },
      },
    });

    if (existingLike) {
      throw new BadRequestException('已经点赞过了');
    }

    // 创建点赞记录
    await this.prisma.like.create({
      data: {
        userId,
        targetType: LikeTargetType.COMMENT,
        targetId: commentId,
      },
    });

    // 更新评论点赞数
    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { increment: 1 } },
    });

    return {
      message: '点赞成功',
      likeCount: updatedComment.likeCount,
      isLiked: true,
    };
  }

  /**
   * 取消点赞评论
   */
  async unlikeComment(userId: string, commentId: string) {
    // 检查评论是否存在
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('评论不存在');
    }

    // 检查是否已点赞
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType: LikeTargetType.COMMENT,
          targetId: commentId,
        },
      },
    });

    if (!existingLike) {
      throw new BadRequestException('尚未点赞');
    }

    // 删除点赞记录
    await this.prisma.like.delete({
      where: { id: existingLike.id },
    });

    // 更新评论点赞数
    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { likeCount: { decrement: 1 } },
    });

    return {
      message: '取消点赞成功',
      likeCount: updatedComment.likeCount,
      isLiked: false,
    };
  }

  /**
   * 检查用户是否点赞了某个目标
   */
  async checkLikeStatus(
    userId: string,
    targetType: LikeTargetType,
    targetId: string,
  ): Promise<boolean> {
    const like = await this.prisma.like.findUnique({
      where: {
        userId_targetType_targetId: {
          userId,
          targetType,
          targetId,
        },
      },
    });
    return !!like;
  }

  /**
   * 批量检查点赞状态
   */
  async checkBatchLikeStatus(
    userId: string,
    targetType: LikeTargetType,
    targetIds: string[],
  ): Promise<Map<string, boolean>> {
    const likes = await this.prisma.like.findMany({
      where: {
        userId,
        targetType,
        targetId: { in: targetIds },
      },
      select: { targetId: true },
    });

    const likedSet = new Set(likes.map((l) => l.targetId));
    const result = new Map<string, boolean>();
    targetIds.forEach((id) => result.set(id, likedSet.has(id)));
    return result;
  }
}
