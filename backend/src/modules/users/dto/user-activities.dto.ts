/**
 * 用户动态列表 DTO
 * 需求17: 用户个人中心 - 动态列表 API
 *
 * 用于展示用户的最近活动动态
 */

import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 活动类型枚举
 */
export enum UserActivityType {
  WORK_PUBLISHED = 'WORK_PUBLISHED', // 发布新作品
  CHAPTER_PUBLISHED = 'CHAPTER_PUBLISHED', // 发布新章节
  CARD_POSTED = 'CARD_POSTED', // 发布广场卡片
  COMMENT_POSTED = 'COMMENT_POSTED', // 发布评论
  WORK_LIKED = 'WORK_LIKED', // 点赞作品
  CARD_LIKED = 'CARD_LIKED', // 点赞卡片
  ACTIVITY_JOINED = 'ACTIVITY_JOINED', // 参与活动
  ACHIEVEMENT_EARNED = 'ACHIEVEMENT_EARNED', // 获得成就（预留）
}

/**
 * 活动类型中文名称映射
 */
export const USER_ACTIVITY_TYPE_NAMES: Record<UserActivityType, string> = {
  [UserActivityType.WORK_PUBLISHED]: '发布了新作品',
  [UserActivityType.CHAPTER_PUBLISHED]: '发布了新章节',
  [UserActivityType.CARD_POSTED]: '发布了动态',
  [UserActivityType.COMMENT_POSTED]: '发表了评论',
  [UserActivityType.WORK_LIKED]: '点赞了作品',
  [UserActivityType.CARD_LIKED]: '点赞了动态',
  [UserActivityType.ACTIVITY_JOINED]: '参与了活动',
  [UserActivityType.ACHIEVEMENT_EARNED]: '获得了成就',
};

/**
 * 用户动态查询参数 DTO
 */
export class UserActivitiesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(UserActivityType))
  type?: UserActivityType;
}

/**
 * 关联实体信息 - 作品
 */
export interface ActivityWorkInfo {
  id: string;
  title: string;
  coverImage: string | null;
}

/**
 * 关联实体信息 - 章节
 */
export interface ActivityChapterInfo {
  id: string;
  title: string;
  workId: string;
  workTitle: string;
}

/**
 * 关联实体信息 - 卡片
 */
export interface ActivityCardInfo {
  id: string;
  contentPreview: string; // 内容预览（截取前100字）
}

/**
 * 关联实体信息 - 评论
 */
export interface ActivityCommentInfo {
  id: string;
  contentPreview: string;
  cardId: string;
}

/**
 * 关联实体信息 - 活动
 */
export interface ActivityEventInfo {
  id: string;
  title: string;
  coverImage: string | null;
}

/**
 * 目标用户信息（被点赞的用户等）
 */
export interface ActivityTargetUserInfo {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 单条用户动态
 */
export interface UserActivityItem {
  id: string;
  type: UserActivityType;
  typeName: string;
  createdAt: Date;
  /** 关联的作品信息 */
  work?: ActivityWorkInfo;
  /** 关联的章节信息 */
  chapter?: ActivityChapterInfo;
  /** 关联的卡片信息 */
  card?: ActivityCardInfo;
  /** 关联的评论信息 */
  comment?: ActivityCommentInfo;
  /** 关联的活动信息 */
  activity?: ActivityEventInfo;
  /** 目标用户信息（如被点赞的作品作者） */
  targetUser?: ActivityTargetUserInfo;
}

/**
 * 分页信息
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 用户动态列表响应 DTO
 */
export interface UserActivitiesResponseDto {
  activities: UserActivityItem[];
  pagination: PaginationInfo;
}
