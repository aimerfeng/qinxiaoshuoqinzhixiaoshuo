'use client';

import { motion } from 'motion/react';
import { Users, ExternalLink, User } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { AffectedUser } from '@/types/risk-control';

/**
 * 受影响用户列表组件
 *
 * 需求19: 风控与反作弊系统 - 风控管理前端
 * 任务19.2.2: 告警详情页面 - 受影响用户列表
 *
 * 显示受告警影响的用户列表，支持跳转到用户详情
 */
interface AffectedUsersListProps {
  userIds: string[];
  users?: AffectedUser[];
  onUserClick?: (userId: string) => void;
  className?: string;
}

export function AffectedUsersList({
  userIds,
  users,
  onUserClick,
  className,
}: AffectedUsersListProps) {
  // 创建用户ID到用户信息的映射
  const userMap = new Map(users?.map((u) => [u.id, u]) || []);

  if (userIds.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          'rounded-2xl p-6',
          'bg-white/60 dark:bg-gray-900/60',
          'backdrop-blur-xl border border-white/20 dark:border-gray-700/30',
          className
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">受影响用户</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">无受影响用户</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
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
          <Users className="w-5 h-5 text-indigo-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">受影响用户</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            ({userIds.length})
          </span>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto">
        {userIds.map((userId, index) => {
          const user = userMap.get(userId);

          return (
            <motion.div
              key={userId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onUserClick?.(userId)}
              className={cn(
                'flex items-center gap-3 p-4',
                'hover:bg-gray-50 dark:hover:bg-gray-800/50',
                onUserClick && 'cursor-pointer',
                'transition-colors'
              )}
            >
              {/* 头像 */}
              <div className="flex-shrink-0">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName || user.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                    <User className="w-5 h-5 text-indigo-500" />
                  </div>
                )}
              </div>

              {/* 用户信息 */}
              <div className="flex-1 min-w-0">
                {user ? (
                  <>
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {user.displayName || user.username}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      @{user.username}
                      {user.email && ` · ${user.email}`}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="font-mono text-sm text-gray-600 dark:text-gray-400 truncate">
                      {userId}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      用户ID
                    </div>
                  </>
                )}
              </div>

              {/* 跳转图标 */}
              {onUserClick && (
                <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
