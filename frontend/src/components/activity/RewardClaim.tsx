'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, Coins, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 活动奖励领取组件
 *
 * 需求26: 限时活动前端
 * 任务26.2.6: 活动奖励领取交互
 *
 * 领取动画和反馈
 */

interface RewardClaimProps {
  rewardAmount: number;
  canClaim: boolean;
  isClaimed: boolean;
  onClaim: () => Promise<void>;
  className?: string;
}

export function RewardClaim({
  rewardAmount,
  canClaim,
  isClaimed,
  onClaim,
  className = '',
}: RewardClaimProps) {
  const [isClaiming, setIsClaiming] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleClaim = async () => {
    if (!canClaim || isClaiming || isClaimed) return;

    setIsClaiming(true);
    try {
      await onClaim();
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to claim reward:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      {/* 成功动画覆盖层 */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/90 to-orange-500/90 backdrop-blur-sm"
          >
            {/* 粒子效果 */}
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  opacity: 1,
                  scale: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{
                  opacity: 0,
                  scale: 1,
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 200,
                }}
                transition={{
                  duration: 1,
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
                className="absolute"
              >
                <Sparkles className="w-4 h-4 text-white" />
              </motion.div>
            ))}

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="text-center"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-3"
              >
                <CheckCircle className="w-10 h-10 text-white" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl font-bold text-white"
              >
                领取成功！
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-white/90 flex items-center justify-center gap-1 mt-1"
              >
                <Coins className="w-4 h-4" />
                +{rewardAmount} 零芥子
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容 */}
      <div
        className={cn(
          'p-6 rounded-2xl border transition-all',
          isClaimed
            ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            : canClaim
            ? 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800'
            : 'bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
        )}
      >
        <div className="flex items-center gap-4">
          {/* 图标 */}
          <motion.div
            animate={canClaim && !isClaimed ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn(
              'p-4 rounded-xl',
              isClaimed
                ? 'bg-gray-100 dark:bg-gray-700'
                : canClaim
                ? 'bg-gradient-to-br from-amber-400 to-orange-500'
                : 'bg-gray-100 dark:bg-gray-800'
            )}
          >
            {isClaimed ? (
              <CheckCircle className="w-8 h-8 text-gray-400 dark:text-gray-500" />
            ) : (
              <Gift className={cn('w-8 h-8', canClaim ? 'text-white' : 'text-gray-400 dark:text-gray-500')} />
            )}
          </motion.div>

          {/* 信息 */}
          <div className="flex-1">
            <h3
              className={cn(
                'text-lg font-semibold mb-1',
                isClaimed
                  ? 'text-gray-500 dark:text-gray-400'
                  : 'text-gray-900 dark:text-white'
              )}
            >
              {isClaimed ? '奖励已领取' : canClaim ? '恭喜完成活动！' : '活动奖励'}
            </h3>
            <div className="flex items-center gap-2">
              <Coins className={cn('w-5 h-5', canClaim && !isClaimed ? 'text-amber-500' : 'text-gray-400')} />
              <span
                className={cn(
                  'text-2xl font-bold',
                  isClaimed
                    ? 'text-gray-400 dark:text-gray-500'
                    : canClaim
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-600 dark:text-gray-400'
                )}
              >
                {rewardAmount}
              </span>
              <span className="text-gray-500 dark:text-gray-400">零芥子</span>
            </div>
          </div>

          {/* 按钮 */}
          {!isClaimed && (
            <motion.button
              whileHover={canClaim ? { scale: 1.05 } : {}}
              whileTap={canClaim ? { scale: 0.95 } : {}}
              onClick={handleClaim}
              disabled={!canClaim || isClaiming}
              className={cn(
                'px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2',
                canClaim
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
              )}
            >
              {isClaiming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Gift className="w-5 h-5" />
                  {canClaim ? '立即领取' : '完成任务后领取'}
                </>
              )}
            </motion.button>
          )}
        </div>

        {/* 提示信息 */}
        {!canClaim && !isClaimed && (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 pl-20">
            完成所有活动任务后即可领取奖励
          </p>
        )}
      </div>
    </div>
  );
}

export default RewardClaim;
