/**
 * 成就系统组件导出
 *
 * 需求24: 成就系统
 */

export { AchievementCategoryNav } from './AchievementCategoryNav';
export type { AchievementCategoryNavProps, CategoryStats } from './AchievementCategoryNav';

export { AchievementCard } from './AchievementCard';
export type { AchievementCardProps } from './AchievementCard';

export { HiddenAchievementCard } from './HiddenAchievementCard';
export type { HiddenAchievementCardProps } from './HiddenAchievementCard';

export { AchievementDetailModal } from './AchievementDetailModal';
export type { AchievementDetailModalProps } from './AchievementDetailModal';

export { AchievementUnlockAnimation } from './AchievementUnlockAnimation';
export type { AchievementUnlockAnimationProps } from './AchievementUnlockAnimation';

export { AchievementClaimRewardModal } from './AchievementClaimRewardModal';
export type { AchievementClaimRewardModalProps } from './AchievementClaimRewardModal';

export {
  AchievementClaimProvider,
  useAchievementClaim,
} from './AchievementClaimContext';
export type {
  AchievementClaimContextValue,
  AchievementClaimProviderProps,
  ClaimResult,
  ClaimStatus,
} from './AchievementClaimContext';

// 成就进度通知组件 (任务24.2.9)
export {
  AchievementProgressToast,
  createAchievementNotification,
  createNotificationFromEvent,
} from './AchievementProgressToast';
export type {
  AchievementProgressToastProps,
  AchievementNotification,
  AchievementNotificationType,
  ToastPosition,
} from './AchievementProgressToast';

// 成就通知 Provider (任务24.2.9)
export {
  AchievementNotificationProvider,
  useAchievementNotificationContext,
} from './AchievementNotificationProvider';
export type {
  AchievementNotificationContextValue,
  AchievementNotificationProviderProps,
} from './AchievementNotificationProvider';
