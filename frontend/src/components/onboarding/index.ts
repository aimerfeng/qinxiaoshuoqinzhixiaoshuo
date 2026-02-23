/**
 * 新手引导组件导出
 *
 * 需求22: 新手引导系统
 * 任务22.2.1: 引导组件（高亮遮罩、气泡）
 * 任务22.2.2: 注册引导流程
 * 任务22.2.3: 首页引导流程
 * 任务22.2.4: 阅读器引导流程
 * 任务22.2.5: 创作引导流程
 * 任务22.2.6: 引导进度管理
 */

// 基础组件
export { default as OnboardingOverlay } from './OnboardingOverlay';
export { default as OnboardingTooltip } from './OnboardingTooltip';
export { default as OnboardingStep } from './OnboardingStep';
export { default as OnboardingTour } from './OnboardingTour';

// 引导流程组件
export { default as RegistrationOnboarding } from './RegistrationOnboarding';
export { default as HomepageOnboarding } from './HomepageOnboarding';
export { default as ReaderOnboarding } from './ReaderOnboarding';
export { default as CreatorOnboarding } from './CreatorOnboarding';

// 进度管理组件
export { default as OnboardingProgressCard } from './OnboardingProgressCard';
export { default as OnboardingGuideList } from './OnboardingGuideList';
export { default as OnboardingRewardsSection } from './OnboardingRewardsSection';
export { default as OnboardingProgressModal } from './OnboardingProgressModal';

// 引导配置
export {
  // 注册引导
  registrationSteps,
  createRegistrationTourConfig,
  REGISTRATION_STEP_IDS,
  REGISTRATION_DATA_ATTRIBUTES,
  // 首页引导
  homepageSteps,
  createHomepageTourConfig,
  HOMEPAGE_STEP_IDS,
  HOMEPAGE_DATA_ATTRIBUTES,
  // 阅读器引导
  readerSteps,
  createReaderTourConfig,
  READER_STEP_IDS,
  READER_DATA_ATTRIBUTES,
  // 创作者引导
  creatorSteps,
  createCreatorTourConfig,
  CREATOR_STEP_IDS,
  CREATOR_DATA_ATTRIBUTES,
} from './tours';
