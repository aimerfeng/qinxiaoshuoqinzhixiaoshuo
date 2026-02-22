'use client';

import { motion } from 'motion/react';
import { Wallet, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 余额卡片组件
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.1: 钱包页面 - 余额展示
 *
 * 设计规范:
 * - 大圆角 (16px)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 * - 毛玻璃效果
 */
interface BalanceCardProps {
  balance: number;
  totalReceived: number;
  totalSent: number;
  balanceLimit: number;
  memberLevelName: string;
  className?: string;
}

export function BalanceCard({
  balance,
  totalReceived,
  totalSent,
  balanceLimit,
  memberLevelName,
  className,
}: BalanceCardProps) {
  const balancePercentage = balanceLimit > 0 ? (balance / balanceLimit) * 100 : 0;
  const isNearLimit = balancePercentage >= 80;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'relative overflow-hidden rounded-2xl',
        'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500',
        'p-6 text-white shadow-xl',
        className
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <Sparkles className="absolute top-4 right-4 w-6 h-6 text-white/30" />
      </div>

      {/* 内容 */}
      <div className="relative z-10">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium text-white/80">零芥子钱包</span>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-medium">
            {memberLevelName}
          </span>
        </div>

        {/* 余额 */}
        <div className="mb-6">
          <div className="text-sm text-white/70 mb-1">当前余额</div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold tracking-tight">{balance.toLocaleString()}</span>
            <span className="text-lg text-white/70">零芥子</span>
          </div>
        </div>

        {/* 余额上限进度条 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-white/70 mb-1">
            <span>余额上限</span>
            <span>{balance.toLocaleString()} / {balanceLimit.toLocaleString()}</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(balancePercentage, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                isNearLimit ? 'bg-amber-300' : 'bg-white'
              )}
            />
          </div>
          {isNearLimit && (
            <div className="text-xs text-amber-200 mt-1">
              余额接近上限，请先使用后再领取
            </div>
          )}
        </div>

        {/* 收支统计 */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <TrendingUp className="w-4 h-4 text-green-300" />
            </div>
            <div>
              <div className="text-xs text-white/60">累计收到</div>
              <div className="font-semibold">{totalReceived.toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/10">
              <TrendingDown className="w-4 h-4 text-red-300" />
            </div>
            <div>
              <div className="text-xs text-white/60">累计发出</div>
              <div className="font-semibold">{totalSent.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
