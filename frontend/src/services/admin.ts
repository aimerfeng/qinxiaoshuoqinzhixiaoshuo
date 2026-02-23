/**
 * 管理后台服务
 *
 * 需求18: 管理后台
 * 任务18.2: 管理后台前端
 */

import { api } from '@/lib/api';

// ==================== 统计数据类型 ====================

export interface StatisticsOverview {
  totalUsers: number;
  dau: number;
  mau: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  totalWorks: number;
  totalChapters: number;
  publishedWorksToday: number;
  publishedChaptersToday: number;
  totalTransactions: number;
  transactionsToday: number;
  totalTokensCirculated: number;
  activeActivities: number;
  pendingActivities: number;
}

export interface UserStatistics {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
  memberLevelDistribution: { level: string; count: number }[];
  userGrowthTrend: { date: string; newUsers: number; totalUsers: number }[];
  dauTrend: { date: string; dau: number }[];
}

export interface ContentStatistics {
  totalWorks: number;
  publishedWorks: number;
  draftWorks: number;
  totalChapters: number;
  publishedChapters: number;
  contentTypeDistribution: { type: string; count: number }[];
  publishTrend: { date: string; works: number; chapters: number }[];
  topTags: { name: string; count: number }[];
}

export interface TransactionStatistics {
  totalTransactions: number;
  totalTokensCirculated: number;
  totalTips: number;
  totalDailyClaims: number;
  transactionTypeDistribution: { type: string; count: number; amount: number }[];
  transactionTrend: { date: string; count: number; amount: number }[];
}

// ==================== 用户管理类型 ====================

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  memberLevel: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  memberLevel?: string;
  isActive?: boolean;
}

export interface UserListResponse {
  users: AdminUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ==================== 内容审核类型 ====================

export interface Report {
  id: string;
  type: string;
  targetId: string;
  targetType: string;
  reason: string;
  description: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESOLVED';
  reporter: { id: string; username: string; nickname: string | null };
  createdAt: string;
}

export interface ReportListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
}

export interface ReportListResponse {
  reports: Report[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ==================== 会员审核类型 ====================

export interface MembershipApplication {
  id: string;
  userId: string;
  user: { id: string; username: string; nickname: string | null; avatar: string | null };
  targetLevel: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface ApplicationListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
}

export interface ApplicationListResponse {
  applications: MembershipApplication[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ==================== 活动审核类型 ====================

export interface ActivityReview {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  creator: { id: string; username: string; nickname: string | null };
  startTime: string;
  endTime: string;
  rewardPerPerson: number;
  totalPool: number;
  createdAt: string;
}

export interface ActivityListQuery {
  page?: number;
  pageSize?: number;
  status?: string;
  type?: string;
}

export interface ActivityListResponse {
  activities: ActivityReview[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ==================== 管理后台服务 ====================

export const adminService = {
  // 统计数据
  async getStatisticsOverview(): Promise<StatisticsOverview> {
    const response = await api.get<StatisticsOverview>('/admin/statistics/overview');
    return response.data;
  },

  async getUserStatistics(): Promise<UserStatistics> {
    const response = await api.get<UserStatistics>('/admin/statistics/users');
    return response.data;
  },

  async getContentStatistics(): Promise<ContentStatistics> {
    const response = await api.get<ContentStatistics>('/admin/statistics/content');
    return response.data;
  },

  async getTransactionStatistics(): Promise<TransactionStatistics> {
    const response = await api.get<TransactionStatistics>('/admin/statistics/transactions');
    return response.data;
  },

  // 用户管理
  async getUserList(query?: UserListQuery): Promise<UserListResponse> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.pageSize) params.set('pageSize', String(query.pageSize));
    if (query?.search) params.set('search', query.search);
    if (query?.memberLevel) params.set('memberLevel', query.memberLevel);
    if (query?.isActive !== undefined) params.set('isActive', String(query.isActive));
    const url = params.toString() ? `/admin/users?${params}` : '/admin/users';
    const response = await api.get<UserListResponse>(url);
    return response.data;
  },

  async banUser(userId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/admin/users/${userId}/ban`, { reason });
    return response.data;
  },

  async unbanUser(userId: string, reason: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post<{ success: boolean; message: string }>(`/admin/users/${userId}/unban`, { reason });
    return response.data;
  },

  // 内容审核
  async getReportList(query?: ReportListQuery): Promise<ReportListResponse> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.pageSize) params.set('pageSize', String(query.pageSize));
    if (query?.status) params.set('status', query.status);
    if (query?.type) params.set('type', query.type);
    const url = params.toString() ? `/admin/reports?${params}` : '/admin/reports';
    const response = await api.get<ReportListResponse>(url);
    return response.data;
  },

  async processReport(
    reportId: string,
    action: 'APPROVE' | 'REJECT',
    note?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.patch<{ success: boolean; message: string }>(`/admin/reports/${reportId}/process`, {
      action,
      note,
    });
    return response.data;
  },

  // 会员审核
  async getApplicationList(query?: ApplicationListQuery): Promise<ApplicationListResponse> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.pageSize) params.set('pageSize', String(query.pageSize));
    if (query?.status) params.set('status', query.status);
    const url = params.toString() ? `/admin/membership/applications?${params}` : '/admin/membership/applications';
    const response = await api.get<ApplicationListResponse>(url);
    return response.data;
  },

  async approveApplication(
    applicationId: string,
    note?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/admin/membership/applications/${applicationId}/approve`,
      { note }
    );
    return response.data;
  },

  async rejectApplication(
    applicationId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/admin/membership/applications/${applicationId}/reject`,
      { reason }
    );
    return response.data;
  },

  // 活动审核
  async getActivityList(query?: ActivityListQuery): Promise<ActivityListResponse> {
    const params = new URLSearchParams();
    if (query?.page) params.set('page', String(query.page));
    if (query?.pageSize) params.set('pageSize', String(query.pageSize));
    if (query?.status) params.set('status', query.status);
    if (query?.type) params.set('type', query.type);
    const url = params.toString() ? `/admin/activities?${params}` : '/admin/activities';
    const response = await api.get<ActivityListResponse>(url);
    return response.data;
  },

  async approveActivity(
    activityId: string,
    note?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/admin/activities/${activityId}/approve`,
      { note }
    );
    return response.data;
  },

  async rejectActivity(
    activityId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.patch<{ success: boolean; message: string }>(
      `/admin/activities/${activityId}/reject`,
      { reason }
    );
    return response.data;
  },
};

export default adminService;
