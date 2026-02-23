'use client';

import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 设置单选组组件
 *
 * 需求21: 设置中心
 * 任务21.2.3: 隐私设置
 *
 * 需求21验收标准5: WHEN 用户设置主页隐私 THEN System SHALL 支持"公开/仅关注者/仅自己"三级
 *
 * 提供统一的单选组样式，用于多选项设置:
 * - 主页可见性（公开/仅关注者/仅自己）
 * - 私信权限（所有人/仅关注者/不允许）
 */

export interface RadioOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
}

interface SettingsRadioGroupProps<T extends string = string> {
  options: RadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  /** 布局方向 */
  direction?: 'horizontal' | 'vertical';
}

export default function SettingsRadioGroup<T extends string = string>({
  options,
  value,
  onChange,
  disabled = false,
  className,
  direction = 'vertical',
}: SettingsRadioGroupProps<T>) {
  return (
    <div
      className={cn(
        'flex gap-2',
        direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}
      role="radiogroup"
    >
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <motion.button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => !disabled && onChange(option.value)}
            whileHover={!disabled ? { scale: 1.01 } : undefined}
            whileTap={!disabled ? { scale: 0.99 } : undefined}
            className={cn(
              'relative flex items-center gap-3 px-4 py-3 rounded-xl',
              'border-2 transition-all duration-200',
              'text-left w-full',
              isSelected
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600',
              disabled && 'opacity-50 cursor-not-allowed',
              !disabled && 'cursor-pointer'
            )}
          >
            {/* 单选圆圈 */}
            <div
              className={cn(
                'flex-shrink-0 w-5 h-5 rounded-full border-2 transition-all',
                'flex items-center justify-center',
                isSelected
                  ? 'border-indigo-500 bg-indigo-500'
                  : 'border-gray-300 dark:border-gray-600'
              )}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </div>

            {/* 文字内容 */}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-medium transition-colors',
                  isSelected
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-900 dark:text-white'
                )}
              >
                {option.label}
              </p>
              {option.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {option.description}
                </p>
              )}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
