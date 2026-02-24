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
  CreateLibraryDto,
  UpdateLibrarySettingsDto,
  GetLibrariesQueryDto,
  LibraryResponseDto,
  LibraryDetailResponseDto,
  CreateLibraryResponseDto,
  UpdateLibrarySettingsResponseDto,
  RankingResponseDto,
  RankingItemDto,
  OwnerBrief,
  LibraryStats,
  LibrarySettings,
} from './dto/index.js';
import { PaginatedResult } from '../../common/dto/pagination.dto.js';

/**
 * 小说库服务
 * 处理小说库管理相关业务逻辑
 *
 * 需求1: 小说库创建与管理
 */
@Injectable()
export class LibraryService {
  private readonly logger = new Logger(LibraryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建新小说库
   *
   * 需求1验收标准1: WHEN 用户创建新小说库时，THE Library_System SHALL 创建一个包含标题、描述、封面图和库类型的 Library 实体
   * 需求1验收标准2: WHEN 库拥有者设置收益分配时，THE Library_System SHALL 允许设置 0-30% 的额外抽成比例
   * 需求1验收标准3: WHEN 库拥有者设置上传费用时，THE Library_System SHALL 支持按千字或按漫画页数两种计费模式
   *
   * @param ownerId 库拥有者ID
   * @param createLibraryDto 创建小说库数据
   * @returns 创建的小说库信息
   */
  async createLibrary(
    ownerId: string,
    createLibraryDto: CreateLibraryDto,
  ): Promise<CreateLibraryResponseDto> {
    const {
      workId,
      title,
      description,
      coverImage,
      libraryType,
      ownerCutPercent = 0,
      uploadFeeType,
      uploadFeeRate = 0,
    } = createLibraryDto;

    // 验证 ownerCutPercent 范围 (Property 2)
    if (ownerCutPercent < 0 || ownerCutPercent > 30) {
      throw new BadRequestException('抽成比例必须在 0-30% 之间');
    }

    // 验证作品存在且属于当前用户
    const work = await this.prisma.work.findUnique({
      where: { id: workId, isDeleted: false },
      select: { id: true, authorId: true, title: true },
    });

    if (!work) {
      throw new NotFoundException('作品不存在');
    }

    if (work.authorId !== ownerId) {
      throw new ForbiddenException('只能为自己的作品创建小说库');
    }

    // 检查作品是否已有关联的小说库
    const existingLibrary = await this.prisma.library.findUnique({
      where: { workId },
    });

    if (existingLibrary) {
      throw new BadRequestException('该作品已有关联的小说库');
    }

    try {
      const library = await this.prisma.library.create({
        data: {
          ownerId,
          workId,
          title,
          description: description || null,
          coverImage: coverImage || null,
          libraryType,
          ownerCutPercent,
          uploadFeeType: uploadFeeType || 'PER_THOUSAND_WORDS',
          uploadFeeRate,
        },
        include: {
          owner: {
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
        `Library created successfully: ${library.id} by owner: ${ownerId}`,
      );

      return {
        message: '小说库创建成功',
        library: this.formatLibraryResponse(library),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create library: ${errorMessage}`);
      throw new InternalServerErrorException('创建小说库失败');
    }
  }

  /**
   * 获取小说库列表（分页、筛选、排序）
   *
   * 需求7验收标准2: WHEN 展示小说库列表时，THE Ranking_System SHALL 支持按热度分数降序排序
   *
   * @param query 查询参数（分页、筛选、排序）
   * @returns 分页的小说库列表
   */
  async getLibraries(
    query: GetLibrariesQueryDto,
  ): Promise<PaginatedResult<LibraryResponseDto>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      libraryType,
      ownerId,
    } = query;

    // 构建查询条件
    const where: any = {
      isDeleted: false,
    };

    if (libraryType) {
      where.libraryType = libraryType;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    // 构建排序
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    try {
      const skip = (page - 1) * limit;

      const [libraries, total] = await Promise.all([
        this.prisma.library.findMany({
          where,
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        this.prisma.library.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        data: libraries.map((library: any) =>
          this.formatLibraryResponse(library),
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
      this.logger.error(`Failed to list libraries: ${errorMessage}`);
      throw new InternalServerErrorException('获取小说库列表失败');
    }
  }

  /**
   * 获取小说库详情
   *
   * @param libraryId 小说库ID
   * @returns 小说库详情
   */
  async getLibraryById(libraryId: string): Promise<LibraryDetailResponseDto> {
    const library = await this.prisma.library.findUnique({
      where: { id: libraryId, isDeleted: false },
      include: {
        owner: {
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

    if (!library) {
      throw new NotFoundException('小说库不存在');
    }

    return this.formatLibraryDetailResponse(library);
  }

  /**
   * 更新小说库设置
   *
   * 需求1验收标准2: WHEN 库拥有者设置收益分配时，THE Library_System SHALL 允许设置 0-30% 的额外抽成比例
   * 需求1验收标准3: WHEN 库拥有者设置上传费用时，THE Library_System SHALL 支持按千字或按漫画页数两种计费模式
   *
   * @param libraryId 小说库ID
   * @param ownerId 请求者ID（必须是库拥有者）
   * @param updateDto 更新数据
   * @returns 更新后的小说库信息
   */
  async updateLibrarySettings(
    libraryId: string,
    ownerId: string,
    updateDto: UpdateLibrarySettingsDto,
  ): Promise<UpdateLibrarySettingsResponseDto> {
    // 查找小说库
    const existingLibrary = await this.prisma.library.findUnique({
      where: { id: libraryId, isDeleted: false },
      select: { id: true, ownerId: true },
    });

    if (!existingLibrary) {
      throw new NotFoundException('小说库不存在');
    }

    // 仅库拥有者可以更新设置
    if (existingLibrary.ownerId !== ownerId) {
      throw new ForbiddenException('无权更新此小说库设置');
    }

    // 验证 ownerCutPercent 范围 (Property 2)
    if (
      updateDto.ownerCutPercent !== undefined &&
      (updateDto.ownerCutPercent < 0 || updateDto.ownerCutPercent > 30)
    ) {
      throw new BadRequestException('抽成比例必须在 0-30% 之间');
    }

    try {
      const updateData: any = {};

      if (updateDto.ownerCutPercent !== undefined) {
        updateData.ownerCutPercent = updateDto.ownerCutPercent;
      }
      if (updateDto.uploadFeeType !== undefined) {
        updateData.uploadFeeType = updateDto.uploadFeeType;
      }
      if (updateDto.uploadFeeRate !== undefined) {
        updateData.uploadFeeRate = updateDto.uploadFeeRate;
      }

      const library = await this.prisma.library.update({
        where: { id: libraryId },
        data: updateData,
        include: {
          owner: {
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
        `Library settings updated: ${libraryId} by owner: ${ownerId}`,
      );

      return {
        message: '小说库设置更新成功',
        library: this.formatLibraryResponse(library),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update library settings: ${errorMessage}`);
      throw new InternalServerErrorException('更新小说库设置失败');
    }
  }

  /**
   * 获取热度排行榜 Top 100
   *
   * 需求7验收标准5: THE Ranking_System SHALL 提供热度排行榜页面，展示 Top 100 小说库
   *
   * @returns Top 100 小说库排行榜
   */
  async getRanking(): Promise<RankingResponseDto> {
    try {
      const libraries = await this.prisma.library.findMany({
        where: { isDeleted: false },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
        orderBy: { hotScore: 'desc' },
        take: 100,
      });

      const data: RankingItemDto[] = libraries.map((library: any, index: number) => ({
        rank: index + 1,
        id: library.id,
        title: library.title,
        description: library.description,
        coverImage: library.coverImage,
        owner: {
          id: library.owner.id,
          username: library.owner.username,
          displayName: library.owner.displayName,
          avatar: library.owner.avatar,
        },
        hotScore: library.hotScore,
        branchCount: library.branchCount,
      }));

      return {
        data,
        total: data.length,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get ranking: ${errorMessage}`);
      throw new InternalServerErrorException('获取热度排行榜失败');
    }
  }

  /**
   * 格式化小说库响应
   * @param library 数据库小说库记录
   * @returns 格式化的小说库响应
   */
  private formatLibraryResponse(library: any): LibraryResponseDto {
    const owner: OwnerBrief = {
      id: library.owner.id,
      username: library.owner.username,
      displayName: library.owner.displayName,
      avatar: library.owner.avatar,
    };

    const stats: LibraryStats = {
      hotScore: library.hotScore,
      branchCount: library.branchCount,
      totalTipAmount: library.totalTipAmount,
    };

    const settings: LibrarySettings = {
      ownerCutPercent: library.ownerCutPercent,
      uploadFeeType: library.uploadFeeType,
      uploadFeeRate: library.uploadFeeRate,
    };

    return {
      id: library.id,
      title: library.title,
      description: library.description,
      coverImage: library.coverImage,
      libraryType: library.libraryType,
      owner,
      stats,
      settings,
      workId: library.workId,
      createdAt: library.createdAt,
      updatedAt: library.updatedAt,
    };
  }

  /**
   * 格式化小说库详情响应（包含作品信息）
   * @param library 数据库小说库记录（含作品）
   * @returns 格式化的小说库详情响应
   */
  private formatLibraryDetailResponse(library: any): LibraryDetailResponseDto {
    const baseResponse = this.formatLibraryResponse(library);

    return {
      ...baseResponse,
      work: {
        id: library.work.id,
        title: library.work.title,
        description: library.work.description,
        coverImage: library.work.coverImage,
      },
    };
  }
}
