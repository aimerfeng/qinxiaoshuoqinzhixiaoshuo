'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Check, Clock, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { DailyClaimStatus } from '@/types/wallet';

/**
 * 每日领取卡片组件
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.1: 钱包页面 - 每日领取入口
 *
 * 需求15验收标准1: WHEN 正式会员每日首次登录 THEN System SHALL 显示领取零芥子入口
 */
interface DailyClaimCardProps {
  status: DailyClaimStatus;
  onClaim: () => Promise<void>;
  className?: string;
}

export function DailyClaimCard({ status, onClaim, className }: DailyClaimCardProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClaim = async () => {
    if (!status.canClaim || isClaiming) return;

    setIsClaiming(true);
    try {
      await onClaim();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } finally {
      setIsClaiming(false);
    }
  };

  // 普通会员不能领取
  if (status.memberLevel === 'REGULAR') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'p-5 rounded-2xl',
          'bg-gray-100/80 dark:bg-gray-800/60',
          'backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/30',
          className
        )}
      >
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-gray-200 dark:bg-gray-700">
            <Gift className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-600 dark:text-gray-400">
              每日领取
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              升级为正式会员后可每日领取零芥子
            </div>
          </div>
          <button
            disabled
            className="px-4 py-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 text-sm font-medium cursor-not-allowed"
          >
            暂不可用
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn(
        'p-5 rounded-2xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        'shadow-lg',
        className
      )}
    >
      <div className="flex items-center gap-4">
        {/* 图标 */}
        <div
          className={cn(
            'p-3 rounded-xl',
            status.canClaim
              ? 'bg-gradient-to-br from-amber-400 to-orange-500'
              : status.hasClaimed
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gray-100 dark:bg-gray-800'
          )}
        >
          {status.hasClaimed ? (
            <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
          ) : status.canClaim ? (
            <Gift className="w-6 h-6 text-white" />
          ) : (
            <Clock className="w-6 h-6 text-gray-400 dark:text-gray-500" />
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1">
          <div className="font-semibold text-gray-900 dark:text-white">
            每日领取
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {status.hasClaimed ? (
              '今日已领取，明天再来吧'
            ) : status.canClaim ? (
              <>
                可领取 <span className="text-amber-600 dark:text-amber-400 font-medium">{status.claimAmount}</span> 零芥子
              </>
            ) : (
              status.reason || '暂时无法领取'
            )}
          </div>
        </div>

        {/* 领取按钮 */}
        <AnimatePresence mode="wait">
          {showSuccess ? (
            <motion.div
              key="success"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">+{status.claimAmount}</span>
            </motion.div>
          ) : (
            <motion.button
              key="button"
              onClick={handleClaim}
              disabled={!status.canClaim || isClaiming}
              whileHover={status.canClaim ? { scale: 1.02 } : undefined}
              whileTap={status.canClaim ? { scale: 0.98 } : undefined}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                status.canClaim
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              )}
            >
              {isClaiming ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : status.hasClaimed ? (
                '已领取'
              ) : status.canClaim ? (
                '立即领取'
              ) : (
                '不可领取'
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* 余额上限提示 */}
      {status.isBalanceLimitReached && (
        <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>余额已达上限 {status.balanceLimit} 零芥子，请先使用后再领取</span>
        </div>
      )}
    </motion.div>
  );
}
