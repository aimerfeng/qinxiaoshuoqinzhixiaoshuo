/**
 * 成就系统 API 服务
 *
 * 需求24: 成就系统
 * 任务24.2.1: 成就中心页面布局
 */

import { api } from '@/lib/api';
import type {
  AchievementQueryParams,
  GetCategoriesResponse,
  GetTiersResponse,
  GetAchievementsResponse,
  GetUserAchievementsResponse,
  GetAchievementResponse,
  GetUserAchievementDetailResponse,
  ClaimRewardResponse,
  GetAchievementStatsResponse,
  AchievementCategory,
  AchievementTier,
} from '@/types/achievement';

const BASE_URL = '/achievements';

/**
 * 成就服务
 */
export const achievementService = {
  /**
   * 获取成就类别列表
   * GET /api/v1/achievements/categories
   */
  async getCategories(): Promise<GetCategoriesResponse> {
    const response = await api.get<GetCategoriesResponse>(`${BASE_URL}/categories`);
    return response.data;
  },

  /**
   * 获取成就等级列表
   * GET /api/v1/achievements/tiers
   */
  async getTiers(): Promise<GetTiersResponse> {
    const response = await api.get<GetTiersResponse>(`${BASE_URL}/tiers`);
    return response.data;
  },

  /**
   * 获取成就列表（公开）
   * GET /api/v1/achievements
   */
  async getAchievements(params?: AchievementQueryParams): Promise<GetAchievementsResponse> {
    const response = await api.get<GetAchievementsResponse>(BASE_URL, { params });
    return response.data;
  },

  /**
   * 按类别获取成就
   * GET /api/v1/achievements/category/:category
   */
  async getAchievementsByCategory(
    category: AchievementCategory,
    params?: AchievementQueryParams
  ): Promise<GetAchievementsResponse> {
    const response = await api.get<GetAchievementsResponse>(
      `${BASE_URL}/category/${category}`,
      { params }
    );
    return response.data;
  },

  /**
   * 按等级获取成就
   * GET /api/v1/achievements/tier/:tier
   */
  async getAchievementsByTier(
    tier: AchievementTier,
    params?: AchievementQueryParams
  ): Promise<GetAchievementsResponse> {
    const response = await api.get<GetAchievementsResponse>(
      `${BASE_URL}/tier/${tier}`,
      { params }
    );
    return response.data;
  },

  /**
   * 获取成就详情
   * GET /api/v1/achievements/:id
   */
  async getAchievementById(id: string): Promise<GetAchievementResponse> {
    const response = await api.get<GetAchievementResponse>(`${BASE_URL}/${id}`);
    return response.data;
  },

  /**
   * 获取用户成就列表
   * GET /api/v1/achievements/user
   */
  async getUserAchievements(params?: AchievementQueryParams): Promise<GetUserAchievementsResponse> {
    const response = await api.get<GetUserAchievementsResponse>(`${BASE_URL}/user`, { params });
    return response.data;
  },

  /**
   * 获取用户成就统计
   * GET /api/v1/achievements/user/stats
   */
  async getUserStats(): Promise<GetAchievementStatsResponse> {
    const response = await api.get<GetAchievementStatsResponse>(`${BASE_URL}/user/stats`);
    return response.data;
  },

  /**
   * 获取用户特定成就详情
   * GET /api/v1/achievements/user/:achievementId
   */
  async getUserAchievementDetail(achievementId: string): Promise<GetUserAchievementDetailResponse> {
    const response = await api.get<GetUserAchievementDetailResponse>(
      `${BASE_URL}/user/${achievementId}`
    );
    return response.data;
  },

  /**
   * 领取成就奖励
   * POST /api/v1/achievements/:id/claim
   */
  async claimReward(achievementId: string): Promise<ClaimRewardResponse> {
    const response = await api.post<ClaimRewardResponse>(`${BASE_URL}/${achievementId}/claim`);
    return response.data;
  },

  /**
   * 批量领取所有可领取的奖励
   * POST /api/v1/achievements/claim-all
   */
  async claimAllRewards(): Promise<{ message: string; results: ClaimRewardResponse[] }> {
    const response = await api.post<{ message: string; results: ClaimRewardResponse[] }>(
      `${BASE_URL}/claim-all`
    );
    return response.data;
  },

  /**
   * 检查并解锁成就
   * POST /api/v1/achievements/check-unlock
   */
  async checkAndUnlock(): Promise<{ message: string; unlockedAchievements: any[] }> {
    const response = await api.post<{ message: string; unlockedAchievements: any[] }>(
      `${BASE_URL}/check-unlock`
    );
    return response.data;
  },
};
