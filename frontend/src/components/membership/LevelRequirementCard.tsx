'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Check, Lock, Clock, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import {
  MemberLevel,
  getMemberLevelConfig,
  type EligibleLevel,
} from '@/types/membership';

export interface LevelRequirementCardProps {
  eligibleLevel: EligibleLevel;
  currentScore: number;
  index?: number;
  onApply?: (level: MemberLevel) => void;
  animated?: boolean;
  className?: string;
}

/**
 * 等级要求卡片组件
 *
 * 需求14: 会员等级体系
 * 任务14.2.4: 会员申请页面
 *
 * 设计规范:
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */
export function LevelRequirementCard({
  eligibleLevel,
  currentScore,
  index = 0,
  onApply,
  animated = true,
  className,
}: LevelRequirementCardProps) {
  const config = useMemo(
    () => getMemberLevelConfig(eligibleLevel.level),
    [eligibleLevel.level]
  );

  const progress = useMemo(() => {
    if (currentScore >= eligibleLevel.requiredScore) return 100;
    return Math.min((currentScore / eligibleLevel.requiredScore) * 100, 100);
  }, [currentScore, eligibleLevel.requiredScore]);

  const statusInfo = useMemo(() => {
    if (eligibleLevel.hasPendingApplication) {
      return {
        icon: Clock,
        text: '申请审核中',
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      };
    }
    if (eligibleLevel.isEligible && eligibleLevel.canApply) {
      return {
        icon: Check,
        text: '可以申请',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
      };
    }
    return {
      icon: Lock,
      text: eligibleLevel.reason || '贡献度不足',
      color: 'text-gray-500 dark:text-gray-400',
      bgColor: 'bg-gray-50 dark:bg-gray-800/50',
    };
  }, [eligibleLevel]);

  const StatusIcon = statusInfo.icon;

  const content = (
    <div
      className={cn(
        'p-4 rounded-2xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl',
        'border border-white/20 dark:border-gray-700/30',
        'shadow-sm hover:shadow-md transition-all',
        eligibleLevel.canApply && 'hover:border-indigo-300 dark:hover:border-indigo-700',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        {/* 等级信息 */}
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center text-2xl',
              config.bgColor,
              'border',
              config.borderColor
            )}
          >
            {config.icon}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">
              Lv.{config.value} {config.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              需要 {eligibleLevel.requiredScore.toLocaleString()} 贡献度
            </p>
          </div>
        </div>

        {/* 状态/操作 */}
        <div className="flex-shrink-0">
          {eligibleLevel.canApply ? (
            <button
              onClick={() => onApply?.(eligibleLevel.level)}
              className={cn(
                'px-4 py-2 rounded-xl',
                'bg-gradient-to-r from-indigo-500 to-purple-500',
                'text-white font-medium text-sm',
                'hover:from-indigo-600 hover:to-purple-600',
                'transition-all shadow-md hover:shadow-lg',
                'flex items-center gap-1'
              )}
            >
              <span>申请</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium',
                'flex items-center gap-1.5',
                statusInfo.color,
                statusInfo.bgColor
              )}
            >
              <StatusIcon className="w-4 h-4" />
              <span>{statusInfo.text}</span>
            </div>
          )}
        </div>
      </div>

      {/* 进度条 */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
          <span>当前进度</span>
          <span>
            {currentScore.toLocaleString()} / {eligibleLevel.requiredScore.toLocaleString()}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200/80 dark:bg-gray-700/50 overflow-hidden">
          {animated ? (
            <motion.div
              className={cn(
                'h-full rounded-full',
                progress >= 100
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
            />
          ) : (
            <div
              className={cn(
                'h-full rounded-full',
                progress >= 100
                  ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              )}
              style={{ width: `${progress}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.1 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export default LevelRequirementCard;
