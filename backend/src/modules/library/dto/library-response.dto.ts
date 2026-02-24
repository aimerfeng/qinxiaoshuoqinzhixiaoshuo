import { LibraryType, UploadFeeType } from '@prisma/client';

/**
 * 库拥有者简要信息
 */
export interface OwnerBrief {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 小说库统计信息
 */
export interface LibraryStats {
  hotScore: number;
  branchCount: number;
  totalTipAmount: number;
}

/**
 * 小说库设置信息
 */
export interface LibrarySettings {
  ownerCutPercent: number;
  uploadFeeType: UploadFeeType;
  uploadFeeRate: number;
}

/**
 * 小说库响应 DTO
 * 用于返回小说库列表和详情
 *
 * 需求1验收标准1: 创建包含标题、描述、封面图和库类型的 Library 实体
 */
export interface LibraryResponseDto {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  libraryType: LibraryType;
  owner: OwnerBrief;
  stats: LibraryStats;
  settings: LibrarySettings;
  workId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 小说库详情响应 DTO
 * 包含关联作品的基本信息
 */
export interface LibraryDetailResponseDto extends LibraryResponseDto {
  work: {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
  };
}

/**
 * 创建小说库响应 DTO
 */
export interface CreateLibraryResponseDto {
  message: string;
  library: LibraryResponseDto;
}

/**
 * 更新小说库设置响应 DTO
 */
export interface UpdateLibrarySettingsResponseDto {
  message: string;
  library: LibraryResponseDto;
}

/**
 * 排行榜项目 DTO
 * 用于热度排行榜展示
 *
 * 需求7验收标准5: THE Ranking_System SHALL 提供热度排行榜页面，展示 Top 100 小说库
 */
export interface RankingItemDto {
  rank: number;
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  owner: OwnerBrief;
  hotScore: number;
  branchCount: number;
}

/**
 * 热度排行榜响应 DTO
 */
export interface RankingResponseDto {
  data: RankingItemDto[];
  total: number;
}
