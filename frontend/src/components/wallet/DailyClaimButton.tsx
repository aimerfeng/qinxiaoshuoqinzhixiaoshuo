'use client';

import { useState, useEffect, useRef } from 'react';
import { Gift, Loader2, Check, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/utils/cn';
import { useAuthStore } from '@/store/auth';
import { walletService } from '@/services/wallet';
import type { DailyClaimStatus } from '@/types/wallet';
import DailyClaimModal from './DailyClaimModal';

/**
 * 每日领取按钮组件 - 紧凑型入口
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.2: 每日领取入口
 *
 * 功能:
 * - 显示当前余额
 * - 显示可领取状态（带通知点）
 * - 点击打开快速领取弹窗
 */
interface DailyClaimButtonProps {
  className?: string;
}

export default function DailyClaimButton({ className }: DailyClaimButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [claimStatus, setClaimStatus] = useState<DailyClaimStatus | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { isAuthenticated } = useAuthStore();

  // 获取领取状态和余额
  const fetchStatus = async () => {
    if (!isAuthenticated) return;
    
    try {
      setIsLoading(true);
      const [statusRes, balanceRes] = await Promise.all([
        walletService.getClaimStatus(),
        walletService.getSimpleBalance(),
      ]);
      setClaimStatus(statusRes.data);
      setBalance(balanceRes.data.balance);
    } catch (error) {
      console.error('Failed to fetch claim status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [isAuthenticated]);

  // 领取成功后刷新状态
  const handleClaimSuccess = () => {
    fetchStatus();
  };

  if (!isAuthenticated) return null;

  // 普通会员不显示
  if (claimStatus && claimStatus.memberLevel === 'REGULAR') {
    return null;
  }

  const canClaim = claimStatus?.canClaim ?? false;
  const hasClaimed = claimStatus?.hasClaimed ?? false;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(true)}
        className={cn(
          'relative flex items-center gap-2 px-3 py-2 rounded-xl',
          'bg-white/60 dark:bg-gray-800/60',
          'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
          'hover:bg-white/80 dark:hover:bg-gray-800/80',
          'transition-all duration-200',
          'shadow-sm hover:shadow-md',
          className
        )}
        aria-label={`零芥子钱包${canClaim ? '，可领取每日奖励' : ''}`}
      >
        {/* 图标 */}
        <div
          className={cn(
            'relative p-1.5 rounded-lg',
            canClaim
              ? 'bg-gradient-to-br from-amber-400 to-orange-500'
              : hasClaimed
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-gradient-to-br from-primary-400 to-secondary-500'
          )}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : hasClaimed ? (
            <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
          ) : (
            <Gift className="w-4 h-4 text-white" />
          )}
          
          {/* 可领取通知点 */}
          <AnimatePresence>
            {canClaim && !isLoading && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"
              />
            )}
          </AnimatePresence>
        </div>

        {/* 余额显示 */}
        <div className="flex flex-col items-start">
          <span className="text-xs text-gray-500 dark:text-gray-400 leading-none">
            零芥子
          </span>
          <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
            {isLoading ? (
              <span className="inline-block w-8 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              balance?.toLocaleString() ?? '0'
            )}
          </span>
        </div>

        {/* 可领取提示 */}
        <AnimatePresence>
          {canClaim && !isLoading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
            >
              <Sparkles className="w-3 h-3" />
              <span className="text-xs font-medium">领取</span>
            </motion.div>
          )}
        </AnimatePresence>
      </button>

      {/* 快速领取弹窗 */}
      <AnimatePresence>
        {isOpen && (
          <DailyClaimModal
            claimStatus={claimStatus}
            balance={balance}
            onClose={() => setIsOpen(false)}
            onClaimSuccess={handleClaimSuccess}
          />
        )}
      </AnimatePresence>
    </>
  );
}
