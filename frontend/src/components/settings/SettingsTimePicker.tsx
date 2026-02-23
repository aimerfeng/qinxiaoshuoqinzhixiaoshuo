'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 设置时间选择器组件
 *
 * 需求21: 设置中心
 * 任务21.2.5: 阅读设置
 *
 * 提供时间选择功能，用于:
 * - 夜间模式开始时间
 * - 夜间模式结束时间
 *
 * 格式: HH:mm (24小时制)
 */

interface SettingsTimePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function SettingsTimePicker({
  value,
  onChange,
  disabled = false,
  placeholder = '选择时间',
  className,
}: SettingsTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 解析当前值
  const [hours, minutes] = value ? value.split(':').map(Number) : [22, 0];

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 更新时间
  const updateTime = (newHours: number, newMinutes: number) => {
    const h = String(newHours).padStart(2, '0');
    const m = String(newMinutes).padStart(2, '0');
    onChange(`${h}:${m}`);
  };

  // 增加/减少小时
  const adjustHours = (delta: number) => {
    let newHours = hours + delta;
    if (newHours < 0) newHours = 23;
    if (newHours > 23) newHours = 0;
    updateTime(newHours, minutes);
  };

  // 增加/减少分钟
  const adjustMinutes = (delta: number) => {
    let newMinutes = minutes + delta;
    if (newMinutes < 0) {
      newMinutes = 55;
      adjustHours(-1);
      return;
    }
    if (newMinutes > 59) {
      newMinutes = 0;
      adjustHours(1);
      return;
    }
    updateTime(hours, newMinutes);
  };

  // 格式化显示
  const displayValue = value
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    : placeholder;

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg',
          'bg-gray-100 dark:bg-gray-800',
          'border border-gray-200 dark:border-gray-700',
          'text-sm font-medium',
          'transition-all duration-200',
          !disabled && 'hover:bg-gray-200 dark:hover:bg-gray-700',
          disabled && 'opacity-50 cursor-not-allowed',
          isOpen && 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900'
        )}
      >
        <Clock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <span
          className={cn(
            value
              ? 'text-gray-900 dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          )}
        >
          {displayValue}
        </span>
      </button>

      {/* 下拉选择器 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute z-50 mt-2 right-0',
              'bg-white dark:bg-gray-800',
              'rounded-xl shadow-xl',
              'border border-gray-200 dark:border-gray-700',
              'p-4'
            )}
          >
            <div className="flex items-center gap-4">
              {/* 小时选择 */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => adjustHours(1)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="增加小时"
                >
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                </button>
                <div className="w-12 h-12 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {String(hours).padStart(2, '0')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustHours(-1)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="减少小时"
                >
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                </button>
                <span className="text-xs text-gray-500 mt-1">时</span>
              </div>

              {/* 分隔符 */}
              <span className="text-2xl font-bold text-gray-400">:</span>

              {/* 分钟选择 */}
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => adjustMinutes(5)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="增加分钟"
                >
                  <ChevronUp className="w-5 h-5 text-gray-500" />
                </button>
                <div className="w-12 h-12 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {String(minutes).padStart(2, '0')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustMinutes(-5)}
                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="减少分钟"
                >
                  <ChevronDown className="w-5 h-5 text-gray-500" />
                </button>
                <span className="text-xs text-gray-500 mt-1">分</span>
              </div>
            </div>

            {/* 快捷选项 */}
            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: '22:00', hours: 22, minutes: 0 },
                  { label: '23:00', hours: 23, minutes: 0 },
                  { label: '06:00', hours: 6, minutes: 0 },
                  { label: '07:00', hours: 7, minutes: 0 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      updateTime(preset.hours, preset.minutes);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'px-2 py-1 rounded-md text-xs font-medium',
                      'bg-gray-100 dark:bg-gray-700',
                      'hover:bg-indigo-100 dark:hover:bg-indigo-900/30',
                      'hover:text-indigo-600 dark:hover:text-indigo-400',
                      'transition-colors'
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 确认按钮 */}
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={cn(
                'w-full mt-3 px-4 py-2 rounded-lg',
                'bg-gradient-to-r from-indigo-500 to-purple-500',
                'text-white text-sm font-medium',
                'hover:from-indigo-600 hover:to-purple-600',
                'transition-all duration-200'
              )}
            >
              确定
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
