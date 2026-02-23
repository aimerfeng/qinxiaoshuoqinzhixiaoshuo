'use client';

import { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';

/**
 * 设置页面头部组件
 *
 * 需求21: 设置中心
 * 任务21.2.1: 设置中心页面布局
 *
 * 提供统一的设置页面头部样式
 */

interface SettingsPageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function SettingsPageHeader({
  title,
  description,
  icon,
  actions,
  className,
}: SettingsPageHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('mb-6 lg:mb-8', className)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* 图标 */}
          {icon && (
            <div
              className={cn(
                'flex-shrink-0 p-3 rounded-xl',
                'bg-gradient-to-br from-indigo-500 to-purple-500',
                'text-white shadow-lg shadow-indigo-500/25'
              )}
            >
              {icon}
            </div>
          )}

          {/* 标题和描述 */}
          <div>
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-lg">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* 操作按钮 */}
        {actions && <div className="flex-shrink-0">{actions}</div>}
      </div>
    </motion.header>
  );
}
