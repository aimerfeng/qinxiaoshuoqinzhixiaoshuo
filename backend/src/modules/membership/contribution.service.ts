import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RedisService } from '../../redis/redis.service.js';
import { ContributionType } from '@prisma/client';

/**
 * 贡献度配置 - 定义每种贡献类型的积分和每日上限
 * 需求14: 贡献度计算维度
 */
export const CONTRIBUTION_CONFIG: Record<
  ContributionType,
  { points: number; dailyLimit: number | null; description: string }
> = {
  // 阅读贡献
  READ_CHAPTER: { points: 2, dailyLimit: 20, description: '完整阅读1章节' },
  READ_DURATION: { points: 5, dailyLimit: 15, description: '累计阅读30分钟' },

  // 互动贡献
  COMMENT_VALID: {
    points: 3,
    dailyLimit: 15,
    description: '发布有效评论（≥20字）',
  },
  COMMENT_LIKED: { points: 1, dailyLimit: 10, description: '评论被点赞' },
  QUOTE_INTERACTED: {
    points: 2,
    dailyLimit: 20,
    description: '引用被互动（点赞/评论）',
  },

  // 创作贡献
  PUBLISH_CHAPTER: { points: 20, dailyLimit: 60, description: '发布章节' },
  WORK_FAVORITED: { points: 5, dailyLimit: 50, description: '作品被收藏' },
  PARAGRAPH_QUOTED: { points: 3, dailyLimit: 30, description: '段落被引用' },

  // 社区贡献
  REPORT_VALID: { points: 10, dailyLimit: 30, description: '举报有效违规' },
  ACTIVITY_PARTICIPATE: {
    points: 15,
    dailyLimit: null,
    description: '参与官方活动',
  },

  // 建议贡献
  SUGGESTION_ACCEPTED: {
    points: 0, // 积分由审核者决定
    dailyLimit: null,
    description: '修订建议被采纳',
  },
};

/**
 * 贡献度记录响应接口
 */
export interface ContributionRecordResponse {
  id: string;
  type: ContributionType;
  points: number;
  referenceId: string | null;
  referenceType: string | null;
  description: string | null;
  createdAt: Date;
}

/**
 * 每日贡献度统计响应接口
 */
export interface DailyContributionResponse {
  type: ContributionType;
  currentPoints: number;
  dailyLimit: number | null;
  remaining: number | null;
  isLimitReached: boolean;
}

/**
 * 贡献度历史分页响应接口
 */
export interface ContributionHistoryResponse {
  records: ContributionRecordResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 添加贡献度结果接口
 */
export interface AddContributionResult {
  success: boolean;
  points: number;
  totalScore: number;
  message: string;
  record?: ContributionRecordResponse;
}

/**
 * 贡献度计算服务
 * 需求14: 会员等级体系 - 贡献度计算
 *
 * 功能说明：
 * 1. 添加贡献度积分（含每日上限检查）
 * 2. 获取每日贡献度统计
 * 3. 检查每日上限是否达到
 * 4. 获取用户总贡献度
 * 5. 获取贡献度历史记录
 *
 * Redis 键设计：
 * - contribution_daily:{userId}:{type}:{date} - 每日贡献度计数
 * - contribution_dedup:{userId}:{type}:{referenceId} - 去重标记
 */
@Injectable()
export class ContributionService {
  private readonly logger = new Logger(ContributionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 获取今日日期字符串 (YYYY-MM-DD)
   */
  private getTodayDateString(): string {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }

  /**
   * 获取今日剩余秒数（用于 Redis TTL）
   */
  private getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
  }

  /**
   * 生成每日贡献度 Redis 键
   */
  private getDailyContributionKey(
    userId: string,
    type: ContributionType,
  ): string {
    const date = this.getTodayDateString();
    return `contribution_daily:${userId}:${type}:${date}`;
  }

  /**
   * 生成去重 Redis 键
   */
  private getDedupKey(
    userId: string,
    type: ContributionType,
    referenceId: string,
  ): string {
    const date = this.getTodayDateString();
    return `contribution_dedup:${userId}:${type}:${referenceId}:${date}`;
  }

