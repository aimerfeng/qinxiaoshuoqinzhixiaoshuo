'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import type { DailyContributionItem } from '@/types/membership';

/**
 * 贡献类型图标和颜色配置
 */
const contributionTypeConfig: Record<string, { icon: string; color: string; bgColor: string }> = {
  reading: {
    icon: '📖',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
  },
  interaction: {
    icon: '💬',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
  },
  creation: {
    icon: '✍️',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
  },
  community: {
    icon: '🤝',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
  },
};

/**
 * 获取贡献类型配置
 */
function getTypeConfig(type: string) {
  // 尝试从类型名称中提取类别
  const lowerType = type.toLowerCase();
  if (lowerType.includes('read') || lowerType.includes('阅读')) {
    return contributionTypeConfig.reading;
  }
  if (lowerType.includes('comment') || lowerType.includes('like') || lowerType.includes('互动') || lowerType.includes('评论') || lowerType.includes('点赞')) {
    return contributionTypeConfig.interaction;
  }
  if (lowerType.includes('create') || lowerType.includes('publish') || lowerType.includes('创作') || lowerType.includes('发布')) {
    return contributionTypeConfig.creation;
  }
  if (lowerType.includes('community') || lowerType.includes('report') || lowerType.includes('社区') || lowerType.includes('举报')) {
    return contributionTypeConfig.community;
  }
  return contributionTypeConfig.reading; // 默认
}

export interface DailyContributionCardProps {
  item: DailyContributionItem;
  index?: number;
  animated?: boolean;
  className?: string;
}

/**
 * 每日贡献度项卡片
 *
 * 需求14: 会员等级体系
 * 任务14.2.3: 贡献度明细页面
 */
export function DailyContributionCard({
  item,
  index = 0,
  animated = true,
  className,
}: DailyContributionCardProps) {
  const config = useMemo(() => getTypeConfig(item.type), [item.type]);
  
  const progressPercent = useMemo(() => {
    if (!item.dailyLimit) return 0;
    return Math.min((item.currentPoints / item.dailyLimit) * 100, 100);
  }, [item.currentPoints, item.dailyLimit]);

  const content = (
    <div
      className={cn(
        'p-4 rounded-xl',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-md',
        'border border-white/20 dark:border-gray-700/30',
        'shadow-sm hover:shadow-md transition-shadow',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* 图标和名称 */}
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', config.bgColor)}>
            <span className="text-xl">{config.icon}</span>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {item.typeName}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {item.dailyLimit ? `每日上限 ${item.dailyLimit}` : '无上限'}
            </p>
          </div>
        </div>

        {/* 当前积分 */}
        <div className="text-right">
          <div className={cn('text-lg font-bold', config.color)}>
            +{item.currentPoints}
          </div>
          {item.dailyLimit && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              剩余 {item.remaining ?? 0}
            </div>
          )}
        </div>
      </div>

      {/* 进度条 */}
      {item.dailyLimit && (
        <div className="mt-3">
          <div className="h-2 w-full rounded-full bg-gray-200/80 dark:bg-gray-700/50 overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                item.isLimitReached
                  ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              )}
              initial={animated ? { width: 0 } : false}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            />
          </div>
          {item.isLimitReached && (
            <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <span>✅</span>
              <span>今日已达上限</span>
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export default DailyContributionCard;
