/**
 * 用户主页数据 DTO
 * 需求17: 用户个人中心 - 用户主页数据 API
 *
 * 用于展示用户公开主页的综合信息
 */

import { MemberLevel, Gender } from '@prisma/client';

/**
 * 用户基础信息
 */
export interface UserBasicInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  bio: string | null;
  createdAt: Date;
}

/**
 * 用户统计数据
 */
export interface UserStatistics {
  /** 已发布作品数 */
  totalWorks: number;
  /** 总章节数 */
  totalChapters: number;
  /** 总字数 */
  totalWordCount: number;
  /** 粉丝数 */
  totalFollowers: number;
  /** 关注数 */
  totalFollowing: number;
  /** 获得的总点赞数 */
  totalLikesReceived: number;
  /** 作品总阅读量 */
  totalViewsReceived: number;
}

/**
 * 会员信息
 */
export interface MembershipInfo {
  /** 会员等级 */
  level: MemberLevel;
  /** 贡献度积分 */
  contributionScore: number;
}

/**
 * 成就徽章信息
 */
export interface AchievementBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
}

/**
 * 用户主页响应 DTO
 */
export interface UserPublicProfileResponseDto {
  /** 用户基础信息 */
  user: UserBasicInfo;
  /** 用户统计数据 */
  statistics: UserStatistics;
  /** 会员信息 */
  membership: MembershipInfo;
  /** 最近获得的成就徽章（最多5个） */
  recentBadges: AchievementBadge[];
  /** 当前用户是否关注了该用户（仅认证用户可见） */
  isFollowing: boolean | null;
  /** 是否是创作者（有发布过作品） */
  isCreator: boolean;
  /** 用户资料扩展信息 */
  profile: {
    backgroundImage: string | null;
    website: string | null;
    location: string | null;
    gender: Gender | null;
  } | null;
}