  /**
   * 添加贡献度
   * 需求14验收标准2: WHEN 用户完成贡献行为 THEN System SHALL 实时计算并更新 Contribution_Score
   *
   * @param userId 用户ID
   * @param type 贡献类型
   * @param referenceId 关联实体ID（可选）
   * @param referenceType 关联实体类型（可选）
   * @returns 添加结果
   */
  async addContribution(
    userId: string,
    type: ContributionType,
    referenceId?: string,
    referenceType?: string,
  ): Promise<AddContributionResult> {
    const config = CONTRIBUTION_CONFIG[type];
    if (!config) {
      throw new BadRequestException(`无效的贡献类型: ${type}`);
    }

    try {
      // 检查用户是否存在
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const user = await (this.prisma as any).user.findUnique({
        where: { id: userId },
        select: { id: true, contributionScore: true },
      });

      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      // 如果有 referenceId，检查是否已经记录过（去重）
      if (referenceId) {
        const dedupKey = this.getDedupKey(userId, type, referenceId);
        const exists = await this.redis.exists(dedupKey);
        if (exists > 0) {
          return {
            success: false,
            points: 0,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            totalScore: user.contributionScore,
            message: '该贡献已记录，不能重复计分',
          };
        }
      }

      // 检查每日上限
      if (config.dailyLimit !== null) {
        const limitCheck = await this.checkDailyLimit(userId, type);
        if (limitCheck.isLimitReached) {
          return {
            success: false,
            points: 0,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
            totalScore: user.contributionScore,
            message: `今日${config.description}贡献度已达上限（${config.dailyLimit}分）`,
          };
        }
      }

      // 使用事务创建记录并更新用户贡献度
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const result = await (this.prisma as any).$transaction(
        async (tx: any) => {
          // 创建贡献记录
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const record = await tx.contributionRecord.create({
            data: {
              userId,
              type,
              points: config.points,
              referenceId: referenceId || null,
              referenceType: referenceType || null,
              description: config.description,
            },
          });

          // 更新用户总贡献度
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const updatedUser = await tx.user.update({
            where: { id: userId },
            data: {
              contributionScore: {
                increment: config.points,
              },
            },
            select: { contributionScore: true },
          });

          return { record, updatedUser };
        },
      );

      // 更新 Redis 每日计数
      const dailyKey = this.getDailyContributionKey(userId, type);
      await this.redis.incrBy(dailyKey, config.points);
      // 设置过期时间到午夜
      const ttl = this.getSecondsUntilMidnight();
      await this.redis.expire(dailyKey, ttl);

      // 如果有 referenceId，设置去重标记
      if (referenceId) {
        const dedupKey = this.getDedupKey(userId, type, referenceId);
        await this.redis.set(dedupKey, '1', ttl);
      }

      this.logger.log(
        `Contribution added: userId=${userId}, type=${type}, points=${config.points}`,
      );

      return {
        success: true,
        points: config.points,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        totalScore: result.updatedUser.contributionScore,
        message: `成功获得${config.points}点贡献度`,
        record: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          id: result.record.id,
          type,
          points: config.points,
          referenceId: referenceId || null,
          referenceType: referenceType || null,
          description: config.description,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          createdAt: result.record.createdAt,
        },
      };
    } catch (error: unknown) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to add contribution: ${errorMessage}`);
      throw new BadRequestException('添加贡献度失败');
    }
  }

  /**
   * 获取用户今日某类型的贡献度
   *
   * @param userId 用户ID
   * @param type 贡献类型
   * @returns 今日贡献度统计
   */
  async getDailyContribution(
    userId: string,
    type: ContributionType,
  ): Promise<DailyContributionResponse> {
    const config = CONTRIBUTION_CONFIG[type];
    if (!config) {
      throw new BadRequestException(`无效的贡献类型: ${type}`);
    }

    const dailyKey = this.getDailyContributionKey(userId, type);
    const currentPointsStr = await this.redis.get(dailyKey);
    const currentPoints = currentPointsStr ? parseInt(currentPointsStr, 10) : 0;

    const dailyLimit = config.dailyLimit;
    const remaining =
      dailyLimit !== null ? Math.max(0, dailyLimit - currentPoints) : null;
    const isLimitReached = dailyLimit !== null && currentPoints >= dailyLimit;

    return {
      type,
      currentPoints,
      dailyLimit,
      remaining,
      isLimitReached,
    };
  }

  /**
   * 检查用户今日某类型贡献度是否达到上限
   *
   * @param userId 用户ID
   * @param type 贡献类型
   * @returns 是否达到上限
   */
  async checkDailyLimit(
    userId: string,
    type: ContributionType,
  ): Promise<{
    isLimitReached: boolean;
    currentPoints: number;
    dailyLimit: number | null;
  }> {
    const config = CONTRIBUTION_CONFIG[type];
    if (!config) {
      throw new BadRequestException(`无效的贡献类型: ${type}`);
    }

    // 如果没有每日上限，直接返回未达上限
    if (config.dailyLimit === null) {
      return {
        isLimitReached: false,
        currentPoints: 0,
        dailyLimit: null,
      };
    }

    const dailyKey = this.getDailyContributionKey(userId, type);
    const currentPointsStr = await this.redis.get(dailyKey);
    const currentPoints = currentPointsStr ? parseInt(currentPointsStr, 10) : 0;

    return {
      isLimitReached: currentPoints >= config.dailyLimit,
      currentPoints,
      dailyLimit: config.dailyLimit,
    };
  }

  /**
   * 获取用户总贡献度
   *
   * @param userId 用户ID
   * @returns 总贡献度
   */
  async getTotalContribution(userId: string): Promise<{
    totalScore: number;
    breakdown: {
      reading: number;
      interaction: number;
      creation: number;
      community: number;
    };
  }> {
    // 检查用户是否存在
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: { contributionScore: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 计算各维度贡献度

    const readingTypes = ['READ_CHAPTER', 'READ_DURATION'];
    const interactionTypes = [
      'COMMENT_VALID',
      'COMMENT_LIKED',
      'QUOTE_INTERACTED',
    ];
    const creationTypes = [
      'PUBLISH_CHAPTER',
      'WORK_FAVORITED',
      'PARAGRAPH_QUOTED',
    ];
    const communityTypes = ['REPORT_VALID', 'ACTIVITY_PARTICIPATE'];

    const [readingScore, interactionScore, creationScore, communityScore] =
      await Promise.all([
        this.sumContributionByTypes(userId, readingTypes as ContributionType[]),
        this.sumContributionByTypes(
          userId,
          interactionTypes as ContributionType[],
        ),
        this.sumContributionByTypes(
          userId,
          creationTypes as ContributionType[],
        ),
        this.sumContributionByTypes(
          userId,
          communityTypes as ContributionType[],
        ),
      ]);

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      totalScore: user.contributionScore,
      breakdown: {
        reading: readingScore,
        interaction: interactionScore,
        creation: creationScore,
        community: communityScore,
      },
    };
  }

  /**
   * 按类型汇总贡献度
   */
  private async sumContributionByTypes(
    userId: string,
    types: ContributionType[],
  ): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await (this.prisma as any).contributionRecord.aggregate({
      where: {
        userId,
        type: { in: types },
      },
      _sum: {
        points: true,
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
    return result._sum.points || 0;
  }

  /**
   * 获取用户贡献度历史记录
   * 需求14验收标准8: WHEN 用户查看贡献明细 THEN System SHALL 显示各维度贡献记录和积分变化
   *
   * @param userId 用户ID
   * @param pagination 分页参数
   * @returns 贡献度历史记录
   */
  async getContributionHistory(
    userId: string,
    pagination: { page: number; pageSize: number },
  ): Promise<ContributionHistoryResponse> {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    // 检查用户是否存在
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取总数
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const total = await (this.prisma as any).contributionRecord.count({
      where: { userId },
    });

    // 获取记录
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const records = await (this.prisma as any).contributionRecord.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      select: {
        id: true,
        type: true,
        points: true,
        referenceId: true,
        referenceType: true,
        description: true,
        createdAt: true,
      },
    });

    return {
      records: records as ContributionRecordResponse[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 获取用户今日所有类型的贡献度统计
   *
   * @param userId 用户ID
   * @returns 今日所有类型贡献度统计
   */
  async getAllDailyContributions(
    userId: string,
  ): Promise<DailyContributionResponse[]> {
    const types = Object.keys(CONTRIBUTION_CONFIG) as ContributionType[];
    const results = await Promise.all(
      types.map((type) => this.getDailyContribution(userId, type)),
    );
    return results;
  }

  /**
   * 获取贡献度配置信息
   *
   * @returns 贡献度配置
   */
  getContributionConfig(): typeof CONTRIBUTION_CONFIG {
    return CONTRIBUTION_CONFIG;
  }
}
