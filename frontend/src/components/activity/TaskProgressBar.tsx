'use client';

import { motion } from 'motion/react';
import { cn } from '@/utils/cn';

/**
 * 任务进度条组件
 *
 * 需求26: 限时活动前端
 * 任务26.2.5: 任务进度条组件
 *
 * 进度可视化，支持多种样式
 */

interface TaskProgressBarProps {
  current: number;
  target: number;
  label?: string;
  showPercentage?: boolean;
  showValues?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'success' | 'warning';
  animated?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
};

const variantClasses = {
  default: 'bg-indigo-500',
  gradient: 'bg-gradient-to-r from-indigo-500 to-purple-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
};

export function TaskProgressBar({
  current,
  target,
  label,
  showPercentage = true,
  showValues = true,
  size = 'md',
  variant = 'gradient',
  animated = true,
  className = '',
}: TaskProgressBarProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = current >= target;

  return (
    <div className={cn('space-y-2', className)}>
      {/* 标签和数值 */}
      {(label || showPercentage || showValues) && (
        <div className="flex items-center justify-between text-sm">
          {label && (
            <span className="text-gray-600 dark:text-gray-400 font-medium">{label}</span>
          )}
          <div className="flex items-center gap-2">
            {showValues && (
              <span
                className={cn(
                  'font-medium',
                  isComplete
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-700 dark:text-gray-300'
                )}
              >
                {current} / {target}
              </span>
            )}
            {showPercentage && (
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full',
                  isComplete
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                )}
              >
                {Math.round(percentage)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* 进度条 */}
      <div
        className={cn(
          'relative bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
          sizeClasses[size]
        )}
      >
        <motion.div
          initial={animated ? { width: 0 } : false}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn(
            'h-full rounded-full relative',
            isComplete ? 'bg-green-500' : variantClasses[variant]
          )}
        >
          {/* 光泽效果 */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />
          
          {/* 动态光效 */}
          {!isComplete && animated && (
            <motion.div
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

/**
 * 圆形进度组件
 */
interface CircularProgressProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  variant?: 'default' | 'gradient' | 'success';
  className?: string;
}

export function CircularProgress({
  current,
  target,
  size = 80,
  strokeWidth = 8,
  showPercentage = true,
  variant = 'default',
  className = '',
}: CircularProgressProps) {
  const percentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const isComplete = current >= target;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const strokeColor = isComplete
    ? '#22c55e'
    : variant === 'gradient'
    ? 'url(#progressGradient)'
    : '#6366f1';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        {/* 背景圆 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* 进度圆 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              'text-lg font-bold',
              isComplete
                ? 'text-green-600 dark:text-green-400'
                : 'text-gray-700 dark:text-gray-300'
            )}
          >
            {Math.round(percentage)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default TaskProgressBar;
