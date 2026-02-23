import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OnboardingService } from './onboarding.service.js';
import {
  UpdateProgressDto,
  GetProgressResponseDto,
  GetAllProgressResponseDto,
  UpdateProgressResponseDto,
  ResetProgressResponseDto,
  CompleteGuideWithRewardResponseDto,
} from './dto/index.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

/**
 * 新手引导控制器
 * 处理用户引导进度相关的 HTTP 请求
 *
 * 需求22: 新手引导系统
 *
 * API 端点：
 * - GET /api/v1/onboarding - 获取所有引导进度
 * - GET /api/v1/onboarding/:guideType - 获取特定引导类型的进度
 * - PATCH /api/v1/onboarding/:guideType - 更新引导进度
 * - POST /api/v1/onboarding/:guideType/complete - 标记引导为完成
 * - POST /api/v1/onboarding/:guideType/reset - 重置引导进度
 */
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  /**
   * 获取所有引导进度
   * GET /api/v1/onboarding
   *
   * 需求22验收标准8: THE System SHALL 记录引导完成率用于产品优化分析
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllProgress(
    @Request() req: { user: { userId: string } },
  ): Promise<GetAllProgressResponseDto> {
    const userId = req.user.userId;
    return this.onboardingService.getAllProgress(userId);
  }

  /**
   * 获取特定引导类型的进度
   * GET /api/v1/onboarding/:guideType
   *
   * @param guideType 引导类型 (REGISTRATION, HOMEPAGE, READER, CREATION)
   *
   * 需求22验收标准5: WHEN 用户再次触发引导场景 THEN System SHALL 检查是否已完成
   */
  @Get(':guideType')
  @HttpCode(HttpStatus.OK)
  async getProgress(
    @Request() req: { user: { userId: string } },
    @Param('guideType') guideType: string,
  ): Promise<GetProgressResponseDto> {
    const userId = req.user.userId;
    return this.onboardingService.getProgress(userId, guideType);
  }

  /**
   * 更新引导进度
   * PATCH /api/v1/onboarding/:guideType
   *
   * @param guideType 引导类型 (REGISTRATION, HOMEPAGE, READER, CREATION)
   * @param updateProgressDto 更新数据，包含当前步骤
   *
   * 需求22验收标准3: WHEN 用户完成引导步骤 THEN System SHALL 自动进入下一步或结束引导
   * 需求22验收标准4: WHEN 用户点击"跳过" THEN System SHALL 结束当前引导并记录进度
   */
  @Patch(':guideType')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateProgress(
    @Request() req: { user: { userId: string } },
    @Param('guideType') guideType: string,
    @Body() updateProgressDto: UpdateProgressDto,
  ): Promise<UpdateProgressResponseDto> {
    const userId = req.user.userId;
    return this.onboardingService.updateProgress(
      userId,
      guideType,
      updateProgressDto.step,
    );
  }

  /**
   * 标记引导为完成
   * POST /api/v1/onboarding/:guideType/complete
   *
   * @param guideType 引导类型 (REGISTRATION, HOMEPAGE, READER, CREATION)
   *
   * 需求22验收标准7: WHEN 用户完成所有引导 THEN System SHALL 发放"新手毕业"成就徽章
   *
   * 奖励机制：
   * - 单个引导完成：10 零芥子
   * - 所有引导完成：额外 50 零芥子 + "新手毕业"成就
   */
  @Post(':guideType/complete')
  @HttpCode(HttpStatus.OK)
  async completeGuide(
    @Request() req: { user: { userId: string } },
    @Param('guideType') guideType: string,
  ): Promise<CompleteGuideWithRewardResponseDto> {
    const userId = req.user.userId;
    return this.onboardingService.completeGuide(userId, guideType);
  }

  /**
   * 重置引导进度
   * POST /api/v1/onboarding/:guideType/reset
   *
   * @param guideType 引导类型 (REGISTRATION, HOMEPAGE, READER, CREATION)
   *
   * 需求22验收标准6: WHEN 用户主动查看帮助 THEN System SHALL 提供重新观看引导的入口
   */
  @Post(':guideType/reset')
  @HttpCode(HttpStatus.OK)
  async resetProgress(
    @Request() req: { user: { userId: string } },
    @Param('guideType') guideType: string,
  ): Promise<ResetProgressResponseDto> {
    const userId = req.user.userId;
    return this.onboardingService.resetProgress(userId, guideType);
  }
}
