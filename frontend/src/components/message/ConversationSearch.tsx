'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ConversationSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * 会话搜索组件
 *
 * 需求20: 私信系统
 * 任务20.2.2: 会话列表页面 - 搜索组件
 *
 * 功能:
 * - 搜索输入框带防抖
 * - 按参与者名称或消息内容过滤
 * - 清除搜索按钮
 */
export default function ConversationSearch({
  value,
  onChange,
  placeholder = '搜索会话...',
  className,
}: ConversationSearchProps) {
  const [localValue, setLocalValue] = useState(value);

  // 防抖处理
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  // 同步外部值变化
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="w-4 h-4 text-gray-400" />
      </div>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-10 py-2.5 text-sm',
          'bg-gray-100 dark:bg-gray-800',
          'border border-transparent',
          'rounded-xl',
          'text-gray-900 dark:text-white',
          'placeholder-gray-500 dark:placeholder-gray-400',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500',
          'transition-all duration-200'
        )}
      />
      {localValue && (
        <button
          onClick={handleClear}
          className={cn(
            'absolute inset-y-0 right-0 pr-3 flex items-center',
            'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
            'transition-colors'
          )}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
