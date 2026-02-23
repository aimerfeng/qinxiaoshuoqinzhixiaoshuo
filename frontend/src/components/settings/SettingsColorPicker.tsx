'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Palette, X } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 设置颜色选择器组件
 *
 * 需求21: 设置中心
 * 任务21.2.6: 主题设置
 *
 * 需求21验收标准9: WHEN 用户切换主题 THEN System SHALL 即时应用并保存偏好
 *
 * 功能:
 * - 预设颜色选择
 * - 自定义颜色输入
 * - 即时预览
 */

export interface PresetColor {
  id: string;
  name: string;
  color: string;
}

interface SettingsColorPickerProps {
  value: string | null;
  onChange: (color: string | null) => void;
  presetColors: PresetColor[];
  disabled?: boolean;
  className?: string;
}

export default function SettingsColorPicker({
  value,
  onChange,
  presetColors,
  disabled = false,
  className,
}: SettingsColorPickerProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customColor, setCustomColor] = useState('');
  const [customColorError, setCustomColorError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 检查当前值是否是预设颜色
  const isPresetColor = presetColors.some((c) => c.color === value);
  const isCustomColor = value && !isPresetColor;

  // 当显示自定义输入时，聚焦输入框
  useEffect(() => {
    if (showCustomInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCustomInput]);

  // 初始化自定义颜色值
  useEffect(() => {
    if (isCustomColor && value) {
      setCustomColor(value);
    }
  }, [isCustomColor, value]);

  /**
   * 验证十六进制颜色
   */
  const isValidHexColor = (color: string): boolean => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  /**
   * 处理预设颜色选择
   */
  const handlePresetColorSelect = (color: string) => {
    if (disabled) return;
    setShowCustomInput(false);
    setCustomColor('');
    setCustomColorError('');
    onChange(color);
  };

  /**
   * 处理自定义颜色输入
   */
  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value;
    
    // 自动添加 # 前缀
    if (inputValue && !inputValue.startsWith('#')) {
      inputValue = '#' + inputValue;
    }
    
    setCustomColor(inputValue);
    setCustomColorError('');
  };

  /**
   * 确认自定义颜色
   */
  const handleCustomColorConfirm = () => {
    if (!customColor) {
      setCustomColorError('请输入颜色值');
      return;
    }

    if (!isValidHexColor(customColor)) {
      setCustomColorError('请输入有效的十六进制颜色（如 #6366F1）');
      return;
    }

    onChange(customColor.toUpperCase());
    setShowCustomInput(false);
    setCustomColorError('');
  };

  /**
   * 取消自定义颜色输入
   */
  const handleCustomColorCancel = () => {
    setShowCustomInput(false);
    setCustomColor(isCustomColor && value ? value : '');
    setCustomColorError('');
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCustomColorConfirm();
    } else if (e.key === 'Escape') {
      handleCustomColorCancel();
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* 预设颜色 */}
      <div className="flex flex-wrap gap-3">
        {presetColors.map((preset) => {
          const isSelected = value === preset.color;

          return (
            <motion.button
              key={preset.id}
              type="button"
              whileHover={!disabled ? { scale: 1.1 } : undefined}
              whileTap={!disabled ? { scale: 0.95 } : undefined}
              onClick={() => handlePresetColorSelect(preset.color)}
              disabled={disabled}
              className={cn(
                'relative w-10 h-10 rounded-full transition-all',
                'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900',
                isSelected
                  ? 'ring-gray-400 dark:ring-gray-500'
                  : 'ring-transparent hover:ring-gray-200 dark:hover:ring-gray-700',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
              style={{ backgroundColor: preset.color }}
              title={preset.name}
              aria-label={`选择${preset.name}`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <Check className="w-5 h-5 text-white drop-shadow-md" />
                </motion.div>
              )}
            </motion.button>
          );
        })}

        {/* 自定义颜色按钮 */}
        <motion.button
          type="button"
          whileHover={!disabled ? { scale: 1.1 } : undefined}
          whileTap={!disabled ? { scale: 0.95 } : undefined}
          onClick={() => !disabled && setShowCustomInput(true)}
          disabled={disabled}
          className={cn(
            'relative w-10 h-10 rounded-full transition-all',
            'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900',
            'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800',
            'border-2 border-dashed border-gray-300 dark:border-gray-600',
            isCustomColor
              ? 'ring-gray-400 dark:ring-gray-500'
              : 'ring-transparent hover:ring-gray-200 dark:hover:ring-gray-700',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          style={isCustomColor && value ? { backgroundColor: value } : undefined}
          title="自定义颜色"
          aria-label="自定义颜色"
        >
          {isCustomColor && value ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <Check className="w-5 h-5 text-white drop-shadow-md" />
            </motion.div>
          ) : (
            <Palette className="w-5 h-5 text-gray-500 dark:text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          )}
        </motion.button>
      </div>

      {/* 颜色名称标签 */}
      <div className="flex flex-wrap gap-2">
        {presetColors.map((preset) => (
          <span
            key={preset.id}
            className={cn(
              'text-xs px-2 py-1 rounded-full transition-colors',
              value === preset.color
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            {preset.name}
          </span>
        ))}
        {isCustomColor && value && (
          <span className="text-xs px-2 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">
            自定义 ({value})
          </span>
        )}
      </div>

      {/* 自定义颜色输入 */}
      <AnimatePresence>
        {showCustomInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 space-y-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  自定义颜色
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* 颜色预览 */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-lg border-2 transition-colors',
                    isValidHexColor(customColor)
                      ? 'border-gray-300 dark:border-gray-600'
                      : 'border-dashed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700'
                  )}
                  style={
                    isValidHexColor(customColor)
                      ? { backgroundColor: customColor }
                      : undefined
                  }
                />

                {/* 输入框 */}
                <div className="flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={customColor}
                    onChange={handleCustomColorChange}
                    onKeyDown={handleKeyDown}
                    placeholder="#6366F1"
                    maxLength={7}
                    className={cn(
                      'w-full px-3 py-2 rounded-lg text-sm',
                      'bg-white dark:bg-gray-900',
                      'border transition-colors',
                      customColorError
                        ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                        : 'border-gray-300 dark:border-gray-600 focus:ring-indigo-500',
                      'focus:outline-none focus:ring-2 focus:ring-offset-0',
                      'text-gray-900 dark:text-white',
                      'placeholder:text-gray-400 dark:placeholder:text-gray-500'
                    )}
                  />
                </div>

                {/* 确认按钮 */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCustomColorConfirm}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    'bg-indigo-500 hover:bg-indigo-600',
                    'text-white'
                  )}
                  aria-label="确认"
                >
                  <Check className="w-4 h-4" />
                </motion.button>

                {/* 取消按钮 */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCustomColorCancel}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600',
                    'text-gray-600 dark:text-gray-400'
                  )}
                  aria-label="取消"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* 错误提示 */}
              {customColorError && (
                <p className="text-xs text-red-500 dark:text-red-400">
                  {customColorError}
                </p>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400">
                请输入十六进制颜色值，如 #6366F1 或 #F00
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
