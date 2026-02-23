import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import {
  OnboardingProgressDto,
  GetProgressResponseDto,
  GetAllProgressResponseDto,
  UpdateProgressResponseDto,
  ResetProgressResponseDto,
  CompleteGuideWithRewardResponseDto,
  GuideType,
} from './dto/index.js';
import { OnboardingRewardService } from './onboarding-reward.service.js';

/**
 * 各引导类型的默认总步骤数
 * 根据需求22的引导流程设计
 */
const GUIDE_TOTAL_STEPS: Record<GuideType, number> = {
  REGISTRATION: 3, // 完善资料、选择兴趣标签、完成
  HOMEPAGE: 4,     // 介绍广场、推荐流、搜索入口、完成
  READER: 5,       // 介绍段落引用、阅读设置、章节导航、弹幕功能、完成
  CREATION: 5,     // 介绍编辑功能、发布流程、数据查看、定时发布、完成
};

/**
 * 新手引导服务
 * 处理用户引导进度相关业务逻辑
 *
 * 需求22: 新手引导系统
 *
 * 验收标准:
 * - 22.4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
 * - 22.5: WHEN 用户再次触发引导场景 THEN System SHALL 检查是否已完成，已完成则不再显示
 * - 22.8: THE System SHALL 记录引导完成率用于产品优化分析
 */
