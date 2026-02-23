'use client';

import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';

/**
 * 设置滑块组件
 *
 * 需求21: 设置中心
 * 任务21.2.5: 阅读设置
 *
 * 提供数值范围选择的滑块控件，用于:
 * - 字体大小 (12-32)
 * - 行高 (1.2-3.0)
 */

interface SettingsSliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  disabled?: boolean;
  className?: string;
  /** 显示的单位 */
  unit?: string;
  /** 格式化显示值 */
  formatValue?: (value: number) => string;
  /** 显示刻度标记 */
  showMarks?: boolean;
  /** 刻度标记 */
  marks?: { value: number; label: string }[];
}

export default function SettingsSlider({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled = false,
  className,
  unit = '',
  formatValue,
  showMarks = false,
  marks,
}: SettingsSliderProps) {
  const [isDragging, setIsDragging] = useState(false);

  // 计算百分比位置
  const percentage = ((value - min) / (max - min)) * 100;

  // 格式化显示值
  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;

  // 处理滑块变化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseFloat(e.target.value);
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div className={cn('w-full', className)}>
      {/* 滑块容器 */}
      <div className="relative pt-1 pb-6">
        {/* 轨道背景 */}
        <div className="relative h-2 rounded-full bg-gray-200 dark:bg-gray-700">
          {/* 已填充部分 */}
          <motion.div
            className={cn(
              'absolute h-full rounded-full',
              'bg-gradient-to-r from-indigo-500 to-purple-500',
              disabled && 'opacity-50'
            )}
            style={{ width: `${percentage}%` }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>

        {/* 原生滑块输入 */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={handleChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          className={cn(
            'absolute inset-0 w-full h-2 opacity-0 cursor-pointer',
            disabled && 'cursor-not-allowed'
          )}
          aria-label="滑块"
        />

        {/* 自定义滑块手柄 */}
        <motion.div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 -translate-x-1/2',
            'w-5 h-5 rounded-full',
            'bg-white shadow-lg border-2',
            isDragging
              ? 'border-purple-500 scale-110'
              : 'border-indigo-500',
            'transition-all duration-150',
            disabled && 'opacity-50'
          )}
          style={{ left: `${percentage}%`, top: '4px' }}
          animate={{
            left: `${percentage}%`,
            scale: isDragging ? 1.1 : 1,
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />

        {/* 当前值气泡 */}
        <motion.div
          className={cn(
            'absolute -translate-x-1/2 -top-8',
            'px-2 py-1 rounded-lg',
            'bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium',
            'opacity-0 transition-opacity duration-150',
            isDragging && 'opacity-100'
          )}
          style={{ left: `${percentage}%` }}
          animate={{ left: `${percentage}%` }}
        >
          {displayValue}
          {/* 小三角 */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 dark:border-t-gray-700" />
        </motion.div>

        {/* 刻度标记 */}
        {showMarks && marks && (
          <div className="absolute w-full top-4 flex justify-between px-0">
            {marks.map((mark) => {
              const markPercentage = ((mark.value - min) / (max - min)) * 100;
              return (
                <div
                  key={mark.value}
                  className="absolute -translate-x-1/2"
                  style={{ left: `${markPercentage}%` }}
                >
                  <div className="w-0.5 h-2 bg-gray-300 dark:bg-gray-600 mx-auto" />
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 block text-center whitespace-nowrap">
                    {mark.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 最小/最大值标签 */}
      {!showMarks && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 -mt-4">
          <span>{formatValue ? formatValue(min) : `${min}${unit}`}</span>
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            {displayValue}
          </span>
          <span>{formatValue ? formatValue(max) : `${max}${unit}`}</span>
        </div>
      )}
    </div>
  );
}
