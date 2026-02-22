/**
 * 用户个人中心服务
 *
 * 需求17: 用户个人中心
 * 任务17.2.1: 个人主页布局
 */

import { api } from '@/lib/api';
import type {
  GetUserProfileResponse,
  GetUserActivitiesResponse,
  GetFollowListResponse,
  GetFavoritesResponse,
  GetReadingStatsResponse,
  GetAchievementsResponse,
  FollowResponse,
} from '@/types/user';

/**
 * 用户服务
 */
export const userService = {
  /**
   * 获取用户主页数据
   * GET /api/v1/users/:userId/profile
   */
  async getUserProfile(userId: string): Promise<GetUserProfileResponse> {
    const response = await api.get<GetUserProfileResponse>(`/users/${userId}/profile`);
    return response.data;
  },

  /**
   * 获取用户动态列表
   * GET /api/v1/users/:userId/activities
   */
  async getUserActivities(
    userId: string,
    params?: {
      page?: number;
      limit?: number;
      type?: string;
    }
  ): Promise<GetUserActivitiesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.type) searchParams.set('type', params.type);

    const query = searchParams.toString();
    const url = query
      ? `/users/${userId}/activities?${query}`
      : `/users/${userId}/activities`;
    const response = await api.get<GetUserActivitiesResponse>(url);
    return response.data;
  },

  /**
   * 获取用户关注列表
   * GET /api/v1/users/:userId/following
   */
  async getUserFollowing(
    userId: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<GetFollowListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    const url = query
      ? `/users/${userId}/following?${query}`
      : `/users/${userId}/following`;
    const response = await api.get<GetFollowListResponse>(url);
    return response.data;
  },

  /**
   * 获取用户粉丝列表
   * GET /api/v1/users/:userId/followers
   */
  async getUserFollowers(
    userId: string,
    params?: {
      page?: number;
      limit?: number;
    }
  ): Promise<GetFollowListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));

    const query = searchParams.toString();
    const url = query
      ? `/users/${userId}/followers?${query}`
      : `/users/${userId}/followers`;
    const response = await api.get<GetFollowListResponse>(url);
    return response.data;
  },

  /**
   * 获取用户收藏列表
   * GET /api/v1/users/:userId/favorites
   */
  async getUserFavorites(
    userId: string,
    params?: {
      page?: number;
      limit?: number;
      status?: 'want_to_read' | 'reading' | 'completed';
    }
  ): Promise<GetFavoritesResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);

    const query = searchParams.toString();
    const url = query
      ? `/users/${userId}/favorites?${query}`
      : `/users/${userId}/favorites`;
    const response = await api.get<GetFavoritesResponse>(url);
    return response.data;
  },

  /**
   * 获取用户阅读统计
   * GET /api/v1/users/:userId/reading-stats
   */
  async getUserReadingStats(userId: string): Promise<GetReadingStatsResponse> {
    const response = await api.get<GetReadingStatsResponse>(
      `/users/${userId}/reading-stats`
    );
    return response.data;
  },

  /**
   * 获取用户成就列表
   * GET /api/v1/users/:userId/achievements
   */
  async getUserAchievements(userId: string): Promise<GetAchievementsResponse> {
    const response = await api.get<GetAchievementsResponse>(
      `/users/${userId}/achievements`
    );
    return response.data;
  },

  /**
   * 关注用户
   * POST /api/v1/users/:userId/follow
   */
  async followUser(userId: string): Promise<FollowResponse> {
    const response = await api.post<FollowResponse>(`/users/${userId}/follow`);
    return response.data;
  },

  /**
   * 取消关注用户
   * DELETE /api/v1/users/:userId/follow
   */
  async unfollowUser(userId: string): Promise<FollowResponse> {
    const response = await api.delete<FollowResponse>(`/users/${userId}/follow`);
    return response.data;
  },
};

export default userService;
