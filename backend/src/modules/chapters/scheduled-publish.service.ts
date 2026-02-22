import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ParagraphsService } from '../paragraphs/paragraphs.service.js';

/**
 * 定时发布调度服务
 *
 * 需求6验收标准14: WHEN Creator 设置章节发布时间 THEN System SHALL 支持定时发布功能
 *
 * 功能：
 * - 定期检查待发布的章节
 * - 到达发布时间时自动发布章节
 * - 发送发布通知（可选）
 */
@Injectable()
export class ScheduledPublishService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ScheduledPublishService.name);
  private intervalId: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 60 * 1000; // 每分钟检查一次

  constructor(
    private readonly prisma: PrismaService,
    private readonly paragraphsService: ParagraphsService,
  ) {}

  /**
   * 模块初始化时启动调度器
   */
  onModuleInit() {
    this.startScheduler();
    this.logger.log('定时发布调度器已启动');
  }

  /**
   * 模块销毁时停止调度器
   */
  onModuleDestroy() {
    this.stopScheduler();
    this.logger.log('定时发布调度器已停止');
  }

  /**
   * 启动调度器
   */
  private startScheduler() {
    // 立即执行一次检查
    this.checkAndPublishScheduledChapters();

    // 设置定时检查
    this.intervalId = setInterval(() => {
      this.checkAndPublishScheduledChapters();
    }, this.CHECK_INTERVAL);
  }

  /**
   * 停止调度器
   */
  private stopScheduler() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * 检查并发布到期的章节
   */
  async checkAndPublishScheduledChapters(): Promise<void> {
    try {
      const now = new Date();

      // 查找所有到期但未发布的章节
      const scheduledChapters = await this.prisma.chapter.findMany({
        where: {
          scheduledAt: {
            lte: now,
          },
          status: 'DRAFT',
          isDeleted: false,
        },
        include: {
          work: {
            select: {
              id: true,
              title: true,
              authorId: true,
            },
          },
        },
      });

      if (scheduledChapters.length === 0) {
        return;
      }

      this.logger.log(`发现 ${scheduledChapters.length} 个待发布章节`);

      // 逐个发布章节
      for (const chapter of scheduledChapters) {
        try {
          await this.publishChapter(chapter.id, chapter.work.authorId);
          this.logger.log(
            `章节已自动发布: ${chapter.title} (作品: ${chapter.work.title})`,
          );
        } catch (error) {
          this.logger.error(
            `章节发布失败: ${chapter.id} - ${error instanceof Error ? error.message : '未知错误'}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `定时发布检查失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
  }

  /**
   * 发布单个章节
   */
  private async publishChapter(
    chapterId: string,
    _authorId: string,
  ): Promise<void> {
    // 使用事务确保数据一致性
    await this.prisma.$transaction(async (tx) => {
      // 更新章节状态
      const chapter = await tx.chapter.update({
        where: { id: chapterId },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
          scheduledAt: null, // 清除定时发布时间
        },
        include: {
          work: true,
        },
      });

      // 解析段落并生成锚点（如果尚未生成）
      const existingParagraphs = await tx.paragraph.count({
        where: { chapterId },
      });

      if (existingParagraphs === 0) {
        // 调用段落服务创建段落
        await this.paragraphsService.createParagraphsForChapter(
          tx,
          chapter.workId,
          chapterId,
          chapter.content,
        );
      }

      // 更新作品的最后更新时间
      await tx.work.update({
        where: { id: chapter.workId },
        data: {
          updatedAt: new Date(),
        },
      });

      // TODO: 发送通知给关注该作品的用户
      // await this.notificationService.notifyFollowers(chapter.workId, chapter.id);
    });
  }

  /**
   * 设置章节定时发布
   *
   * @param chapterId 章节ID
   * @param scheduledAt 计划发布时间
   * @param userId 用户ID（用于验证权限）
   * @returns 更新后的章节
   */
  async scheduleChapterPublish(
    chapterId: string,
    scheduledAt: Date,
    userId: string,
  ): Promise<{ id: string; scheduledAt: Date | null }> {
    // 验证章节存在且属于该用户
    const chapter = await this.prisma.chapter.findFirst({
      where: {
        id: chapterId,
        authorId: userId,
        isDeleted: false,
      },
    });

    if (!chapter) {
      throw new Error('章节不存在或无权限');
    }

    if (chapter.status === 'PUBLISHED') {
      throw new Error('章节已发布，无法设置定时发布');
    }

    // 验证发布时间必须在未来
    if (scheduledAt <= new Date()) {
      throw new Error('发布时间必须在未来');
    }

    // 更新定时发布时间
    const updated = await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { scheduledAt },
      select: {
        id: true,
        scheduledAt: true,
      },
    });

    this.logger.log(
      `章节 ${chapterId} 已设置定时发布: ${scheduledAt.toISOString()}`,
    );

    return updated;
  }

  /**
   * 取消章节定时发布
   *
   * @param chapterId 章节ID
   * @param userId 用户ID
   * @returns 更新后的章节
   */
  async cancelScheduledPublish(
    chapterId: string,
    userId: string,
  ): Promise<{ id: string; scheduledAt: Date | null }> {
    // 验证章节存在且属于该用户
    const chapter = await this.prisma.chapter.findFirst({
      where: {
        id: chapterId,
        authorId: userId,
        isDeleted: false,
      },
    });

    if (!chapter) {
      throw new Error('章节不存在或无权限');
    }

    if (!chapter.scheduledAt) {
      throw new Error('章节未设置定时发布');
    }

    // 清除定时发布时间
    const updated = await this.prisma.chapter.update({
      where: { id: chapterId },
      data: { scheduledAt: null },
      select: {
        id: true,
        scheduledAt: true,
      },
    });

    this.logger.log(`章节 ${chapterId} 已取消定时发布`);

    return updated;
  }

  /**
   * 获取用户的所有定时发布章节
   *
   * @param userId 用户ID
   * @returns 定时发布章节列表
   */
  async getScheduledChapters(userId: string): Promise<
    Array<{
      id: string;
      title: string;
      workId: string;
      workTitle: string;
      scheduledAt: Date;
    }>
  > {
    const chapters = await this.prisma.chapter.findMany({
      where: {
        authorId: userId,
        scheduledAt: { not: null },
        status: 'DRAFT',
        isDeleted: false,
      },
      include: {
        work: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });

    return chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      workId: chapter.work.id,
      workTitle: chapter.work.title,
      scheduledAt: chapter.scheduledAt!,
    }));
  }
}
