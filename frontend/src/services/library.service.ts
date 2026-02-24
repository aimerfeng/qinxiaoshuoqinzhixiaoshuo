/**
 * 小说库分支系统 API 服务
 *
 * 需求1: 小说库创建与管理
 * 需求2: 正文分支管理
 * 需求3: 改写分支管理
 * 需求4: 漫画分支管理
 * 需求5: 修订建议系统
 * 需求6: 收益分配系统
 */

import { apiRequest } from '@/lib/api';
import type {
  // Request DTOs
  CreateLibraryDto,
  GetLibrariesQueryDto,
  UpdateLibrarySettingsDto,
  CreateBranchDto,
  GetBranchesQueryDto,
  CreateSuggestionDto,
  AcceptSuggestionDto,
  RejectSuggestionDto,
  TipBranchDto,
  // Response DTOs
  Library,
  LibraryDetail,
  LibraryBranch,
  CreateLibraryResponseDto,
  GetLibrariesResponseDto,
  GetLibraryDetailResponseDto,
  UpdateLibrarySettingsResponseDto,
  CreateBranchResponseDto,
  GetBranchesResponseDto,
  GetBranchDetailResponseDto,
  CreateSuggestionResponseDto,
  GetSuggestionsResponseDto,
  ProcessSuggestionResponseDto,
  TipBranchResponseDto,
  RankingResponseDto,
} from '@/types/library';

/**
 * 构建查询字符串
 */
function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * 小说库 API 服务
 */
