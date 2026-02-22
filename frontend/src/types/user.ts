/**
 * 用户个人中心类型定义
 *
 * 需求17: 用户个人中心
 * 任务17.2.1: 个人主页布局
 */

import type { Work, PaginationMeta } from './index';
import type { MemberLevel } from './membership';

/**
 * 用户主页数据
 */
export interface UserProfileData {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  backgroundImage: string | null;
  membershipLevel: MemberLevel | string;
  contributionScore: number;
  isEmailVerified: boolean;
  createdAt: string;
  stats: UserStats;
  isFollowing?: boolean;
  isOwnProfile?: boolean;
}

/**
 * 用户统计数据
 */
export interface UserStats {
  followersCount: number;
  followingCount: number;
  worksCount: number;
  likesCount: number;
  totalReadCount: number;
  totalReadTime: number; // 分钟
}

/**
 * 用户动态类型枚举（与后端保持一致）
 */
export enum UserActivityType {
  WORK_PUBLISHED = 'WORK_PUBLISHED',
  CHAPTER_PUBLISHED = 'CHAPTER_PUBLISHED',
  CARD_POSTED = 'CARD_POSTED',
  COMMENT_POSTED = 'COMMENT_POSTED',
  WORK_LIKED = 'WORK_LIKED',
  CARD_LIKED = 'CARD_LIKED',
  ACTIVITY_JOINED = 'ACTIVITY_JOINED',
  ACHIEVEMENT_EARNED = 'ACHIEVEMENT_EARNED',
}

/**
 * 活动关联 - 作品信息
 */
export interface ActivityWorkInfo {
  id: string;
  title: string;
  coverImage: string | null;
}

/**
 * 活动关联 - 章节信息
 */
export interface ActivityChapterInfo {
  id: string;
  title: string;
  workId: string;
  workTitle: string;
}

/**
 * 活动关联 - 卡片信息
 */
export interface ActivityCardInfo {
  id: string;
  contentPreview: string;
}

/**
 * 活动关联 - 评论信息
 */
export interface ActivityCommentInfo {
  id: string;
  contentPreview: string;
  cardId: string;
}

/**
 * 活动关联 - 社区活动信息
 */
export interface ActivityEventInfo {
  id: string;
  title: string;
  coverImage: string | null;
}

/**
 * 活动关联 - 目标用户信息
 */
export interface ActivityTargetUserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 用户动态项（与后端 UserActivityItem 对应）
 */
export interface UserActivity {
  id: string;
  type: UserActivityType;
  typeName: string;
  createdAt: string;
  work?: ActivityWorkInfo;
  chapter?: ActivityChapterInfo;
  card?: ActivityCardInfo;
  comment?: ActivityCommentInfo;
  activity?: ActivityEventInfo;
  targetUser?: ActivityTargetUserInfo;
}

/**
 * 关注/粉丝用户项
 */
export interface FollowUser {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  membershipLevel: MemberLevel | string;
  isFollowing: boolean;
  followedAt: string;
}

/**
 * 收藏作品项
 */
export interface FavoriteWork {
  id: string;
  work: Work;
  addedAt: string;
  lastReadAt: string | null;
  readProgress: number; // 0-100
  hasUpdate: boolean;
}

/**
 * 阅读统计数据
 */
export interface ReadingStats {
  totalReadTime: number;        // 总阅读时长（分钟）
  totalChaptersRead: number;    // 总阅读章节数
  totalWorksRead: number;       // 总阅读作品数
  currentStreak: number;        // 当前连续阅读天数
  longestStreak: number;        // 最长连续阅读天数
  favoriteCategories: CategoryStat[];
  weeklyReadTime: number[];     // 最近7天每日阅读时长
  monthlyReadTime: number[];    // 最近30天每日阅读时长
}

/**
 * 分类统计
 */
export interface CategoryStat {
  category: string;
  count: number;
  percentage: number;
}

/**
 * 成就徽章
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  unlockedAt: string | null;
  progress: number;
  maxProgress: number;
}

/**
 * 成就分类
 */
export type AchievementCategory =
  | 'reading'     // 阅读成就
  | 'creation'    // 创作成就
  | 'social'      // 社交成就
  | 'collection'  // 收藏成就
  | 'special';    // 特殊成就

/**
 * 成就稀有度
 */
export type AchievementRarity =
  | 'common'      // 普通
  | 'rare'        // 稀有
  | 'epic'        // 史诗
  | 'legendary';  // 传说

// ==================== API 响应类型 ====================

/**
 * 获取用户主页数据响应
 */
export interface GetUserProfileResponse {
  success: boolean;
  data: UserProfileData;
}

/**
 * 获取用户动态列表响应
 */
export interface GetUserActivitiesResponse {
  success: boolean;
  data: UserActivity[];
  meta: PaginationMeta;
}

/**
 * 获取关注/粉丝列表响应
 */
export interface GetFollowListResponse {
  success: boolean;
  data: FollowUser[];
  meta: PaginationMeta;
}

/**
 * 获取收藏列表响应
 */
export interface GetFavoritesResponse {
  success: boolean;
  data: FavoriteWork[];
  meta: PaginationMeta;
}

/**
 * 获取阅读统计响应
 */
export interface GetReadingStatsResponse {
  success: boolean;
  data: ReadingStats;
}

/**
 * 获取成就列表响应
 */
export interface GetAchievementsResponse {
  success: boolean;
  data: Achievement[];
}

/**
 * 关注/取消关注响应
 */
export interface FollowResponse {
  success: boolean;
  data: {
    isFollowing: boolean;
    followersCount: number;
  };
}

// ==================== Tab 类型 ====================

/**
 * 个人主页 Tab 类型
 */
export type ProfileTab = 'activities' | 'works' | 'favorites' | 'following' | 'followers' | 'stats';

/**
 * Tab 配置
 */
export interface ProfileTabConfig {
  key: ProfileTab;
  label: string;
  icon: string;
  requiresCreator?: boolean;
}

/**
 * 默认 Tab 配置
 */
export const PROFILE_TABS: ProfileTabConfig[] = [
  { key: 'activities', label: '动态', icon: '📝' },
  { key: 'works', label: '作品', icon: '📚', requiresCreator: true },
  { key: 'favorites', label: '收藏', icon: '⭐' },
  { key: 'stats', label: '统计', icon: '📊' },
  { key: 'following', label: '关注', icon: '👥' },
  { key: 'followers', label: '粉丝', icon: '💫' },
];
