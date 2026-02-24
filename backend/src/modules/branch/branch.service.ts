import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateBranchDto, GetBranchesQueryDto } from './dto/index.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';
import { BranchType, UploadFeeType } from '@prisma/client';

/**
 * 分支创作者简要信息
 */
export interface CreatorBrief {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 分支统计信息
 */
export interface BranchStats {
  likeCount: number;
  tipAmount: number;
  viewCount: number;
  hotScore: number;
}

/**
 * 分支点信息
 */
export interface ForkPoint {
  chapterId: string | null;
  paragraphId: string | null;
}

/**
 * 分支响应 DTO
 */
export interface BranchResponseDto {
  id: string;
  libraryId: string;
  workId: string;
  branchType: BranchType;
  derivativeType: string | null;
  title: string;
  description: string | null;
  coverImage: string | null;
  creator: CreatorBrief;
  stats: BranchStats;
  forkPoint: ForkPoint;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 分支详情响应 DTO
 */
export interface BranchDetailResponseDto extends BranchResponseDto {
  library: {
    id: string;
    title: string;
    libraryType: string;
  };
  work: {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
  };
}

/**
 * 创建分支响应 DTO
 */
export interface CreateBranchResponseDto {
  message: string;
  branch: BranchResponseDto;
}

/**
 * 上传费用计算结果
 */
export interface UploadFeeCalculation {
  totalFee: number;
  ownerAmount: number;
  platformAmount: number;
  feeType: UploadFeeType;
  feeRate: number;
  quantity: number; // wordCount / 1000 或 pageCount
}

/**
 * 分支服务
 * 处理分支管理相关业务逻辑
 *
 * 需求2: 正文分支管理
 * 需求3: 改写分支管理
 * 需求4: 漫画分支管理
 */
@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 计算上传费用
   *
   * Property 7: 上传费用计算与分配
   * - 文字分支费用 = ceil(wordCount / 1000) × uploadFeeRate
   * - 漫画分支费用 = pageCount × uploadFeeRate
   * - 库拥有者收入 = 费用 × 70%
   * - 平台收入 = 费用 × 30%
   *
   * @param branchType 分支类型
   * @param uploadFeeType 费用类型
   * @param uploadFeeRate 费率（分/千字 或 分/页）
   * @param wordCount 字数（文字分支使用）
   * @param pageCount 页数（漫画分支使用）
   * @returns 费用计算结果
   *
   * _Requirements: 3.2, 3.3, 3.4, 4.2_
   */
  calculateUploadFee(
    branchType: BranchType,
    uploadFeeType: UploadFeeType,
    uploadFeeRate: number,
    wordCount?: number,
    pageCount?: number,
  ): UploadFeeCalculation {
    let totalFee = 0;
    let quantity = 0;

    if (branchType === 'MANGA') {
      // 漫画分支：pageCount × uploadFeeRate
      if (!pageCount || pageCount <= 0) {
        throw new BadRequestException('漫画分支必须提供有效的页数');
      }
      quantity = pageCount;
      totalFee = pageCount * uploadFeeRate;
    } else if (branchType === 'DERIVATIVE') {
      // 改写分支：ceil(wordCount / 1000) × uploadFeeRate
      if (wordCount === undefined || wordCount < 0) {
        throw new BadRequestException('改写分支必须提供有效的字数');
      }
      // ceil(wordCount / 1000)
      quantity = Math.ceil(wordCount / 1000);
      totalFee = quantity * uploadFeeRate;
    }
    // MAIN 分支不收取上传费用

    // 分配：70% 给库拥有者，30% 给平台
    const ownerAmount = Math.floor(totalFee * 0.7);
    const platformAmount = totalFee - ownerAmount; // 确保总和等于 totalFee

    return {
      totalFee,
      ownerAmount,
      platformAmount,
      feeType: uploadFeeType,
      feeRate: uploadFeeRate,
      quantity,
    };
  }

