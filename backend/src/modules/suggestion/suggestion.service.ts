import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSuggestionDto } from './dto/create-suggestion.dto.js';
import { AcceptSuggestionDto } from './dto/accept-suggestion.dto.js';
import { RejectSuggestionDto } from './dto/reject-suggestion.dto.js';
import { SuggestionType, SuggestionStatus } from '@prisma/client';

/**
 * 建议提交者简要信息
 */
export interface SuggesterBrief {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 建议响应 DTO
 */
export interface SuggestionResponseDto {
  id: string;
  branchId: string;
  paragraphId: string;
  suggestionType: SuggestionType;
  status: SuggestionStatus;
  suggestedContent: string | null;
  imageUrl: string | null;
  rewardAmount: number;
  reviewedAt: Date | null;
  reviewNote: string | null;
  cardId: string | null;
  suggester: SuggesterBrief;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 创建建议响应 DTO
 */
export interface CreateSuggestionResponseDto {
  message: string;
  suggestion: SuggestionResponseDto;
}

/**
 * 修订建议服务
 * 处理修订建议相关业务逻辑
 *
 * 需求5: 修订建议系统
 * - 创建段落级修订建议
 * - 审核（采纳/拒绝）建议
 * - 奖励贡献积分
 * - 生成社区动态卡片
 */
@Injectable()
export class SuggestionService {
  private readonly logger = new Logger(SuggestionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建修订建议
   *
   * 需求5验收标准1: WHEN 用户选择段落并提交修订建议时，THE Suggestion_System SHALL 记录建议内容和建议者信息
   * 需求5验收标准2: THE Suggestion_System SHALL 支持对任意已发布段落创建修订建议
   * 需求5验收标准3: THE Suggestion_System SHALL 支持"修改"类型建议，允许修改段落文字内容
   * 需求5验收标准4: THE Suggestion_System SHALL 支持"插入"类型建议，允许在段落前后插入新内容
   * 需求5验收标准5: THE Suggestion_System SHALL 支持"添加插图"类型建议，允许为段落添加配图
   *
   * Property 10: 修订建议类型支持
   * - 支持 MODIFY, INSERT_BEFORE, INSERT_AFTER, ADD_IMAGE 四种类型
   *
   * @param paragraphId 段落ID
   * @param suggesterId 建议提交者ID
   * @param createSuggestionDto 创建建议数据
   * @returns 创建的建议信息
   *
   * _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
   */
  async createSuggestion(
    paragraphId: string,
    suggesterId: string,
    createSuggestionDto: CreateSuggestionDto,
  ): Promise<CreateSuggestionResponseDto> {
    const { branchId, suggestionType, suggestedContent, imageUrl } =
      createSuggestionDto;

    // 1. 验证段落存在
    const paragraph = await this.prisma.paragraph.findUnique({
      where: { id: paragraphId },
      select: {
        id: true,
        chapterId: true,
        isDeleted: true,
        chapter: {
          select: {
            id: true,
            workId: true,
            status: true,
          },
        },
      },
    });

    if (!paragraph) {
      throw new NotFoundException('段落不存在');
    }

    if (paragraph.isDeleted) {
      throw new BadRequestException('段落已被删除');
    }

    // 2. 验证分支存在且未被删除
    const branch = await this.prisma.libraryBranch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        workId: true,
        isDeleted: true,
        library: {
          select: {
            id: true,
            workId: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException('分支不存在');
    }

    if (branch.isDeleted) {
      throw new BadRequestException('分支已被删除');
    }

    // 3. 验证段落属于分支的作品
    // 段落可以属于分支的作品，或者属于小说库的原始作品
    const paragraphWorkId = paragraph.chapter.workId;
    const branchWorkId = branch.workId;
    const libraryWorkId = branch.library.workId;

    if (paragraphWorkId !== branchWorkId && paragraphWorkId !== libraryWorkId) {
      throw new BadRequestException('段落不属于该分支或其关联的小说库');
    }

    // 4. 验证建议内容
    // ADD_IMAGE 类型必须提供 imageUrl
    if (suggestionType === 'ADD_IMAGE') {
      if (!imageUrl || imageUrl.trim() === '') {
        throw new BadRequestException('添加插图类型建议必须提供图片URL');
      }
    }

    // MODIFY, INSERT_BEFORE, INSERT_AFTER 类型必须提供 suggestedContent
    if (
      suggestionType === 'MODIFY' ||
      suggestionType === 'INSERT_BEFORE' ||
      suggestionType === 'INSERT_AFTER'
    ) {
      if (!suggestedContent || suggestedContent.trim() === '') {
        throw new BadRequestException('修改或插入类型建议必须提供建议内容');
      }
    }

    try {
      // 5. 创建修订建议，默认状态为 PENDING
      const suggestion = await this.prisma.contentSuggestion.create({
        data: {
          branchId,
          paragraphId,
          suggesterId,
          suggestionType,
          status: 'PENDING',
          suggestedContent: suggestedContent || null,
          imageUrl: imageUrl || null,
        },
        include: {
          suggester: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      });

      this.logger.log(
        `Suggestion created successfully: ${suggestion.id} for paragraph: ${paragraphId} by suggester: ${suggesterId}, type: ${suggestionType}`,
      );

      return {
        message: '修订建议创建成功',
        suggestion: this.formatSuggestionResponse(suggestion),
      };
    } catch (error: unknown) {
      // 重新抛出已知的业务异常
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create suggestion: ${errorMessage}`);
      throw new InternalServerErrorException('创建修订建议失败');
    }
  }

  /**
   * 格式化建议响应
   * @param suggestion 数据库建议记录
   * @returns 格式化的建议响应
   */
  private formatSuggestionResponse(suggestion: any): SuggestionResponseDto {
    const suggester: SuggesterBrief = {
      id: suggestion.suggester.id,
      username: suggestion.suggester.username,
      displayName: suggestion.suggester.displayName,
      avatar: suggestion.suggester.avatar,
    };

    return {
      id: suggestion.id,
      branchId: suggestion.branchId,
      paragraphId: suggestion.paragraphId,
      suggestionType: suggestion.suggestionType,
      status: suggestion.status,
      suggestedContent: suggestion.suggestedContent,
      imageUrl: suggestion.imageUrl,
      rewardAmount: suggestion.rewardAmount,
      reviewedAt: suggestion.reviewedAt,
      reviewNote: suggestion.reviewNote,
      cardId: suggestion.cardId,
      suggester,
      createdAt: suggestion.createdAt,
      updatedAt: suggestion.updatedAt,
    };
  }

  /**
   * 获取分支的修订建议列表
   *
   * @param branchId 分支ID
   * @param status 可选的状态筛选
   * @returns 建议列表
   */
  async getSuggestionsByBranch(
    branchId: string,
    status?: SuggestionStatus,
  ): Promise<SuggestionResponseDto[]> {
    // 验证分支存在
    const branch = await this.prisma.libraryBranch.findUnique({
      where: { id: branchId },
      select: { id: true, isDeleted: true },
    });

    if (!branch) {
      throw new NotFoundException('分支不存在');
    }

    if (branch.isDeleted) {
      throw new BadRequestException('分支已被删除');
    }

    const whereClause: any = {
      branchId,
      isDeleted: false,
    };

    if (status) {
      whereClause.status = status;
    }

    const suggestions = await this.prisma.contentSuggestion.findMany({
      where: whereClause,
      include: {
        suggester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return suggestions.map((s) => this.formatSuggestionResponse(s));
  }

  /**
   * 采纳修订建议
   *
   * 需求5验收标准6: WHEN 分支创作者审核修订建议时，THE Suggestion_System SHALL 支持采纳或拒绝操作
   * 需求5验收标准7: IF 修订建议被采纳，THEN THE Suggestion_System SHALL 创建 ContributionRecord 奖励建议提交者
   * 需求5验收标准8: IF 修订建议被采纳且选择发布动态，THEN THE Suggestion_System SHALL 创建 Card 实体
   * 需求8验收标准3: THE Integration_System SHALL 复用现有 ContributionRecord 模型记录建议采纳奖励
   * 需求8验收标准5: THE Integration_System SHALL 复用现有 Card 模型发布建议采纳动态
   *
   * Property 11: 建议采纳奖励与动态
   * - 采纳后创建 ContributionRecord
   * - publishCard=true 时创建 Card
   *
   * @param suggestionId 建议ID
   * @param reviewerId 审核者ID（分支创作者）
   * @param acceptDto 采纳参数
   * @returns 更新后的建议信息
   *
   * _Requirements: 5.6, 5.7, 5.8, 8.3, 8.5_
   */
  async acceptSuggestion(
    suggestionId: string,
    reviewerId: string,
    acceptDto: AcceptSuggestionDto,
  ): Promise<SuggestionResponseDto> {
    const { rewardAmount = 0, publishCard = false, cardContent } = acceptDto;

    // 1. 获取建议并验证
    const suggestion = await this.prisma.contentSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        branch: {
          select: {
            id: true,
            creatorId: true,
            isDeleted: true,
            library: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
        suggester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        paragraph: {
          select: {
            id: true,
            content: true,
          },
        },
      },
    });

    if (!suggestion) {
      throw new NotFoundException('修订建议不存在');
    }

    if (suggestion.isDeleted) {
      throw new BadRequestException('修订建议已被删除');
    }

    // 2. 验证建议状态为 PENDING
    if (suggestion.status !== 'PENDING') {
      throw new BadRequestException('该建议已被处理，无法重复操作');
    }

    // 3. 验证审核者是分支创作者
    if (suggestion.branch.creatorId !== reviewerId) {
      throw new ForbiddenException('只有分支创作者可以审核修订建议');
    }

    // 4. 验证分支未被删除
    if (suggestion.branch.isDeleted) {
      throw new BadRequestException('分支已被删除，无法审核建议');
    }

    try {
      // 使用事务处理采纳操作
      const result = await this.prisma.$transaction(async (tx) => {
        let cardId: string | null = null;

        // 5. 如果需要发布动态卡片，先创建 Card
        if (publishCard) {
          const defaultCardContent =
            cardContent ||
            `采纳了来自 @${suggestion.suggester.username} 的修订建议`;

          const card = await tx.card.create({
            data: {
              authorId: reviewerId,
              content: defaultCardContent,
            },
          });
          cardId = card.id;

          this.logger.log(
            `Card created for accepted suggestion: ${card.id}, suggestion: ${suggestionId}`,
          );
        }

        // 6. 更新建议状态为 ACCEPTED
        const updatedSuggestion = await tx.contentSuggestion.update({
          where: { id: suggestionId },
          data: {
            status: 'ACCEPTED',
            reviewedAt: new Date(),
            rewardAmount,
            cardId,
          },
          include: {
            suggester: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        });

        // 7. 创建 ContributionRecord 奖励建议提交者
        if (rewardAmount > 0) {
          await tx.contributionRecord.create({
            data: {
              userId: suggestion.suggesterId,
              type: 'SUGGESTION_ACCEPTED',
              points: rewardAmount,
              referenceId: suggestionId,
              referenceType: 'ContentSuggestion',
              description: `修订建议被采纳，获得 ${rewardAmount} 积分`,
            },
          });

          this.logger.log(
            `ContributionRecord created for suggester: ${suggestion.suggesterId}, points: ${rewardAmount}`,
          );
        }

        return updatedSuggestion;
      });

      this.logger.log(
        `Suggestion accepted: ${suggestionId} by reviewer: ${reviewerId}`,
      );

      return this.formatSuggestionResponse(result);
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to accept suggestion: ${errorMessage}`);
      throw new InternalServerErrorException('采纳修订建议失败');
    }
  }

  /**
   * 拒绝修订建议
   *
   * 需求5验收标准6: WHEN 分支创作者审核修订建议时，THE Suggestion_System SHALL 支持采纳或拒绝操作
   *
   * @param suggestionId 建议ID
   * @param reviewerId 审核者ID（分支创作者）
   * @param rejectDto 拒绝参数
   * @returns 更新后的建议信息
   *
   * _Requirements: 5.6_
   */
  async rejectSuggestion(
    suggestionId: string,
    reviewerId: string,
    rejectDto: RejectSuggestionDto,
  ): Promise<SuggestionResponseDto> {
    const { reviewNote } = rejectDto;

    // 1. 获取建议并验证
    const suggestion = await this.prisma.contentSuggestion.findUnique({
      where: { id: suggestionId },
      include: {
        branch: {
          select: {
            id: true,
            creatorId: true,
            isDeleted: true,
          },
        },
        suggester: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
    });

    if (!suggestion) {
      throw new NotFoundException('修订建议不存在');
    }

    if (suggestion.isDeleted) {
      throw new BadRequestException('修订建议已被删除');
    }

    // 2. 验证建议状态为 PENDING
    if (suggestion.status !== 'PENDING') {
      throw new BadRequestException('该建议已被处理，无法重复操作');
    }

    // 3. 验证审核者是分支创作者
    if (suggestion.branch.creatorId !== reviewerId) {
      throw new ForbiddenException('只有分支创作者可以审核修订建议');
    }

    // 4. 验证分支未被删除
    if (suggestion.branch.isDeleted) {
      throw new BadRequestException('分支已被删除，无法审核建议');
    }

    try {
      // 5. 更新建议状态为 REJECTED
      const updatedSuggestion = await this.prisma.contentSuggestion.update({
        where: { id: suggestionId },
        data: {
          status: 'REJECTED',
          reviewedAt: new Date(),
          reviewNote: reviewNote || null,
        },
        include: {
          suggester: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      });

      this.logger.log(
        `Suggestion rejected: ${suggestionId} by reviewer: ${reviewerId}`,
      );

      return this.formatSuggestionResponse(updatedSuggestion);
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reject suggestion: ${errorMessage}`);
      throw new InternalServerErrorException('拒绝修订建议失败');
    }
  }
}
