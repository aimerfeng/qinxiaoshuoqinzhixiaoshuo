/**
 * 黑名单用户项组件
 *
 * 需求21: 设置中心
 * 任务21.2.7: 黑名单管理
 *
 * 需求21验收标准11: WHEN 用户解除拉黑 THEN System SHALL 恢复正常显示
 *
 * 功能:
 * - 显示用户头像、用户名、显示名
 * - 显示拉黑日期和原因
 * - 解除拉黑按钮
 */

'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { UserMinus, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { BlacklistEntry } from '@/types/settings';

interface BlacklistItemProps {
  entry: BlacklistEntry;
  onUnblock: (userId: string) => Promise<void>;
  index?: number;
}

/**
 * 格式化日期
 */
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BlacklistItem({
  entry,
  onUnblock,
  index = 0,
}: BlacklistItemProps) {
  const [isUnblocking, setIsUnblocking] = useState(false);

  const handleUnblock = async () => {
    setIsUnblocking(true);
    try {
      await onUnblock(entry.blockedUserId);
    } finally {
      setIsUnblocking(false);
    }
  };

  const displayName = entry.blockedUser.displayName || entry.blockedUser.username;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center gap-4 px-4 py-4"
    >
      {/* 头像 */}
      <div className="flex-shrink-0">
        {entry.blockedUser.avatar ? (
          <img
            src={entry.blockedUser.avatar}
            alt={displayName}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100 dark:ring-gray-800"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center ring-2 ring-gray-100 dark:ring-gray-800">
            <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">
              {initial}
            </span>
          </div>
        )}
      </div>

      {/* 用户信息 */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {displayName}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          @{entry.blockedUser.username}
        </p>
        {entry.reason && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
            原因：{entry.reason}
          </p>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          拉黑于 {formatDate(entry.createdAt)}
        </p>
      </div>

      {/* 解除拉黑按钮 */}
      <button
        onClick={handleUnblock}
        disabled={isUnblocking}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
          'text-sm font-medium',
          'text-red-600 dark:text-red-400',
          'bg-red-50 dark:bg-red-900/20',
          'hover:bg-red-100 dark:hover:bg-red-900/30',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors'
        )}
      >
        {isUnblocking ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <UserMinus className="w-4 h-4" />
        )}
        解除拉黑
      </button>
    </motion.div>
  );
}
