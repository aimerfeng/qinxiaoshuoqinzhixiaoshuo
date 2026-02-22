'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Gift, Check, X, Sparkles, Loader2, Wallet, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/utils/cn';
import { walletService } from '@/services/wallet';
import type { DailyClaimStatus } from '@/types/wallet';

/**
 * 每日领取弹窗组件
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.2: 每日领取入口 - 快速领取弹窗
 *
 * 功能:
 * - 显示当前余额和领取状态
 * - 快速领取功能
 * - 领取成功动画
 * - 跳转到钱包页面
 */
interface DailyClaimModalProps {
  claimStatus: DailyClaimStatus | null;
  balance: number | null;
  onClose: () => void;
  onClaimSuccess: () => void;
}

export default function DailyClaimModal({
  claimStatus,
  balance,
  onClose,
  onClaimSuccess,
}: DailyClaimModalProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    success: boolean;
    amount: number;
    newBalance: number;
  } | null>(null);

  const handleClaim = async () => {
    if (!claimStatus?.canClaim || isClaiming) return;

    setIsClaiming(true);
    try {
      const response = await walletService.claimDaily();
      if (response.data.success) {
        setClaimResult({
          success: true,
          amount: response.data.amount,
          newBalance: response.data.newBalance,
        });
        onClaimSuccess();
      }
    } catch (error) {
      console.error('Failed to claim daily reward:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  const canClaim = claimStatus?.canClaim ?? false;
  const hasClaimed = claimStatus?.hasClaimed ?? false;
  const claimAmount = claimStatus?.claimAmount ?? 0;

  return (
    <>
      {/* 背景遮罩 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
      />

      {/* 弹窗内容 */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm z-50"
      >
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl',
            'bg-white/90 dark:bg-gray-900/90',
            'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
            'shadow-2xl'
          )}
        >
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
            aria-label="关闭"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>

          {/* 顶部装饰渐变 */}
          <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-primary-500/20 via-secondary-500/20 to-amber-500/20" />

          {/* 内容区域 */}
          <div className="relative p-6 pt-8">
            {/* 图标 */}
            <div className="flex justify-center mb-4">
              <motion.div
                animate={claimResult?.success ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.5 }}
                className={cn(
                  'p-4 rounded-2xl',
                  claimResult?.success
                    ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                    : canClaim
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                      : hasClaimed
                        ? 'bg-green-100 dark:bg-green-900/30'
                        : 'bg-gradient-to-br from-primary-400 to-secondary-500'
                )}
              >
                {claimResult?.success ? (
                  <Sparkles className="w-8 h-8 text-white" />
                ) : hasClaimed ? (
                  <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                ) : (
                  <Gift className="w-8 h-8 text-white" />
                )}
              </motion.div>
            </div>

            {/* 标题 */}
            <h3 className="text-xl font-bold text-center text-gray-900 dark:text-white mb-2">
              {claimResult?.success
                ? '领取成功！'
                : hasClaimed
                  ? '今日已领取'
                  : canClaim
                    ? '每日领取'
                    : '每日领取'}
            </h3>

            {/* 描述/结果 */}
            {claimResult?.success ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="flex items-center justify-center gap-2 text-2xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                  <Sparkles className="w-6 h-6" />
                  <span>+{claimResult.amount}</span>
                  <span className="text-base font-normal">零芥子</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  当前余额: {claimResult.newBalance.toLocaleString()} 零芥子
                </p>
              </motion.div>
            ) : (
              <div className="text-center">
                {canClaim ? (
                  <p className="text-gray-600 dark:text-gray-300">
                    可领取 <span className="text-amber-600 dark:text-amber-400 font-semibold">{claimAmount}</span> 零芥子
                  </p>
                ) : hasClaimed ? (
                  <p className="text-gray-500 dark:text-gray-400">
                    明天再来领取吧~
                  </p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">
                    {claimStatus?.reason || '暂时无法领取'}
                  </p>
                )}
              </div>
            )}

            {/* 余额上限提示 */}
            {claimStatus?.isBalanceLimitReached && !claimResult?.success && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>余额已达上限，请先使用后再领取</span>
              </div>
            )}

            {/* 当前余额 */}
            {!claimResult?.success && (
              <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">当前余额</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {balance?.toLocaleString() ?? 0} 零芥子
                </span>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="mt-6 space-y-3">
              {claimResult?.success ? (
                <button
                  onClick={onClose}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium transition-all',
                    'bg-gradient-to-r from-primary-500 to-secondary-500 text-white',
                    'hover:shadow-lg hover:shadow-primary-500/25'
                  )}
                >
                  太棒了！
                </button>
              ) : canClaim ? (
                <button
                  onClick={handleClaim}
                  disabled={isClaiming}
                  className={cn(
                    'w-full py-3 rounded-xl font-medium transition-all',
                    'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
                    'hover:shadow-lg hover:shadow-amber-500/25',
                    'disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  {isClaiming ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      领取中...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Gift className="w-5 h-5" />
                      立即领取
                    </span>
                  )}
                </button>
              ) : null}

              <Link
                href="/wallet"
                onClick={onClose}
                className={cn(
                  'flex items-center justify-center gap-2 w-full py-3 rounded-xl font-medium transition-all',
                  'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                  'hover:bg-gray-200 dark:hover:bg-gray-700'
                )}
              >
                <Wallet className="w-5 h-5" />
                查看钱包
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
