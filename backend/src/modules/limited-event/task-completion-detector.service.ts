import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class TaskCompletionDetectorService {
  private readonly logger = new Logger(TaskCompletionDetectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async detectTaskCompletion(userId: string, taskType: string, targetValue: number): Promise<boolean> {
    this.logger.debug('Detecting task completion for user ' + userId + ', type: ' + taskType);
    switch (taskType) {
      case 'DAILY_LOGIN': return true;
      case 'READ_CHAPTERS': return this.checkReadChapters(userId, targetValue);
      case 'PUBLISH_CARD': return this.checkPublishCard(userId, targetValue);
      case 'COMMENT': return this.checkComment(userId, targetValue);
      case 'LIKE': return this.checkLike(userId, targetValue);
      default: this.logger.warn('Unknown task type: ' + taskType); return false;
    }
  }

  private async checkReadChapters(userId: string, targetValue: number): Promise<boolean> {
    const count = await this.prisma.readingProgress.count({
      where: { userId, createdAt: { gte: this.getTodayStart() } },
    });
    return count >= targetValue;
  }

  private async checkPublishCard(userId: string, targetValue: number): Promise<boolean> {
    const count = await this.prisma.card.count({
      where: { authorId: userId, createdAt: { gte: this.getTodayStart() } },
    });
    return count >= targetValue;
  }

  private async checkComment(userId: string, targetValue: number): Promise<boolean> {
    const count = await this.prisma.comment.count({
      where: { authorId: userId, createdAt: { gte: this.getTodayStart() } },
    });
    return count >= targetValue;
  }

  private async checkLike(userId: string, targetValue: number): Promise<boolean> {
    const count = await this.prisma.like.count({
      where: { userId, createdAt: { gte: this.getTodayStart() } },
    });
    return count >= targetValue;
  }

  private getTodayStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}
