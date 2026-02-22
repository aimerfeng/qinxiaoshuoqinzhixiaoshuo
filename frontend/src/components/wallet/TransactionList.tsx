'use client';

import { motion } from 'motion/react';
import { History, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { TransactionItem } from './TransactionItem';
import type { TransactionItem as TransactionItemType, Pagination } from '@/types/wallet';

/**
 * 交易记录列表组件
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.1: 钱包页面 - 交易记录列表
 *
 * 需求15验收标准5: WHEN 用户查看零芥子钱包 THEN System SHALL 显示余额、收支明细、来源统计
 */
interface TransactionListProps {
  transactions: TransactionItemType[];
  pagination: Pagination | null;
  isLoading: boolean;
  currentPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function TransactionList({
  transactions,
  pagination,
  isLoading,
  currentPage,
  onPageChange,
  className,
}: TransactionListProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className={cn(
        'rounded-2xl overflow-hidden',
        'bg-white/60 dark:bg-gray-900/60',
        'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">交易记录</h3>
          {pagination && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              共 {pagination.total} 条
            </span>
          )}
        </div>
      </div>

      {/* 列表内容 */}
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : transactions.length > 0 ? (
        <>
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {transactions.map((transaction, index) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                index={index}
              />
            ))}
          </div>

          {/* 分页 */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  currentPage <= 1
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (pagination.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= pagination.totalPages - 2) {
                    pageNum = pagination.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => onPageChange(pageNum)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                        currentPage === pageNum
                          ? 'bg-indigo-500 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  currentPage >= pagination.totalPages
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <History className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
          <p>暂无交易记录</p>
        </div>
      )}
    </motion.div>
  );
}
