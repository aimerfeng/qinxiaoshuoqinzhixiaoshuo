/**
 * 小说库分支系统类型定义
 *
 * 需求1: 小说库创建与管理
 * 需求2: 正文分支管理
 * 需求3: 改写分支管理
 * 需求4: 漫画分支管理
 * 需求5: 修订建议系统
 * 需求6: 收益分配系统
 */

// ==================== 枚举类型 ====================

/**
 * 小说库类型
 * - ORIGINAL: 原创库 - 仅库拥有者可发布正文主线
 * - SHARED: 共享库 - 所有用户可上传分支
 */
export type LibraryType = 'ORIGINAL' | 'SHARED';

/**
 * 分支类型
 * - MAIN: 正文分支 - 原创内容或续写
 * - DERIVATIVE: 改写分支 - 同人/IF线/改编
 * - MANGA: 漫画分支 - 漫画改编版本
 */
export type BranchType = 'MAIN' | 'DERIVATIVE' | 'MANGA';

/**
 * 改写分支子类型
 * - FANFIC: 同人
 * - IF_LINE: IF线
 * - ADAPTATION: 改编
 */
export type DerivativeType = 'FANFIC' | 'IF_LINE' | 'ADAPTATION';

/**
 * 上传费用类型
 * - PER_THOUSAND_WORDS: 按千字计费
 * - PER_PAGE: 按页数计费（漫画用）
 */
export type UploadFeeType = 'PER_THOUSAND_WORDS' | 'PER_PAGE';

/**
 * 修订建议类型
 * - MODIFY: 修改段落内容
 * - INSERT_BEFORE: 在段落前插入
 * - INSERT_AFTER: 在段落后插入
 * - ADD_IMAGE: 添加插图
 */
export type SuggestionType = 'MODIFY' | 'INSERT_BEFORE' | 'INSERT_AFTER' | 'ADD_IMAGE';

/**
 * 修订建议状态
 * - PENDING: 待审核
 * - ACCEPTED: 已采纳
 * - REJECTED: 已拒绝
 */
export type SuggestionStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

/**
 * 分支交易类型
 * - UPLOAD_FEE: 上传费用
 * - TIP: 打赏
 */
export type BranchTransactionType = 'UPLOAD_FEE' | 'TIP';

// ==================== 枚举显示名称映射 ====================

export const LIBRARY_TYPE_NAMES: Record<LibraryType, string> = {
  ORIGINAL: '原创库',
  SHARED: '共享库',
};

export const BRANCH_TYPE_NAMES: Record<BranchType, string> = {
  MAIN: '正文分支',
  DERIVATIVE: '改写分支',
  MANGA: '漫画分支',
};

export const DERIVATIVE_TYPE_NAMES: Record<DerivativeType, string> = {
  FANFIC: '同人',
  IF_LINE: 'IF线',
  ADAPTATION: '改编',
};

export const SUGGESTION_TYPE_NAMES: Record<SuggestionType, string> = {
  MODIFY: '修改内容',
  INSERT_BEFORE: '前插段落',
  INSERT_AFTER: '后插段落',
  ADD_IMAGE: '添加插图',
};

export const SUGGESTION_STATUS_NAMES: Record<SuggestionStatus, string> = {
  PENDING: '待审核',
  ACCEPTED: '已采纳',
  REJECTED: '已拒绝',
};

// ==================== 基础类型 ====================

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

// ==================== 主要实体类型 ====================

/**
 * 小说库
 * 需求1.1: 创建包含标题、描述、封面图和库类型的 Library 实体
 */
