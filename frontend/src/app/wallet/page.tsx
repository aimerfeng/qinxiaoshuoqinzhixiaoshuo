'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Loader2, ChevronLeft, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { walletService } from '@/services/wallet';
import {
  BalanceCard,
  DailyClaimCard,
  SourceStatsCard,
  TransactionList,
} from '@/components/wallet';
import type {
  WalletInfo,
  DailyClaimStatus,
  SourceStatItem,
  TransactionItem,
  Pagination,
} from '@/types/wallet';

/**
 * 钱包页面
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.1: 钱包页面
 *
 * 功能：
 * - 显示当前余额（突出显示）
 * - 显示累计收到和累计发出
 * - 显示余额上限（基于会员等级）
 * - 每日领取状态和按钮
 * - 来源统计（按交易类型分组）
 * - 最近交易记录列表
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - Motion 动画
 */
export default function WalletPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();

  // 数据状态
  const [walletInfo, setWalletInfo] = useState<{
    wallet: WalletInfo;
    memberLevel: string;
    memberLevelName: string;
  } | null>(null);
  const [claimStatus, setClaimStatus] = useState<DailyClaimStatus | null>(null);
  const [sourceStats, setSourceStats] = useState<SourceStatItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // 加载状态
  const [isLoadingWallet, setIsLoadingWallet] = useState(true);
  const [isLoadingClaim, setIsLoadingClaim] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // 当前页码
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // 加载钱包信息
  const loadWalletInfo = useCallback(async () => {
    setIsLoadingWallet(true);
    try {
      const response = await walletService.getWalletInfo();
      setWalletInfo(response.data);
    } catch (error) {
      console.error('Failed to load wallet info:', error);
    } finally {
      setIsLoadingWallet(false);
    }
  }, []);

  // 加载领取状态
  const loadClaimStatus = useCallback(async () => {
    setIsLoadingClaim(true);
    try {
      const response = await walletService.getClaimStatus();
      setClaimStatus(response.data);
    } catch (error) {
      console.error('Failed to load claim status:', error);
    } finally {
      setIsLoadingClaim(false);
    }
  }, []);

  // 加载来源统计
  const loadSourceStats = useCallback(async () => {
    setIsLoadingStats(true);
    try {
      const response = await walletService.getDetailedBalance();
      setSourceStats(response.data.sourceStats);
    } catch (error) {
      console.error('Failed to load source stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // 加载交易记录
  const loadTransactions = useCallback(async (page: number) => {
    setIsLoadingTransactions(true);
    try {
      const response = await walletService.getTransactions({
        page,
        pageSize,
      });
      setTransactions(response.data.transactions);
      setPagination(response.data.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  // 处理每日领取
  const handleClaim = async () => {
    try {
      const response = await walletService.claimDaily();
      if (response.data.success) {
        // 刷新数据
        await Promise.all([
          loadWalletInfo(),
          loadClaimStatus(),
          loadSourceStats(),
          loadTransactions(1),
        ]);
      }
    } catch (error) {
      console.error('Failed to claim daily:', error);
    }
  };

  // 翻页
  const handlePageChange = (page: number) => {
    if (page >= 1 && pagination && page <= pagination.totalPages) {
      loadTransactions(page);
      // 滚动到交易记录区域
      document.getElementById('transactions-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // 检查登录状态
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=/wallet');
    }
  }, [authLoading, isAuthenticated, router]);

  // 加载数据
  useEffect(() => {
    if (isAuthenticated) {
      loadWalletInfo();
      loadClaimStatus();
      loadSourceStats();
      loadTransactions(1);
    }
  }, [isAuthenticated, loadWalletInfo, loadClaimStatus, loadSourceStats, loadTransactions]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-20">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-white/20 dark:border-gray-700/30 hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              零芥子钱包
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              管理您的零芥子代币
            </p>
          </div>
        </motion.div>

        {/* 余额卡片 */}
        {isLoadingWallet ? (
          <div className="h-56 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : walletInfo ? (
          <BalanceCard
            balance={walletInfo.wallet.balance}
            totalReceived={walletInfo.wallet.totalReceived}
            totalSent={walletInfo.wallet.totalSent}
            balanceLimit={walletInfo.wallet.balanceLimit}
            memberLevelName={walletInfo.memberLevelName}
            className="mb-4"
          />
        ) : null}

        {/* 每日领取卡片 */}
        {isLoadingClaim ? (
          <div className="h-24 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex items-center justify-center mb-4">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : claimStatus ? (
          <DailyClaimCard
            status={claimStatus}
            onClaim={handleClaim}
            className="mb-6"
          />
        ) : null}

        {/* 来源统计 */}
        {isLoadingStats ? (
          <div className="h-48 rounded-2xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-md flex items-center justify-center mb-6">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        ) : (
          <SourceStatsCard stats={sourceStats} className="mb-6" />
        )}

        {/* 交易记录 */}
        <div id="transactions-section">
          <TransactionList
            transactions={transactions}
            pagination={pagination}
            isLoading={isLoadingTransactions}
            currentPage={currentPage}
            onPageChange={handlePageChange}
          />
        </div>

        {/* 查看完整历史链接 */}
        {pagination && pagination.total > pageSize && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-4 text-center"
          >
            <button
              onClick={() => router.push('/wallet/history')}
              className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              查看完整交易历史
              <ExternalLink className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
