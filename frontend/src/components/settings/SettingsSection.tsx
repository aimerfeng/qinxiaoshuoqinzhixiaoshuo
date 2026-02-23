'use client';

import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';

/**
 * 设置区块组件
 *
 * 需求21: 设置中心
 * 任务21.2.1: 设置中心页面布局
 *
 * 提供统一的设置区块样式，包含:
 * - 标题和描述
 * - 毛玻璃卡片效果
 * - 大圆角设计
 */

interface SettingsSectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export default function SettingsSection({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('mb-6', className)}
    >
      {/* 标题区域 */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>

      {/* 内容卡片 */}
      <div
        className={cn(
          'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
          'rounded-2xl border border-gray-200/50 dark:border-gray-700/50',
          'shadow-sm overflow-hidden'
        )}
      >
        {children}
      </div>
    </motion.section>
  );
}