  /**
   * 创建分支
   *
   * 需求2验收标准1: WHEN 用户创建正文分支时，THE Branch_System SHALL 记录分支点和分支创作者
   * 需求2验收标准5: THE Branch_System SHALL 支持从任意已发布章节的任意段落创建分支
   * 需求3验收标准1: WHEN 用户创建改写分支时，THE Branch_System SHALL 要求选择分支类型
   * 需求3验收标准2-5: 上传费用计算与扣费
   *
   * Property 7: 上传费用计算与分配
   * Property 8: 余额不足拒绝创建
   *
   * @param libraryId 小说库ID
   * @param creatorId 创作者ID
   * @param createBranchDto 创建分支数据
   * @returns 创建的分支信息
   *
   * _Requirements: 2.1, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.2_
   */
  async createBranch(
    libraryId: string,
    creatorId: string,
    createBranchDto: CreateBranchDto,
  ): Promise<CreateBranchResponseDto> {
    const {
      branchType,
      derivativeType,
      forkFromChapterId,
      forkFromParagraphId,
      title,
      description,
      coverImage,
      wordCount,
      pageCount,
      pageUrls,
    } = createBranchDto;

    // 验证小说库存在并获取费用设置
    const library = await this.prisma.library.findUnique({
      where: { id: libraryId, isDeleted: false },
      select: {
        id: true,
        ownerId: true,
        libraryType: true,
        title: true,
        uploadFeeType: true,
        uploadFeeRate: true,
      },
    });

    if (!library) {
      throw new NotFoundException('小说库不存在');
    }

    // Property 3: 分支创建授权验证
    // ORIGINAL 库只有拥有者可创建 MAIN 分支
    if (
      library.libraryType === 'ORIGINAL' &&
      branchType === 'MAIN' &&
      library.ownerId !== creatorId
    ) {
      throw new ForbiddenException('原创库只有拥有者可以创建正文分支');
    }

    // Property 6: 改写分支类型必填验证
    if (branchType === 'DERIVATIVE' && !derivativeType) {
      throw new BadRequestException('改写分支必须指定子类型（同人/IF线/改编）');
    }

    // 验证分支点（如果提供）
    if (forkFromChapterId) {
      const chapter = await this.prisma.chapter.findUnique({
        where: { id: forkFromChapterId },
        select: { id: true, status: true },
      });

      if (!chapter) {
        throw new NotFoundException('分支点章节不存在');
      }

      if (chapter.status !== 'PUBLISHED') {
        throw new BadRequestException('只能从已发布的章节创建分支');
      }
    }

    if (forkFromParagraphId) {
      const paragraph = await this.prisma.paragraph.findUnique({
        where: { id: forkFromParagraphId },
        select: { id: true },
      });

      if (!paragraph) {
        throw new NotFoundException('分支点段落不存在');
      }
    }

    // Property 7 & 8: 计算上传费用并验证余额
    let feeCalculation: UploadFeeCalculation | null = null;

    // 只有 DERIVATIVE 和 MANGA 分支需要收取上传费用
    if (branchType === 'DERIVATIVE' || branchType === 'MANGA') {
      feeCalculation = this.calculateUploadFee(
        branchType,
        library.uploadFeeType,
        library.uploadFeeRate,
        wordCount,
        pageCount,
      );

      // 如果有费用，验证用户余额
      if (feeCalculation.totalFee > 0) {
        const userWallet = await this.prisma.wallet.findUnique({
          where: { userId: creatorId },
          select: { id: true, balance: true },
        });

        if (!userWallet) {
          throw new BadRequestException('用户钱包不存在，请先创建钱包');
        }

        // Property 8: 余额不足拒绝创建
        if (userWallet.balance < feeCalculation.totalFee) {
          throw new BadRequestException(
            `余额不足，需要 ${feeCalculation.totalFee} 零芥子，当前余额 ${userWallet.balance} 零芥子`,
          );
        }
      }
    }

    try {
      // 使用事务创建分支、扣除费用和创建交易记录
      const result = await this.prisma.$transaction(async (tx) => {
        // Property 9: 漫画分支同步创建作品
        // 为漫画分支生成带有原作引用的描述
        let workDescription = description || null;
        if (branchType === 'MANGA') {
          const adaptationNote = `改编自《${library.title}》`;
          workDescription = description
            ? `${adaptationNote}\n\n${description}`
            : adaptationNote;
        }

        // 创建关联的 Work 存储分支内容
        const work = await tx.work.create({
          data: {
            authorId: creatorId,
            title,
            description: workDescription,
            coverImage: coverImage || null,
            contentType: branchType === 'MANGA' ? 'MANGA' : 'NOVEL',
            status: 'DRAFT',
          },
        });

        // 创建分支
        const branch = await tx.libraryBranch.create({
          data: {
            libraryId,
            creatorId,
            workId: work.id,
            branchType,
            derivativeType: derivativeType || null,
            forkFromChapterId: forkFromChapterId || null,
            forkFromParagraphId: forkFromParagraphId || null,
          },
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            work: {
              select: {
                id: true,
                title: true,
                description: true,
                coverImage: true,
              },
            },
          },
        });

        // Property 9: 漫画分支同步创建 MangaPage 实体
        if (branchType === 'MANGA' && pageUrls && pageUrls.length > 0) {
          // 首先创建一个默认章节来存放漫画页面
          const chapter = await tx.chapter.create({
            data: {
              workId: work.id,
              authorId: creatorId,
              title: '第1话',
              content: '', // 漫画章节不需要文字内容
              orderIndex: 0,
              status: 'DRAFT',
            },
          });

          // 创建 MangaPage 实体
          await tx.mangaPage.createMany({
            data: pageUrls.map((imageUrl, index) => ({
              chapterId: chapter.id,
              imageUrl,
              orderIndex: index,
            })),
          });
        }

        // 更新小说库的分支计数
        await tx.library.update({
          where: { id: libraryId },
          data: {
            branchCount: { increment: 1 },
          },
        });

        // 如果有上传费用，执行扣费和创建交易记录
        let branchTransaction = null;
        if (feeCalculation && feeCalculation.totalFee > 0) {
          // 扣除用户余额
          const userWallet = await tx.wallet.update({
            where: { userId: creatorId },
            data: {
              balance: { decrement: feeCalculation.totalFee },
              totalSent: { increment: feeCalculation.totalFee },
            },
          });

          // 创建用户支出交易记录
          const userTransaction = await tx.transaction.create({
            data: {
              walletId: userWallet.id,
              type: 'TIP_SENT',
              amount: -feeCalculation.totalFee,
              referenceId: branch.id,
              referenceType: 'branch_upload_fee',
              description: `分支上传费用 - ${title}`,
            },
          });

          // 增加库拥有者余额（如果有）
          let ownerTransactionId: string | null = null;
          if (feeCalculation.ownerAmount > 0) {
            const ownerWallet = await tx.wallet.upsert({
              where: { userId: library.ownerId },
              create: {
                userId: library.ownerId,
                balance: feeCalculation.ownerAmount,
                totalReceived: feeCalculation.ownerAmount,
              },
              update: {
                balance: { increment: feeCalculation.ownerAmount },
                totalReceived: { increment: feeCalculation.ownerAmount },
              },
            });

            const ownerTransaction = await tx.transaction.create({
              data: {
                walletId: ownerWallet.id,
                type: 'TIP_RECEIVED',
                amount: feeCalculation.ownerAmount,
                referenceId: branch.id,
                referenceType: 'branch_upload_fee',
                description: `分支上传费用收入 - ${title}`,
              },
            });
            ownerTransactionId = ownerTransaction.id;
          }

          // 创建 BranchTransaction 记录
          branchTransaction = await tx.branchTransaction.create({
            data: {
              branchId: branch.id,
              userId: creatorId,
              transactionType: 'UPLOAD_FEE',
              totalAmount: feeCalculation.totalFee,
              platformAmount: feeCalculation.platformAmount,
              ownerAmount: feeCalculation.ownerAmount,
              creatorAmount: 0, // 上传费用不分配给创作者
              userTransactionId: userTransaction.id,
              ownerTransactionId,
              // platformTransactionId 暂不处理，平台收入可以通过计算得出
            },
          });
        }

        return { branch, work, branchTransaction };
      });

      this.logger.log(
        `Branch created successfully: ${result.branch.id} in library: ${libraryId} by creator: ${creatorId}` +
          (feeCalculation && feeCalculation.totalFee > 0
            ? `, upload fee: ${feeCalculation.totalFee}`
            : ''),
      );

      return {
        message: '分支创建成功',
        branch: this.formatBranchResponse(result.branch, result.work),
      };
    } catch (error: unknown) {
      // 重新抛出已知的业务异常
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create branch: ${errorMessage}`);
      throw new InternalServerErrorException('创建分支失败');
    }
  }

  /**
   * 获取分支列表（分页、筛选、排序）
   *
   * 需求2验收标准2: WHEN 展示正文分支列表时，THE Branch_System SHALL 按（点赞数 + 打赏贡献值）降序排序
   *
   * @param libraryId 小说库ID
   * @param query 查询参数
   * @returns 分页的分支列表
   */
  async getBranches(
    libraryId: string,
    query: GetBranchesQueryDto,
  ): Promise<PaginatedResult<BranchResponseDto>> {
    const {
      page = 1,
      limit = 20,
      branchType,
      sortBy = 'hotScore',
      sortOrder = 'desc',
    } = query;

    // 验证小说库存在
    const library = await this.prisma.library.findUnique({
      where: { id: libraryId, isDeleted: false },
      select: { id: true },
    });

    if (!library) {
      throw new NotFoundException('小说库不存在');
    }

    // 构建查询条件
    const where: any = {
      libraryId,
      isDeleted: false,
    };

    if (branchType) {
      where.branchType = branchType;
    }

    // 构建排序
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    try {
      const skip = (page - 1) * limit;

      const [branches, total] = await Promise.all([
        this.prisma.libraryBranch.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
            work: {
              select: {
                id: true,
                title: true,
                description: true,
                coverImage: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.libraryBranch.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: branches.map((branch: any) =>
          this.formatBranchResponse(branch, branch.work),
        ),
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
      this.logger.error(`Failed to list branches: ${errorMessage}`);
      throw new InternalServerErrorException('获取分支列表失败');
    }
  }

  /**
   * 获取分支详情
   *
   * 需求2验收标准3: WHEN 用户阅读正文分支时，THE Branch_System SHALL 显示分支创作者信息和分支点位置
   *
   * @param branchId 分支ID
   * @returns 分支详情
   */
  async getBranchById(branchId: string): Promise<BranchDetailResponseDto> {
    const branch = await this.prisma.libraryBranch.findUnique({
      where: { id: branchId, isDeleted: false },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
        work: {
          select: {
            id: true,
            title: true,
            description: true,
            coverImage: true,
          },
        },
        library: {
          select: {
            id: true,
            title: true,
            libraryType: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException('分支不存在');
    }

    return this.formatBranchDetailResponse(branch);
  }

  /**
   * 软删除分支
   *
   * 需求2验收标准4: IF 正文分支被删除，THEN THE Branch_System SHALL 保留分支元数据但标记为已删除状态
   *
   * Property 5: 软删除保留元数据
   * - 删除后 isDeleted=true
   * - 所有其他元数据字段（creatorId, libraryId, branchType, forkFromChapterId 等）保持不变
   *
   * @param branchId 分支ID
   * @param userId 请求者ID（必须是分支创作者或库拥有者）
   * @returns 删除成功消息
   *
   * _Requirements: 2.4_
   */
  async deleteBranch(
    branchId: string,
    userId: string,
  ): Promise<{ message: string }> {
    // 查找分支及其关联的库信息
    const branch = await this.prisma.libraryBranch.findUnique({
      where: { id: branchId },
      select: {
        id: true,
        creatorId: true,
        libraryId: true,
        isDeleted: true,
        library: {
          select: {
            id: true,
            ownerId: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException('分支不存在');
    }

    // 如果已经被删除，返回提示
    if (branch.isDeleted) {
      throw new BadRequestException('分支已被删除');
    }

    // 验证权限：只有分支创作者或库拥有者可以删除分支
    const isCreator = branch.creatorId === userId;
    const isLibraryOwner = branch.library.ownerId === userId;

    if (!isCreator && !isLibraryOwner) {
      throw new ForbiddenException('无权删除此分支');
    }

    try {
      // 软删除：仅设置 isDeleted=true，保留所有其他元数据
      await this.prisma.libraryBranch.update({
        where: { id: branchId },
        data: {
          isDeleted: true,
        },
      });

      // 更新小说库的分支计数
      await this.prisma.library.update({
        where: { id: branch.libraryId },
        data: {
          branchCount: { decrement: 1 },
        },
      });

      this.logger.log(
        `Branch soft deleted: ${branchId} by user: ${userId} (${isCreator ? 'creator' : 'library owner'})`,
      );

      return {
        message: '分支删除成功',
      };
    } catch (error: unknown) {
      // 重新抛出已知的业务异常
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete branch: ${errorMessage}`);
      throw new InternalServerErrorException('删除分支失败');
    }
  }

  /**
   * 格式化分支响应
   * @param branch 数据库分支记录
   * @param work 关联的作品
   * @returns 格式化的分支响应
   */
  private formatBranchResponse(branch: any, work: any): BranchResponseDto {
    const creator: CreatorBrief = {
      id: branch.creator.id,
      username: branch.creator.username,
      displayName: branch.creator.displayName,
      avatar: branch.creator.avatar,
    };

    const stats: BranchStats = {
      likeCount: branch.likeCount,
      tipAmount: branch.tipAmount,
      viewCount: branch.viewCount,
      hotScore: branch.hotScore,
    };

    const forkPoint: ForkPoint = {
      chapterId: branch.forkFromChapterId,
      paragraphId: branch.forkFromParagraphId,
    };

    return {
      id: branch.id,
      libraryId: branch.libraryId,
      workId: branch.workId,
      branchType: branch.branchType,
      derivativeType: branch.derivativeType,
      title: work.title,
      description: work.description,
      coverImage: work.coverImage,
      creator,
      stats,
      forkPoint,
      createdAt: branch.createdAt,
      updatedAt: branch.updatedAt,
    };
  }

  /**
   * 格式化分支详情响应
   * @param branch 数据库分支记录（含库和作品）
   * @returns 格式化的分支详情响应
   */
  private formatBranchDetailResponse(branch: any): BranchDetailResponseDto {
    const baseResponse = this.formatBranchResponse(branch, branch.work);

    return {
      ...baseResponse,
      library: {
        id: branch.library.id,
        title: branch.library.title,
        libraryType: branch.library.libraryType,
      },
      work: {
        id: branch.work.id,
        title: branch.work.title,
        description: branch.work.description,
        coverImage: branch.work.coverImage,
      },
    };
  }
}
