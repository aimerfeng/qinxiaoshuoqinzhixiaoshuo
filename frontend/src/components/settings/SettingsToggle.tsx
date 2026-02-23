'use client';

import { cn } from '@/utils/cn';

/**
 * 设置开关组件
 *
 * 需求21: 设置中心
 * 任务21.2.1: 设置中心页面布局
 *
 * 提供统一的开关样式
 */

interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export default function SettingsToggle({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className,
}: SettingsToggleProps) {
  const sizes = {
    sm: {
      track: 'w-9 h-5',
      thumb: 'w-4 h-4',
      translate: 'translate-x-4',
    },
    md: {
      track: 'w-11 h-6',
      thumb: 'w-5 h-5',
      translate: 'translate-x-5',
    },
  };

  const currentSize = sizes[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex flex-shrink-0 rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        currentSize.track,
        checked
          ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
          : 'bg-gray-200 dark:bg-gray-700',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block rounded-full bg-white shadow-lg',
          'transform ring-0 transition duration-200 ease-in-out',
          currentSize.thumb,
          checked ? currentSize.translate : 'translate-x-0.5',
          'mt-0.5 ml-0.5'
        )}
      />
    </button>
  );
}
