'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Database, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 告警数据/证据查看组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.2: 告警详情页面 - 数据查看组件
 *
 * 以结构化方式显示告警数据/证据
 */
interface AlertDataViewProps {
  data: Record<string, unknown> | null | undefined;
  className?: string;
}

export function AlertDataView({ data, className }: AlertDataViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={cn(
          'rounded-2xl p-6',
          'bg-white/60 dark:bg-gray-900/60',
          'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">告警数据</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">暂无数据</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-left"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <Database className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">告警数据</h3>
        </button>

        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
            'text-gray-500 dark:text-gray-400',
            'hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-green-500">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>复制 JSON</span>
            </>
          )}
        </button>
      </div>

      {/* 数据内容 */}
      {isExpanded && (
        <div className="p-4">
          <DataRenderer data={data} />
        </div>
      )}
    </motion.div>
  );
}

/**
 * 递归数据渲染组件
 */
interface DataRendererProps {
  data: unknown;
  depth?: number;
}

function DataRenderer({ data, depth = 0 }: DataRendererProps) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const toggleKey = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (data === null) {
    return <span className="text-gray-400 italic">null</span>;
  }

  if (data === undefined) {
    return <span className="text-gray-400 italic">undefined</span>;
  }

  if (typeof data === 'boolean') {
    return (
      <span className={data ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
        {data.toString()}
      </span>
    );
  }

  if (typeof data === 'number') {
    return <span className="text-blue-600 dark:text-blue-400">{data}</span>;
  }

  if (typeof data === 'string') {
    // 检查是否是日期字符串
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(data)) {
      return (
        <span className="text-purple-600 dark:text-purple-400">
          {new Date(data).toLocaleString('zh-CN')}
        </span>
      );
    }
    // 检查是否是 UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data)) {
      return (
        <span className="text-orange-600 dark:text-orange-400 font-mono text-xs">
          {data}
        </span>
      );
    }
    return <span className="text-green-600 dark:text-green-400">"{data}"</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="text-gray-400">[]</span>;
    }

    return (
      <div className="space-y-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="text-gray-400 text-xs w-6 text-right flex-shrink-0">
              [{index}]
            </span>
            <DataRenderer data={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <span className="text-gray-400">{'{}'}</span>;
    }

    return (
      <div className="space-y-2">
        {entries.map(([key, value]) => {
          const isComplex = typeof value === 'object' && value !== null;
          const isExpanded = expandedKeys.has(key) || depth < 2;

          return (
            <div key={key} className="group">
              <div className="flex items-start gap-2">
                {isComplex ? (
                  <button
                    onClick={() => toggleKey(key)}
                    className="flex items-center gap-1 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3 h-3 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3 h-3 text-gray-400" />
                    )}
                    <span className="text-indigo-600 dark:text-indigo-400 font-medium text-sm">
                      {key}:
                    </span>
                  </button>
                ) : (
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium text-sm pl-4">
                    {key}:
                  </span>
                )}
                {!isComplex && (
                  <DataRenderer data={value} depth={depth + 1} />
                )}
              </div>
              {isComplex && isExpanded && (
                <div className="ml-6 mt-1 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <DataRenderer data={value} depth={depth + 1} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return <span className="text-gray-500">{String(data)}</span>;
}
