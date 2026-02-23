/**
 * 引导奖励相关 DTO
 *
 * 需求22验收标准7: WHEN 用户完成所有引导 THEN System SHALL 发放"新手毕业"成就徽章
 */

/**
 * 单个引导完成奖励信息
 */
export class GuideCompletionRewardDto {
  /** 引导类型 */
  guideType!: string;
  /** 奖励的零芥子数量 */
  tokensAwarded!: number;
  /** 奖励描述 */
  description!: string;
}

/**
 * 所有引导完成奖励信息
 */
export class AllGuidesCompletionRewardDto {
  /** 奖励的零芥子数量 */
  tokensAwarded!: number;
  /** 成就徽章名称 */
  achievementName!: string;
  /** 奖励描述 */
  description!: string;
}

/**
 * 完成引导响应 DTO（含奖励信息）
 */
export class CompleteGuideWithRewardResponseDto {
  /** 响应消息 */
  message!: string;
  /** 引导进度信息 */
  progress!: {
    id: string;
    userId: string;
    guideType: string;
    currentStep: number;
    totalSteps: number;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  /** 单个引导完成奖励 */
  guideReward?: GuideCompletionRewardDto;
  /** 所有引导完成奖励（仅当所有引导都完成时） */
  allGuidesReward?: AllGuidesCompletionRewardDto;
  /** 是否所有引导都已完成 */
  allGuidesCompleted!: boolean;
}

/**
 * 检查所有引导完成状态响应 DTO
 */
export class CheckAllGuidesCompletedResponseDto {
  /** 是否所有引导都已完成 */
  allCompleted!: boolean;
  /** 已完成的引导类型列表 */
  completedGuides!: string[];
  /** 未完成的引导类型列表 */
  pendingGuides!: string[];
  /** 完成进度百分比 */
  completionPercentage!: number;
}
