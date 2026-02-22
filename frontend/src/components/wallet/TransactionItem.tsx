'use client';

import { motion } from 'motion/react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/utils/cn';
import {
  TRANSACTION_TYPE_ICONS,
  TRANSACTION_TYPE_COLORS,
  TRANSACTION_TYPE_NAMES,
  type TransactionItem as TransactionItemType,
} from '@/types/wallet';

/**
 * 交易记录项组件
 *
 * 需求15: 零芥子代币系统
 * 任务15.2.1: 钱包页面 - 交易记录列表
 */
interface TransactionItemProps {
  transaction: TransactionItemType;
  index: number;
}

export function TransactionItem({ transaction, index }: TransactionItemProps) {
  const colors = TRANSACTION_TYPE_COLORS[transaction.type];
  const icon = TRANSACTION_TYPE_ICONS[transaction.type];
  const typeName = TRANSACTION_TYPE_NAMES[transaction.type];
  const isIncome = transaction.amount > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* 图标 */}
        <div className={cn('p-2 rounded-xl', colors.bg)}>
          <span className="text-lg">{icon}</span>
        </div>

        {/* 信息 */}
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {typeName}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {transaction.description || typeName}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {format(new Date(transaction.createdAt), 'MM月dd日 HH:mm', { locale: zhCN })}
          </div>
        </div>
      </div>

      {/* 金额 */}
      <div
        className={cn(
          'text-lg font-semibold',
          isIncome
            ? 'text-green-600 dark:text-green-400'
            : 'text-red-600 dark:text-red-400'
        )}
      >
        {isIncome ? '+' : ''}
        {transaction.amount.toLocaleString()}
      </div>
    </motion.div>
  );
}
