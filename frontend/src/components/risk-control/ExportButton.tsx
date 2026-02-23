'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';

/**
 * 导出按钮组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.4: 风控报告页面 - 导出功能
 */
interface ExportButtonProps {
  onExport: (format: 'csv' | 'pdf') => Promise<void>;
  isExporting?: boolean;
  className?: string;
}

export function ExportButton({
  onExport,
  isExporting = false,
  className,
}: ExportButtonProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null);

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExportingFormat(format);
    setIsDropdownOpen(false);
    try {
      await onExport(format);
    } finally {
      setExportingFormat(null);
    }
  };

  const exportOptions = [
    {
      format: 'csv' as const,
      label: '导出 CSV',
      icon: FileSpreadsheet,
      description: '表格数据格式',
    },
    {
      format: 'pdf' as const,
      label: '导出 PDF',
      icon: FileText,
      description: '报告文档格式',
    },
  ];

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        disabled={isExporting || exportingFormat !== null}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg',
          'bg-indigo-500 text-white',
          'hover:bg-indigo-600 transition-colors',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'text-sm font-medium'
        )}
      >
        {exportingFormat ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>导出报告</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform',
            isDropdownOpen && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'absolute top-full right-0 mt-2 z-50',
              'min-w-[200px] py-2 rounded-lg',
              'bg-white dark:bg-gray-800',
              'border border-gray-200 dark:border-gray-700',
              'shadow-lg'
            )}
          >
            {exportOptions.map((option) => (
              <button
                key={option.format}
                onClick={() => handleExport(option.format)}
                className={cn(
                  'w-full px-4 py-3 text-left',
                  'hover:bg-gray-100 dark:hover:bg-gray-700',
                  'transition-colors flex items-start gap-3'
                )}
              >
                <option.icon className="w-5 h-5 text-gray-500 dark:text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {option.label}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 点击外部关闭 */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}
