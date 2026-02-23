import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

export interface StatisticsOverview {
  totalUsers: number;
  dau: number;
  mau: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalWorks: number;
  totalChapters: number;
  publishedWorksToday: number;
  publishedChaptersToday: number;
  totalTransactions: number;
  transactionsToday: number;
  totalTokensCirculated: number;
  activeActivities: number;
  pendingActivities: number;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  memberLevelDistribution: { level: string; count: number }[];
  userGrowthTrend: { date: string; newUsers: number; totalUsers: number }[];
  dauTrend: { date: string; dau: number }[];
}

export interface ContentStatistics {
  totalWorks: number;
  publishedWorks: number;
  draftWorks: number;
  totalChapters: number;
  publishedChapters: number;
  contentTypeDistribution: { type: string; count: number }[];
  publishTrend: { date: string; works: number; chapters: number }[];
  topTags: { name: string; count: number }[];
}

export interface TransactionStatistics {
  totalTransactions: number;
  totalTokensCirculated: number;
  totalTips: number;
  totalDailyClaims: number;
  transactionTypeDistribution: {
    type: string;
    count: number;
    amount: number;
  }[];
  transactionTrend: { date: string; count: number; amount: number }[];
}

@Injectable()
export class StatisticsService {
  private readonly logger = new Logger(StatisticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOverview(): Promise<StatisticsOverview> {
    this.logger.debug('Fetching statistics overview');
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(todayStart);
    monthStart.setDate(monthStart.getDate() - 30);

    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      dau,
      mau,
      totalWorks,
      totalChapters,
      publishedWorksToday,
      publishedChaptersToday,
      totalTransactions,
      transactionsToday,
      totalTokensCirculated,
      activeActivities,
      pendingActivities,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { lastLoginAt: { gte: monthStart } } }),
      this.prisma.work.count({ where: { isDeleted: false } }),
      this.prisma.chapter.count({ where: { isDeleted: false } }),
      this.prisma.work.count({
        where: { isDeleted: false, publishedAt: { gte: todayStart } },
      }),
      this.prisma.chapter.count({
        where: { isDeleted: false, publishedAt: { gte: todayStart } },
      }),
      this.prisma.transaction.count(),
      this.prisma.transaction.count({
        where: { createdAt: { gte: todayStart } },
      }),
      this.prisma.transaction
        .aggregate({ where: { amount: { gt: 0 } }, _sum: { amount: true } })
        .then((r) => r._sum?.amount ?? 0),
      this.prisma.activity.count({
        where: { status: 'ACTIVE', isDeleted: false },
      }),
      this.prisma.activity.count({
        where: { status: 'PENDING', isDeleted: false },
      }),
    ]);

    return {
      totalUsers,
      dau,
      mau,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalWorks,
      totalChapters,
      publishedWorksToday,
      publishedChaptersToday,
      totalTransactions,
      transactionsToday,
      totalTokensCirculated,
      activeActivities,
      pendingActivities,
    };
  }

  async getUserStatistics(): Promise<UserStatistics> {
    const [totalUsers, activeUsers, bannedUsers, memberLevelResult] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { isActive: true } }),
        this.prisma.user.count({ where: { isActive: false } }),
        this.prisma.user.groupBy({ by: ['memberLevel'], _count: { id: true } }),
      ]);
    return {
      totalUsers,
      activeUsers,
      bannedUsers,
      memberLevelDistribution: memberLevelResult.map((i) => ({
        level: String(i.memberLevel),
        count: i._count.id,
      })),
      userGrowthTrend: [],
      dauTrend: [],
    };
  }

  async getContentStatistics(): Promise<ContentStatistics> {
    const [
      totalWorks,
      publishedWorks,
      draftWorks,
      totalChapters,
      publishedChapters,
      contentTypeResult,
      topTags,
    ] = await Promise.all([
      this.prisma.work.count({ where: { isDeleted: false } }),
      this.prisma.work.count({
        where: { isDeleted: false, status: 'PUBLISHED' },
      }),
      this.prisma.work.count({ where: { isDeleted: false, status: 'DRAFT' } }),
      this.prisma.chapter.count({ where: { isDeleted: false } }),
      this.prisma.chapter.count({
        where: { isDeleted: false, status: 'PUBLISHED' },
      }),
      this.prisma.work.groupBy({
        by: ['contentType'],
        where: { isDeleted: false },
        _count: { id: true },
      }),
      this.prisma.tag.findMany({
        orderBy: { usageCount: 'desc' },
        take: 10,
        select: { name: true, usageCount: true },
      }),
    ]);
    return {
      totalWorks,
      publishedWorks,
      draftWorks,
      totalChapters,
      publishedChapters,
      contentTypeDistribution: contentTypeResult.map((i) => ({
        type: String(i.contentType),
        count: i._count.id,
      })),
      publishTrend: [],
      topTags: topTags.map((t) => ({ name: t.name, count: t.usageCount })),
    };
  }

  async getTransactionStatistics(): Promise<TransactionStatistics> {
    const [
      totalTransactions,
      totalTokensResult,
      totalTips,
      totalDailyClaims,
      typeResult,
    ] = await Promise.all([
      this.prisma.transaction.count(),
      this.prisma.transaction.aggregate({
        where: { amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.tipRecord.count(),
      this.prisma.dailyClaimRecord.count(),
      this.prisma.transaction.groupBy({
        by: ['type'],
        _count: { id: true },
        _sum: { amount: true },
      }),
    ]);
    return {
      totalTransactions,
      totalTokensCirculated: totalTokensResult._sum?.amount ?? 0,
      totalTips,
      totalDailyClaims,
      transactionTypeDistribution: typeResult.map((i) => ({
        type: String(i.type),
        count: i._count.id,
        amount: Math.abs(i._sum?.amount ?? 0),
      })),
      transactionTrend: [],
    };
  }
}
