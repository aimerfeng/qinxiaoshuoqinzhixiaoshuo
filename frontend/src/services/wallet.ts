/**
 * 钱包服务
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.1: 钱包页面
 */

import { api } from '@/lib/api';
import type {
  GetWalletInfoResponse,
  GetSimpleBalanceResponse,
  GetDetailedBalanceResponse,
  GetClaimStatusResponse,
  ClaimDailyResponse,
  GetTransactionsResponse,
  TransactionQueryParams,
  TipRequest,
  TipResponse,
} from '@/types/wallet';

/**
 * 钱包服务
 */
export const walletService = {
  /**
   * 获取钱包信息
   * GET /api/v1/wallet
   */
  async getWalletInfo(): Promise<GetWalletInfoResponse> {
    const response = await api.get<GetWalletInfoResponse>('/wallet');
    return response.data;
  },

  /**
   * 获取简单余额信息
   * GET /api/v1/wallet/balance
   */
  async getSimpleBalance(): Promise<GetSimpleBalanceResponse> {
    const response = await api.get<GetSimpleBalanceResponse>('/wallet/balance');
    return response.data;
  },

  /**
   * 获取详细余额信息（含来源统计）
   * GET /api/v1/wallet/balance/detailed
   */
  async getDetailedBalance(): Promise<GetDetailedBalanceResponse> {
    const response = await api.get<GetDetailedBalanceResponse>('/wallet/balance/detailed');
    return response.data;
  },

  /**
   * 获取每日领取状态
   * GET /api/v1/wallet/claim/status
   */
  async getClaimStatus(): Promise<GetClaimStatusResponse> {
    const response = await api.get<GetClaimStatusResponse>('/wallet/claim/status');
    return response.data;
  },

  /**
   * 每日领取零芥子
   * POST /api/v1/wallet/claim
   */
  async claimDaily(): Promise<ClaimDailyResponse> {
    const response = await api.post<ClaimDailyResponse>('/wallet/claim');
    return response.data;
  },

  /**
   * 获取交易记录
   * GET /api/v1/wallet/transactions
   */
  async getTransactions(params?: TransactionQueryParams): Promise<GetTransactionsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.type) searchParams.set('type', params.type);
    if (params?.startDate) searchParams.set('startDate', params.startDate);
    if (params?.endDate) searchParams.set('endDate', params.endDate);

    const query = searchParams.toString();
    const url = query ? `/wallet/transactions?${query}` : '/wallet/transactions';
    const response = await api.get<GetTransactionsResponse>(url);
    return response.data;
  },

  /**
   * 打赏
   * POST /api/v1/wallet/tip
   */
  async tip(request: TipRequest): Promise<TipResponse> {
    const response = await api.post<TipResponse>('/wallet/tip', request);
    return response.data;
  },
};

export default walletService;