@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly onboardingRewardService: OnboardingRewardService,
  ) {}

  /**
   * 将数据库模型转换为 DTO
   */
  private toProgressDto(progress: {
    id: string;
    userId: string;
    guideType: string;
    currentStep: number;
    totalSteps: number;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): OnboardingProgressDto {
    return {
      id: progress.id,
      userId: progress.userId,
      guideType: progress.guideType as GuideType,
      currentStep: progress.currentStep,
      totalSteps: progress.totalSteps,
      completedAt: progress.completedAt,
      createdAt: progress.createdAt,
      updatedAt: progress.updatedAt,
    };
  }

  /**
   * 验证引导类型是否有效
   */
  private validateGuideType(guideType: string): GuideType {
    const upperGuideType = guideType.toUpperCase();
    if (!Object.values(GuideType).includes(upperGuideType as GuideType)) {
      throw new BadRequestException(
        `无效的引导类型: ${guideType}。有效类型: ${Object.values(GuideType).join(', ')}`,
      );
    }
    return upperGuideType as GuideType;
  }

  /**
   * 获取特定引导类型的进度
   * 如果不存在则创建初始进度
   *
   * 需求22验收标准5: WHEN 用户再次触发引导场景 THEN System SHALL 检查是否已完成
   */
  async getProgress(
    userId: string,
    guideType: string,
  ): Promise<GetProgressResponseDto> {
    try {
      const validGuideType = this.validateGuideType(guideType);

      let progress = await this.prisma.onboardingProgress.findUnique({
        where: {
          userId_guideType: {
            userId,
            guideType: validGuideType,
          },
        },
      });

      // 如果不存在，创建初始进度
      if (!progress) {
        progress = await this.prisma.onboardingProgress.create({
          data: {
            userId,
            guideType: validGuideType,
            currentStep: 0,
            totalSteps: GUIDE_TOTAL_STEPS[validGuideType],
          },
        });
        this.logger.log(
          `Created initial onboarding progress for user ${userId}, guide type: ${validGuideType}`,
        );
      }

      return {
        message: '获取引导进度成功',
        progress: this.toProgressDto(progress),
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get onboarding progress: ${errorMessage}`);
      throw new InternalServerErrorException('获取引导进度失败');
    }
  }

  /**
   * 获取用户所有引导进度
   *
   * 需求22验收标准8: THE System SHALL 记录引导完成率用于产品优化分析
   */
  async getAllProgress(userId: string): Promise<GetAllProgressResponseDto> {
    try {
      const progressList = await this.prisma.onboardingProgress.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });

      return {
        message: '获取所有引导进度成功',
        progress: progressList.map((p) => this.toProgressDto(p)),
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get all onboarding progress: ${errorMessage}`,
      );
      throw new InternalServerErrorException('获取所有引导进度失败');
    }
  }

  /**
   * 更新引导进度
   *
   * 需求22验收标准3: WHEN 用户完成引导步骤 THEN System SHALL 自动进入下一步或结束引导
   * 需求22验收标准4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
   */
  async updateProgress(
    userId: string,
    guideType: string,
    step: number,
  ): Promise<UpdateProgressResponseDto> {
    try {
      const validGuideType = this.validateGuideType(guideType);
      const totalSteps = GUIDE_TOTAL_STEPS[validGuideType];

      // 验证步骤范围
      if (step < 0 || step > totalSteps) {
        throw new BadRequestException(
          `步骤必须在 0 到 ${totalSteps} 之间`,
        );
      }

      // 使用 upsert 确保记录存在
      const progress = await this.prisma.onboardingProgress.upsert({
        where: {
          userId_guideType: {
            userId,
            guideType: validGuideType,
          },
        },
        create: {
          userId,
          guideType: validGuideType,
          currentStep: step,
          totalSteps,
          completedAt: step >= totalSteps ? new Date() : null,
        },
        update: {
          currentStep: step,
          completedAt: step >= totalSteps ? new Date() : null,
        },
      });

      this.logger.log(
        `Updated onboarding progress for user ${userId}, guide type: ${validGuideType}, step: ${step}`,
      );

      return {
        message: '更新引导进度成功',
        progress: this.toProgressDto(progress),
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to update onboarding progress: ${errorMessage}`,
      );
      throw new InternalServerErrorException('更新引导进度失败');
    }
  }

  /**
   * 完成引导
   *
   * 需求22验收标准7: WHEN 用户完成所有引导 THEN System SHALL 发放"新手毕业"成就徽章
   *
   * 功能：
   * - 标记引导为完成
   * - 发放单个引导完成奖励（10 零芥子）
   * - 检查是否所有引导都已完成
   * - 如果所有引导完成，发放"新手毕业"成就和额外奖励（50 零芥子）
   */
  async completeGuide(
    userId: string,
    guideType: string,
  ): Promise<CompleteGuideWithRewardResponseDto> {
    try {
      const validGuideType = this.validateGuideType(guideType);
      const totalSteps = GUIDE_TOTAL_STEPS[validGuideType];

      // 使用 upsert 确保记录存在并标记为完成
      const progress = await this.prisma.onboardingProgress.upsert({
        where: {
          userId_guideType: {
            userId,
            guideType: validGuideType,
          },
        },
        create: {
          userId,
          guideType: validGuideType,
          currentStep: totalSteps,
          totalSteps,
          completedAt: new Date(),
        },
        update: {
          currentStep: totalSteps,
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Completed onboarding for user ${userId}, guide type: ${validGuideType}`,
      );

      // 处理奖励发放
      const rewards =
        await this.onboardingRewardService.processGuideCompletionRewards(
          userId,
          validGuideType,
        );

      // 构建响应消息
      let message = '引导已完成';
      if (rewards.guideReward) {
        message += `，获得 ${rewards.guideReward.tokensAwarded} 零芥子`;
      }
      if (rewards.allGuidesReward) {
        message += `，恭喜获得"${rewards.allGuidesReward.achievementName}"成就和 ${rewards.allGuidesReward.tokensAwarded} 零芥子奖励！`;
      }

      return {
        message,
        progress: this.toProgressDto(progress),
        guideReward: rewards.guideReward ?? undefined,
        allGuidesReward: rewards.allGuidesReward ?? undefined,
        allGuidesCompleted: rewards.allGuidesCompleted,
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to complete onboarding: ${errorMessage}`);
      throw new InternalServerErrorException('完成引导失败');
    }
  }

  /**
   * 重置引导进度
   * 用于用户主动查看帮助时重新观看引导
   *
   * 需求22验收标准6: WHEN 用户主动查看帮助 THEN System SHALL 提供重新观看引导的入口
   */
  async resetProgress(
    userId: string,
    guideType: string,
  ): Promise<ResetProgressResponseDto> {
    try {
      const validGuideType = this.validateGuideType(guideType);
      const totalSteps = GUIDE_TOTAL_STEPS[validGuideType];

      // 使用 upsert 确保记录存在并重置
      const progress = await this.prisma.onboardingProgress.upsert({
        where: {
          userId_guideType: {
            userId,
            guideType: validGuideType,
          },
        },
        create: {
          userId,
          guideType: validGuideType,
          currentStep: 0,
          totalSteps,
          completedAt: null,
        },
        update: {
          currentStep: 0,
          completedAt: null,
        },
      });

      this.logger.log(
        `Reset onboarding progress for user ${userId}, guide type: ${validGuideType}`,
      );

      return {
        message: '引导进度已重置',
        progress: this.toProgressDto(progress),
      };
    } catch (error: unknown) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to reset onboarding progress: ${errorMessage}`);
      throw new InternalServerErrorException('重置引导进度失败');
    }
  }
}
