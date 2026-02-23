/**
 * 引导流程配置导出
 *
 * 需求22: 新手引导系统
 * 任务22.2.2: 注册引导流程
 * 任务22.2.3: 首页引导流程
 * 任务22.2.4: 阅读器引导流程
 * 任务22.2.5: 创作引导流程
 */

export {
  registrationSteps,
  createRegistrationTourConfig,
  REGISTRATION_STEP_IDS,
  REGISTRATION_DATA_ATTRIBUTES,
} from './registration-tour';

export {
  homepageSteps,
  createHomepageTourConfig,
  HOMEPAGE_STEP_IDS,
  HOMEPAGE_DATA_ATTRIBUTES,
} from './homepage-tour';

export {
  readerSteps,
  createReaderTourConfig,
  READER_STEP_IDS,
  READER_DATA_ATTRIBUTES,
} from './reader-tour';

export {
  creatorSteps,
  createCreatorTourConfig,
  CREATOR_STEP_IDS,
  CREATOR_DATA_ATTRIBUTES,
} from './creator-tour';