export const libraryService = {
  // ==================== Library APIs ====================

  /**
   * 创建小说库
   * POST /api/v1/libraries
   * 需求1.1: 创建包含标题、描述、封面图和库类型的 Library 实体
   */
  async createLibrary(data: CreateLibraryDto): Promise<CreateLibraryResponseDto> {
    return apiRequest<CreateLibraryResponseDto>('post', '/libraries', data);
  },

  /**
   * 获取小说库列表
   * GET /api/v1/libraries
   */
  async getLibraries(params?: GetLibrariesQueryDto): Promise<GetLibrariesResponseDto> {
    const query = buildQueryString(params as Record<string, string | number | boolean | undefined | null> || {});
    const response = await apiRequest<{ data: Library[]; meta?: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } }>('get', `/libraries${query}`);
    
    // Backend returns 'meta', frontend expects 'pagination'
    return {
      data: response.data,
      pagination: response.meta ? {
        page: response.meta.page,
        limit: response.meta.limit,
        total: response.meta.total,
        totalPages: response.meta.totalPages,
        hasNextPage: response.meta.hasNextPage,
        hasPreviousPage: response.meta.hasPreviousPage,
      } : {
        page: 1,
        limit: 20,
        total: response.data.length,
        totalPages: 1,
      },
    };
  },

  /**
   * 获取小说库详情
   * GET /api/v1/libraries/:id
   */
  async getLibraryById(id: string): Promise<LibraryDetail> {
    // apiRequest already extracts response.data.data, so we get the library directly
    return apiRequest<LibraryDetail>('get', `/libraries/${id}`);
  },

  /**
   * 更新小说库设置
   * PATCH /api/v1/libraries/:id/settings
   * 需求1.2: 设置 0-30% 的额外抽成比例
   * 需求1.3: 支持按千字或按漫画页数两种计费模式
   */
  async updateLibrarySettings(
    id: string,
    data: UpdateLibrarySettingsDto,
  ): Promise<UpdateLibrarySettingsResponseDto> {
    return apiRequest<UpdateLibrarySettingsResponseDto>(
      'patch',
      `/libraries/${id}/settings`,
      data,
    );
  },

  // ==================== Branch APIs ====================

  /**
   * 创建分支
   * POST /api/v1/libraries/:id/branches
   * 需求2.1: 创建正文分支，记录分支点和分支创作者
   * 需求3.1: 创建改写分支，要求选择分支类型
   * 需求4.1: 创建漫画分支，要求上传漫画页面图片
   */
  async createBranch(libraryId: string, data: CreateBranchDto): Promise<CreateBranchResponseDto> {
    return apiRequest<CreateBranchResponseDto>('post', `/libraries/${libraryId}/branches`, data);
  },

  /**
   * 获取分支列表
   * GET /api/v1/libraries/:id/branches
   * 需求2.2: 按（点赞数 + 打赏贡献值）降序排序
   */
  async getBranches(libraryId: string, params?: GetBranchesQueryDto): Promise<GetBranchesResponseDto> {
    const query = buildQueryString(params as Record<string, string | number | boolean | undefined | null> || {});
    const response = await apiRequest<{ data: LibraryBranch[]; meta?: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean } }>('get', `/libraries/${libraryId}/branches${query}`);
    
    // Backend returns 'meta', frontend expects 'pagination'
    return {
      data: response.data,
      pagination: response.meta ? {
        page: response.meta.page,
        limit: response.meta.limit,
        total: response.meta.total,
        totalPages: response.meta.totalPages,
      } : {
        page: 1,
        limit: 20,
        total: response.data.length,
        totalPages: 1,
      },
    };
  },

  /**
   * 获取分支详情
   * GET /api/v1/branches/:id
   * 需求2.3: 显示分支创作者信息和分支点位置
   */
  async getBranchById(id: string): Promise<LibraryBranch> {
    // apiRequest already extracts response.data.data, so we get the branch directly
    return apiRequest<LibraryBranch>('get', `/branches/${id}`);
  },

  // ==================== Suggestion APIs ====================

  /**
   * 创建修订建议
   * POST /api/v1/paragraphs/:id/suggestions
   * 需求5.1-5.5: 支持修改段落、前后插入、添加插图
   */
  async createSuggestion(
    paragraphId: string,
    data: CreateSuggestionDto,
  ): Promise<CreateSuggestionResponseDto> {
    return apiRequest<CreateSuggestionResponseDto>(
      'post',
      `/paragraphs/${paragraphId}/suggestions`,
      data,
    );
  },

  /**
   * 获取分支的建议列表
   * GET /api/v1/branches/:id/suggestions
   */
  async getSuggestions(
    branchId: string,
    params?: { page?: number; limit?: number; status?: string },
  ): Promise<GetSuggestionsResponseDto> {
    const query = buildQueryString(params || {});
    return apiRequest<GetSuggestionsResponseDto>('get', `/branches/${branchId}/suggestions${query}`);
  },

  /**
   * 采纳建议
   * PATCH /api/v1/suggestions/:id/accept
   * 需求5.7: 奖励建议提交者贡献积分
   * 需求5.8: 自动生成社区动态卡片
   */
  async acceptSuggestion(
    id: string,
    data?: AcceptSuggestionDto,
  ): Promise<ProcessSuggestionResponseDto> {
    return apiRequest<ProcessSuggestionResponseDto>('patch', `/suggestions/${id}/accept`, data);
  },

  /**
   * 拒绝建议
   * PATCH /api/v1/suggestions/:id/reject
   */
  async rejectSuggestion(
    id: string,
    data?: RejectSuggestionDto,
  ): Promise<ProcessSuggestionResponseDto> {
    return apiRequest<ProcessSuggestionResponseDto>('patch', `/suggestions/${id}/reject`, data);
  },

  // ==================== Tip API ====================

  /**
   * 打赏分支
   * POST /api/v1/branches/:id/tip
   * 需求6.1: 按比例分配收益给平台、库拥有者、分支创作者
   */
  async tipBranch(branchId: string, data: TipBranchDto): Promise<TipBranchResponseDto> {
    return apiRequest<TipBranchResponseDto>('post', `/branches/${branchId}/tip`, data);
  },

  // ==================== Ranking API ====================

  /**
   * 获取热度排行榜
   * GET /api/v1/libraries/ranking
   * 需求7.5: 展示 Top 100 小说库
   */
  async getRanking(params?: { limit?: number }): Promise<RankingResponseDto> {
    const query = buildQueryString(params || {});
    return apiRequest<RankingResponseDto>('get', `/libraries/ranking${query}`);
  },
};

export default libraryService;
