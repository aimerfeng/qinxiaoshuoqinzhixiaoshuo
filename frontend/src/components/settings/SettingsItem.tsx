'use client';

import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 设置项组件
 *
 * 需求21: 设置中心
 * 任务21.2.1: 设置中心页面布局
 *
 * 提供统一的设置项样式，支持:
 * - 标签和描述
 * - 右侧控件（开关、选择器等）
 * - 可点击跳转
 */

interface SettingsItemProps {
  label: string;
  description?: string;
  icon?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  showArrow?: boolean;
  className?: string;
  disabled?: boolean;
}

export default function SettingsItem({
  label,
  description,
  icon,
  children,
  onClick,
  showArrow = false,
  className,
  disabled = false,
}: SettingsItemProps) {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-4 px-4 py-4',
        'border-b border-gray-100 dark:border-gray-800 last:border-b-0',
        onClick && !disabled && 'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {/* 图标 */}
      {icon && (
        <div className="flex-shrink-0 text-gray-400 dark:text-gray-500">
          {icon}
        </div>
      )}

      {/* 标签和描述 */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {label}
        </p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        )}
      </div>

      {/* 右侧控件 */}
      {children && <div className="flex-shrink-0">{children}</div>}

      {/* 箭头 */}
      {showArrow && (
        <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 flex-shrink-0" />
      )}
    </Wrapper>
  );
}
