/**
 * 赛季系统组件导出
 *
 * 需求25: 赛季排行榜系统
 */

export { SeasonCountdown } from './SeasonCountdown';
export type {
  SeasonCountdownProps,
  CountdownSize,
  CountdownVariant,
  TimeLeft,
} from './SeasonCountdown';

export { LeaderboardCategoryTabs } from './LeaderboardCategoryTabs';
export type {
  LeaderboardCategoryTabsProps,
  TabVariant,
  TabSize,
} from './LeaderboardCategoryTabs';

export {
  LeaderboardList,
  RankBadge,
  UserAvatar,
  TierBadge,
  RankChangeIndicator,
  LeaderboardSkeleton,
} from './LeaderboardList';
export type {
  LeaderboardListProps,
  LeaderboardItemProps,
} from './LeaderboardList';

export {
  MyRankCard,
  TierBadgeLarge,
  TierProgressBar,
  CategoryRankItem,
  PointsBreakdown,
  MyRankCardSkeleton,
} from './MyRankCard';
export type { MyRankCardProps } from './MyRankCard';

export {
  RankChangeAnimation,
  RankChangeSmall,
  RankChangeLarge,
  RankChangeIcon,
  AnimatedNumber,
} from './RankChangeAnimation';
export type {
  RankChangeAnimationProps,
  RankChangeSize,
  RankChangeType,
  AnimatedNumberProps,
} from './RankChangeAnimation';

// 任务25.2.8: 赛季奖励预览页面组件
export {
  SeasonRewardCard,
  SeasonRewardCardSkeleton,
} from './SeasonRewardCard';
export type { SeasonRewardCardProps } from './SeasonRewardCard';

export {
  TierRewardsSection,
  TierRewardsSectionSkeleton,
} from './TierRewardsSection';
export type { TierRewardsSectionProps } from './TierRewardsSection';

// 任务25.2.9: 赛季历史记录页面组件
export {
  SeasonHistoryCard,
  SeasonHistoryCardSkeleton,
} from './SeasonHistoryCard';
export type { SeasonHistoryCardProps } from './SeasonHistoryCard';

// 任务25.2.10: 赛季结算弹窗组件
export {
  SeasonSettlementModal,
  SeasonSettlementModalSkeleton,
} from './SeasonSettlementModal';
export type {
  SeasonSettlementModalProps,
  TierChangeType,
} from './SeasonSettlementModal';