export interface Library {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  libraryType: LibraryType;
  owner: OwnerBrief;
  stats: LibraryStats;
  settings: LibrarySettings;
  workId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 小说库详情（包含关联作品信息）
 */
export interface LibraryDetail extends Library {
  work: {
    id: string;
    title: string;
    description: string | null;
    coverImage: string | null;
  };
}

/**
 * 分支创作者简要信息
 */
export interface CreatorBrief {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 分支点信息
 */
export interface ForkPoint {
  chapterId: string | null;
  chapterTitle: string | null;
  paragraphId: string | null;
  paragraphContent: string | null;
}

/**
 * 分支统计信息
 */
export interface BranchStats {
  likeCount: number;
  tipAmount: number;
  viewCount: number;
  hotScore: number;
}

/**
 * 小说库分支
 * 需求2.1: 记录分支点和分支创作者
 * 需求3.1: 支持改写分支类型
 * 需求4.1: 支持漫画分支
 */
export interface LibraryBranch {
  id: string;
  libraryId: string;
  creator: CreatorBrief;
  workId: string;
  branchType: BranchType;
  derivativeType: DerivativeType | null;
  forkPoint: ForkPoint;
  stats: BranchStats;
  title: string;
  description: string | null;
  coverImage: string | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * 建议提交者简要信息
 */
export interface SuggesterBrief {
  id: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
}

/**
 * 修订建议
 * 需求5: 段落级修订建议
 */
export interface ContentSuggestion {
  id: string;
  branchId: string;
  paragraphId: string;
  suggester: SuggesterBrief;
  suggestionType: SuggestionType;
  status: SuggestionStatus;
  suggestedContent: string | null;
  imageUrl: string | null;
  rewardAmount: number;
  reviewedAt: string | null;
  reviewNote: string | null;
  cardId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * 分支交易
 * 需求6: 收益分配记录
 */
export interface BranchTransaction {
  id: string;
  branchId: string;
  userId: string;
  transactionType: BranchTransactionType;
  totalAmount: number;
  platformAmount: number;
  ownerAmount: number;
  creatorAmount: number;
  message: string | null;
  createdAt: string;
}

// ==================== API 请求 DTO ====================

/**
 * 创建小说库请求
 * 需求1.1-1.3
 */
export interface CreateLibraryDto {
  workId: string;
  title: string;
  description?: string;
  coverImage?: string;
  libraryType: LibraryType;
  ownerCutPercent?: number;
  uploadFeeType?: UploadFeeType;
  uploadFeeRate?: number;
}

/**
 * 获取小说库列表查询参数
 */
export interface GetLibrariesQueryDto {
  page?: number;
  limit?: number;
  sortBy?: 'hotScore' | 'createdAt' | 'branchCount';
  sortOrder?: 'asc' | 'desc';
  libraryType?: LibraryType;
  ownerId?: string;
}

/**
 * 更新小说库设置请求
 * 需求1.2-1.3
 */
export interface UpdateLibrarySettingsDto {
  ownerCutPercent?: number;
  uploadFeeType?: UploadFeeType;
  uploadFeeRate?: number;
}

/**
 * 创建分支请求
 * 需求2.1, 3.1, 4.1
 */
export interface CreateBranchDto {
  branchType: BranchType;
  derivativeType?: DerivativeType;
  forkFromChapterId?: string;
  forkFromParagraphId?: string;
  title: string;
  description?: string;
  coverImage?: string;
  readingDirection?: 'LTR' | 'RTL';
  wordCount?: number;
  pageCount?: number;
  pageUrls?: string[];
}

/**
 * 获取分支列表查询参数
 */
export interface GetBranchesQueryDto {
  page?: number;
  limit?: number;
  branchType?: BranchType;
  sortBy?: 'hotScore' | 'createdAt' | 'likeCount' | 'tipAmount';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 创建修订建议请求
 * 需求5.1-5.5
 */
export interface CreateSuggestionDto {
  branchId: string;
  suggestionType: SuggestionType;
  suggestedContent?: string;
  imageUrl?: string;
}

/**
 * 采纳建议请求
 * 需求5.7-5.8
 */
export interface AcceptSuggestionDto {
  rewardAmount?: number;
  publishCard?: boolean;
  cardContent?: string;
}

/**
 * 拒绝建议请求
 */
export interface RejectSuggestionDto {
  reviewNote?: string;
}

/**
 * 打赏分支请求
 * 需求6.1
 */
export interface TipBranchDto {
  amount: number;
  message?: string;
}

// ==================== API 响应 DTO ====================

/**
 * 创建小说库响应
 */
export interface CreateLibraryResponseDto {
  message: string;
  library: Library;
}

/**
 * 获取小说库列表响应
 */
export interface GetLibrariesResponseDto {
  data: Library[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
  // Backend returns 'meta' instead of 'pagination'
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

/**
 * 获取小说库详情响应
 */
export interface GetLibraryDetailResponseDto {
  data: LibraryDetail;
}

/**
 * 更新小说库设置响应
 */
export interface UpdateLibrarySettingsResponseDto {
  message: string;
  library: Library;
}

/**
 * 创建分支响应
 */
export interface CreateBranchResponseDto {
  message: string;
  branch: LibraryBranch;
  uploadFee?: {
    totalAmount: number;
    ownerAmount: number;
    platformAmount: number;
  };
}

/**
 * 获取分支列表响应
 */
export interface GetBranchesResponseDto {
  data: LibraryBranch[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 获取分支详情响应
 */
export interface GetBranchDetailResponseDto {
  data: LibraryBranch;
}

/**
 * 创建建议响应
 */
export interface CreateSuggestionResponseDto {
  message: string;
  suggestion: ContentSuggestion;
}

/**
 * 获取建议列表响应
 */
export interface GetSuggestionsResponseDto {
  data: ContentSuggestion[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * 采纳/拒绝建议响应
 */
export interface ProcessSuggestionResponseDto {
  message: string;
  suggestion: ContentSuggestion;
}

/**
 * 打赏分支响应
 * 需求6.1-6.4
 */
export interface TipBranchResponseDto {
  message: string;
  transaction: {
    id: string;
    totalAmount: number;
    platformAmount: number;
    ownerAmount: number;
    creatorAmount: number;
  };
}

/**
 * 排行榜项目
 * 需求7.5: 热度排行榜展示
 */
export interface RankingItem {
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
 * 热度排行榜响应
 */
export interface RankingResponseDto {
  data: RankingItem[];
  total: number;
}

// ==================== 组件 Props 类型 ====================

/**
 * LibraryCard 组件属性
 */
export interface LibraryCardProps {
  library: Library;
  rank?: number;
  onClick?: () => void;
}

/**
 * BranchList 组件属性
 */
export interface BranchListProps {
  libraryId: string;
  initialTab?: BranchType;
}

/**
 * SuggestionSidebar 组件属性
 */
export interface SuggestionSidebarProps {
  paragraph: {
    id: string;
    content: string;
    anchorId: string;
  };
  branchId: string;
  onClose: () => void;
  onSubmit: (suggestion: CreateSuggestionDto) => Promise<void>;
}

/**
 * BranchCreator 组件属性
 */
export interface BranchCreatorProps {
  libraryId: string;
  forkPoint?: {
    chapterId: string;
    paragraphId?: string;
  };
  onSuccess: (branch: LibraryBranch) => void;
  onCancel: () => void;
}

/**
 * RevenueSettings 组件属性
 */
export interface RevenueSettingsProps {
  library: {
    id: string;
    ownerCutPercent: number;
    uploadFeeType: UploadFeeType;
    uploadFeeRate: number;
  };
  onSave: (settings: UpdateLibrarySettingsDto) => Promise<void>;
}
