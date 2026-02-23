'use client';

import { motion } from 'motion/react';
import { Star, Gift, Lock, CheckCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 里程碑进度展示组件
 *
 * 需求26: 限时活动前端
 * 任务26.2.7: 里程碑进度展示
 *
 * 里程碑奖励显示
 */

interface Milestone {
  id: string;
  percentage: number;
  label: string;
  reward?: number;
  reached: boolean;
  claimed?: boolean;
}

interface MilestoneProgressProps {
  current: number;
  target: number;
  milestones?: Milestone[];
  onClaimMilestone?: (milestoneId: string) => void;
  className?: string;
}

const defaultMilestones = (current: number, target: number): Milestone[] => {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  return [
    { id: '25', percentage: 25, label: '25%', reward: 5, reached: percentage >= 25 },
    { id: '50', percentage: 50, label: '50%', reward: 10, reached: percentage >= 50 },
    { id: '75', percentage: 75, label: '75%', reward: 15, reached: percentage >= 75 },
    { id: '100', percentage: 100, label: '完成', reward: 20, reached: percentage >= 100 },
  ];
};

export function MilestoneProgress({
  current,
  target,
  milestones,
  onClaimMilestone,
  className = '',
}: MilestoneProgressProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const displayMilestones = milestones || defaultMilestones(current, target);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-500" />
          里程碑奖励
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {Math.round(percentage)}% 完成
        </span>
      </div>

      {/* 进度条和里程碑 */}
      <div className="relative pt-8 pb-4">
        {/* 进度条背景 */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full relative"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent rounded-full" />
          </motion.div>
        </div>

        {/* 里程碑标记 */}
        {displayMilestones.map((milestone, index) => (
          <motion.div
            key={milestone.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="absolute top-0"
            style={{ left: `${milestone.percentage}%`, transform: 'translateX(-50%)' }}
          >
            {/* 里程碑图标 */}
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                milestone.reached
                  ? milestone.claimed
                    ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500 border-amber-300 dark:border-amber-600 shadow-lg shadow-amber-500/30'
                  : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600'
              )}
            >
              {milestone.reached ? (
                milestone.claimed ? (
                  <CheckCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                ) : (
                  <Gift className="w-4 h-4 text-white" />
                )
              ) : (
                <Lock className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
              )}
            </div>

            {/* 标签 */}
            <div className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span
                className={cn(
                  'text-xs font-medium',
                  milestone.reached
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                {milestone.label}
              </span>
              {milestone.reward && (
                <span
                  className={cn(
                    'block text-xs',
                    milestone.reached
                      ? 'text-amber-500 dark:text-amber-400'
                      : 'text-gray-400 dark:text-gray-500'
                  )}
                >
                  +{milestone.reward}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 里程碑卡片列表 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
        {displayMilestones.map((milestone, index) => (
          <motion.div
            key={milestone.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + index * 0.1 }}
            className={cn(
              'p-3 rounded-xl border text-center transition-all',
              milestone.reached
                ? milestone.claimed
                  ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                  : 'bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-white/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
            )}
          >
            <div
              className={cn(
                'w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2',
                milestone.reached
                  ? milestone.claimed
                    ? 'bg-gray-100 dark:bg-gray-700'
                    : 'bg-gradient-to-br from-amber-400 to-orange-500'
                  : 'bg-gray-100 dark:bg-gray-800'
              )}
            >
              {milestone.reached ? (
                milestone.claimed ? (
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                ) : (
                  <Gift className="w-5 h-5 text-white" />
                )
              ) : (
                <Lock className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <p
              className={cn(
                'text-sm font-medium mb-1',
                milestone.reached
                  ? milestone.claimed
                    ? 'text-gray-500 dark:text-gray-400'
                    : 'text-amber-700 dark:text-amber-300'
                  : 'text-gray-500 dark:text-gray-400'
              )}
            >
              {milestone.label}
            </p>
            {milestone.reward && (
              <p
                className={cn(
                  'text-xs',
                  milestone.reached && !milestone.claimed
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-gray-400 dark:text-gray-500'
                )}
              >
                +{milestone.reward} 零芥子
              </p>
            )}
            {milestone.reached && !milestone.claimed && onClaimMilestone && (
              <button
                onClick={() => onClaimMilestone(milestone.id)}
                className="mt-2 px-3 py-1 text-xs font-medium rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
              >
                领取
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default MilestoneProgress;
