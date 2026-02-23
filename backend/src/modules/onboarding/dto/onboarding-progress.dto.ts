/**
 * 引导类型枚举
 */
export enum GuideType {
  REGISTRATION = 'REGISTRATION',
  HOMEPAGE = 'HOMEPAGE',
  READER = 'READER',
  CREATION = 'CREATION',
}

/**
 * 引导进度数据 DTO
 */
export class OnboardingProgressDto {
  id!: string;
  userId!: string;
  guideType!: GuideType;
  currentStep!: number;
  totalSteps!: number;
  completedAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

/**
 * 获取单个引导进度响应 DTO
 */
export class GetProgressResponseDto {
  message!: string;
  progress!: OnboardingProgressDto;
}

/**
 * 获取所有引导进度响应 DTO
 */
export class GetAllProgressResponseDto {
  message!: string;
  progress!: OnboardingProgressDto[];
}

/**
 * 更新引导进度响应 DTO
 */
export class UpdateProgressResponseDto {
  message!: string;
  progress!: OnboardingProgressDto;
}

/**
 * 完成引导响应 DTO
 */
export class CompleteGuideResponseDto {
  message!: string;
  progress!: OnboardingProgressDto;
}

/**
 * 重置引导进度响应 DTO
 */
export class ResetProgressResponseDto {
  message!: string;
  progress!: OnboardingProgressDto;
}
