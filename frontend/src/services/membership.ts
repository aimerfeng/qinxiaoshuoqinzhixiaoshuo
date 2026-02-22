/**
 * 会员系统服务
 *
 * 需求14: 会员等级体系
 * 任务14.2.1: 会员等级展示组件
 */

import { api } from '@/lib/api';
import type {
  GetContributionResponse,
  GetDailyContributionResponse,
  GetContributionHistoryResponse,
  GetContributionConfigResponse,
  CheckEligibilityResponse,
  CreateApplicationRequest,
  CreateApplicationResponse,
  GetApplicationsResponse,
  GetApplicationDetailResponse,
  MemberApplicationStatus,
} from '@/types/membership';

/**
 * 会员服务
 */
export const membershipService = {
  /**
   * 获取用户总贡献度
   * GET /api/v1/membership/contribution
   */
  async getContribution(): Promise<GetContributionResponse> {
    const response = await api.get<GetContributionResponse>('/membership/contribution');
    return response.data;
  },

  /**
   * 获取今日贡献度统计
   * GET /api/v1/membership/contribution/daily
   */
  async getDailyContribution(): Promise<GetDailyContributionResponse> {
    const response = await api.get<GetDailyContributionResponse>('/membership/contribution/daily');
    return response.data;
  },

  /**
   * 获取贡献度历史记录
   * GET /api/v1/membership/contribution/history
   */
  async getContributionHistory(params?: {
    page?: number;
    pageSize?: number;
    type?: string;
  }): Promise<GetContributionHistoryResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.type) searchParams.set('type', params.type);

    const query = searchParams.toString();
    const url = query ? `/membership/contribution/history?${query}` : '/membership/contribution/history';
    const response = await api.get<GetContributionHistoryResponse>(url);
    return response.data;
  },

  /**
   * 获取贡献度配置
   * GET /api/v1/membership/contribution/config
   */
  async getContributionConfig(): Promise<GetContributionConfigResponse> {
    const response = await api.get<GetContributionConfigResponse>('/membership/contribution/config');
    return response.data;
  },

  // ==================== 会员申请相关 API ====================

  /**
   * 检查用户申请资格
   * GET /api/v1/membership/eligibility
   */
  async checkEligibility(): Promise<CheckEligibilityResponse> {
    const response = await api.get<CheckEligibilityResponse>('/membership/eligibility');
    return response.data;
  },

  /**
   * 提交会员申请
   * POST /api/v1/membership/apply
   */
  async submitApplication(data: CreateApplicationRequest): Promise<CreateApplicationResponse> {
    const response = await api.post<CreateApplicationResponse>('/membership/apply', data);
    return response.data;
  },

  /**
   * 获取用户的申请列表
   * GET /api/v1/membership/applications
   */
  async getApplications(params?: {
    page?: number;
    pageSize?: number;
    status?: MemberApplicationStatus;
  }): Promise<GetApplicationsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const url = query ? `/membership/applications?${query}` : '/membership/applications';
    const response = await api.get<GetApplicationsResponse>(url);
    return response.data;
  },

  /**
   * 获取申请详情
   * GET /api/v1/membership/applications/:id
   */
  async getApplicationDetail(id: string): Promise<GetApplicationDetailResponse> {
    const response = await api.get<GetApplicationDetailResponse>(`/membership/applications/${id}`);
    return response.data;
  },
};

export default membershipService;
