'use client';

import { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';

/**
 * 引导进度卡片组件
 *
 * 需求22: 新手引导系统
 * 任务22.2.6: 引导进度管理
 *
 * 功能：
 * - 显示整体引导完成进度（百分比）
 * - 圆形进度指示器（渐变描边）
 * - 已完成/总数统计
 *
 * 设计规范：
 * - 大圆角 (12-16px)
 * - 半透明毛玻璃效果 (backdrop-blur)
 * - 渐变紫蓝主题色 (#6366F1 → #8B5CF6)
 */

interface OnboardingProgressCardProps {
  /** 已完成的引导数量 */
  completedCount: number;
  /** 总引导数量 */
  totalCount: number;
  /** 是否正在加载 */
  loading?: boolean;
  /** 自定义类名 */
  className?: string;
}

export default function OnboardingProgressCard({
  completedCount,
  totalCount,
  loading = false,
  className,
}: OnboardingProgressCardProps) {
  // 计算进度百分比
  const percentage = useMemo(() => {
    if (totalCount === 0) return 0;
    return Math.round((completedCount / totalCount) * 100);
  }, [completedCount, totalCount]);

  // SVG 圆形进度条参数
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  // 进度状态文本
  const statusText = useMemo(() => {
    if (percentage === 100) return '已完成所有引导！';
    if (percentage >= 75) return '即将完成！';
    if (percentage >= 50) return '进度过半！';
    if (percentage > 0) return '继续加油！';
    return '开始你的引导之旅';
  }, [percentage]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        'relative rounded-2xl p-6',
        'bg-white/80 dark:bg-gray-800/80',
        'backdrop-blur-xl',
        'shadow-[0_8px_32px_rgba(99,102,241,0.15)]',
        'border border-white/20 dark:border-gray-700/50',
        className
      )}
    >
      {/* 背景装饰 */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-purple-500/10 to-pink-500/10 rounded-full blur-2xl" />
      </div>

      <div className="relative flex items-center gap-6">
        {/* 圆形进度指示器 */}
        <div className="relative flex-shrink-0">
          <svg
            width={size}
            height={size}
            className="transform -rotate-90"
          >
            {/* 背景圆环 */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-gray-200 dark:text-gray-700"
            />
            {/* 进度圆环 */}
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#progressGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: loading ? circumference : strokeDashoffset }}
              transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1], delay: 0.2 }}
            />
            {/* 渐变定义 */}
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>
          </svg>

          {/* 中心百分比 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {loading ? (
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="text-2xl font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent"
                >
                  {percentage}%
                </motion.span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  完成度
                </span>
              </>
            )}
          </div>
        </div>

        {/* 文字信息 */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            新手引导进度
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            {statusText}
          </p>

          {/* 统计信息 */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                已完成 <span className="font-semibold">{completedCount}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-600" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                待完成 <span className="font-semibold">{totalCount - completedCount}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 完成彩带效果 */}
      {percentage === 100 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="absolute top-3 right-3"
        >
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            全部完成
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
