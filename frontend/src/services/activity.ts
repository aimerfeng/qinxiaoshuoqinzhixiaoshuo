/**
 * 活动服务
 *
 * 需求16: 社区活动系统
 * 任务16.2.1: 活动中心页面
 */

import { api } from '@/lib/api';
import type {
  GetActivityListResponse,
  GetMyParticipationsResponse,
  JoinActivityResponse,
  LeaveActivityResponse,
  GetActivityDetailResponse,
  GetActivityProgressResponse,
  ClaimRewardResponse,
  ActivityQueryParams,
  MyParticipationsQueryParams,
  CreateActivityRequest,
  CreateActivityResponse,
} from '@/types/activity';

/**
 * 活动服务
 */
export const activityService = {
  /**
   * 获取活动列表
   * GET /api/v1/activities
   */
  async getActivityList(params?: ActivityQueryParams): Promise<GetActivityListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.status) searchParams.set('status', params.status);
    if (params?.type) searchParams.set('type', params.type);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.creatorId) searchParams.set('creatorId', params.creatorId);

    const query = searchParams.toString();
    const url = query ? `/activities?${query}` : '/activities';
    const response = await api.get<GetActivityListResponse>(url);
    return response.data;
  },

  /**
   * 获取我的参与记录
   * GET /api/v1/activities/my-participations
   */
  async getMyParticipations(params?: MyParticipationsQueryParams): Promise<GetMyParticipationsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const url = query ? `/activities/my-participations?${query}` : '/activities/my-participations';
    const response = await api.get<GetMyParticipationsResponse>(url);
    return response.data;
  },

  /**
   * 参与活动
   * POST /api/v1/activities/:id/join
   */
  async joinActivity(activityId: string): Promise<JoinActivityResponse> {
    const response = await api.post<JoinActivityResponse>(`/activities/${activityId}/join`);
    return response.data;
  },

  /**
   * 退出活动
   * POST /api/v1/activities/:id/leave
   */
  async leaveActivity(activityId: string): Promise<LeaveActivityResponse> {
    const response = await api.post<LeaveActivityResponse>(`/activities/${activityId}/leave`);
    return response.data;
  },

  /**
   * 获取活动详情
   * GET /api/v1/activities/:id
   */
  async getActivityDetail(activityId: string): Promise<GetActivityDetailResponse> {
    const response = await api.get<GetActivityDetailResponse>(`/activities/${activityId}`);
    return response.data;
  },

  /**
   * 获取活动进度
   * GET /api/v1/activities/:id/progress
   */
  async getActivityProgress(activityId: string): Promise<GetActivityProgressResponse> {
    const response = await api.get<GetActivityProgressResponse>(`/activities/${activityId}/progress`);
    return response.data;
  },

  /**
   * 领取活动奖励
   * POST /api/v1/activities/:id/claim-reward
   */
  async claimReward(activityId: string): Promise<ClaimRewardResponse> {
    const response = await api.post<ClaimRewardResponse>(`/activities/${activityId}/claim-reward`);
    return response.data;
  },

  /**
   * 创建活动
   * POST /api/v1/activities
   * 
   * 任务16.2.3: 创建活动表单
   */
  async createActivity(data: CreateActivityRequest): Promise<CreateActivityResponse> {
    const response = await api.post<CreateActivityResponse>('/activities', data);
    return response.data;
  },
};

export default activityService;
